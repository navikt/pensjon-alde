import { mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TestProject } from 'vitest/node'
import {
  BUILD_TIMEOUT_MS,
  docker,
  dockerOrThrow,
  ensureDockerDaemon,
  IMAGE,
  prepareToolImages,
  waitFor,
} from './docker.ts'

declare module 'vitest' {
  export interface ProvidedContext {
    pdfBaseUrl: string
    pdfImage: string | null
    pdfOutDir: string
  }
}

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const outDir = resolve(process.env.PDF_OUT_DIR ?? join(tmpdir(), 'alde-pdf-integration'))

async function isReady(baseUrl: string): Promise<boolean> {
  const res = await fetch(`${baseUrl}/internal/ready`, { signal: AbortSignal.timeout(2000) })
  return res.ok
}

function printArtifacts(): void {
  const files = readdirSync(outDir).map(name => `  ${join(outDir, name)}`)
  if (files.length > 0) console.log(`\nPDF-artefakter:\n${files.join('\n')}\n`)
}

async function startContainer(): Promise<{ baseUrl: string; stop: () => void }> {
  if (process.env.PDF_SKIP_BUILD !== '1') {
    const pull = process.env.PDF_PULL === '1' ? ['--pull'] : []
    dockerOrThrow(['build', ...pull, '-f', `${repoRoot}pdf/Dockerfile`, '-t', IMAGE, repoRoot], {
      inherit: true,
      timeoutMs: BUILD_TIMEOUT_MS,
    })
  }

  const container = dockerOrThrow(['run', '-d', '-p', '127.0.0.1::8090', IMAGE])
  const stop = () => {
    docker(['rm', '-f', container])
  }

  try {
    const port = dockerOrThrow(['port', container, '8090/tcp']).split('\n')[0].split(':').pop()
    const baseUrl = `http://127.0.0.1:${port}`
    await waitFor(() => isReady(baseUrl), 60_000, `PDF-tjenesten (${baseUrl})`)
    return { baseUrl, stop }
  } catch (err) {
    const logs = docker(['logs', container])
    console.error(`${logs.stdout}\n${logs.stderr}`)
    stop()
    throw err
  }
}

async function prepare(project: TestProject) {
  mkdirSync(outDir, { recursive: true })
  project.provide('pdfOutDir', outDir)

  ensureDockerDaemon()
  prepareToolImages(repoRoot)

  const external = process.env.PDF_BASE_URL
  if (external) {
    await waitFor(() => isReady(external), 10_000, external)
    project.provide('pdfBaseUrl', external)
    project.provide('pdfImage', null)
    return printArtifacts
  }

  const { baseUrl, stop } = await startContainer()
  project.provide('pdfBaseUrl', baseUrl)
  project.provide('pdfImage', IMAGE)

  return () => {
    stop()
    printArtifacts()
  }
}

export default async function setup(project: TestProject) {
  try {
    return await prepare(project)
  } catch (err) {
    const message = `PDF-integrasjonstesten kunne ikke starte: ${err instanceof Error ? err.message : String(err)}`
    console.error(`\n${message}\n`)
    const error = new Error(message)
    error.stack = message
    throw error
  }
}
