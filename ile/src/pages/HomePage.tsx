import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Scale, Sparkles } from 'lucide-react'
import { listings } from '../data/seed'
import { ListingCard, RoleStrip } from '../components/ListingCard'

export function HomePage() {
  const featured = listings.slice(0, 3)

  return (
    <div>
      <section className="relative min-h-[92dvh] overflow-hidden grain">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(10,18,16,0.92) 15%, rgba(10,18,16,0.55) 55%, rgba(10,18,16,0.75)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="relative shell flex min-h-[92dvh] flex-col justify-end pb-16 pt-24 lg:justify-center lg:pb-24">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl leading-none text-laterite md:text-7xl lg:text-8xl"
            style={{ fontWeight: 800 }}
          >
            Ile
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-5 max-w-2xl font-display text-3xl leading-tight text-paper md:text-5xl"
            style={{ fontWeight: 700 }}
          >
            Real estate without stacked fees
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-4 max-w-lg text-base text-mist md:text-lg"
          >
            Listings, deals, and messaging for Nigeria — with a published fee sheet so agents and
            lawyers cannot quietly inflate your closing cost.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 rounded-xl bg-laterite px-5 py-3 text-sm font-bold text-ink hover:bg-laterite-deep"
            >
              Browse listings <ArrowRight size={16} />
            </Link>
            <Link
              to="/agents"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-ink/40 px-5 py-3 text-sm font-semibold text-paper backdrop-blur hover:border-mist/50"
            >
              <Sparkles size={16} /> Fee & deal AI
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="shell py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'One mandate',
              body: 'Listings lock a single agency %. Stacked agent claims are flagged before you pay.',
            },
            {
              icon: Scale,
              title: 'Fixed-fee lawyers',
              body: 'Compare quotes to Ile’s band. Scope search vs transfer so hours don’t run away.',
            },
            {
              icon: Sparkles,
              title: 'AI that cuts cost',
              body: 'Fee estimator, document Q&A, deal checklist, and dispute helper — not chat theatre.',
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="border-t border-laterite/40 pt-4"
            >
              <item.icon className="text-mist" size={22} strokeWidth={1.6} />
              <h3 className="mt-3 font-display text-xl text-paper">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="shell pb-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-mist">One grid</p>
            <h2 className="mt-2 font-display text-3xl text-paper">Every listing kind</h2>
          </div>
          <Link to="/listings" className="text-sm font-semibold text-laterite">
            See all
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      </section>

      <RoleStrip />
    </div>
  )
}
