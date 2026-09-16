import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('buyer')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    navigate('/profile')
  }

  return (
    <div className="shell grid min-h-[80dvh] items-center gap-10 py-10 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-3xl border border-line"
      >
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
          alt="Lagos skyline mood"
          className="aspect-[4/5] w-full object-cover md:aspect-square"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="font-display text-4xl text-laterite" style={{ fontWeight: 800 }}>
            Ile
          </p>
          <p className="mt-2 text-sm text-mist">
            Sign in to publish fee sheets, message counterparties, and run deal AI.
          </p>
        </div>
      </motion.div>

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4">
        <h1 className="font-display text-3xl text-paper">Welcome back</h1>
        <p className="text-sm text-muted">
          Demo auth — Surreal <code className="text-mist">DEFINE ACCESS</code> hooks up next.
        </p>
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-panel/60 px-3 py-2.5 outline-none focus:border-mist"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-panel/60 px-3 py-2.5 outline-none focus:border-mist"
          >
            {['buyer', 'seller', 'landlord', 'tenant', 'agent', 'lawyer'].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-laterite py-3 text-sm font-bold text-ink hover:bg-laterite-deep"
        >
          Continue
        </button>
        <p className="text-center text-sm text-muted">
          <Link to="/" className="text-mist hover:text-paper">
            Back to home
          </Link>
        </p>
      </form>
    </div>
  )
}
