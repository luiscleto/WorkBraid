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
  stale?: boolean
  parent_diff?: string
  action_error?: string
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
  review?: ChangeReview
  review_blocker?: string
}

type ChangeReview = {
  diff: string
  base_revision: string
  candidate_tree: string
  generation: number
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
  const [architectureNotice, setArchitectureNotice] = useState('')
  const [architectureBusy, setArchitectureBusy] = useState(false)
  const [acceptanceUnknown, setAcceptanceUnknown] = useState(false)

  async function inspectProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedSourceRoot = sourceRoot.trim()
    setSourceRoot(trimmedSourceRoot)
    setState({ kind: 'looking' })
    setArchitectureNotice('')
    setAcceptanceUnknown(false)

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

  async function reviewChanges(result: ArchitectureResult) {
    setArchitectureBusy(true)
    setArchitectureNotice('')
    try {
      const response = await postJSON('/api/architecture/review', { source_root: result.source_root })
      const payload = (await response.json()) as ArchitectureResult | ErrorPayload
      if ('state' in payload) {
        setAcceptanceUnknown(false)
        setState({ kind: 'ready', value: payload })
      } else {
        setArchitectureNotice(messageForArchitectureAction('code' in payload ? payload.code : undefined))
      }
    } catch {
      setArchitectureNotice("WorkBraid couldn't prepare these changes for review. Try again.")
    } finally {
      setArchitectureBusy(false)
    }
  }

  async function updateArchitecture(result: ArchitectureResult) {
    const review = result.changes?.review
    if (!review) return
    setArchitectureBusy(true)
    setArchitectureNotice('')
    setAcceptanceUnknown(true)
    setState({
      kind: 'ready',
      value: { ...result, changes: result.changes ? { ...result.changes, review: undefined } : undefined },
    })
    try {
      const response = await postJSON('/api/architecture/accept', {
        source_root: result.source_root,
        base_revision: review.base_revision,
        candidate_tree: review.candidate_tree,
        generation: review.generation,
      })
      const payload = (await response.json()) as ArchitectureResult | ErrorPayload
      if ('state' in payload) {
        setAcceptanceUnknown(false)
        setState({ kind: 'ready', value: payload })
      } else {
        setArchitectureNotice('WorkBraid could not confirm what happened. Open this project again to check its current architecture.')
      }
    } catch {
      setArchitectureNotice('WorkBraid could not confirm what happened. Open this project again to check its current architecture.')
    } finally {
      setArchitectureBusy(false)
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
                <h2>{state.value.stale ? 'Architecture changed' : 'Architecture ready'}</h2>
                {state.value.stale && <p>This view is out of date. Open the project again to see the latest architecture.</p>}
                {state.value.action_error && !state.value.changes && (
                  <p className="review-error" role="alert">{messageForArchitectureAction(state.value.action_error)}</p>
                )}
                {architectureNotice && <p className="review-error" role="alert">{architectureNotice}</p>}
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
                          {!state.value.stale && !acceptanceUnknown && (
                            <button className="text-action" type="button" onClick={() => editAccepted(component, state.value)}>Edit</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!state.value.stale && !acceptanceUnknown && <div className="authoring-actions">
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
                </div>}
                {state.value.changes && state.value.changes.components.length > 0 && (
                  <section className="changes-in-progress" aria-labelledby="changes-heading">
                    <h3 id="changes-heading">Changes in progress</h3>
                    <p>These changes have not updated the architecture yet.</p>
                    <ul>
                      {state.value.changes.components.map((component) => (
                        <li key={component.id}>
                          <span>{component.title.trim() || 'Untitled component'}</span>
                          {!state.value.stale && !acceptanceUnknown && (
                            <button className="text-action" type="button" onClick={() => editPending(component)}>Edit</button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {state.value.changes.review_blocker && (
                      <p className="review-error" role="alert">{messageForReviewBlocker(state.value.changes.review_blocker)}</p>
                    )}
                    {state.value.action_error && !state.value.changes.review_blocker && (
                      <p className="review-error" role="alert">{messageForArchitectureAction(state.value.action_error)}</p>
                    )}
                    {!state.value.stale && !state.value.changes.review && !acceptanceUnknown && (
                      <button className="inline-action review-action" type="button" disabled={architectureBusy} onClick={() => reviewChanges(state.value)}>
                        {architectureBusy ? 'Preparing…' : 'Review changes'}
                      </button>
                    )}
                    {state.value.changes.review && !state.value.stale && (
                      <section className="change-review" aria-labelledby="review-heading">
                        <h3 id="review-heading">Review changes</h3>
                        <p>Inspect the complete change before updating the architecture; backslashes and non-printing characters use escaped notation.</p>
                        <pre>{state.value.changes.review.diff}</pre>
                        <details>
                          <summary>Review details</summary>
                          <dl>
                            <dt>Base revision</dt><dd>{state.value.changes.review.base_revision}</dd>
                            <dt>Candidate tree</dt><dd>{state.value.changes.review.candidate_tree}</dd>
                            <dt>Change version</dt><dd>{state.value.changes.review.generation}</dd>
                          </dl>
                        </details>
                        <button className="inline-action review-action" type="button" disabled={architectureBusy} onClick={() => updateArchitecture(state.value)}>
                          {architectureBusy ? 'Updating…' : 'Update architecture'}
                        </button>
                      </section>
                    )}
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
                    />
                    <label htmlFor="component-description">Description</label>
                    <textarea
                      id="component-description"
                      value={editor.description}
                      onChange={(event) => setEditor({ ...editor, description: event.target.value, descriptionChanged: true })}
                      rows={8}
                    />
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
                  {state.value.parent_diff && (
                    <div className="accepted-diff">
                      <h3>Parent diff</h3>
                      <pre>{state.value.parent_diff}</pre>
                    </div>
                  )}
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

function messageForAuthoringError(code?: string) {
  if (code === 'origin_mismatch') return 'Open WorkBraid at the address printed in the terminal.'
  if (code === 'changes_elsewhere') return 'Changes are already in progress for another architecture.'
  if (code === 'component_not_found') return 'That component is no longer available to edit.'
  if (code === 'architecture_not_open') return 'Open the project again, then try your change.'
  return "WorkBraid couldn't keep that change. Try again."
}

function messageForReviewBlocker(code?: string) {
  if (code === 'title_required') return 'Add a title to the untitled component before updating architecture.'
  if (code === 'title_one_line') return 'Use a one-line component title before updating architecture.'
  return 'Correct the component changes before updating architecture.'
}

function messageForArchitectureAction(code?: string) {
  if (code === 'architecture_stale') return 'These changes are out of date because the architecture changed.'
  if (code === 'review_changed') return 'The changes were edited after this review. Review them again before updating architecture.'
  if (code === 'updated_reload') return 'Architecture was updated, but this page could not refresh. Open the project again.'
  if (code === 'update_uncertain') return 'WorkBraid could not confirm the current architecture. Open the project again.'
  if (code === 'update_failed') return "WorkBraid couldn't update the architecture. Try again."
  if (code === 'review_failed') return "WorkBraid couldn't prepare these changes for review. Try again."
  return "WorkBraid couldn't complete that action. Try again."
}
