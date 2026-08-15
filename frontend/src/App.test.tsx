import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('reports an unassociated project without claiming no store exists', async () => {
    mockResponse({ source_root: '/tmp/example', known: false })
    render(<App />)

    await submitPath('/tmp/example')

    expect(await screen.findByRole('heading', { name: 'No association known' })).toBeInTheDocument()
    expect(screen.getByText('WorkBraid has no known Architecture store association for this project.')).toBeInTheDocument()
    expect(screen.queryByText(/does not exist/i)).not.toBeInTheDocument()
  })

  it('shows a known association returned by SQLite', async () => {
    mockResponse({
      source_root: '/tmp/example',
      known: true,
      store_id: 'a0b38e04-54bd-464d-8a8f-8f2e78e653ea',
    })
    render(<App />)

    await submitPath('/tmp/example')

    expect(await screen.findByRole('heading', { name: 'Association known' })).toBeInTheDocument()
    expect(screen.getByText('a0b38e04-54bd-464d-8a8f-8f2e78e653ea')).toBeInTheDocument()
  })

  it('shows validation errors from the backend', async () => {
    mockResponse({ error: 'source root must be an absolute path' }, 400)
    render(<App />)

    await submitPath('relative/project')

    expect(await screen.findByRole('alert')).toHaveTextContent('source root must be an absolute path')
  })

  it('shows loading and backend failure states', async () => {
    let rejectRequest: ((reason: Error) => void) | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject
        }),
    )
    render(<App />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Absolute project-root path'), '/tmp/example')
    await user.click(screen.getByRole('button', { name: 'Open project' }))
    expect(screen.getByText('Checking this project…')).toBeInTheDocument()

    rejectRequest?.(new Error('backend unavailable'))
    expect(await screen.findByRole('alert')).toHaveTextContent('backend unavailable')
  })
})

function mockResponse(body: unknown, status = 200) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

async function submitPath(path: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Absolute project-root path'), path)
  await user.click(screen.getByRole('button', { name: 'Open project' }))
}
