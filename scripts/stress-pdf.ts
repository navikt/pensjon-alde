import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

type Format = 'pdf' | 'pdfa' | 'random'

interface Options {
  target: string
  total: number
  concurrency: number
  minDelay: number
  maxDelay: number
  errorRate: number
  format: Format
  timeout: number
  warmup: number
  payload: string
  brokenPayload: string
  failThreshold: number
  outDir?: string
}

interface Result {
  ok: boolean
  status: number
  ms: number
  bytes: number
  outcome: string
  injectedError: boolean
}

function help(): never {
  console.log(`Stress test the PDF service.

Usage: tsx scripts/stress-pdf.ts [options]

  --target <url>         Base URL of the PDF service      (default http://localhost:8090)
  --total <n>            Total PDFs to generate           (default 100)
  --concurrency <n>      Simultaneous in-flight requests  (default 10)
  --min-delay <ms>       Min random delay before a request(default 0)
  --max-delay <ms>       Max random delay before a request(default 0)
  --error-rate <0..1>    Fraction sent with broken payload(default 0)
  --format <pdf|pdfa|random>  Output format               (default pdfa)
  --timeout <ms>         Per-request timeout              (default 30000)
  --warmup <n>           Warmup requests, excluded from stats (default 0)
  --payload <path>       Valid payload JSON     (default pdf/sample-payload.json)
  --broken-payload <path>Broken payload JSON    (default pdf/sample-payload-broken.json)
  --fail-threshold <0..1>Unexpected-failure fraction that exits non-zero (default 0.1)
  --out-dir <path>       Save each PDF to this dir (default: discard, saves nothing)
  --help
`)
  process.exit(0)
}

const { values } = parseArgs({
  options: {
    target: { type: 'string' },
    total: { type: 'string' },
    concurrency: { type: 'string' },
    'min-delay': { type: 'string' },
    'max-delay': { type: 'string' },
    'error-rate': { type: 'string' },
    format: { type: 'string' },
    timeout: { type: 'string' },
    warmup: { type: 'string' },
    payload: { type: 'string' },
    'broken-payload': { type: 'string' },
    'fail-threshold': { type: 'string' },
    'out-dir': { type: 'string' },
    help: { type: 'boolean' },
  },
})

if (values.help) help()

const opts: Options = {
  target: (values.target ?? 'http://localhost:8090').replace(/\/$/, ''),
  total: Number(values.total ?? 100),
  concurrency: Number(values.concurrency ?? 10),
  minDelay: Number(values['min-delay'] ?? 0),
  maxDelay: Number(values['max-delay'] ?? 0),
  errorRate: Number(values['error-rate'] ?? 0),
  format: (values.format ?? 'pdfa') as Format,
  timeout: Number(values.timeout ?? 30000),
  warmup: Number(values.warmup ?? 0),
  payload: values.payload ?? 'pdf/sample-payload.json',
  brokenPayload: values['broken-payload'] ?? 'pdf/sample-payload-broken.json',
  failThreshold: Number(values['fail-threshold'] ?? 0.1),
  outDir: values['out-dir'],
}

if (!['pdf', 'pdfa', 'random'].includes(opts.format)) {
  console.error(`Invalid --format '${opts.format}'. Use pdf, pdfa or random.`)
  process.exit(2)
}
if (opts.maxDelay < opts.minDelay) opts.maxDelay = opts.minDelay

function loadPayload(path: string): string {
  const abs = path.startsWith('/') ? path : `${repoRoot}${path}`
  return readFileSync(abs, 'utf-8')
}

const validBody = loadPayload(opts.payload)
const brokenBody = loadPayload(opts.brokenPayload)

if (opts.outDir) mkdirSync(opts.outDir, { recursive: true })

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const rand = (min: number, max: number) => (max <= min ? min : min + Math.random() * (max - min))

function pickFormat(): 'pdf' | 'pdfa' {
  if (opts.format === 'random') return Math.random() < 0.5 ? 'pdf' : 'pdfa'
  return opts.format
}

