interface Env {
  ASSETS: Fetcher
  /** Optional Worker secret. Never exposed to the client. */
  SURREAL_URL?: string
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/mode') {
      const configured = Boolean(env.SURREAL_URL)
      return Response.json({
        mode: configured ? 'remote' : 'seed',
        surrealConfigured: configured,
      })
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
