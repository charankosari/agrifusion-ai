import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ML_DIR = path.join(__dirname, '..', '..', 'ml')

// ---- Python ML bridge -----------------------------------------------------
export function runPython(payload) {
  return new Promise((resolve, reject) => {
    const py = spawn(process.env.PYTHON || 'python', ['predict.py'], { cwd: ML_DIR })
    let out = '', err = ''
    py.stdout.on('data', d => (out += d))
    py.stderr.on('data', d => (err += d))
    py.on('error', e => reject(new Error('Cannot start Python (' + e.message + '). Set PYTHON in server/.env')))
    py.on('close', code => {
      if (code !== 0) return reject(new Error('ML failed: ' + err.slice(-400)))
      try { resolve(JSON.parse(out)) } catch { reject(new Error('Bad ML output')) }
    })
    py.stdin.end(JSON.stringify(payload))
  })
}

// ---- Weather ---------------------------------------------------------------
const FALLBACK = { 1: [22, 60, 15], 2: [25, 55, 15], 3: [29, 50, 20], 4: [32, 50, 30], 5: [33, 55, 50], 6: [29, 75, 110], 7: [27, 82, 170], 8: [27, 83, 160], 9: [27, 80, 130], 10: [26, 72, 70], 11: [23, 65, 25], 12: [21, 62, 10] }

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

export async function geocode(location) {
  try {
    const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.split(',')[0])}&count=1&country_code=IN`)
    if (j.results?.length) return { lat: j.results[0].latitude, lon: j.results[0].longitude, name: j.results[0].name }
  } catch { /* offline */ }
  return { lat: 17.385, lon: 78.4867, name: location } // Hyderabad default
}

export async function getWeather(lat, lon) {
  const month = new Date().getMonth() + 1
  try {
    const j = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`)
    const rain7 = j.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0)
    const [fbT, fbH, fbR] = FALLBACK[month]
    return {
      source: 'Open-Meteo live forecast',
      temp: Math.round(j.current.temperature_2m * 10) / 10,
      humidity: j.current.relative_humidity_2m,
      rainfall: Math.round(Math.max(rain7 * 30 / 7, fbR * 0.5)), // blend forecast with climatology (mm per month)
      rainChance: Math.max(...j.daily.precipitation_probability_max.map(v => v || 0)),
      daily: j.daily.time.map((t, i) => ({ date: t, max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_sum[i] })),
    }
  } catch {
    const [t, h, r] = FALLBACK[month]
    return { source: 'Seasonal climatology (offline fallback)', temp: t, humidity: h, rainfall: r, rainChance: Math.min(90, Math.round(r / 2)), daily: [] }
  }
}
