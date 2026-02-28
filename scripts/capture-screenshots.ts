/**
 * Automatisk screenshot-generering for pensjon-alde.
 *
 * Navigerer til sider i mock-appen og tar skjermbilder som viser
 * hele den nestede rute-strukturen (header, stepper, innhold).
 *
 * Bruk:
 *   npx tsx scripts/capture-screenshots.ts [--docs] [--url URL] [--clean]
 *
 * Forutsetter at mock-serveren kjører: npm run dev:mock
 */
import { existsSync, copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { glob } from 'glob'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

const OUTPUT_DIR = join(PROJECT_ROOT, 'screenshots')
const MAPPING_FILE = join(__dirname, 'screenshot-mapping.json')

const VIEWPORT = { width: 1440, height: 900 }

// Cookie som aktiverer stepper og metadata i behandlingsvisningen
const SETTINGS_COOKIE = {
  name: 'alde-settings',
  value: JSON.stringify({ showStepper: true, showMetadata: true }),
  domain: 'localhost',
  path: '/',
}

interface ScreenshotPage {
  /** Unik id for siden */
  id: string
  /** URL-sti (relativ til baseUrl) */
  path: string
  /** Filnavn for skjermbildet */
  filename: string
  /** Beskrivelse av hva skjermbildet viser */
  description: string
  /** Valgfri ventetid etter navigering (ms) */
  waitMs?: number
}

interface ScreenshotMapping {
  targetDir: string
  pages: ScreenshotPage[]
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    docs: args.includes('--docs'),
    clean: args.includes('--clean'),
    url: args.find((a, i) => args[i - 1] === '--url') ?? 'http://localhost:3001',
  }
}

/**
 * Oppdag behandling-/aktivitet-ruter dynamisk fra mappestrukturen,
 * på samme måte som app/routes.ts gjør det.
 */
function discoverRoutes(): Array<{ behandling: string; aktivitet: string }> {
  const behandlingerPath = join(PROJECT_ROOT, 'app/behandlinger')
  const routes: Array<{ behandling: string; aktivitet: string }> = []

  const behandlingFolders = glob.sync('*/', { cwd: behandlingerPath })
  for (const bf of behandlingFolders) {
    const behandling = bf.replace('/', '')
    const aktivitetFolders = glob.sync('*/', { cwd: join(behandlingerPath, behandling) })
    for (const af of aktivitetFolders) {
      const aktivitet = af.replace('/', '')
      const hasIndex = existsSync(join(behandlingerPath, behandling, aktivitet, 'index.tsx'))
      if (hasIndex) {
        routes.push({ behandling, aktivitet })
      }
    }
  }
  return routes
}

function loadMapping(): ScreenshotMapping {
  if (!existsSync(MAPPING_FILE)) {
    console.error(`Mapping-fil ikke funnet: ${MAPPING_FILE}`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'))
}

async function capturePages(
  page: import('playwright').Page,
  pages: ScreenshotPage[],
  baseUrl: string,
): Promise<number> {
  let captured = 0
  for (const p of pages) {
    const url = `${baseUrl}${p.path}`
    const filepath = join(OUTPUT_DIR, p.filename)

    try {
      await page.goto(url, { waitUntil: 'networkidle' })
      if (p.waitMs) {
        await page.waitForTimeout(p.waitMs)
      }
      // Skjul debug-knapp og Aksel-widget i skjermbildene
      await page.addStyleTag({
        content: `
          button[aria-label="Debug"],
          #__alde-debug { display: none !important; }
        `,
      })
      await page.evaluate(() => {
        for (const btn of document.querySelectorAll('button')) {
          if (btn.textContent?.trim() === 'Debug') {
            btn.style.display = 'none'
          }
        }
        // Skjul Aksel feedback-widgeten (sirkulær knapp nederst til høyre)
        const feedbackWidget = document.querySelector('[id^="rdt-"]') as HTMLElement
        if (feedbackWidget) feedbackWidget.style.display = 'none'
      })
      await page.screenshot({ path: filepath, fullPage: true })
      captured++
      console.log(`  ✓ ${p.filename} — ${p.description}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ukjent feil'
      console.error(`  ✗ ${p.filename}: ${message}`)
    }
  }
  return captured
}

async function runDocsMode(url: string) {
  const mapping = loadMapping()
  const targetDir = resolve(__dirname, '..', mapping.targetDir)

  if (!existsSync(targetDir)) {
    console.error(`Målmappe finnes ikke: ${targetDir}`)
    console.error('Er pensjon-dokumentasjon sjekket ut ved siden av pensjon-alde?')
    process.exit(1)
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log(`Genererer ${mapping.pages.length} docs-skjermbilder...`)

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT })
  await context.addCookies([SETTINGS_COOKIE])
  const page = await context.newPage()

  const captured = await capturePages(page, mapping.pages, url)
  await browser.close()

  // Kopier til dokumentasjon
  let copied = 0
  for (const p of mapping.pages) {
    const src = join(OUTPUT_DIR, p.filename)
    const dest = join(targetDir, p.filename)
    if (existsSync(src)) {
      copyFileSync(src, dest)
      copied++
    }
  }

  console.log(`\nFerdig! ${captured}/${mapping.pages.length} screenshots generert`)
  console.log(`${copied} bilder kopiert til ${targetDir}`)
}

async function runStandardMode(url: string, clean: boolean) {
  if (clean && existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true })
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })

  // Bygg sider fra oppdagede ruter
  const discoveredRoutes = discoverRoutes()
  console.log(`Oppdaget ${discoveredRoutes.length} aktivitet-ruter dynamisk`)

  // Faste sider som ikke krever dynamisk oppdaging
  const pages: ScreenshotPage[] = [
    {
      id: 'home',
      path: '/',
      filename: 'home.png',
      description: 'Hjemmeside',
    },
    {
      id: 'attestering',
      path: '/behandling/6359437',
      filename: 'attestering.png',
      description: 'Attestering (omdirigeres automatisk)',
      waitMs: 500,
    },
    {
      id: 'vurder-samboer',
      path: '/behandling/1000001',
      filename: 'vurder-samboer.png',
      description: 'Vurder samboer (omdirigeres til aktiv aktivitet)',
      waitMs: 500,
    },
    {
      id: 'kontroller-inntekt',
      path: '/behandling/1000002',
      filename: 'kontroller-inntekt.png',
      description: 'Kontroller inntekt EPS (omdirigeres til aktiv aktivitet)',
      waitMs: 500,
    },
  ]

  console.log(`Tar ${pages.length} skjermbilder...`)

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT })
  await context.addCookies([SETTINGS_COOKIE])
  const page = await context.newPage()

  const captured = await capturePages(page, pages, url)
  await browser.close()
  console.log(`\nFerdig! ${captured}/${pages.length} screenshots lagret i ${OUTPUT_DIR}`)
}

async function main() {
  const { docs, url, clean } = parseArgs()

  if (docs) {
    await runDocsMode(url)
  } else {
    await runStandardMode(url, clean)
  }
}

main()
