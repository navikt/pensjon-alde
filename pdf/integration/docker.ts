import { spawnSync } from 'node:child_process'

export const IMAGE = process.env.PDF_IMAGE ?? 'alde-pdf:integration-test'
export const TOOLS_IMAGE = process.env.PDF_TOOLS_IMAGE ?? 'alde-pdf-tools:integration-test'
export const VERAPDF_IMAGE = process.env.PDF_VERAPDF_IMAGE ?? 'verapdf/cli:latest'
export const VERAPDF_PLATFORM = process.env.PDF_VERAPDF_PLATFORM ?? 'linux/amd64'

const DEFAULT_TIMEOUT_MS = 60_000
export const BUILD_TIMEOUT_MS = 15 * 60_000

interface DockerOptions {
  inherit?: boolean
  timeoutMs?: number
}

export function docker(args: string[], options: DockerOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const result = spawnSync('docker', args, {
    encoding: 'utf-8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
  })
  const timedOut = (result.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT'
  const stderr = timedOut
    ? `docker ${args[0]} ble avbrutt etter ${timeoutMs / 1000} s`
    : (result.stderr?.trim() ?? result.error?.message ?? '')
  return { ok: result.status === 0, stdout: result.stdout?.trim() ?? '', stderr }
}

export function dockerOrThrow(args: string[], options: DockerOptions = {}): string {
  const result = docker(args, options)
  if (!result.ok) throw new Error(`docker ${args.join(' ')} feilet:\n${result.stderr}`)
  return result.stdout
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function ensureDockerDaemon(): void {
  const info = docker(['info'])
  if (info.ok) return
  throw new Error(
    `Docker kjører ikke. Start Docker og prøv igjen.\ndocker info: ${info.stderr || info.stdout || 'fant ikke docker-kommandoen'}`,
  )
}

export async function waitFor(check: () => Promise<boolean> | boolean, timeoutMs: number, what: string) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ready = await Promise.resolve()
      .then(check)
      .catch(() => false)
    if (ready) return
    await sleep(500)
  }
  throw new Error(`${what} ble ikke klar innen ${timeoutMs / 1000} s`)
}

export function runInImage(image: string, dir: string, args: string[], platform?: string) {
  const create = ['create', ...(platform ? ['--platform', platform] : []), image, ...args]
  const id = dockerOrThrow(create)
  try {
    dockerOrThrow(['cp', `${dir}/.`, `${id}:/data`])
    return docker(['start', '-a', id])
  } finally {
    docker(['rm', '-f', id])
  }
}

export function prepareToolImages(repoRoot: string): void {
  dockerOrThrow(
    [
      'build',
      '-q',
      '-f',
      `${repoRoot}pdf/integration/tools.Dockerfile`,
      '-t',
      TOOLS_IMAGE,
      `${repoRoot}pdf/integration`,
    ],
    { timeoutMs: BUILD_TIMEOUT_MS },
  )
  if (!docker(['image', 'inspect', VERAPDF_IMAGE]).ok) {
    dockerOrThrow(['pull', '--platform', VERAPDF_PLATFORM, VERAPDF_IMAGE], {
      inherit: true,
      timeoutMs: BUILD_TIMEOUT_MS,
    })
  }
}
