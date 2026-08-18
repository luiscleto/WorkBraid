import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArchitectureMap } from './ArchitectureMap'
import { MarkdownBody } from './MarkdownBody'

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
  filename: string
  relationships: { target_id: string; label: string }[]
}

type PendingComponent = AuthoringComponent & { new: boolean }

type ChangesInProgress = {
  components: PendingComponent[]
  relationship_targets?: RelationshipTarget[]
  valid: boolean
  validation_code?: string
  validation_item?: string
  review?: ChangeReview
  review_blocker?: string
}

type RelationshipTarget = {
  id: string
  title: string
  context?: string
  new?: boolean
}

type RelationshipValue = { target_id: string; label: string }
type RelationshipRow = RelationshipValue & { rowKey: string }

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
  initialTitle: string
  initialDescription: string
  relationships: RelationshipRow[]
  initialRelationships: RelationshipValue[]
}

type WorkspaceTask = 'documentation' | 'changes' | 'empty'

type NavigationIntent =
  | { kind: 'component'; id: string }
  | { kind: 'changes' }
  | { kind: 'add' }
  | { kind: 'open-another' }

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

let relationshipRowCounter = 0

function newRelationshipRow(value: RelationshipValue = { target_id: '', label: '' }): RelationshipRow {
  relationshipRowCounter += 1
  return { ...value, rowKey: `relationship-row-${relationshipRowCounter}` }
}

function relationshipRows(values: RelationshipValue[]): RelationshipRow[] {
  return values.map((value) => newRelationshipRow(value))
}

function relationshipValues(values: Array<RelationshipValue | RelationshipRow>): RelationshipValue[] {
  return values.map(({ target_id, label }) => ({ target_id, label }))
}

function sameRelationships(left: RelationshipValue[], right: RelationshipValue[]) {
  return left.length === right.length && left.every((value, index) => value.target_id === right[index].target_id && value.label === right[index].label)
}

function relationshipTargetsFor(result: ArchitectureResult): RelationshipTarget[] {
  if (result.changes?.relationship_targets) return result.changes.relationship_targets
  const titleCounts = new Map<string, number>()
  for (const component of result.components ?? []) {
    titleCounts.set(component.title, (titleCounts.get(component.title) ?? 0) + 1)
  }
  return (result.components ?? []).map((component) => ({
    id: component.id,
    title: component.title,
    ...((titleCounts.get(component.title) ?? 0) > 1 ? { context: component.filename || component.id.slice(0, 8) } : {}),
  }))
}

function relationshipTargetLabel(target: RelationshipTarget) {
  const title = target.title.trim() || 'Untitled component'
  return [title, target.context, target.new ? 'New component' : ''].filter(Boolean).join(' — ')
}

