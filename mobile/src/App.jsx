import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  createStudioRun,
  getNodes,
  getApiBaseUrl,
  hasApiAuthToken,
  listStudioRuns,
  getStudioRun,
  getVaultArtifacts,
  subscribeNodeTelemetry,
} from './gateway.js'
import './App.css'

const screens = [
  {
    path: '/home',
    name: 'Home',
    eyebrow: 'CodexCore',
    title: 'Control the core from one mobile shell.',
    description:
      'Watch the system state, check what needs attention, and move between the parts of CodexCore without desktop-heavy UI.',
    cards: [
      { label: 'Active flows', value: '12', detail: '4 require review' },
      { label: 'Runtime health', value: 'Stable', detail: 'No critical alerts' },
      { label: 'Pending tasks', value: '7', detail: '2 ready to ship' },
    ],
  },
  {
    path: '/studio',
    name: 'Studio',
    eyebrow: 'Build',
    title: 'Shape prompts, runs, and releases with less friction.',
    description:
      'Studio keeps creation focused: recent sessions, prepared launch states, and a fast handoff into deeper workflows when needed.',
    cards: [
      { label: 'Draft sessions', value: '5', detail: '2 edited today' },
      { label: 'Launch presets', value: '9', detail: 'Touch-ready actions' },
      { label: 'Queued exports', value: '3', detail: 'ETA 14 min' },
    ],
  },
  {
    path: '/vault',
    name: 'Vault',
    eyebrow: 'Store',
    title: 'Keep critical artifacts close and protected.',
    description:
      'Vault surfaces the latest documents, build bundles, and handoff notes in a compact view tuned for quick checks on mobile.',
    cards: [
      { label: 'Encrypted packs', value: '24', detail: '1 updated recently' },
      { label: 'Recent handoffs', value: '8', detail: 'All synced' },
      { label: 'Retention window', value: '30d', detail: 'Policy enforced' },
    ],
  },
  {
    path: '/nodes',
    name: 'Nodes',
    eyebrow: 'Network',
    title: 'Track the graph and intervene only where it matters.',
    description:
      'Nodes gives a simple read on cluster status, capacity, and the few connections that need operator attention right now.',
    cards: [
      { label: 'Healthy nodes', value: '31', detail: '2 degraded' },
      { label: 'Capacity', value: '78%', detail: 'Within threshold' },
      { label: 'Linked regions', value: '6', detail: '1 path unstable' },
    ],
  },
]

const apiBaseUrl = getApiBaseUrl()
const apiAuthEnabled = hasApiAuthToken()

function normalizeAlertState(value) {
  if (value === 'green' || value === 'yellow' || value === 'red') {
    return value
  }

  return 'yellow'
}

function getNodeAlertState(node, snapshot) {
  if (!snapshot) {
    return 'yellow'
  }

  if (node.status !== 'healthy' && (node.load >= 0.88 || snapshot.latencyMs >= 60)) {
    return 'red'
  }

  if (node.status !== 'healthy' || node.load >= 0.75 || snapshot.latencyMs >= 38) {
    return 'yellow'
  }

  return 'green'
}

function getRunAlertState(status) {
  switch (status) {
    case 'completed':
    case 'success':
    case 'ready':
    case 'synced':
    case 'reviewed':
      return 'green'
    case 'error':
    case 'failed':
      return 'red'
    default:
      return 'yellow'
  }
}

function getLogAlertState(level) {
  switch (level) {
    case 'error':
    case 'critical':
      return 'red'
    case 'warning':
      return 'yellow'
    default:
      return 'green'
  }
}

function getArtifactAlertState(status) {
  switch (status) {
    case 'synced':
    case 'reviewed':
      return 'green'
    case 'expired':
    case 'failed':
      return 'red'
    default:
      return 'yellow'
  }
}

function SignalBadge({ label, state }) {
  const normalizedState = normalizeAlertState(state)

  return (
    <span className={`signal-badge signal-${normalizedState}`}>
      <span className="signal-dot" aria-hidden="true" />
      {label}
    </span>
  )
}