async function fireOne(index: number): Promise<Result> {
  const delay = rand(opts.minDelay, opts.maxDelay)
  if (delay > 0) await sleep(delay)

  const injectedError = Math.random() < opts.errorRate
  const body = injectedError ? brokenBody : validBody
  const format = pickFormat()
  const url = `${opts.target}/pdf?format=${format}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeout)
  const t0 = performance.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ctrl.signal,
    })
    const buf = Buffer.from(await res.arrayBuffer())
    const ms = performance.now() - t0
    const isPdf = buf.subarray(0, 4).toString('latin1') === '%PDF'

    if (opts.outDir && isPdf) {
      writeFileSync(`${opts.outDir}/pdf-${String(index).padStart(5, '0')}-${format}.pdf`, buf)
    }

    let outcome: string
    if (res.ok && isPdf) outcome = 'success'
    else if (res.ok && !isPdf) outcome = 'bad-body'
    else if (res.status === 422) outcome = 'missing-component'
    else if (res.status === 400) outcome = 'invalid-format'
    else outcome = `http-${res.status}`

    // A request we deliberately broke is "expected" to fail; anything else failing is unexpected.
    const ok = injectedError ? !res.ok || !isPdf : res.ok && isPdf
    return { ok, status: res.status, ms, bytes: buf.length, outcome, injectedError }
  } catch (err) {
    const ms = performance.now() - t0
    const aborted = (err as Error).name === 'AbortError'
    return {
      ok: injectedError,
      status: 0,
      ms,
      bytes: 0,
      outcome: aborted ? 'timeout' : 'network-error',
      injectedError,
    }
  } finally {
    clearTimeout(timer)
  }
}

const results: Result[] = []
let dispatched = 0
let stopping = false

async function worker(): Promise<void> {
  while (!stopping) {
    const index = dispatched++
    if (index >= opts.warmup + opts.total) return
    const counted = index >= opts.warmup
    const r = await fireOne(index)
    if (counted) results.push(r)
    process.stdout.write(r.ok ? '.' : r.injectedError ? '×' : '!')
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function summarize(wallMs: number): number {
  const counted = results
  const latencies = counted.map(r => r.ms).sort((a, b) => a - b)
  const unexpected = counted.filter(r => !r.ok).length
  const injected = counted.filter(r => r.injectedError).length
  const bytes = counted.reduce((s, r) => s + r.bytes, 0)

  const byOutcome = new Map<string, number>()
  for (const r of counted) byOutcome.set(r.outcome, (byOutcome.get(r.outcome) ?? 0) + 1)

  console.log('\n\n── stress summary ─────────────────────────────')
  console.log(`target        ${opts.target}`)
  console.log(`requests      ${counted.length} counted (warmup ${opts.warmup}), concurrency ${opts.concurrency}`)
  console.log(`format        ${opts.format}   error-rate ${opts.errorRate}   delay ${opts.minDelay}-${opts.maxDelay}ms`)
  console.log(`wall time     ${(wallMs / 1000).toFixed(2)}s`)
  console.log(`throughput    ${(counted.length / (wallMs / 1000)).toFixed(1)} req/s`)
  console.log(`injected errs ${injected}`)
  console.log(`unexpected    ${unexpected}  (${((unexpected / Math.max(1, counted.length)) * 100).toFixed(1)}%)`)
  console.log(`total bytes   ${(bytes / 1024 / 1024).toFixed(2)} MiB`)
  console.log(
    'latency ms    ' +
      [
        `min ${percentile(latencies, 0).toFixed(0)}`,
        `p50 ${percentile(latencies, 50).toFixed(0)}`,
        `p90 ${percentile(latencies, 90).toFixed(0)}`,
        `p99 ${percentile(latencies, 99).toFixed(0)}`,
        `max ${percentile(latencies, 100).toFixed(0)}`,
      ].join('  '),
  )
  console.log('outcomes')
  for (const [outcome, n] of [...byOutcome.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${outcome.padEnd(18)} ${n}`)
  }
  console.log('───────────────────────────────────────────────')

  return unexpected / Math.max(1, counted.length)
}

process.on('SIGINT', () => {
  console.log('\nStopping…')
  stopping = true
})

const startedAt = performance.now()
const workers = Array.from({ length: Math.max(1, opts.concurrency) }, () => worker())
await Promise.all(workers)
const failRate = summarize(performance.now() - startedAt)

process.exit(failRate > opts.failThreshold ? 1 : 0)
