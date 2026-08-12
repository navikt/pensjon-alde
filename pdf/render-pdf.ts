import { type Browser, chromium } from 'playwright'

let browserPromise: Promise<Browser> | null = null

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined
    browserPromise = chromium.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
  }
  return browserPromise
}

export interface PdfRenderOptions {
  continuous?: boolean
  width?: number
}

export async function htmlToPdf(html: string, options: PdfRenderOptions = {}): Promise<Buffer> {
  const { continuous = true, width = 1200 } = options
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setViewportSize({ width, height: 1200 })
    await page.emulateMedia({ media: 'print' })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

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