function HandoffBridge({ label, state }) {
  const normalizedState = normalizeAlertState(state)

  return (
    <div className={`handoff-shell handoff-shell-${normalizedState}`} aria-hidden="true">
      <div className="handoff-bridge">
        <span className="handoff-bridge-line" />
        <span className="handoff-bridge-pulse" />
      </div>
      <p className="handoff-copy">{label}</p>
    </div>
  )
}

function CodexCoreSymbol() {
  return (
    <div className="codex-symbol-saver" aria-hidden="true">
      <div className="codex-symbol codex-symbol-ball" />
      <div className="codex-symbol codex-symbol-square" />
      <div className="codex-symbol codex-symbol-atom">
        <span className="codex-atom-core" />
        <span className="codex-atom-ring codex-atom-ring-a" />
        <span className="codex-atom-ring codex-atom-ring-b" />
        <span className="codex-atom-ring codex-atom-ring-c" />
      </div>
    </div>
  )
}

function formatLoad(load) {
  return `${Math.round(load * 100)}%`
}

function getNodeStats(nodes) {
  const healthyCount = nodes.filter((node) => node.status === 'healthy').length
  const degradedCount = nodes.filter((node) => node.status !== 'healthy').length
  const averageLoad =
    nodes.length === 0
      ? 0
      : Math.round(
          (nodes.reduce((total, node) => total + node.load, 0) / nodes.length) *
            100,
        )

  return {
    healthyCount,
    degradedCount,
    averageLoad,
  }
}

