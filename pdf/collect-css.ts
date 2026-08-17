import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function walkCss(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walkCss(full, out)
    } else if (entry.name.endsWith('.css')) {
      out.push(full)
    }
  }
}

export function collectAppCss(appDir: string): string {
  const files: string[] = []
  walkCss(appDir, files)
  return files
    .sort()
    .map(f => readFileSync(f, 'utf-8'))
    .join('\n')
}
