import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import express from 'express'
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client'
import { createServer as createViteServer } from 'vite'
import { collectAppCss } from './collect-css.ts'
import type { PdfInput, renderAttestering as RenderAttestering } from './entry.server.tsx'
import { toPdfA } from './pdfa.ts'
import { closeBrowser, htmlToPdf } from './render-pdf.ts'
import { stubServerModules } from './vite-stub-server.ts'

const require = createRequire(import.meta.url)
const dsCss = readFileSync(require.resolve('@navikt/ds-css'), 'utf-8')
const appDir = fileURLToPath(new URL('../app/', import.meta.url))
const stubsDir = fileURLToPath(new URL('./stubs/', import.meta.url))
const css = `${dsCss}
${collectAppCss(appDir)}`

const vite = await createViteServer({
  configFile: false,
  root: process.cwd(),
  cacheDir: fileURLToPath(new URL('.vite/', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [{ find: /^~\//, replacement: appDir }],
  },
  plugins: [stubServerModules(stubsDir)],
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, hmr: false, allowedHosts: true },
  appType: 'custom',
})

const tracer = trace.getTracer('pensjon-alde-pdf')

const registry = new Registry()
collectDefaultMetrics({ register: registry })

const pdfDuration = new Histogram({
  name: 'pdf_generation_duration_seconds',
  help: 'Time spent generating a PDF, labelled by format and outcome',
  labelNames: ['format', 'outcome'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
})

const app = express()
app.use(vite.middlewares)
app.use(express.json({ limit: '8mb' }))

app.get(['/internal/live', '/internal/ready'], (_req, res) => res.sendStatus(200))

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType)
  res.send(await registry.metrics())
})

function pdfName({ behandling: b }: PdfInput): string {
  return [b.fornavn, b.mellomnavn, b.etternavn].filter(Boolean).join(' ')
}

function pdfTitle(input: PdfInput): string {
  const b = input.behandling
  const navn = pdfName(input)
  const base = b.friendlyName ?? 'Behandling'
  const parts = [navn, b.sakId != null ? `sak ${b.sakId}` : null].filter(Boolean)
  return parts.length > 0 ? `${base} - ${parts.join(', ')}` : base
}

function pdfSubject({ behandling: b }: PdfInput): string {
  return b.friendlyName ?? 'Behandling'
}

app.post('/pdf', async (req, res) => {
  const start = Date.now()
  const endTimer = pdfDuration.startTimer()
  let format = 'unknown'
  console.log(`PDF request received: ${req.method} ${req.originalUrl}`)
  await tracer.startActiveSpan('generate-pdf', async span => {
    try {
      format = String(req.query.format ?? 'pdfa')
        .toLowerCase()
        .replace('-', '')
      span.setAttribute('pdf.format', format)
      if (format !== 'pdf' && format !== 'pdfa') {
        endTimer({ format, outcome: 'invalid_format' })
        span.setAttribute('pdf.outcome', 'invalid_format')
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'invalid format' })
        res.status(400).json({ error: `Ugyldig format: '${req.query.format}'. Bruk 'pdf' eller 'pdfa'.` })
        return
      }

      const { renderAttestering } = (await vite.ssrLoadModule('/pdf/entry.server.tsx')) as {
        renderAttestering: typeof RenderAttestering
      }
      const input = req.body as PdfInput
      const html = renderAttestering(input, css)
      const rendered = await htmlToPdf(html)
      const pdf =
        format === 'pdfa'
          ? await toPdfA(rendered, {
              title: pdfTitle(input),
              subject: pdfSubject(input),
              author: 'Nav - Pensjon Alde',
              lang: 'nb-NO',
            })
          : rendered
      endTimer({ format, outcome: 'success' })
      span.setAttribute('pdf.outcome', 'success')
      span.setAttribute('pdf.bytes', pdf.length)
      span.setStatus({ code: SpanStatusCode.OK })
      console.log(
        `PDF created: format=${format}, title="${pdfTitle(input)}", bytes=${pdf.length}, took=${Date.now() - start}ms`,
      )
      res.type('application/pdf').send(pdf)
    } catch (err) {
      const outcome = (err as Error).name === 'MissingComponentError' ? 'missing_component' : 'error'
      endTimer({ format, outcome })
      span.setAttribute('pdf.outcome', outcome)
      span.recordException(err as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message })
      vite.ssrFixStacktrace(err as Error)
      console.error(err)
      const status = (err as Error).name === 'MissingComponentError' ? 422 : 500
      res.status(status).json({ error: (err as Error).message })
    } finally {
      span.end()
    }
  })
})

const port = Number(process.env.PDF_PORT ?? 8090)
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`PDF service listening at http://0.0.0.0:${port} (POST /pdf)`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await closeBrowser()
    server.close(() => process.exit(0))
  })
}
