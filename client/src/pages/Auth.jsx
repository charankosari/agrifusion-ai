import { useState } from 'react'
import { api } from '../api.js'
import { Icon } from '../icons.jsx'

export default function Auth({ onAuth, toggle }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const r = await api(`/auth/${mode}`, 'POST', f); onAuth(r.user, r.token) }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="brand"><div className="brand-mark"><Icon name="Sprout" size={20} stroke={2} /></div><div><strong>AgriFusion</strong><span>AI FARM INTELLIGENCE</span></div></div>
        <div className="av-body">
          <h1>Decide what to grow,<br />before you sow.</h1>
          <p>Compare crops on profit, water and risk. Get a complete plan from sowing to selling.</p>
          <ul className="av-points"><li><Icon name="Sprout" size={18} />14 crops compared for your soil, water and budget</li><li><Icon name="TrendingUp" size={18} />12-month price forecast and best month to sell</li><li><Icon name="ShieldCheck" size={18} />Weather-based disease and risk scoring</li></ul>
        </div>
        <small>Smart Agriculture Decision Support System</small>
      </section>
      <section className="auth-card">
        <div className="auth-top">{toggle}</div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">{mode === 'login' ? 'Log in to see your farm dashboard.' : 'It takes less than a minute.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Full name<input required value={f.name} onChange={set('name')} placeholder="Ramesh Kumar" autoComplete="name" /></label>}
          <label>Email<input required type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" /></label>
          <label>Password<input required type="password" minLength={6} value={f.password} onChange={set('password')} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {err && <div className="error" role="alert">{err}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        </form>
        <p className="switch">{mode === 'login' ? 'New here?' : 'Already registered?'}{' '}
          <a href="#" onClick={e => { e.preventDefault(); setErr(''); setMode(mode === 'login' ? 'register' : 'login') }}>{mode === 'login' ? 'Create an account' : 'Log in'}</a></p>
      </section>
    </main>
  )
}
