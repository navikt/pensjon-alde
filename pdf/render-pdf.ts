import { type Browser, chromium, type Page } from 'playwright'
import { AKSEL_FONT_URL_PATTERN, resolveAkselFont } from './fonts.ts'

let browserPromise: Promise<Browser> | null = null

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined
    const launching = chromium
      .launch({
        executablePath,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      })
      .then(browser => {
        browser.on('disconnected', () => {
          if (browserPromise === launching) browserPromise = null
        })
        return browser
      })
      .catch(err => {
        if (browserPromise === launching) browserPromise = null
        throw err
      })
    browserPromise = launching
  }
  return browserPromise
}

async function serveAkselFontsLocally(page: Page): Promise<string[]> {
  const missing: string[] = []
  await page.route(AKSEL_FONT_URL_PATTERN, route => {
    const url = route.request().url()
    const path = resolveAkselFont(url)
    if (!path) {
      missing.push(url)
      return route.abort()
    }
    return route.fulfill({ path, contentType: 'font/woff2' })
  })
  return missing
}

export interface PdfRenderOptions {
  continuous?: boolean
  width?: number
  timeout?: number
}

export async function htmlToPdf(html: string, options: PdfRenderOptions = {}): Promise<Buffer> {
  const { continuous = true, width = 1200, timeout = 30_000 } = options
  const browser = await getBrowser()
  const page = await browser.newPage()
  page.setDefaultTimeout(timeout)
  page.setDefaultNavigationTimeout(timeout)
  try {
    const missingFonts = await serveAkselFontsLocally(page)
    await page.setViewportSize({ width, height: 1200 })
    await page.emulateMedia({ media: 'print' })
    await page.setContent(html, { waitUntil: 'networkidle', timeout })
    await page.evaluate(() => document.fonts.ready)
    if (missingFonts.length > 0) {
      throw new Error(`Mangler lokale Aksel-fonter i pdf/fonts/: ${missingFonts.join(', ')}`)
    }

    if (continuous) {
      const height = await page.evaluate(() => document.documentElement.scrollHeight)
      return await page.pdf({
        printBackground: true,
        width: `${width}px`,
        height: `${height + 2}px`,
        pageRanges: '1',
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      })
    }

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    })
  } finally {
    await page.close()
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise
    await browser.close()
    browserPromise = null
  }
}
