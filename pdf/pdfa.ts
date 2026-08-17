import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PDFA_DEF = fileURLToPath(new URL('./PDFA_def.ps', import.meta.url))
const GS_BIN = process.env.GHOSTSCRIPT_BIN || 'gs'

export interface PdfAMetadata {
  title?: string
  subject?: string
  author?: string
  lang?: string
}

// Encode a JS string as a PostScript string literal containing UTF-16BE with a BOM,
// so non-ASCII (æøå) survives into the PDF text string (Title etc.).
const MAX_METADATA_LEN = 512
function psUtf16(value: string): string {
  const text = String(value)
  const len = Math.min(text.length, MAX_METADATA_LEN)
  const out: string[] = ['\\376', '\\377'] // BOM: FE FF
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i)
    out.push(`\\${((code >> 8) & 0xff).toString(8).padStart(3, '0')}`)
    out.push(`\\${(code & 0xff).toString(8).padStart(3, '0')}`)
  }
  return out.join('')
}

// Escape a plain-ASCII PostScript string literal (paths, lang codes).
function psAscii(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

// Locate an sRGB ICC profile inside the container (Ghostscript ships one).
function locateIccProfile(): string {
  if (process.env.PDFA_ICC_PROFILE) return process.env.PDFA_ICC_PROFILE

  const gsRoot = '/usr/share/ghostscript'
  if (existsSync(gsRoot)) {
    for (const version of readdirSync(gsRoot)) {
      const candidate = join(gsRoot, version, 'iccprofiles', 'srgb.icc')
      if (existsSync(candidate)) return candidate
    }
  }
  for (const candidate of ['/usr/share/color/icc/sRGB.icc', '/usr/share/color/icc/colord/sRGB.icc']) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error('Fant ingen sRGB ICC-profil. Sett PDFA_ICC_PROFILE til en .icc-fil.')
}

// Convert a plain PDF buffer to PDF/A-2b via Ghostscript. Ghostscript embeds all
// fonts and attaches the sRGB OutputIntent from PDFA_def.ps. Selection is done by
// the caller (POST /pdf?format=pdfa); this always converts. Optional metadata sets
// the document Title and language.
export async function toPdfA(pdf: Buffer, meta: PdfAMetadata = {}): Promise<Buffer> {
  const icc = locateIccProfile()
  const lang = meta.lang ?? 'nb-NO'
  const docinfo = [
    meta.title ? `/Title (${psUtf16(meta.title)})` : '',
    meta.subject ? `/Subject (${psUtf16(meta.subject)})` : '',
    meta.author ? `/Author (${psUtf16(meta.author)})` : '',
  ].filter(Boolean)
  const setup = [
    `/SRGBICCPath (${psAscii(icc)}) def`,
    docinfo.length > 0 ? `[ ${docinfo.join(' ')} /DOCINFO pdfmark` : '',
    `[{Catalog} <</Lang (${psAscii(lang)})>> /PUT pdfmark`,
  ]
    .filter(Boolean)
    .join('\n')

  const dir = await mkdtemp(join(tmpdir(), 'pdfa-'))
  const input = join(dir, 'in.pdf')
  const output = join(dir, 'out.pdf')
  try {
    await writeFile(input, pdf)
    await runGhostscript([
      '-dPDFA=2',
      '-dBATCH',
      '-dNOPAUSE',
      '-dSAFER',
      '-dPDFACompatibilityPolicy=1',
      '-sColorConversionStrategy=RGB',
      '-sDEVICE=pdfwrite',
      `--permit-file-read=${icc}`,
      `-sOutputFile=${output}`,
      '-c',
      setup,
      '-f',
      PDFA_DEF,
      input,
    ])
    return await readFile(output)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function runGhostscript(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const gs = spawn(GS_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    gs.stdout.on('data', chunk => {
      out += chunk
    })
    gs.stderr.on('data', chunk => {
      out += chunk
    })
    gs.on('error', reject)
    gs.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Ghostscript exited with code ${code}: ${out.trim()}`))
    })
  })
}
