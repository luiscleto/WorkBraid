import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('keeps the idle screen to one sheet without empty result chrome', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Open a project' })).toBeInTheDocument()
    expect(screen.getByText('Paste the full folder path, starting with /.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Not linked' })).not.toBeInTheDocument()
  })

  it('reports that the folder is not linked without claiming no architecture exists', async () => {
    const fetchMock = mockResponse({ source_root: '/tmp/example', known: false })
    render(<App />)

    await submitPath('  /tmp/example  ')

    expect(await screen.findByRole('heading', { name: 'Not linked' })).toBeInTheDocument()
    expect(screen.getByText('WorkBraid has not linked this folder to architecture.')).toBeInTheDocument()
    expect(screen.getByText('/tmp/example')).toBeInTheDocument()
    expect(screen.queryByText(/store (does not|doesn't) exist/i)).not.toBeInTheDocument()
    expect(requestBody(fetchMock)).toEqual({ source_root: '/tmp/example' })
    expect(screen.getByLabelText('Project folder')).toHaveValue('/tmp/example')
  })

  it('shows a linked folder returned by SQLite in human language', async () => {
    mockResponse({
      source_root: '/tmp/example',
      known: true,
      store_id: 'a0b38e04-54bd-464d-8a8f-8f2e78e653ea',
    })
    render(<App />)

    await submitPath('/tmp/example')

    expect(await screen.findByRole('heading', { name: 'Linked' })).toBeInTheDocument()
    expect(screen.getByText('WorkBraid found the architecture linked to this folder.')).toBeInTheDocument()
    expect(screen.getByText('/tmp/example')).toBeInTheDocument()
    expect(screen.queryByText('Architecture ID')).not.toBeInTheDocument()
    expect(screen.queryByText('a0b38e04-54bd-464d-8a8f-8f2e78e653ea')).not.toBeInTheDocument()
  })

  it.each([
    ['path_required', 'Enter a folder path.'],
    ['path_relative', 'Use a full path, starting with /.'],
    ['path_missing', 'That folder is not on this computer.'],
    ['path_not_directory', 'That path is a file. Choose the project folder.'],
    ['origin_mismatch', 'Open WorkBraid at the address printed in the terminal.'],
  ])('maps backend code %s to an operator sentence', async (code, message) => {
    mockResponse({ code }, 400)
    render(<App />)

    await submitPath(code === 'path_required' ? '' : '/tmp/example')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That path did not work')
    expect(alert).toHaveTextContent(message)
  })

  it('maps unknown response shapes and network failures to one generic sentence', async () => {
    mockResponse({ error: 'request body must be valid JSON' }, 400)
    const { unmount } = render(<App />)

    await submitPath('/tmp/example')
    expect(await screen.findByRole('alert')).toHaveTextContent("WorkBraid couldn't look that up. Try again.")

    unmount()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('backend unavailable'))
    render(<App />)

    await submitPath('/tmp/example')
    expect(await screen.findByRole('alert')).toHaveTextContent("WorkBraid couldn't look that up. Try again.")
    expect(screen.queryByText('backend unavailable')).not.toBeInTheDocument()
  })

  it('shows concise lookup progress', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => undefined))
    render(<App />)

    await submitPath('/tmp/example')

    expect(screen.getByRole('button', { name: 'Looking up…' })).toBeDisabled()
    expect(screen.getByText('Looking up this folder…')).toBeInTheDocument()
  })
})

function mockResponse(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function requestBody(fetchMock: ReturnType<typeof mockResponse>) {
  const options = fetchMock.mock.calls[0]?.[1]
  return JSON.parse(String(options?.body)) as unknown
}

async function submitPath(path: string) {
  const user = userEvent.setup()
  const input = screen.getByLabelText('Project folder')
  if (path) {
    await user.type(input, path)
  }
  await user.click(screen.getByRole('button', { name: 'Open' }))
}
