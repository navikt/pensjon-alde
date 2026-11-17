import { readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import {
  docker,
  dockerOrThrow,
  runInImage,
  TOOLS_IMAGE,
  VERAPDF_IMAGE,
  VERAPDF_PLATFORM,
  waitFor,
} from './integration/docker.ts'

const baseUrl = inject('pdfBaseUrl')
const image = inject('pdfImage')

const payload = readFileSync(new URL('./sample-payload.json', import.meta.url), 'utf-8')
const brokenPayload = readFileSync(new URL('./sample-payload-broken.json', import.meta.url), 'utf-8')
const outDir = inject('pdfOutDir')

async function postPdf(query: string, body: string) {
  const res = await fetch(`${baseUrl}/pdf${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  return { res, bytes: Buffer.from(await res.arrayBuffer()) }
}

function save(name: string, bytes: Buffer): string {
  const path = join(outDir, name)
  writeFileSync(path, bytes)
  return path
}

function expectPdf(bytes: Buffer) {
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
}

function fontsIn(path: string): string {
  const result = runInImage(TOOLS_IMAGE, outDir, ['pdffonts', `/data/${basename(path)}`])
  expect(result.ok, result.stderr).toBe(true)
  return result.stdout
}

describe('helsesjekker', () => {
  it.each(['/internal/live', '/internal/ready', '/ping'])('GET %s svarer 200', async path => {
    const res = await fetch(`${baseUrl}${path}`)
    expect(res.status).toBe(200)
  })

  it('GET /metrics eksponerer PDF-histogrammet', async () => {
    const res = await fetch(`${baseUrl}/metrics`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('pdf_generation_duration_seconds')
  })
})

describe('POST /pdf', () => {
  let pdfaPath: string
  let plainPath: string

  beforeAll(async () => {
    const pdfa = await postPdf('?format=pdfa', payload)
    expect(pdfa.res.status, pdfa.bytes.toString('utf-8', 0, 500)).toBe(200)
    pdfaPath = save('pdfa.pdf', pdfa.bytes)

    const plain = await postPdf('?format=pdf', payload)
    expect(plain.res.status, plain.bytes.toString('utf-8', 0, 500)).toBe(200)
    plainPath = save('plain.pdf', plain.bytes)
  })

  it('format=pdfa gir en PDF', () => {
    expectPdf(readFileSync(pdfaPath))
  })

  it('format=pdf gir en PDF', () => {
    expectPdf(readFileSync(plainPath))
  })

  it.each(['', '?format=pdf-a', '?format=PDFA'])('%s gir PDF/A', async query => {
    const { res, bytes } = await postPdf(query, payload)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
    expectPdf(bytes)
  })

  it('format=pdfa er gyldig PDF/A-2b', () => {
    const result = runInImage(
      VERAPDF_IMAGE,
      outDir,
      ['--flavour', '2b', `/data/${basename(pdfaPath)}`],
      VERAPDF_PLATFORM,
    )
    expect(result.stdout, result.stderr).toContain('isCompliant="true"')
  })

  it('format=pdf har Aksel-fonten Source Sans 3 og ingen fallback-fonter', () => {
    const fonts = fontsIn(plainPath)
    expect(fonts).toMatch(/SourceSans3/i)
    expect(fonts).not.toMatch(/Liberation|Arial|DejaVu/i)
  })

  it('format=pdfa har bare innebygde Type 3-fonter med Unicode-mapping', () => {
    const rows = fontsIn(pdfaPath).trim().split('\n').slice(2)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).toMatch(/Type 3\s+\S+\s+yes\s+\S+\s+yes\s+\d+\s+\d+$/)
      expect(row).not.toMatch(/Liberation|Arial|DejaVu/i)
    }
  })

  it('ukjent format gir 400', async () => {
    const { res, bytes } = await postPdf('?format=docx', payload)
    expect(res.status).toBe(400)
    expect(JSON.parse(bytes.toString('utf-8')).error).toContain('docx')
  })

  it('ukjent handlerName gir 422 uten PDF', async () => {
    const { res, bytes } = await postPdf('', brokenPayload)
    expect(res.status).toBe(422)
    expect(JSON.parse(bytes.toString('utf-8')).error).toContain('ikke-en-ekte-handler')
  })

  it('ugyldig JSON gir 400', async () => {
    const { res } = await postPdf('', '{ikke json')
    expect(res.status).toBe(400)
  })

  it('håndterer parallelle forespørsler', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => postPdf('?format=pdfa', payload)))
    for (const { res, bytes } of results) {
      expect(res.status).toBe(200)
      expectPdf(bytes)
    }
  })
})

describe.runIf(image)('uten nettverkstilgang', () => {
  let container = ''

  const execNode = (script: string, timeoutMs?: number) =>
    docker(['exec', container, 'node', '-e', script], { timeoutMs })

  beforeAll(async () => {
    container = dockerOrThrow(['run', '-d', '--network', 'none', image as string])
    await waitFor(
      () =>
        execNode(
          "fetch('http://127.0.0.1:8090/internal/ready').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))",
          5_000,
        ).ok,
      60_000,
      'PDF-tjenesten uten nettverk',
    )
  })

  afterAll(() => {
    if (container) docker(['rm', '-f', container])
  })

  it('rendrer PDF/A uten utgående kall', () => {
    const result = execNode(`
      const body = require('node:fs').readFileSync('pdf/sample-payload.json')
      fetch('http://127.0.0.1:8090/pdf?format=pdfa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        .then(async r => {
          const b = Buffer.from(await r.arrayBuffer())
          console.log(JSON.stringify({ status: r.status, head: b.subarray(0, 5).toString('latin1'), text: r.ok ? '' : b.toString() }))
        })
    `)
    expect(result.ok, result.stderr).toBe(true)
    const { status, head, text } = JSON.parse(result.stdout)
    expect(status, text).toBe(200)
    expect(head).toBe('%PDF-')
  })
})
