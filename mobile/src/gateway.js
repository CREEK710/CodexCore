import { API_AUTH_TOKEN, API_BASE_URL } from './config.js'

const nodes = [
  {
    id: 'node-atlas',
    name: 'Atlas',
    region: 'us-east',
    status: 'healthy',
    load: 0.64,
  },
  {
    id: 'node-boreal',
    name: 'Boreal',
    region: 'eu-west',
    status: 'degraded',
    load: 0.82,
  },
  {
    id: 'node-cinder',
    name: 'Cinder',
    region: 'ap-south',
    status: 'healthy',
    load: 0.57,
  },
]

const nodeTelemetry = new Map([
  [
    'node-atlas',
    {
      latencyMs: 18,
      throughputRps: 142,
      socketState: 'open',
      lastHeartbeatAt: '2026-03-15T07:20:00Z',
    },
  ],
  [
    'node-boreal',
    {
      latencyMs: 46,
      throughputRps: 97,
      socketState: 'open',
      lastHeartbeatAt: '2026-03-15T07:20:00Z',
    },
  ],
  [
    'node-cinder',
    {
      latencyMs: 24,
      throughputRps: 131,
      socketState: 'open',
      lastHeartbeatAt: '2026-03-15T07:20:00Z',
    },
  ],
])

const vaultArtifacts = [
  {
    id: 'artifact-release-brief',
    name: 'Release Brief',
    type: 'document',
    updatedAt: '2026-03-15T06:40:00Z',
    status: 'synced',
  },
  {
    id: 'artifact-core-bundle',
    name: 'Core Bundle',
    type: 'bundle',
    updatedAt: '2026-03-15T05:55:00Z',
    status: 'encrypted',
  },
  {
    id: 'artifact-handoff-note',
    name: 'Handoff Note',
    type: 'note',
    updatedAt: '2026-03-14T22:10:00Z',
    status: 'reviewed',
  },
]

const studioRuns = new Map([
  [
    'run-seed',
    {
      id: 'run-seed',
      name: 'Seed Run',
      prompt: 'Initialize CodexCore mobile shell.',
      status: 'completed',
      createdAt: '2026-03-15T06:00:00Z',
      logs: [
        {
          id: 'log-seed-1',
          level: 'info',
          message: 'Studio run accepted by gateway.',
          timestamp: '2026-03-15T06:00:03Z',
        },
        {
          id: 'log-seed-2',
          level: 'info',
          message: 'Scaffold plan prepared for mobile shell.',
          timestamp: '2026-03-15T06:00:11Z',
        },
        {
          id: 'log-seed-3',
          level: 'success',
          message: 'Initial run completed successfully.',
          timestamp: '2026-03-15T06:00:22Z',
        },
      ],
    },
  ],
])

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function withSource(payload) {
  return {
    ...payload,
    apiBaseUrl: API_BASE_URL,
    requestHeaders: getApiHeaders(),
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getApiHeaders() {
  return API_AUTH_TOKEN
    ? {
        Authorization: `Bearer ${API_AUTH_TOKEN}`,
      }
    : {}
}

export function hasApiAuthToken() {
  return Boolean(API_AUTH_TOKEN)
}

export async function getNodes() {
  return clone(nodes).map((node) => withSource(node))
}

export async function getVaultArtifacts() {
  return clone(vaultArtifacts).map((artifact) => withSource(artifact))
}

export async function createStudioRun(input = {}) {
  const run = {
    id: `run-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name?.trim() || 'Untitled Run',
    prompt: input.prompt?.trim() || '',
    status: 'queued',
    createdAt: new Date().toISOString(),
    logs: [
      {
        id: `log-${Math.random().toString(36).slice(2, 10)}`,
        level: 'info',
        message: 'Run queued from the mobile shell.',
        timestamp: new Date().toISOString(),
      },
      {
        id: `log-${Math.random().toString(36).slice(2, 10)}`,
        level: 'info',
        message: input.prompt?.trim()
          ? `Prompt captured: "${input.prompt.trim()}"`
          : 'Prompt captured with no additional detail.',
        timestamp: new Date().toISOString(),
      },
      {
        id: `log-${Math.random().toString(36).slice(2, 10)}`,
        level: 'warning',
        message: 'Awaiting worker pickup.',
        timestamp: new Date().toISOString(),
      },
    ],
  }

  studioRuns.set(run.id, run)
  return withSource(clone(run))
}

export async function getStudioRun(runId) {
  const run = studioRuns.get(runId)

  if (!run) {
    throw new Error(`Studio run not found: ${runId}`)
  }

  return withSource(clone(run))
}

export async function listStudioRuns() {
  return clone(
    Array.from(studioRuns.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ),
  ).map((run) => withSource(run))
}

export function subscribeNodeTelemetry(listener) {
  listener(clone(Array.from(nodeTelemetry.entries())))

  const intervalId = setInterval(() => {
    for (const [nodeId, snapshot] of nodeTelemetry.entries()) {
      const latencyDelta = Math.floor(Math.random() * 7) - 3
      const throughputDelta = Math.floor(Math.random() * 17) - 8

      snapshot.latencyMs = Math.max(10, snapshot.latencyMs + latencyDelta)
      snapshot.throughputRps = Math.max(60, snapshot.throughputRps + throughputDelta)
      snapshot.lastHeartbeatAt = new Date().toISOString()
      snapshot.socketState = 'open'
      nodeTelemetry.set(nodeId, snapshot)
    }

    listener(clone(Array.from(nodeTelemetry.entries())))
  }, 2500)

  return () => {
    clearInterval(intervalId)
  }
}
