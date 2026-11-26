import { readFileSync } from 'node:fs'
import { Surreal } from 'surrealdb'
import { buildSeed, emptyGraph } from '../src/data/seed'
import { loadGraph, syncGraph, wipe } from '../src/db/sync'
import { addReel, addStory, claim, completeDrop, lockPrice } from '../src/logic/actions'
import { quote, totalNgn } from '../src/lib/pricing'
import { parsePostal } from '../src/lib/postal'
import { STATE_CODE_LIST, assertAllStatesCovered } from '../src/lib/states'

function fail(message: string): never {
  throw new Error(message)
}

function must<T extends { ok: true; graph: import('../src/data/types').Graph } | { ok: false; error: string }>(
  result: T,
): import('../src/data/types').Graph {
  if (!result.ok) fail(result.error)
  return result.graph
}

function assertMemory() {
  const seed = buildSeed()
  assertAllStatesCovered(seed.people.map((row) => row.stateCode))
  if (seed.people.length < 37) fail('expected a person in every state')
  const invalid = ['LA00A01AA01', 'FC02A09DB00', 'XX02A09DB09', '100001', 'FC02A9DB09', '', 'LA12M12KS0']
  for (const code of invalid) {
    if (parsePostal(code)) fail(`accepted invalid postcode ${code}`)
  }
  const sample = parsePostal('fc 02 a09 db 09')
  if (!sample || sample.compact !== 'FC02A09DB09' || sample.display !== 'FC 02 A09 DB 09') {
    fail('display form of the NIPOST sample is wrong')
  }
  if (!parsePostal('FC-02-A09-DB-09')) fail('hyphenated postcode should be accepted')
  for (const row of seed.shipments) {
    const priced = quote(row.originPostal, row.destPostal, row.weightKg)
    if (
      priced.pickupNgn !== row.pickupNgn ||
      priced.distanceNgn !== row.distanceNgn ||
      priced.hubNgn !== row.hubNgn ||
      priced.platformFeeNgn !== row.platformFeeNgn
    ) {
      fail(`seed price drifted on ${row.id}`)
    }
    if (totalNgn(row) !== row.pickupNgn + row.distanceNgn + row.hubNgn + row.platformFeeNgn) {
      fail(`total mismatch on ${row.id}`)
    }
  }
  const papers = seed.shipments.find((row) => row.id === 'papers')
  if (!papers || papers.hubNgn !== 0) fail('same-state drop should have a zero hub fee')
  const oil = seed.shipments.find((row) => row.id === 'oil')
  const seyi = seed.people.find((row) => row.id === 'seyi')
  if (!oil || oil.status !== 'open') fail('oil need should be open')
  if (!seyi || seyi.corridorFrom !== 'AB' || seyi.corridorTo !== 'EN') fail('Seyi corridor missing')
  if (parsePostal(oil.originPostal)?.state !== 'AB' || parsePostal(oil.destPostal)?.state !== 'EN') {
    fail('oil corridor does not match Seyi')
  }
  const garri = seed.deals.find((row) => row.id === 'garri')
  if (!garri?.locked) fail('garri price should already be locked')
  if (!seed.stories.some((row) => row.shipmentId === 'plantain')) fail('plantain live leg missing')
  if (seed.shipments.find((row) => row.id === 'garri')?.status !== 'delivered') fail('garri should be public proof')
  const schema = readFileSync(new URL('../surreal/schema.surql', import.meta.url), 'utf8')
  for (const code of STATE_CODE_LIST) {
    if (!schema.includes(`'${code}'`)) fail(`schema is missing state ${code}`)
  }
  let graph = buildSeed()
  const before = totalNgn(graph.shipments.find((row) => row.id === 'oil')!)
  graph = must(claim(graph, 'seyi', 'oil'))
  graph = must(lockPrice(graph, 'seyi', 'oil'))
  graph = must(addStory(graph, 'seyi', 'oil', 'Leaving Aba with the keg.'))
  graph = must(addReel(graph, 'seyi', 'oil', 'Packing proof', 'Keg sealed.'))
  graph = must(completeDrop(graph, 'seyi', 'oil'))
  const done = graph.shipments.find((row) => row.id === 'oil')
  if (done?.status !== 'delivered') fail('oil loop did not complete')
  if (totalNgn(done!) !== before) fail('completed drop changed the price')
  const seyiAfter = graph.people.find((row) => row.id === 'seyi')
  if (!seyiAfter || seyiAfter.dropsCompleted !== seyi.dropsCompleted + 1) fail('completed drop was not counted')
  const twice = lockPrice(graph, 'seyi', 'oil')
  if (twice.ok) fail('a locked price was locked again')
}

async function expectThrow(run: () => Promise<unknown>, label: string) {
  try {
    await run()
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    console.log(`rejected ${label}: ${text.split('\n')[0]}`)
    return
  }
  fail(`expected SurrealDB to reject ${label}`)
}

async function applySchema(db: Surreal) {
  const schema = readFileSync(new URL('../surreal/schema.surql', import.meta.url), 'utf8')
  await db.query(schema)
}

async function seedDatabase(db: Surreal) {
  await wipe(db)
  await syncGraph(db, emptyGraph(), buildSeed())
}

