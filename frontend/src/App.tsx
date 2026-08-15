import { FormEvent, useState } from 'react'

type Inspection = {
  source_root: string
  known: boolean
  store_id?: string
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
    setState({ kind: 'loading' })

    try {
      const response = await fetch('/api/projects/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_root: sourceRoot }),
      })
      const result = (await response.json()) as Inspection | { error?: string }
      if (!response.ok) {
        throw new Error('error' in result && result.error ? result.error : 'WorkBraid could not inspect this project')
      }
      setState({ kind: 'inspection', value: result as Inspection })
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'WorkBraid could not inspect this project',
      })
    }
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">WorkBraid</p>
        <h1>Open a project</h1>
        <p className="introduction">
          Choose an existing local project root to check its Architecture association. WorkBraid will not change the project.
        </p>
      </header>

      <form onSubmit={inspectProject}>
        <label htmlFor="source-root">Absolute project-root path</label>
        <div className="input-row">
          <input
            id="source-root"
            name="source-root"
            type="text"
            value={sourceRoot}
            onChange={(event) => setSourceRoot(event.target.value)}
            placeholder="/home/alice/src/example-project"
            autoComplete="off"
            required
          />
          <button type="submit" disabled={state.kind === 'loading'}>
            {state.kind === 'loading' ? 'Opening…' : 'Open project'}
          </button>
        </div>
      </form>

      <section className="result" aria-live="polite" aria-busy={state.kind === 'loading'}>
        {state.kind === 'idle' && <p>Enter an absolute local path to begin.</p>}
        {state.kind === 'loading' && <p>Checking this project…</p>}
        {state.kind === 'error' && (
          <div className="message error" role="alert">
            <h2>Could not open project</h2>
            <p>{state.message}</p>
          </div>
        )}
        {state.kind === 'inspection' && !state.value.known && (
          <div className="message neutral">
            <h2>No association known</h2>
            <p>WorkBraid has no known Architecture store association for this project.</p>
            <p className="path">{state.value.source_root}</p>
          </div>
        )}
        {state.kind === 'inspection' && state.value.known && (
          <div className="message known">
            <h2>Association known</h2>
            <p>WorkBraid knows which private Architecture store is associated with this project.</p>
            <dl>
              <dt>Project root</dt>
              <dd>{state.value.source_root}</dd>
              <dt>Store ID</dt>
              <dd>{state.value.store_id}</dd>
            </dl>
          </div>
        )}
      </section>
    </main>
  )
}
