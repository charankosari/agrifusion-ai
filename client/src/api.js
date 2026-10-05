const get = () => localStorage.getItem('af_token')
export async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(get() ? { Authorization: 'Bearer ' + get() } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(j.error || 'Request failed'); e.status = r.status; throw e }
  return j
}
export const setToken = t => (t ? localStorage.setItem('af_token', t) : localStorage.removeItem('af_token'))
export const hasToken = () => !!get()
export const inr = n => (n < 0 ? '-₹' : '₹') + Math.abs(Math.round(n)).toLocaleString('en-IN')
export const inrShort = n => {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  return a >= 1e7 ? `${s}₹${(a / 1e7).toFixed(2)} Cr` : a >= 1e5 ? `${s}₹${(a / 1e5).toFixed(2)} L` : a >= 1e3 ? `${s}₹${(a / 1e3).toFixed(1)}k` : `${s}₹${Math.round(a)}`
}
export const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtMonth = d => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
export const riskLabel = r => (r > 0.4 ? ['High', 3] : r > 0.2 ? ['Medium', 2] : ['Low', 1])

// results saved by older versions lack newer fields; never render those
export const isFresh = r => !!(r && r.crops && r.crops[0] && r.crops[0].reasons && r.crops[0].scenarios && r.crops[0].priceForecast?.[0]?.label)