async function databaseChecks(db: Surreal) {
  const seed = buildSeed()
  const loaded = await loadGraph(db)
  if (loaded.people.length !== seed.people.length) {
    fail(`loaded ${loaded.people.length} people, seed has ${seed.people.length}`)
  }
  assertAllStatesCovered(loaded.people.map((row) => row.stateCode))
  for (const row of seed.shipments) {
    const got = loaded.shipments.find((item) => item.id === row.id)
    if (!got) fail(`missing shipment ${row.id} in SurrealDB`)
    if (got.status !== row.status || got.pickupNgn !== row.pickupNgn || got.platformFeeNgn !== row.platformFeeNgn) {
      fail(`shipment ${row.id} did not round-trip`)
    }
    if (got.originPostal !== row.originPostal) fail(`postcode changed on ${row.id}`)
  }
  const totals = (await db.query('SELECT id, total_ngn, pickup_ngn, distance_ngn, hub_ngn, platform_fee_ngn FROM shipment')) as [
    Array<{ id: string; total_ngn: number; pickup_ngn: number; distance_ngn: number; hub_ngn: number; platform_fee_ngn: number }>,
  ]
  for (const row of totals[0] ?? []) {
    const sum = row.pickup_ngn + row.distance_ngn + row.hub_ngn + row.platform_fee_ngn
    if (row.total_ngn !== sum) fail(`computed total drifted on ${row.id}`)
  }
  await expectThrow(
    () => db.query(`CREATE person:bad SET handle = 'bad', name = 'Bad', role = 'sender', state_code = 'LA', postal_code = 'LA00A01AA01'`),
    'LGA 00',
  )
  await expectThrow(
    () => db.query(`CREATE person:legacy SET handle = 'legacy', name = 'Legacy', role = 'sender', state_code = 'LA', postal_code = '100001'`),
    'legacy 6-digit postcode',
  )
  await expectThrow(() => db.query('UPDATE deal:garri SET pickup_ngn = 1'), 'a change to a locked price')
  await expectThrow(
    () =>
      db.query(
        `CREATE shipment:fee SET author = person:adaeze, status = 'open', goods = 'x', weight_kg = 1, origin_postal = 'FC02A09DB09', dest_postal = 'FC02G04GW12', origin_label = 'A', dest_label = 'B', pickup_ngn = 700, distance_ngn = 400, hub_ngn = 0, platform_fee_ngn = 40, hidden_fee_ngn = 25, pay_method = 'cash', proof = 'parcel', formula = 'koro-v1'`,
      ),
    'a hidden fee',
  )

  let graph = buildSeed()
  const prevPeople = graph.people.find((row) => row.id === 'seyi')!.dropsCompleted
  graph = must(claim(graph, 'seyi', 'oil'))
  await syncGraph(db, seed, graph)
  graph = must(lockPrice(graph, 'seyi', 'oil'))
  await syncGraph(db, (await loadGraph(db, 'seyi')), graph)
  await expectThrow(() => db.query('UPDATE shipment:oil SET pickup_ngn = 5'), 'a price edit after lock')
  const locked = await loadGraph(db, 'seyi')
  if (!locked.deals.find((row) => row.id === 'oil')?.locked) fail('oil deal did not lock in SurrealDB')
  if (locked.shipments.find((row) => row.id === 'oil')?.pickupNgn !== seed.shipments.find((row) => row.id === 'oil')?.pickupNgn) {
    fail('locked shipment price changed')
  }
  const moving = must(addStory(graph, 'seyi', 'oil', 'Leaving Aba. Keg is sealed.'))
  await syncGraph(db, graph, moving)
  const withProof = must(addReel(moving, 'seyi', 'oil', 'Packing proof', 'Keg cap taped.'))
  await syncGraph(db, moving, withProof)
  const delivered = must(completeDrop(withProof, 'seyi', 'oil'))
  await syncGraph(db, withProof, delivered)
  const after = await loadGraph(db, 'seyi')
  const oil = after.shipments.find((row) => row.id === 'oil')
  if (oil?.status !== 'delivered') fail('SurrealDB did not record the completed drop')
  if (after.people.find((row) => row.id === 'seyi')?.dropsCompleted !== prevPeople + 1) {
    fail('SurrealDB did not count the completed drop')
  }
  if (!after.stories.some((row) => row.shipmentId === 'oil')) fail('live leg was not stored')
  if (!after.reels.some((row) => row.shipmentId === 'oil')) fail('proof reel was not stored')
}

async function main() {
  assertMemory()
  const seedOnly = process.argv.includes('--seed-only')
  const endpoint = process.env.SURREAL_URL
  if (!endpoint) fail('SURREAL_URL is required, for example ws://127.0.0.1:8000/rpc')
  const db = new Surreal()
  await db.connect(endpoint, { reconnect: false })
  await db.use({ namespace: 'koro', database: 'network' })
  await applySchema(db)
  await seedDatabase(db)
  if (!seedOnly) {
    await databaseChecks(db)
    await seedDatabase(db)
  }
  const loaded = await loadGraph(db)
  console.log(
    `Koro ready · ${loaded.people.length} people · ${new Set(loaded.people.map((row) => row.stateCode)).size} states · ${loaded.shipments.length} drops · seed mode uses no cloud credentials`,
  )
  await db.close()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
