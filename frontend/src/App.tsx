import { FormEvent, useState } from 'react'

type Inspection = {
  source_root: string
  known: boolean
  store_id?: string
}

type ErrorCode =
  | 'path_required'
  | 'path_relative'
  | 'path_missing'
  | 'path_not_directory'
  | 'origin_mismatch'
  | 'lookup_failed'

type ErrorPayload = {
  code?: string
}

type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'inspection'; value: Inspection }
  | { kind: 'error'; message: string }

export function App() {
  const [sourceRoot, setSourceRoot] = useState('')
  const [state, setState] = useState<ViewState>({ kind: 'idle' })

  async function inspectProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedSourceRoot = sourceRoot.trim()
    setSourceRoot(trimmedSourceRoot)
    setState({ kind: 'loading' })

    try {
      const response = await fetch('/api/projects/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_root: trimmedSourceRoot }),
      })
      const result = (await response.json()) as Inspection | ErrorPayload
      if (!response.ok) {
        setState({ kind: 'error', message: messageForError('code' in result ? result.code : undefined) })
        return
      }
      setState({ kind: 'inspection', value: result as Inspection })
    } catch {
      setState({ kind: 'error', message: messageForError() })
    }
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
              }}
              placeholder="/home/alice/src/example-project"
              autoComplete="off"
              aria-describedby="folder-hint"
            />
            <button type="submit" disabled={state.kind === 'loading'}>
              {state.kind === 'loading' ? 'Looking up…' : 'Open'}
            </button>
          </div>
          <p className="field-hint" id="folder-hint">
            Paste the full folder path, starting with /.
          </p>
        </form>

        {state.kind !== 'idle' && (
          <section className={`result-note ${state.kind === 'error' ? 'error' : ''}`} aria-live="polite">
            {state.kind === 'loading' && <p className="lookup-status">Looking up this folder…</p>}
            {state.kind === 'error' && (
              <div className="message" role="alert">
                <h2>That path did not work</h2>
                <p>{state.message}</p>
              </div>
            )}
            {state.kind === 'inspection' && !state.value.known && (
              <div className="message">
                <h2>Not linked</h2>
                <p>WorkBraid has not linked this folder to architecture.</p>
                <p className="folder-path">{state.value.source_root}</p>
              </div>
            )}
            {state.kind === 'inspection' && state.value.known && (
              <div className="message">
                <h2>Linked</h2>
                <p>WorkBraid found the architecture linked to this folder.</p>
                <p className="folder-path">{state.value.source_root}</p>
              </div>
            )}
          </section>
        )}
      </article>
    </main>
  )
}

const errorMessages: Record<ErrorCode, string> = {
  path_required: 'Enter a folder path.',
  path_relative: 'Use a full path, starting with /.',
  path_missing: 'That folder is not on this computer.',
  path_not_directory: 'That path is a file. Choose the project folder.',
  origin_mismatch: 'Open WorkBraid at the address printed in the terminal.',
  lookup_failed: "WorkBraid couldn't look that up. Try again.",
}

function messageForError(code?: string) {
  if (code && Object.prototype.hasOwnProperty.call(errorMessages, code)) {
    return errorMessages[code as ErrorCode]
  }
  return errorMessages.lookup_failed
}
