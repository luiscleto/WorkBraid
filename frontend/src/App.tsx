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
  components: AuthoringComponent[]
  changes?: ChangesInProgress
}

type AuthoringComponent = {
  id: string
  title: string
  description: string
}

type PendingComponent = AuthoringComponent & { new: boolean }

type ChangesInProgress = {
  components: PendingComponent[]
  valid: boolean
  validation_code?: string
  validation_item?: string
}

type ComponentEditor = {
  kind: 'add' | 'edit'
  id?: string
  title: string
  description: string
  titleChanged: boolean
  descriptionChanged: boolean
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
  const [editor, setEditor] = useState<ComponentEditor | null>(null)
  const [authoringError, setAuthoringError] = useState('')

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
        setEditor(null)
        setAuthoringError('')
        setState({ kind: 'ready', value: result as ArchitectureResult })
      } else {
        setState({ kind: 'inspection', value: result as Inspection })
      }
    } catch {
      setState({ kind: 'path-error', message: messageForError() })
    }
  }

  function editAccepted(component: AuthoringComponent, result: ArchitectureResult) {
    const pending = result.changes?.components.find((change) => change.id === component.id)
    setAuthoringError('')
    setEditor({
      kind: 'edit',
      id: component.id,
      title: pending?.title ?? component.title,
      description: pending?.description ?? component.description,
      titleChanged: false,
      descriptionChanged: false,
    })
  }

  function editPending(component: PendingComponent) {
    setAuthoringError('')
    setEditor({ kind: 'edit', id: component.id, title: component.title, description: component.description, titleChanged: false, descriptionChanged: false })
  }

  async function submitComponent(event: FormEvent<HTMLFormElement>, result: ArchitectureResult) {
    event.preventDefault()
    if (!editor) return
    setAuthoringError('')
    const endpoint = editor.kind === 'add' ? '/api/architecture/components/add' : '/api/architecture/components/edit'
    try {
      const response = await postJSON(endpoint, {
        source_root: result.source_root,
        ...(editor.id ? { component_id: editor.id } : {}),
        ...(editor.kind === 'add' || editor.titleChanged ? { title: editor.title } : {}),
        ...(editor.kind === 'add' || editor.descriptionChanged ? { description: editor.description } : {}),
        ...(editor.kind === 'edit' ? { title_changed: editor.titleChanged, description_changed: editor.descriptionChanged } : {}),
      })
      const payload = (await response.json()) as ArchitectureResult | ErrorPayload
      if (!response.ok || !('state' in payload)) {
        setAuthoringError(messageForAuthoringError('code' in payload ? payload.code : undefined))
        return
      }
      setState({ kind: 'ready', value: payload })
      if (payload.changes?.valid) {
        setEditor(null)
      } else {
        const invalid = payload.changes?.components.find((change) => change.id === payload.changes?.validation_item)
        if (invalid) {
          setEditor({ kind: 'edit', id: invalid.id, title: invalid.title, description: invalid.description, titleChanged: false, descriptionChanged: false })
        }
      }
    } catch {
      setAuthoringError("WorkBraid couldn't keep that change. Try again.")
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
                setEditor(null)
                setAuthoringError('')
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
                  <div className="component-inventory accepted-components">
                    <p>
                      This architecture has {state.value.component_count}{' '}
                      {state.value.component_count === 1 ? 'component' : 'components'}.
                    </p>
                    <ul>
                      {(state.value.components ?? []).map((component) => (
                        <li key={component.id}>
                          <span>{component.title}</span>
                          <button className="text-action" type="button" onClick={() => editAccepted(component, state.value)}>
                            Edit
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="authoring-actions">
                  <button
                    className="inline-action"
                    type="button"
                    onClick={() => {
                      setAuthoringError('')
                      setEditor({ kind: 'add', title: '', description: '', titleChanged: false, descriptionChanged: false })
                    }}
                  >
                    Add component
                  </button>
                </div>
                {state.value.changes && state.value.changes.components.length > 0 && (
                  <section className="changes-in-progress" aria-labelledby="changes-heading">
                    <h3 id="changes-heading">Changes in progress</h3>
                    <p>These changes have not updated the architecture yet.</p>
                    <ul>
                      {state.value.changes.components.map((component) => {
                        const componentValidation = validationMessage(state.value.changes, component.id)
                        return (
                          <li key={component.id}>
                            <div className="change-item-copy">
                              <span>{component.title.trim() || 'Untitled component'}</span>
                              {componentValidation && (
                                <p className="change-validation" role="alert">
                                  {componentValidation}
                                </p>
                              )}
                            </div>
                            <button className="text-action" type="button" onClick={() => editPending(component)}>
                              Edit
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
                {editor && (
                  <form className="component-form" onSubmit={(event) => submitComponent(event, state.value)}>
                    <h3>{editor.kind === 'add' ? 'Add component' : 'Edit component'}</h3>
                    <label htmlFor="component-title">Title</label>
                    <input
                      id="component-title"
                      value={editor.title}
                      onChange={(event) => setEditor({ ...editor, title: event.target.value, titleChanged: true })}
                      autoComplete="off"
                      aria-invalid={Boolean(validationMessage(state.value.changes, editor.id))}
                      aria-describedby={validationMessage(state.value.changes, editor.id) ? 'component-validation' : undefined}
                    />
                    <label htmlFor="component-description">Description</label>
                    <textarea
                      id="component-description"
                      value={editor.description}
                      onChange={(event) => setEditor({ ...editor, description: event.target.value, descriptionChanged: true })}
                      rows={8}
                    />
                    {validationMessage(state.value.changes, editor.id) && (
                      <p className="authoring-error" id="component-validation">
                        {validationMessage(state.value.changes, editor.id)}
                      </p>
                    )}
                    {authoringError && (
                      <p className="authoring-error" role="alert">
                        {authoringError}
                      </p>
                    )}
                    <div className="button-group">
                      <button className="secondary-action" type="button" onClick={() => setEditor(null)}>
                        Cancel
                      </button>
                      <button className="inline-action" type="submit">
                        Keep change
                      </button>
                    </div>
                  </form>
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

function validationMessage(changes?: ChangesInProgress, componentID?: string) {
  if (!changes || changes.valid || !componentID || changes.validation_item !== componentID) return ''
  if (changes.validation_code === 'title_required') return 'Add a title.'
  if (changes.validation_code === 'title_one_line') return 'Use a one-line title.'
  if (changes.validation_code === 'change_unavailable') return "WorkBraid couldn't check these changes. Try again."
  return 'Check this component and try again.'
}

function messageForAuthoringError(code?: string) {
  if (code === 'origin_mismatch') return 'Open WorkBraid at the address printed in the terminal.'
  if (code === 'changes_elsewhere') return 'Changes are already in progress for another architecture.'
  if (code === 'component_not_found') return 'That component is no longer available to edit.'
  if (code === 'architecture_not_open') return 'Open the project again, then try your change.'
  return "WorkBraid couldn't keep that change. Try again."
}