export function App() {
  const [sourceRoot, setSourceRoot] = useState('')
  const [state, setState] = useState<ViewState>({ kind: 'idle' })
  const [editor, setEditor] = useState<ComponentEditor | null>(null)
  const [authoringError, setAuthoringError] = useState('')
  const [architectureNotice, setArchitectureNotice] = useState('')
  const [architectureBusy, setArchitectureBusy] = useState(false)
  const [acceptanceUnknown, setAcceptanceUnknown] = useState(false)
  const [selectedComponentID, setSelectedComponentID] = useState<string>()
  const [workspaceTask, setWorkspaceTask] = useState<WorkspaceTask>('empty')
  const [navigationIntent, setNavigationIntent] = useState<NavigationIntent | null>(null)
  const [discardConfirming, setDiscardConfirming] = useState(false)

  const enterWorkspace = useCallback((result: ArchitectureResult, task?: WorkspaceTask) => {
    setState({ kind: 'ready', value: result })
    setSelectedComponentID((current) => result.components?.some((component) => component.id === current) ? current : result.components?.[0]?.id)
    setWorkspaceTask(task ?? (result.changes?.components.length ? 'changes' : result.components?.length ? 'documentation' : 'empty'))
  }, [])

  useEffect(() => {
    if (state.kind !== 'ready') return
    if (selectedComponentID && state.value.components?.some((component) => component.id === selectedComponentID)) return
    setSelectedComponentID(state.value.components?.[0]?.id)
  }, [state, selectedComponentID])

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
        if ('state' in result && result.action_error === 'pending_blocks_switch') {
          setSourceRoot(result.source_root)
          setEditor(null)
          setAuthoringError('')
          setDiscardConfirming(false)
          enterWorkspace({ ...result, action_error: undefined }, 'changes')
          setArchitectureNotice('Keep working here or discard these changes before opening another project.')
          return
        }
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
        enterWorkspace(result as ArchitectureResult)
      } else {
        setState({ kind: 'inspection', value: result as Inspection })
      }
    } catch {
      setState({ kind: 'path-error', message: messageForError() })
    }
  }

  function editAccepted(component: AuthoringComponent, result: ArchitectureResult) {
    const pending = result.changes?.components.find((change) => change.id === component.id)
    const relationships = pending?.relationships ?? component.relationships ?? []
    setAuthoringError('')
    setEditor({
      kind: 'edit',
      id: component.id,
      title: pending?.title ?? component.title,
      description: pending?.description ?? component.description,
      titleChanged: false,
      descriptionChanged: false,
      initialTitle: pending?.title ?? component.title,
      initialDescription: pending?.description ?? component.description,
      relationships: relationshipRows(relationships),
      initialRelationships: relationshipValues(relationships),
    })
    setWorkspaceTask('documentation')
  }

  function editPending(component: PendingComponent) {
    const relationships = component.relationships ?? []
    setAuthoringError('')
    setEditor({
      kind: 'edit', id: component.id, title: component.title, description: component.description,
      titleChanged: false, descriptionChanged: false, initialTitle: component.title, initialDescription: component.description,
      relationships: relationshipRows(relationships), initialRelationships: relationshipValues(relationships),
    })
    setWorkspaceTask('changes')
  }

  async function submitComponent(event: FormEvent<HTMLFormElement>, result: ArchitectureResult) {
    event.preventDefault()
    if (!editor) return
    setAuthoringError('')
    const endpoint = editor.kind === 'add' ? '/api/architecture/components/add' : '/api/architecture/components/edit'
    const relationships = relationshipValues(editor.relationships)
    const relationshipsChanged = !sameRelationships(relationships, editor.initialRelationships)
    try {
      const response = await postJSON(endpoint, {
        source_root: result.source_root,
        ...(editor.id ? { component_id: editor.id } : {}),
        ...(editor.kind === 'add' || editor.titleChanged ? { title: editor.title } : {}),
        ...(editor.kind === 'add' || editor.descriptionChanged ? { description: editor.description } : {}),
        ...(editor.kind === 'add' || relationshipsChanged ? { relationships } : {}),
        ...(editor.kind === 'edit' ? { title_changed: editor.titleChanged, description_changed: editor.descriptionChanged } : {}),
        ...(editor.kind === 'edit' && relationshipsChanged ? { relationships_changed: true } : {}),
      })
      const payload = (await response.json()) as ArchitectureResult | ErrorPayload
      if (!response.ok || !('state' in payload)) {
        setAuthoringError(messageForAuthoringError('code' in payload ? payload.code : undefined))
        return
      }
      enterWorkspace(payload, 'changes')
      setEditor(null)
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
      enterWorkspace(result as ArchitectureResult)
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
        enterWorkspace(payload, 'changes')
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
    enterWorkspace({ ...result, changes: result.changes ? { ...result.changes, review: undefined } : undefined }, 'changes')
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
        enterWorkspace(payload, payload.changes ? 'changes' : 'documentation')
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

  const editorDirty = editor !== null && (
    editor.title !== editor.initialTitle || editor.description !== editor.initialDescription ||
    !sameRelationships(relationshipValues(editor.relationships), editor.initialRelationships)
  )

  function requestNavigation(intent: NavigationIntent) {
    if (editorDirty) {
      setNavigationIntent(intent)
      return
    }
    void performNavigation(intent)
  }

  async function performNavigation(intent: NavigationIntent) {
    setNavigationIntent(null)
    setEditor(null)
    setAuthoringError('')
    setArchitectureNotice('')
    if (intent.kind === 'component') {
      setSelectedComponentID(intent.id)
      setWorkspaceTask('documentation')
      return
    }
    if (intent.kind === 'changes') {
      setWorkspaceTask('changes')
      return
    }
    if (intent.kind === 'add') {
      setEditor({
        kind: 'add', title: '', description: '', titleChanged: false, descriptionChanged: false,
        initialTitle: '', initialDescription: '',
        relationships: [], initialRelationships: [],
      })
      return
    }
    if (state.kind !== 'ready') return
    setArchitectureBusy(true)
    setArchitectureNotice('')
    try {
      const response = await postJSON('/api/projects/leave', { source_root: state.value.source_root })
      if (response.ok) {
        setState({ kind: 'idle' })
        setSourceRoot('')
        setSelectedComponentID(undefined)
        setWorkspaceTask('empty')
        return
      }
      const payload = (await response.json()) as ArchitectureResult | ErrorPayload
      if ('state' in payload) {
        enterWorkspace({ ...payload, action_error: undefined }, 'changes')
        setArchitectureNotice('Keep working here or discard these changes before opening another project.')
      } else {
        setArchitectureNotice("WorkBraid couldn't leave this project. Try again.")
      }
    } catch {
      setArchitectureNotice("WorkBraid couldn't leave this project. Try again.")
    } finally {
      setArchitectureBusy(false)
    }
  }

  async function discardChanges(result: ArchitectureResult) {
    setArchitectureBusy(true)
    setArchitectureNotice('')
    try {
      const response = await postJSON('/api/architecture/discard', { source_root: result.source_root })
      const payload = (await response.json()) as ArchitectureResult | ErrorPayload
      if (!response.ok || !('state' in payload)) {
        setArchitectureNotice("WorkBraid couldn't discard these changes. Try again.")
        return
      }
      setDiscardConfirming(false)
      enterWorkspace(payload, payload.components?.length ? 'documentation' : 'empty')
    } catch {
      setArchitectureNotice("WorkBraid couldn't discard these changes. Try again.")
    } finally {
      setArchitectureBusy(false)
    }
  }

  if (state.kind === 'ready') {
    const result = state.value
    const selected = result.components?.find((component) => component.id === selectedComponentID)
    const titleCounts = new Map<string, number>()
    for (const component of result.components ?? []) titleCounts.set(component.title, (titleCounts.get(component.title) ?? 0) + 1)
    return (
      <main className="workspace-shell">
        <header className="application-frame">
          <div>
            <p className="eyebrow">WorkBraid</p>
            <p className="workspace-context"><strong>{result.project_name}</strong><span>Architecture</span></p>
          </div>
          <div className="frame-actions">
            {result.changes?.components.length ? (
              <button className="text-action" type="button" onClick={() => requestNavigation({ kind: 'changes' })}>
                Changes in progress <span className="change-count">{result.changes.components.length}</span>
              </button>
            ) : null}
            <button className="text-action" type="button" disabled={architectureBusy || acceptanceUnknown} onClick={() => requestNavigation({ kind: 'open-another' })}>
              Open another project
            </button>
          </div>
        </header>
        {result.stale && <div className="stale-banner" role="alert">This view is out of date. Changes in progress remain tied to the architecture they started from.</div>}
        {architectureNotice && (
          <div className="workspace-notice" role="alert">
            <span>{architectureNotice}</span>
            <button className="notice-dismiss" type="button" aria-label="Dismiss message" onClick={() => setArchitectureNotice('')}>×</button>
          </div>
        )}
        <div className={`architecture-workbench ${result.changes?.review ? 'reviewing' : ''}`}>
          <nav className="component-index" aria-label="Components">
            <div className="index-heading"><h1>Components</h1></div>
            {result.components?.length ? (
              <ul>
                {result.components.map((component) => (
                  <li key={component.id}>
                    <button
                      type="button"
                      className={component.id === selectedComponentID && workspaceTask === 'documentation' && !editor ? 'selected' : ''}
                      aria-label={(titleCounts.get(component.title) ?? 0) > 1 ? `${component.title}, ${component.filename || component.id.slice(0, 8)}` : undefined}
                      aria-current={component.id === selectedComponentID && workspaceTask === 'documentation' && !editor ? 'page' : undefined}
                      onClick={() => requestNavigation({ kind: 'component', id: component.id })}
                    >
                      <span>{component.title}</span>
                      {(titleCounts.get(component.title) ?? 0) > 1 && <small>{' '}{component.filename || component.id.slice(0, 8)}</small>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="index-empty">No components</p>}
            {!result.stale && !acceptanceUnknown && (
              <button className="index-add" type="button" onClick={() => requestNavigation({ kind: 'add' })}>Add component</button>
            )}
          </nav>
          <section className="map-region">
            <div className="region-label">Architecture map</div>
            <ArchitectureMap
              revision={result.revision}
              components={result.components ?? []}
              selectedID={selectedComponentID}
              onSelect={(id) => requestNavigation({ kind: 'component', id })}
            />
          </section>
          <aside className="working-pane" aria-label="Architecture task">
            {editor ? (
              <ComponentEditorForm
                editor={editor}
                setEditor={setEditor}
                targets={relationshipTargetsFor(result)}
                error={authoringError}
                onCancel={() => setEditor(null)}
                onSubmit={(event) => submitComponent(event, result)}
              />
            ) : workspaceTask === 'changes' && result.changes ? (
              <ChangesTask
                result={result}
                busy={architectureBusy}
                acceptanceUnknown={acceptanceUnknown}
                discardConfirming={discardConfirming}
                onEdit={editPending}
                onReview={() => reviewChanges(result)}
                onUpdate={() => updateArchitecture(result)}
                onBeginDiscard={() => setDiscardConfirming(true)}
                onCancelDiscard={() => setDiscardConfirming(false)}
                onDiscard={() => discardChanges(result)}
              />
            ) : selected ? (
              <article className="component-documentation">
                <div className="pane-heading"><p className="eyebrow">Component</p><h2>{selected.title}</h2></div>
                <MarkdownBody source={selected.description} />
                {!result.stale && !acceptanceUnknown && <button className="inline-action" type="button" onClick={() => editAccepted(selected, result)}>Edit component</button>}
              </article>
            ) : (
              <div className="workspace-empty"><p className="eyebrow">Architecture</p><h2>Start with a component</h2><p>Add the first part of this architecture to begin the map.</p></div>
            )}
            <details className="technical-details">
              <summary>Technical details</summary>
              <dl><dt>Folder</dt><dd>{result.source_root}</dd><dt>Revision</dt><dd>{result.revision}</dd></dl>
              {result.parent_diff && <div className="accepted-diff"><h3>Parent diff</h3><pre>{result.parent_diff}</pre></div>}
            </details>
          </aside>
        </div>
        {navigationIntent && (
          <div className="navigation-guard" role="dialog" aria-modal="true" aria-labelledby="unsaved-heading">
            <div>
              <h2 id="unsaved-heading">Leave without keeping?</h2>
              <p>Your latest component edits have not been kept.</p>
              <div className="button-group">
                <button className="secondary-action" type="button" onClick={() => setNavigationIntent(null)}>Keep editing</button>
                <button className="destructive-action" type="button" onClick={() => performNavigation(navigationIntent)}>Leave without keeping</button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

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

function ComponentEditorForm({
  editor,
  setEditor,
  targets,
  error,
  onCancel,
  onSubmit,
}: {
  editor: ComponentEditor
  setEditor: (editor: ComponentEditor) => void
  targets: RelationshipTarget[]
  error: string
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="component-form" onSubmit={onSubmit}>
      <div className="pane-heading"><p className="eyebrow">Architecture</p><h2>{editor.kind === 'add' ? 'Add component' : 'Edit component'}</h2></div>
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
        rows={14}
      />
      <fieldset className="relationship-editor">
        <legend>Outgoing relationships</legend>
        {editor.relationships.length ? (
          <div className="relationship-rows">
            {editor.relationships.map((relationship, index) => (
              <div className="relationship-row" key={relationship.rowKey}>
                <label htmlFor={`relationship-target-${relationship.rowKey}`}>Target</label>
                <select
                  id={`relationship-target-${relationship.rowKey}`}
                  value={relationship.target_id}
                  onChange={(event) => setEditor({
                    ...editor,
                    relationships: editor.relationships.map((row) => row.rowKey === relationship.rowKey ? { ...row, target_id: event.target.value } : row),
                  })}
                >
                  <option value="">Choose a component</option>
                  {targets.map((target) => <option key={target.id} value={target.id}>{relationshipTargetLabel(target)}</option>)}
                </select>
                <label htmlFor={`relationship-label-${relationship.rowKey}`}>Label</label>
                <textarea
                  id={`relationship-label-${relationship.rowKey}`}
                  value={relationship.label}
                  rows={2}
                  placeholder="calls"
                  onChange={(event) => setEditor({
                    ...editor,
                    relationships: editor.relationships.map((row) => row.rowKey === relationship.rowKey ? { ...row, label: event.target.value } : row),
                  })}
                />
                <button
                  className="text-action relationship-remove"
                  type="button"
                  aria-label={`Remove relationship ${index + 1}`}
                  onClick={() => setEditor({ ...editor, relationships: editor.relationships.filter((row) => row.rowKey !== relationship.rowKey) })}
                >Remove</button>
              </div>
            ))}
          </div>
        ) : <p className="relationship-empty">No outgoing relationships</p>}
        <button
          className="secondary-action relationship-add"
          type="button"
          onClick={() => setEditor({ ...editor, relationships: [...editor.relationships, newRelationshipRow()] })}
        >Add relationship</button>
      </fieldset>
      {error && <p className="authoring-error" role="alert">{error}</p>}
      <div className="button-group">
        <button className="secondary-action" type="button" onClick={onCancel}>Cancel</button>
        <button className="inline-action" type="submit">Keep change</button>
      </div>
    </form>
  )
}

function ChangesTask({
  result,
  busy,
  acceptanceUnknown,
  discardConfirming,
  onEdit,
  onReview,
  onUpdate,
  onBeginDiscard,
  onCancelDiscard,
  onDiscard,
}: {
  result: ArchitectureResult
  busy: boolean
  acceptanceUnknown: boolean
  discardConfirming: boolean
  onEdit: (component: PendingComponent) => void
  onReview: () => void
  onUpdate: () => void
  onBeginDiscard: () => void
  onCancelDiscard: () => void
  onDiscard: () => void
}) {
  const changes = result.changes
  if (!changes) return null
  const discardAction = !acceptanceUnknown
    ? <button className="discard-action" type="button" disabled={busy} onClick={onBeginDiscard}>Discard changes</button>
    : null
  return (
    <section className="changes-in-progress" aria-labelledby="changes-heading">
      <div className="pane-heading"><p className="eyebrow">Architecture</p><h2 id="changes-heading">Changes in progress</h2></div>
      <p>These changes have not updated the architecture yet.</p>
      <ul>
        {changes.components.map((component) => (
          <li key={component.id}>
            <span>{component.title.trim() || 'Untitled component'}</span>
            {!result.stale && !acceptanceUnknown && <button className="text-action" type="button" onClick={() => onEdit(component)}>Edit</button>}
          </li>
        ))}
      </ul>
      {changes.review_blocker && <p className="review-error" role="alert">{messageForReviewBlocker(changes.review_blocker)}</p>}
      {result.action_error && !changes.review_blocker && <p className="review-error" role="alert">{messageForArchitectureAction(result.action_error)}</p>}
      {(!changes.review || result.stale) && !acceptanceUnknown && (
        <div className="change-actions">
          {!result.stale && !changes.review && (
            <button className="inline-action" type="button" disabled={busy} onClick={onReview}>{busy ? 'Preparing…' : 'Review changes'}</button>
          )}
          {discardAction}
        </div>
      )}
      {changes.review && !result.stale && (
        <section className="change-review" aria-labelledby="review-heading">
          <h3 id="review-heading">Review changes</h3>
          <p>Inspect the complete change before updating the architecture; backslashes and non-printing characters use escaped notation.</p>
          <pre>{changes.review.diff}</pre>
          <details>
            <summary>Review details</summary>
            <dl>
              <dt>Base revision</dt><dd>{changes.review.base_revision}</dd>
              <dt>Candidate tree</dt><dd>{changes.review.candidate_tree}</dd>
              <dt>Change version</dt><dd>{changes.review.generation}</dd>
            </dl>
          </details>
          <div className="change-actions">
            <button className="inline-action" type="button" disabled={busy} onClick={onUpdate}>{busy ? 'Updating…' : 'Update architecture'}</button>
            {discardAction}
          </div>
        </section>
      )}
      {discardConfirming && (
        <div className="navigation-guard" role="dialog" aria-modal="true" aria-labelledby="discard-heading">
          <div className="discard-confirmation">
            <h2 id="discard-heading">Discard changes?</h2>
            <p>This clears every change in progress. The accepted architecture will not change.</p>
            <div className="button-group">
              <button className="secondary-action" type="button" onClick={onCancelDiscard}>Keep changes</button>
              <button className="destructive-action" type="button" disabled={busy} onClick={onDiscard}>Discard changes</button>
            </div>
          </div>
        </div>
      )}
    </section>
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
  if (code === 'relationship_label_required') return 'Add a label to each relationship before updating architecture.'
  if (code === 'relationship_target_required') return 'Choose a component for each relationship before updating architecture.'
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
