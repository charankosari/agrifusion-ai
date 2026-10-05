import { Component, useEffect, useState } from 'react'
import { api, setToken, hasToken } from './api.js'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Analyze from './pages/Analyze.jsx'
import Market from './pages/Market.jsx'
import Insights from './pages/Insights.jsx'
import { Icon } from './icons.jsx'

const TABS = [['dashboard', 'Dashboard', 'LayoutDashboard'], ['analyze', 'Crop Analysis', 'Sprout'], ['market', 'Market', 'TrendingUp'], ['insights', 'AI Insights', 'Brain']]
class Boundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return <div className="card"><h3>Something went wrong on this page</h3><p className="muted">{String(this.state.err.message || this.state.err)}</p><button className="primary" onClick={() => this.setState({ err: null })}>Try again</button></div>
  }
}
const safe = (fn, d) => { try { return fn() } catch { return d } }

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!hasToken())
  const [tab, setTab] = useState('dashboard')
  const [latest, setLatest] = useState(null)
  const [pick, setPick] = useState(null)
  const [theme, setTheme] = useState(() => safe(() => localStorage.getItem('af_theme'), null) || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

  useEffect(() => { document.documentElement.dataset.theme = theme; safe(() => localStorage.setItem('af_theme', theme)) }, [theme])
  useEffect(() => { if (hasToken()) api('/me').then(r => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true)) }, [])

  const logout = () => { setToken(null); setUser(null); setLatest(null); setTab('dashboard') }
  const toggle = <button className="icon-btn" title="Toggle dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={17} /></button>
  if (!ready) return <div className="center"><div className="spinner" /></div>
  if (!user) return <Auth onAuth={(u, t) => { setToken(t); setUser(u) }} toggle={toggle} />
  const open = (crop) => { setPick(crop); setTab('analyze') }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><div className="brand-mark"><Icon name="Sprout" size={20} stroke={2} /></div><div><strong>AgriFusion</strong><span>AI FARM INTELLIGENCE</span></div></div>
        <nav>{TABS.map(([k, l, ic]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={ic} size={18} /><b>{l}</b></button>)}</nav>
        <div className="me"><div className="avatar">{user.name[0]?.toUpperCase()}</div><div className="me-t"><div>{user.name}</div><small>{user.email}</small></div>{toggle}</div>
        <button className="ghost" onClick={logout}><Icon name="LogOut" size={16} />Log out</button>
      </aside>
      <main className="main"><Boundary key={tab}>
        {tab === 'dashboard' && <Dashboard user={user} latest={latest} setLatest={setLatest} goAnalyze={() => setTab('analyze')} open={open} />}
        {tab === 'analyze' && <Analyze latest={latest} setLatest={setLatest} pick={pick} />}
        {tab === 'market' && <Market />}
        {tab === 'insights' && <Insights />}
      </Boundary></main>
    </div>
  )
}
