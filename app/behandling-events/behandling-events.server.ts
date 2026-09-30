import { Consumer, MessagesStreamModes, stringDeserializers } from '@platformatic/kafka'

export type BehandlingEvent = { behandlingId: number }
type Listener = (event: BehandlingEvent) => void

type State = { started: boolean; listeners: Map<number, Set<Listener>> }

declare global {
  var __behandlingEvents: State | undefined
}

globalThis.__behandlingEvents ??= { started: false, listeners: new Map() }
const state = globalThis.__behandlingEvents

async function consume() {
  const { KAFKA_BROKERS, KAFKA_CERTIFICATE, KAFKA_PRIVATE_KEY, KAFKA_CA, BEHANDLING_KAFKA_TOPIC, HOSTNAME } =
    process.env
  if (!KAFKA_BROKERS || !BEHANDLING_KAFKA_TOPIC) {
    console.log('Kafka not configured, behandling events disabled')
    return
  }

  const consumer = new Consumer({
    groupId: `pensjon-alde-${HOSTNAME}`,
    clientId: `pensjon-alde-${HOSTNAME}`,
    bootstrapBrokers: KAFKA_BROKERS.split(','),
    deserializers: stringDeserializers,
    tls: { cert: KAFKA_CERTIFICATE, key: KAFKA_PRIVATE_KEY, ca: KAFKA_CA },
  })

  const stream = await consumer.consume({
    topics: [BEHANDLING_KAFKA_TOPIC],
    mode: MessagesStreamModes.LATEST,
    autocommit: false,
  })

  for await (const message of stream) {
    if (!message.value) continue
    const event = JSON.parse(message.value) as BehandlingEvent
    for (const listener of state.listeners.get(event.behandlingId) ?? []) listener(event)
  }
}

export function subscribe(behandlingId: number, listener: Listener): () => void {
  if (!state.started) {
    console.log('Startet å lytte på behandling events: ', behandlingId)
    state.started = true
    consume().catch(error => {
      console.error('Behandling event consumer failed', error)
      state.started = false
    })
  }

  const listeners = state.listeners.get(behandlingId) ?? new Set()
  listeners.add(listener)
  state.listeners.set(behandlingId, listeners)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) state.listeners.delete(behandlingId)
  }
}