function NodeFeed() {
  const [nodes, setNodes] = useState([])
  const [telemetry, setTelemetry] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadNodes() {
      try {
        const nextNodes = await getNodes()

        if (!active) {
          return
        }

        setNodes(nextNodes)
        setStatus('ready')
      } catch (err) {
        if (!active) {
          return
        }

        setError(err instanceof Error ? err.message : 'Failed to load nodes.')
        setStatus('error')
      }
    }

    loadNodes()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeNodeTelemetry((entries) => {
      const nextTelemetry = Object.fromEntries(entries)
      setTelemetry(nextTelemetry)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (status === 'loading') {
    return <p className="status-copy">Loading nodes...</p>
  }

  if (status === 'error') {
    return <p className="status-copy">{error}</p>
  }

  const stats = getNodeStats(nodes)
  const nodeSignals = nodes.map((node) => ({
    node,
    telemetry: telemetry[node.id],
    alertState: getNodeAlertState(node, telemetry[node.id]),
  }))

  return (
    <>
      <section className="action-panel panel-sheen">
        <div>
          <p className="eyebrow">Signal threads</p>
          <h2>Live node bridge</h2>
          <p className="panel-copy">
            Connection threads stay constrained to green, yellow, and red.
          </p>
        </div>
        <section className="signal-network" aria-label="Node connection signals">
          {nodeSignals.map(({ node, telemetry: snapshot, alertState }, index) => (
            <article
              key={node.id}
              className={`signal-node signal-node-${alertState}`}
              style={{ '--signal-index': index }}
            >
              <div className="signal-node-rail" aria-hidden="true">
                <span className={`signal-thread signal-thread-${alertState}`} />
              </div>
              <div className="signal-node-copy">
                <p className="card-label">
                  {node.region} · {snapshot?.socketState ?? 'pending'}
                </p>
                <strong className="explorer-title">{node.name}</strong>
              </div>
              <SignalBadge label={alertState} state={alertState} />
            </article>
          ))}
        </section>
      </section>

      <section className="status-panel">
        <article className="status-metric">
          <p className="card-label">Healthy</p>
          <strong className="card-value">{stats.healthyCount}</strong>
        </article>
        <article className="status-metric">
          <p className="card-label">Degraded</p>
          <strong className="card-value">{stats.degradedCount}</strong>
        </article>
        <article className="status-metric">
          <p className="card-label">Average load</p>
          <strong className="card-value">{stats.averageLoad}%</strong>
        </article>
      </section>

      <section className="stack">
        {nodeSignals.map(({ node, telemetry: snapshot, alertState }) => (
          <article className={`info-card node-card node-card-${alertState}`} key={node.id}>
            <div>
              <div className="card-meta-row">
                <p className="card-label">
                  {node.region} · {node.status}
                </p>
                <SignalBadge label={alertState} state={alertState} />
              </div>
              <strong className="card-value">{node.name}</strong>
            </div>
            <div className="telemetry-block">
              <p className="card-detail">Load {formatLoad(node.load)}</p>
              <p className="telemetry-copy">
                WS {snapshot?.latencyMs ?? '--'}ms · {snapshot?.throughputRps ?? '--'} rps
              </p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

function VaultFeed() {
  const [artifacts, setArtifacts] = useState([])
  const [selectedArtifactId, setSelectedArtifactId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadArtifacts() {
      try {
        const nextArtifacts = await getVaultArtifacts()

        if (!active) {
          return
        }

        setArtifacts(nextArtifacts)
        setSelectedArtifactId(nextArtifacts[0]?.id || '')
        setStatus('ready')
      } catch (err) {
        if (!active) {
          return
        }

        setError(
          err instanceof Error ? err.message : 'Failed to load vault artifacts.',
        )
        setStatus('error')
      }
    }

    loadArtifacts()

    return () => {
      active = false
    }
  }, [])

  if (status === 'loading') {
    return <p className="status-copy">Loading vault artifacts...</p>
  }

  if (status === 'error') {
    return <p className="status-copy">{error}</p>
  }

  const filteredArtifacts = artifacts.filter((artifact) => {
    const haystack =
      `${artifact.name} ${artifact.type} ${artifact.status} ${artifact.id}`.toLowerCase()
    return haystack.includes(searchTerm.trim().toLowerCase())
  })

  const selectedArtifact =
    filteredArtifacts.find((artifact) => artifact.id === selectedArtifactId) ||
    filteredArtifacts[0]
  const selectedArtifactAlertState = selectedArtifact
    ? getArtifactAlertState(selectedArtifact.status)
    : 'yellow'

  return (
    <>
      <section className="action-panel">
        <div>
          <p className="eyebrow">Artifact search</p>
          <h2>Find stored items fast</h2>
          <p className="panel-copy">
            Filter by name, type, status, or artifact ID.
          </p>
        </div>
        <label className="composer-label" htmlFor="artifact-search">
          Search
        </label>
        <input
          id="artifact-search"
          className="composer-input"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search artifacts"
        />
      </section>

      <section className="explorer-list">
        {filteredArtifacts.map((artifact) => (
          <button
            key={artifact.id}
            type="button"
            className={
              artifact.id === selectedArtifact?.id
                ? 'explorer-item explorer-item-active panel-sheen'
                : 'explorer-item'
            }
            onClick={() => setSelectedArtifactId(artifact.id)}
          >
            <span>
              <span className="card-label">
                {artifact.type} · {artifact.status}
              </span>
              <strong className="explorer-title">{artifact.name}</strong>
            </span>
            <span className="explorer-item-meta">
              <SignalBadge
                label={getArtifactAlertState(artifact.status)}
                state={getArtifactAlertState(artifact.status)}
              />
              <span className="card-detail">{artifact.updatedAt.slice(0, 10)}</span>
            </span>
          </button>
        ))}
      </section>

      {filteredArtifacts.length === 0 && (
        <p className="status-copy">No artifacts match that search.</p>
      )}

      {selectedArtifact && (
        <section className="action-panel panel-sheen">
          <div>
            <p className="eyebrow">Artifact explorer</p>
            <h2>{selectedArtifact.name}</h2>
            <p className="panel-copy">
              {selectedArtifact.type} artifact is currently {selectedArtifact.status}.
            </p>
          </div>
          <HandoffBridge
            label="Run outputs cross the bridge into typed vault artifacts."
            state={selectedArtifactAlertState}
          />
          <section className="artifact-grid">
            <article className="artifact-detail">
              <p className="card-label">Artifact ID</p>
              <strong className="artifact-detail-value">
                {selectedArtifact.id}
              </strong>
            </article>
            <article className="artifact-detail">
              <p className="card-label">Updated</p>
              <strong className="artifact-detail-value">
                {selectedArtifact.updatedAt}
              </strong>
            </article>
            <article className="artifact-detail">
              <p className="card-label">State</p>
              <strong className="artifact-detail-value">
                {selectedArtifact.status}
              </strong>
            </article>
          </section>
        </section>
      )}
    </>
  )
}

function StudioComposer() {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Use a short run prompt to queue a studio task.')
  const [activeRunId, setActiveRunId] = useState('run-seed')
  const composerAlertState = getRunAlertState(status)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!prompt.trim()) {
      setStatus('error')
      setMessage('Enter a prompt before creating a run.')
      return
    }

    setStatus('submitting')
    setMessage('Creating studio run...')

    try {
      const run = await createStudioRun({
        name: 'Mobile Studio Run',
        prompt,
      })

      setPrompt('')
      setActiveRunId(run.id)
      setStatus('success')
      setMessage(`Queued ${run.id} for "${run.prompt}"`)
    } catch (err) {
      setStatus('error')
      setMessage(
        err instanceof Error ? err.message : 'Failed to create studio run.',
      )
    }
  }

  return (
    <>
      <section className="action-panel panel-sheen">
        <div>
          <p className="eyebrow">Run prompt</p>
          <h2>Queue a studio run</h2>
          <p className="panel-copy">{message}</p>
        </div>
        <SignalBadge label={composerAlertState} state={composerAlertState} />

        <form className="composer-form" onSubmit={handleSubmit}>
          <label className="composer-label" htmlFor="studio-prompt">
            Prompt
          </label>
          <textarea
            id="studio-prompt"
            className="composer-input"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the run you want CodexCore to prepare."
            rows="4"
          />
          <button
            type="submit"
            className="primary-action"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Creating...' : 'Create run'}
          </button>
        </form>
      </section>

      <StudioRunLogViewer runId={activeRunId} />
      <StudioRunHistory activeRunId={activeRunId} />
    </>
  )
}

function StudioRunHistory({ activeRunId }) {
  const [runs, setRuns] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadRuns() {
      try {
        const nextRuns = await listStudioRuns()

        if (!active) {
          return
        }

        setRuns(nextRuns)
        setStatus('ready')
      } catch (err) {
        if (!active) {
          return
        }

        setError(
          err instanceof Error ? err.message : 'Failed to load run history.',
        )
        setStatus('error')
      }
    }

    loadRuns()

    return () => {
      active = false
    }
  }, [activeRunId])

  return (
    <section className="action-panel">
      <div>
        <p className="eyebrow">Run history</p>
        <h2>Timeline</h2>
        <p className="panel-copy">
          Review recent studio runs in chronological order.
        </p>
      </div>

      {status === 'loading' && <p className="status-copy">Loading run history...</p>}
      {status === 'error' && <p className="status-copy">{error}</p>}

      {status === 'ready' && (
        <section className="timeline">
          {runs.map((run) => (
            <article
              key={run.id}
              className={
                run.id === activeRunId
                  ? 'timeline-item timeline-item-active panel-sheen'
                  : 'timeline-item'
              }
            >
              <div className="card-meta-row">
                <p className="card-label">
                  {run.createdAt.slice(0, 16).replace('T', ' ')}
                </p>
                <SignalBadge
                  label={getRunAlertState(run.status)}
                  state={getRunAlertState(run.status)}
                />
              </div>
              <strong className="explorer-title">{run.name}</strong>
              <p className="card-detail">{run.status}</p>
            </article>
          ))}
        </section>
      )}
    </section>
  )
}

function StudioRunLogViewer({ runId }) {
  const [run, setRun] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const runAlertState =
    status === 'error'
      ? 'red'
      : status === 'loading'
        ? 'yellow'
        : getRunAlertState(run?.status)

  useEffect(() => {
    let active = true

    async function loadRun() {
      setStatus('loading')
      setError('')

      try {
        const nextRun = await getStudioRun(runId)

        if (!active) {
          return
        }

        setRun(nextRun)
        setStatus('ready')
      } catch (err) {
        if (!active) {
          return
        }

        setRun(null)
        setError(
          err instanceof Error ? err.message : 'Failed to load studio run.',
        )
        setStatus('error')
      }
    }

    loadRun()

    return () => {
      active = false
    }
  }, [runId])

  return (
    <section className="action-panel panel-sheen">
      <div>
        <p className="eyebrow">Run log</p>
        <h2>Viewer</h2>
        <p className="panel-copy">
          {status === 'ready' && run
            ? `Showing ${run.logs.length} entries for ${run.id}.`
            : 'Inspect the current studio run from the mobile shell.'}
        </p>
      </div>

      {status === 'loading' && <p className="status-copy">Loading run log...</p>}
      {status === 'error' && <p className="status-copy">{error}</p>}

      {status === 'ready' && run && (
        <>
          <article className="run-summary">
            <div className="card-meta-row">
              <p className="card-label">
                {run.status} · {run.createdAt.slice(0, 16).replace('T', ' ')}
              </p>
              <SignalBadge label={runAlertState} state={runAlertState} />
            </div>
            <strong className="explorer-title">{run.prompt || run.name}</strong>
          </article>
          <HandoffBridge
            label="Live handoff keeps run state in motion toward vault-ready artifacts."
            state={runAlertState}
          />
          <section className="log-list">
            {run.logs.map((entry) => (
              <article
                className={`log-entry log-entry-${getLogAlertState(entry.level)}`}
                key={entry.id}
              >
                <div className="log-header">
                  <p className="log-level">
                    <SignalBadge
                      label={getLogAlertState(entry.level)}
                      state={getLogAlertState(entry.level)}
                    />
                  </p>
                  <p className="card-detail">
                    {entry.timestamp.slice(11, 19)}
                  </p>
                </div>
                <p className="log-message">{entry.message}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  )
}

function Screen({ screen }) {
  const isNodesScreen = screen.path === '/nodes'
  const isVaultScreen = screen.path === '/vault'
  const isStudioScreen = screen.path === '/studio'

  return (
    <section className="screen">
      <header className="hero-panel panel-sheen">
        <div className="hero-header">
          <div>
            <p className="eyebrow">{screen.eyebrow}</p>
            <h1>{screen.title}</h1>
            <p className="hero-copy">{screen.description}</p>
            <p className="api-copy">API {apiBaseUrl}</p>
            <p className="api-copy">
              Auth {apiAuthEnabled ? 'Bearer token configured' : 'No token configured'}
            </p>
          </div>
          <CodexCoreSymbol />
        </div>
      </header>

      {isNodesScreen ? (
        <NodeFeed />
      ) : isVaultScreen ? (
        <VaultFeed />
      ) : isStudioScreen ? (
        <>
          <section className="stack">
            {screen.cards.map((card) => (
              <article className="info-card" key={card.label}>
                <div>
                  <p className="card-label">{card.label}</p>
                  <strong className="card-value">{card.value}</strong>
                </div>
                <p className="card-detail">{card.detail}</p>
              </article>
            ))}
          </section>
          <StudioComposer />
        </>
      ) : (
        <section className="stack">
          {screen.cards.map((card) => (
            <article className="info-card" key={card.label}>
              <div>
                <p className="card-label">{card.label}</p>
                <strong className="card-value">{card.value}</strong>
              </div>
              <p className="card-detail">{card.detail}</p>
            </article>
          ))}
        </section>
      )}

      {!isStudioScreen && (
        <section className="action-panel">
          <div>
            <p className="eyebrow">Quick action</p>
            <h2>{screen.name} ready</h2>
            <p className="panel-copy">
              Tap through the shell to inspect each area. The layout stays fully
              contained inside the mobile app with no dependency on other
              workspaces.
            </p>
          </div>
          <button type="button" className="primary-action">
            Open {screen.name}
          </button>
        </section>
      )}
    </section>
  )
}

function Shell() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <main className="content-shell">
        <div className="route-stage" key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            {screens.map((screen) => (
              <Route
                key={screen.path}
                path={screen.path}
                element={<Screen screen={screen} />}
              />
            ))}
          </Routes>
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {screens.map((screen) => (
          <NavLink
            key={screen.path}
            to={screen.path}
            className={({ isActive }) =>
              isActive ? 'nav-button nav-button-active panel-sheen' : 'nav-button'
            }
          >
            {screen.name}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Shell
