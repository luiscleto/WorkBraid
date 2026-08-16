import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const unlinkedProject = {
  source_root: '/tmp/example',
  project_name: 'example',
  known: false,
}

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

  it('offers a simple derived-context confirmation only after the user chooses setup', async () => {
    const fetchMock = mockResponses([unlinkedProject])
    render(<App />)

    await submitPath('  /tmp/example  ')
    expect(await screen.findByRole('heading', { name: 'Not linked' })).toBeInTheDocument()
    expect(screen.getByText('WorkBraid has not linked this folder to architecture.')).toBeInTheDocument()
    expect(screen.getByText('/tmp/example')).toBeInTheDocument()
    expect(screen.queryByText(/store (does not|doesn't) exist/i)).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Set up architecture' }))

    expect(screen.getByRole('heading', { name: 'Set up architecture?' })).toBeInTheDocument()
    expect(screen.getByText('example')).toBeInTheDocument()
    expect(screen.getByText('/tmp/example')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Not linked' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestBody(fetchMock, 0)).toEqual({ source_root: '/tmp/example' })
    expect(screen.getByLabelText('Project folder')).toHaveValue('/tmp/example')
  })

  it('initializes explicitly and shows the empty architecture with technical details collapsed', async () => {
    const revision = 'a'.repeat(40)
    const fetchMock = mockResponses([
      unlinkedProject,
      {
        source_root: '/tmp/example',
        project_name: 'example',
        state: 'empty',
        revision,
        component_count: 0,
      },
    ])
    render(<App />)
    await submitPath('/tmp/example')

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set up architecture' }))
    await user.click(screen.getByRole('button', { name: 'Set up' }))

    expect(await screen.findByRole('heading', { name: 'Architecture ready' })).toBeInTheDocument()
    expect(screen.getByText('This project has an empty architecture.')).toBeInTheDocument()
    const details = screen.getByText('Technical details').closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(within(details as HTMLElement).getByText(revision)).toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/projects/initialize')
    expect(requestBody(fetchMock, 1)).toEqual({ source_root: '/tmp/example' })
  })

  it('opens a known link without presenting a new-setup confirmation', async () => {
    const fetchMock = mockResponses([
      { ...unlinkedProject, known: true },
      { source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: 'b'.repeat(40), component_count: 0 },
    ])
    render(<App />)
    await submitPath('/tmp/example')

    expect(await screen.findByRole('heading', { name: 'Linked' })).toBeInTheDocument()
    expect(screen.getByText('WorkBraid found the architecture linked to this folder.')).toBeInTheDocument()
    expect(screen.queryByText(/Architecture ID/i)).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open architecture' }))
    expect(await screen.findByRole('heading', { name: 'Architecture ready' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Set up architecture?' })).not.toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/projects/initialize')
  })

  it('keeps an incomplete setup retryable in the same running application', async () => {
    const fetchMock = mockResponses([
      unlinkedProject,
      { code: 'setup_incomplete' },
      { source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: 'c'.repeat(40), component_count: 0 },
    ], [200, 500, 200])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set up architecture' }))
    await user.click(screen.getByRole('button', { name: 'Set up' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Setup did not finish')
    expect(alert).toHaveTextContent('WorkBraid could not finish setting up architecture. Try again.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Architecture ready' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('shows concise setup progress after confirmation', async () => {
    let finishSetup: ((response: Response) => void) | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(unlinkedProject), { status: 200 }))
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { finishSetup = resolve }))
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set up architecture' }))
    await user.click(screen.getByRole('button', { name: 'Set up' }))

    expect(screen.getByText('Setting up architecture…')).toBeInTheDocument()
    finishSetup?.(new Response(JSON.stringify({
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: 'd'.repeat(40), component_count: 0,
    }), { status: 200 }))
    expect(await screen.findByRole('heading', { name: 'Architecture ready' })).toBeInTheDocument()
  })

  it('keeps implementation terminology out of normal setup copy', async () => {
    mockResponses([unlinkedProject])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set up architecture' }))

    const sheet = screen.getByRole('article').textContent ?? ''
    expect(sheet).not.toMatch(/\b(store|association|bootstrap|manifest|canonical|uuid|accepted ref|accepted revision)\b/i)
  })

  it.each([
    ['architecture_invalid', 409, 'Architecture needs attention', 'files conflict with the expected format'],
    ['architecture_unsupported', 422, 'Architecture not supported yet', 'contains components that this version of WorkBraid cannot open yet'],
  ])('shows %s clearly without pretending an empty architecture loaded', async (code, status, heading, message) => {
    mockResponses([unlinkedProject, { code }], [200, status])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set up architecture' }))
    await user.click(screen.getByRole('button', { name: 'Set up' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(heading)
    expect(alert).toHaveTextContent(message)
    expect(screen.queryByText('This project has an empty architecture.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it.each([
    ['path_required', 'Enter a folder path.'],
    ['path_relative', 'Use a full path, starting with /.'],
    ['path_missing', 'That folder is not on this computer.'],
    ['path_not_directory', 'That path is a file. Choose the project folder.'],
    ['origin_mismatch', 'Open WorkBraid at the address printed in the terminal.'],
  ])('maps backend code %s to an operator sentence', async (code, message) => {
    mockResponses([{ code }], [400])
    render(<App />)

    await submitPath(code === 'path_required' ? '' : '/tmp/example')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That path did not work')
    expect(alert).toHaveTextContent(message)
  })

  it('maps unknown response shapes and network failures to one generic sentence', async () => {
    mockResponses([{ error: 'request body must be valid JSON' }], [400])
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

  it('shows concise progress for lookup and setup', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => undefined))
    render(<App />)

    await submitPath('/tmp/example')

    expect(screen.getByRole('button', { name: 'Looking up…' })).toBeDisabled()
    expect(screen.getByText('Looking up this folder…')).toBeInTheDocument()
  })
})

function mockResponses(bodies: unknown[], statuses: number[] = []) {
  let index = 0
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const current = index++
    return new Response(JSON.stringify(bodies[current]), {
      status: statuses[current] ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

function requestPath(fetchMock: ReturnType<typeof mockResponses>, index: number) {
  return String(fetchMock.mock.calls[index]?.[0])
}

function requestBody(fetchMock: ReturnType<typeof mockResponses>, index: number) {
  const options = fetchMock.mock.calls[index]?.[1]
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
