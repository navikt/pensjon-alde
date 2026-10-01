import { randomUUID } from 'node:crypto'
import { Consumer, MessagesStreamModes, stringDeserializers } from '@platformatic/kafka'

export type BehandlingEvent = { behandlingId: number }
type Subscription = { onEvent: (event: BehandlingEvent) => void; onClose: () => void }
type Status = 'disconnected' | 'connecting' | 'connected'

type State = {
  status: Status
  connecting: Promise<void> | undefined
  instanceId: string
  subscriptions: Map<number, Set<Subscription>>
}

declare global {
  var __behandlingEvents: State | undefined
}

globalThis.__behandlingEvents ??= {
  status: 'disconnected',
  connecting: undefined,
  instanceId: process.env.HOSTNAME ?? randomUUID(),
  subscriptions: new Map(),
}
const state = globalThis.__behandlingEvents

const log = (message: string, ...args: unknown[]) => console.log(`[behandling-events] ${message}`, ...args)

export function connections() {
  const perBehandling = Object.fromEntries(
    [...state.subscriptions].map(([behandlingId, subscriptions]) => [behandlingId, subscriptions.size]),
  )
  const total = Object.values(perBehandling).reduce((sum, count) => sum + count, 0)
  return { status: state.status, total, perBehandling }
}

function parseEvent(value: string): BehandlingEvent | undefined {
  try {
    const event = JSON.parse(value) as BehandlingEvent
    return Number.isSafeInteger(event?.behandlingId) ? event : undefined
  } catch {
    return undefined
  }
}

function dispatch(event: BehandlingEvent) {
  for (const subscription of state.subscriptions.get(event.behandlingId) ?? []) {
    try {
      subscription.onEvent(event)
    } catch (error) {
      console.error('[behandling-events] Subscriber failed', { behandlingId: event.behandlingId }, error)
    }
  }
}

function closeAllSubscriptions() {
  const subscriptions = [...state.subscriptions.values()].flatMap(set => [...set])
  state.subscriptions.clear()
  log('Closing all subscriptions', { count: subscriptions.length })
  for (const subscription of subscriptions) {
    try {
      subscription.onClose()
    } catch (error) {
      console.error('[behandling-events] Failed to close subscription', error)
    }
  }
}

async function startConsumer() {
  const { KAFKA_BROKERS, KAFKA_CERTIFICATE, KAFKA_PRIVATE_KEY, KAFKA_CA, BEHANDLING_KAFKA_TOPIC } = process.env
  if (!KAFKA_BROKERS || !BEHANDLING_KAFKA_TOPIC) {
    throw new Error(
      `Kafka not configured (hasBrokers=${Boolean(KAFKA_BROKERS)}, hasTopic=${Boolean(BEHANDLING_KAFKA_TOPIC)})`,
    )
  }

  const groupId = `pensjon-alde-${state.instanceId}`
  const brokers = KAFKA_BROKERS.split(',')

  log('Connecting to Kafka', {
    brokers,
    topic: BEHANDLING_KAFKA_TOPIC,
    groupId,
    hasCertificate: Boolean(KAFKA_CERTIFICATE),
    hasPrivateKey: Boolean(KAFKA_PRIVATE_KEY),
    hasCa: Boolean(KAFKA_CA),
  })

  state.status = 'connecting'

  const consumer = new Consumer({
    groupId,
    clientId: groupId,
    bootstrapBrokers: brokers,
    deserializers: stringDeserializers,
    tls: { cert: KAFKA_CERTIFICATE, key: KAFKA_PRIVATE_KEY, ca: KAFKA_CA },
  })

  let stream: Awaited<ReturnType<typeof consumer.consume>>
  try {
    stream = await consumer.consume({
      topics: [BEHANDLING_KAFKA_TOPIC],
      mode: MessagesStreamModes.LATEST,
      autocommit: false,
    })
  } catch (error) {
    state.status = 'disconnected'
    await consumer.close().catch(() => {})
    throw error
  }

  state.status = 'connected'
  log('Connected to Kafka, consuming from latest offset', { topic: BEHANDLING_KAFKA_TOPIC, groupId })

  void (async () => {
    try {
      for await (const message of stream) {
        const position = { partition: message.partition, offset: String(message.offset), key: message.key }

        if (!message.value) {
          log('Skipping message without value', position)
          continue
        }

        const event = parseEvent(message.value)
        if (!event) {
          log('Skipping unparseable message', { ...position, value: message.value })
          continue
        }

        log('Received message', {
          ...position,
          behandlingId: event.behandlingId,
          subscribers: state.subscriptions.get(event.behandlingId)?.size ?? 0,
        })
        dispatch(event)
      }
      log('Kafka stream ended')
    } catch (error) {
      console.error('[behandling-events] Consumer failed', error)
    } finally {
      state.status = 'disconnected'
      await consumer.close().catch(() => {})
      closeAllSubscriptions()
    }
  })()
}

export function connect(timeoutMs = 10_000): Promise<void> {
  if (state.status === 'connected') return Promise.resolve()

  state.connecting ??= startConsumer().finally(() => {
    state.connecting = undefined
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out connecting to Kafka after ${timeoutMs} ms`)), timeoutMs)
  })

  return Promise.race([state.connecting, timeout]).finally(() => clearTimeout(timer))
}

export function subscribe(behandlingId: number, subscription: Subscription): () => void {
  const subscriptions = state.subscriptions.get(behandlingId) ?? new Set()
  subscriptions.add(subscription)
  state.subscriptions.set(behandlingId, subscriptions)

  return () => {
    subscriptions.delete(subscription)
    if (subscriptions.size === 0 && state.subscriptions.get(behandlingId) === subscriptions) {
      state.subscriptions.delete(behandlingId)
    }
  }
}
