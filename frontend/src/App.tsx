import { FormEvent, useState } from 'react'

type Inspection = {
  source_root: string
  project_name: string
  known: boolean
}

type ArchitectureResult = {
  source_root: string
  project_name: string
  state: 'empty' | 'ready'
  revision: string
  component_count: number
  component_titles: string[]
}

type ErrorCode =
  | 'path_required'
  | 'path_relative'
  | 'path_missing'
  | 'path_not_directory'
  | 'origin_mismatch'
  | 'lookup_failed'
  | 'setup_incomplete'
  | 'architecture_unavailable'
  | 'architecture_invalid'
  | 'architecture_unsupported'

type ErrorPayload = { code?: string }

type ViewState =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'inspection'; value: Inspection }
  | { kind: 'confirming'; value: Inspection }
  | { kind: 'setting-up'; value: Inspection }
  | { kind: 'ready'; value: ArchitectureResult }
  | { kind: 'setup-error'; inspection: Inspection; code?: string }
  | { kind: 'architecture-error'; sourceRoot: string; code?: string }
  | { kind: 'path-error'; message: string }

export function App() {
  const [sourceRoot, setSourceRoot] = useState('')
  const [state, setState] = useState<ViewState>({ kind: 'idle' })

  async function inspectProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedSourceRoot = sourceRoot.trim()
    setSourceRoot(trimmedSourceRoot)
    setState({ kind: 'looking' })

    try {
      const response = await postJSON('/api/projects/open', { source_root: trimmedSourceRoot })
      const result = (await response.json()) as Inspection | ArchitectureResult | ErrorPayload
      if (!response.ok) {
        const code = 'code' in result ? result.code : undefined
        if (isArchitectureError(code)) {
          setState({ kind: 'architecture-error', sourceRoot: trimmedSourceRoot, code })
        } else {
          setState({ kind: 'path-error', message: messageForError(code) })
        }
        return
      }
      if ('state' in result) {
        setState({ kind: 'ready', value: result as ArchitectureResult })
      } else {
        setState({ kind: 'inspection', value: result as Inspection })
      }
    } catch {
      setState({ kind: 'path-error', message: messageForError() })
    }
  }

  async function setupArchitecture(inspection: Inspection) {
    setState({ kind: 'setting-up', value: inspection })
    try {
      const response = await postJSON('/api/projects/initialize', { source_root: inspection.source_root })
      const result = (await response.json()) as ArchitectureResult | ErrorPayload
      if (!response.ok) {
        setState({
          kind: 'setup-error',
          inspection,
          code: 'code' in result ? result.code : undefined,
        })
        return
      }
      setState({ kind: 'ready', value: result as ArchitectureResult })
    } catch {
      setState({ kind: 'setup-error', inspection })
    }
  }

  const busy = state.kind === 'looking' || state.kind === 'setting-up'

  return (
    <main className="shell">
      <article className="sheet">
        <header className="sheet-header">
          <p className="eyebrow">WorkBraid</p>
          <h1>Open a project</h1>
          <p className="introduction">
            Choose a project folder on this computer. WorkBraid will look for its architecture without changing the folder.
          </p>
        </header>

        <form onSubmit={inspectProject}>
          <label htmlFor="source-root">Project folder</label>
          <div className="input-row">
            <input
              id="source-root"
              name="source-root"
              type="text"
              value={sourceRoot}
              onChange={(event) => {
                setSourceRoot(event.target.value)
                setState({ kind: 'idle' })
              }}
              placeholder="/home/alice/src/example-project"
              autoComplete="off"
              aria-describedby="folder-hint"
            />
            <button type="submit" disabled={busy}>
              {state.kind === 'looking' ? 'Looking up…' : 'Open'}
            </button>
          </div>
          <p className="field-hint" id="folder-hint">
            Paste the full folder path, starting with /.
          </p>
        </form>

        {state.kind !== 'idle' && (
          <section className={`result-note ${isErrorState(state) ? 'error' : ''}`} aria-live="polite">
            {state.kind === 'looking' && <p className="lookup-status">Looking up this folder…</p>}
            {state.kind === 'path-error' && (
              <div className="message" role="alert">
                <h2>That path did not work</h2>
                <p>{state.message}</p>
              </div>
            )}
            {state.kind === 'inspection' && !state.value.known && (
              <div className="message">
                <h2>Not linked</h2>
                <p>WorkBraid has not linked this folder to architecture.</p>
                <FolderPath path={state.value.source_root} />
                <button className="inline-action" type="button" onClick={() => setState({ kind: 'confirming', value: state.value })}>
                  Set up architecture
                </button>
              </div>
            )}
            {state.kind === 'confirming' && (
              <div className="message confirmation">
                <h2>Set up architecture?</h2>
                <p>WorkBraid will create private architecture for this project without changing the folder.</p>
                <p className="project-name">{state.value.project_name}</p>
                <FolderPath path={state.value.source_root} />
                <div className="button-group">
                  <button className="secondary-action" type="button" onClick={() => setState({ kind: 'inspection', value: state.value })}>
                    Cancel
                  </button>
                  <button className="inline-action" type="button" onClick={() => setupArchitecture(state.value)}>
                    Set up
                  </button>
                </div>
              </div>
            )}
            {state.kind === 'setting-up' && <p className="lookup-status">Setting up architecture…</p>}
            {state.kind === 'ready' && (
              <div className="message">
                <h2>Architecture ready</h2>
                {state.value.component_count === 0 ? (
                  <p>This project has an empty architecture.</p>
                ) : (
                  <div className="component-inventory">
                    <p>
                      This architecture has {state.value.component_count}{' '}
                      {state.value.component_count === 1 ? 'component' : 'components'}.
                    </p>
                    <ul>
                      {state.value.component_titles.map((title, index) => (
                        <li key={`${index}-${title}`}>{title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <FolderPath path={state.value.source_root} />
                <details>
                  <summary>Technical details</summary>
                  <dl>
                    <dt>Revision</dt>
                    <dd>{state.value.revision}</dd>
                  </dl>
                </details>
              </div>
            )}
            {state.kind === 'setup-error' && (
              <SetupError state={state} onRetry={() => setupArchitecture(state.inspection)} />
            )}
            {state.kind === 'architecture-error' && <ArchitectureError state={state} />}
          </section>
        )}
      </article>
    </main>
  )
}

function ArchitectureError({ state }: { state: Extract<ViewState, { kind: 'architecture-error' }> }) {
  if (state.code === 'architecture_unsupported') {
    return (
      <div className="message" role="alert">
        <h2>Architecture not supported yet</h2>
        <p>This architecture uses features that this version of WorkBraid cannot open yet.</p>
        <FolderPath path={state.sourceRoot} />
      </div>
    )
  }
  if (state.code === 'architecture_invalid') {
    return (
      <div className="message" role="alert">
        <h2>Architecture needs attention</h2>
        <p>WorkBraid could not read this project's architecture.</p>
        <FolderPath path={state.sourceRoot} />
      </div>
    )
  }
  return (
    <div className="message" role="alert">
      <h2>Architecture unavailable</h2>
      <p>WorkBraid could not open the architecture linked to this project.</p>
      <FolderPath path={state.sourceRoot} />
    </div>
  )
}

function FolderPath({ path }: { path: string }) {
  return <p className="folder-path">{path}</p>
}

function SetupError({
  state,
  onRetry,
}: {
  state: Extract<ViewState, { kind: 'setup-error' }>
  onRetry: () => void
}) {
  if (state.code === 'architecture_invalid') {
    return (
      <div className="message" role="alert">
        <h2>Architecture needs attention</h2>
        <p>WorkBraid could not read this project's architecture.</p>
        <FolderPath path={state.inspection.source_root} />
      </div>
    )
  }
  if (state.code === 'architecture_unsupported') {
    return (
      <div className="message" role="alert">
        <h2>Architecture not supported yet</h2>
        <p>This architecture uses features that this version of WorkBraid cannot open yet.</p>
        <FolderPath path={state.inspection.source_root} />
      </div>
    )
  }
  return (
    <div className="message" role="alert">
      <h2>Setup did not finish</h2>
      <p>WorkBraid could not finish setting up architecture. Try again.</p>
      <FolderPath path={state.inspection.source_root} />
      <button className="inline-action" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

function isErrorState(state: ViewState) {
  return state.kind === 'path-error' || state.kind === 'setup-error' || state.kind === 'architecture-error'
}

async function postJSON(path: string, value: unknown) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
}

const errorMessages: Record<ErrorCode, string> = {
  path_required: 'Enter a folder path.',
  path_relative: 'Use a full path, starting with /.',
  path_missing: 'That folder is not on this computer.',
  path_not_directory: 'That path is a file. Choose the project folder.',
  origin_mismatch: 'Open WorkBraid at the address printed in the terminal.',
  lookup_failed: "WorkBraid couldn't look that up. Try again.",
  setup_incomplete: 'WorkBraid could not finish setting up architecture. Try again.',
  architecture_unavailable: 'WorkBraid could not open this architecture.',
  architecture_invalid: 'WorkBraid could not open this architecture.',
  architecture_unsupported: 'This architecture is not supported yet.',
}

function isArchitectureError(code?: string): code is Extract<ErrorCode, `architecture_${string}`> {
  return code === 'architecture_unavailable' || code === 'architecture_invalid' || code === 'architecture_unsupported'
}

function messageForError(code?: string) {
  if (code && Object.prototype.hasOwnProperty.call(errorMessages, code)) {
    return errorMessages[code as ErrorCode]
  }
  return errorMessages.lookup_failed
}
