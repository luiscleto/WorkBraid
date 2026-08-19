import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const graphHarness = vi.hoisted(() => ({
  calls: [] as Array<{ elements?: unknown[] }>,
  select: undefined as undefined | ((event: { target: { id: () => string } }) => void),
}))

vi.mock('cytoscape', () => ({
  default: (options: { elements?: unknown[] }) => {
    graphHarness.calls.push(options)
    return {
      on: (_event: string, _selector: string, callback: typeof graphHarness.select) => { graphHarness.select = callback },
      destroy: () => undefined,
      fit: () => undefined,
      $: () => ({ unselect: () => undefined }),
      getElementById: () => ({ select: () => undefined }),
    }
  },
}))

const unlinkedProject = {
  source_root: '/tmp/example',
  project_name: 'example',
  known: false,
}

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    graphHarness.calls.length = 0
    graphHarness.select = undefined
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

    expect(await screen.findByRole('heading', { name: 'Start with a component' })).toBeInTheDocument()
    expect(screen.getByText('The architecture has no components yet.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Open a project' })).not.toBeInTheDocument()
    const details = screen.getByText('Technical details').closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(within(details as HTMLElement).getByText(revision)).toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/projects/initialize')
    expect(requestBody(fetchMock, 1)).toEqual({ source_root: '/tmp/example' })
  })

  it('opens a known architecture immediately without presenting setup controls', async () => {
    const revision = 'b'.repeat(40)
    const fetchMock = mockResponses([
      { source_root: '/tmp/example', project_name: 'example', state: 'empty', revision, component_count: 0 },
    ])
    render(<App />)
    await submitPath('/tmp/example')

    expect(await screen.findByRole('heading', { name: 'Start with a component' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Set up architecture?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set up|retry|repair|reset/i })).not.toBeInTheDocument()
    expect(within(screen.getByText('Technical details').closest('details') as HTMLElement).getByText(revision)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestPath(fetchMock, 0)).toBe('/api/projects/open')
  })

  it('shows a compact read-only component title inventory', async () => {
    const revision = 'e'.repeat(40)
    mockResponses([{
      source_root: '/tmp/example',
      project_name: 'example',
      state: 'ready',
      revision,
      component_count: 3,
      component_titles: ['API', 'Worker', 'API'],
      components: [
        { id: 'api-1', title: 'API', description: '\nAPI body\n' },
        { id: 'worker', title: 'Worker', description: 'Worker body\n' },
        { id: 'api-2', title: 'API', description: '' },
      ],
    }])
    render(<App />)
    await submitPath('/tmp/example')

    const index = await screen.findByRole('navigation', { name: 'Components' })
    expect(within(index).getAllByRole('listitem').map((item) => item.querySelector('span')?.textContent)).toEqual(['API', 'Worker', 'API'])
    expect(screen.queryByText('This project has an empty architecture.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add component' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit component' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit map' })).toBeInTheDocument()
    expect(screen.queryByText(/markdown|frontmatter|uuid|filename|relationship/i)).not.toBeInTheDocument()
    const details = screen.getByText('Technical details').closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(within(details as HTMLElement).getByText(revision)).toBeInTheDocument()
    const documentation = screen.getByRole('heading', { name: 'API' }).closest('article') as HTMLElement
    expect(documentation.nextElementSibling).toBe(details)
  })

  it('keeps accepted components separate while one edit and one addition accumulate as changes in progress', async () => {
    const accepted = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: 'f'.repeat(40),
      component_count: 1, component_titles: ['API'],
      components: [{ id: 'api-id', title: 'API', description: '\nAccepted body\n' }],
    }
    const edited = {
      ...accepted,
      changes: {
        valid: true,
        components: [{ id: 'api-id', title: 'Gateway', description: '\nChanged body\n', new: false }],
      },
    }
    const both = {
      ...accepted,
      changes: {
        valid: true,
        components: [
          ...edited.changes.components,
          { id: 'worker-id', title: 'Worker', description: '\nDoes work\n', new: true },
        ],
      },
    }
    const fetchMock = mockResponses([accepted, edited, both])
    render(<App />)
    await submitPath('/tmp/example')

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit component' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Gateway')
    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), 'Changed body\n')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(await screen.findByRole('heading', { name: 'Changes in progress' })).toBeInTheDocument()
    expect(screen.getByText('These changes have not updated the architecture yet.')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Components' })).getByText('API')).toBeInTheDocument()
    expect(screen.getByText('Gateway')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add component' }))
    await user.type(screen.getByLabelText('Title'), 'Worker')
    await user.type(screen.getByLabelText('Description'), '\nDoes work\n')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(await screen.findByText('Worker')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Changes in progress' }).closest('section') as HTMLElement).getAllByRole('listitem')).toHaveLength(2)
    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/components/edit')
    expect(requestBody(fetchMock, 1)).toEqual({
      source_root: '/tmp/example', component_id: 'api-id', title: 'Gateway', description: '\nChanged body\n',
      title_changed: true, description_changed: true,
    })
    expect(requestPath(fetchMock, 2)).toBe('/api/architecture/components/add')
    expect(graphHarness.calls).toHaveLength(1)
    expect(graphHarness.calls[0].elements).toEqual([{ data: { id: 'api-id', label: 'API' } }])
  })

  it('sends explicit title-only intent without an untouched CRLF description', async () => {
    const accepted = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: 'f'.repeat(40),
      component_count: 1, component_titles: ['API'],
      components: [{ id: 'api-id', title: 'API', description: '\r\nExact body  \r\nSecond exact\r\n' }],
    }
    const edited = {
      ...accepted,
      changes: {
        valid: true,
        components: [{ id: 'api-id', title: 'Gateway', description: accepted.components[0].description, new: false }],
      },
    }
    const fetchMock = mockResponses([accepted, edited])
    render(<App />)
    await submitPath('/tmp/example')

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit component' }))
    expect(screen.getByLabelText('Description')).toHaveValue('Exact body  \nSecond exact\n')
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Gateway')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(requestBody(fetchMock, 1)).toEqual({
      source_root: '/tmp/example',
      component_id: 'api-id',
      title: 'Gateway',
      title_changed: true,
      description_changed: false,
    })
  })

  it('hides one structural body separator while preserving it in a description edit', async () => {
    const accepted = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: 'f'.repeat(40),
      component_count: 1, component_titles: ['API'],
      components: [{ id: 'api-id', title: 'API', description: '\nOriginal body\n' }],
    }
    const edited = {
      ...accepted,
      changes: {
        valid: true,
        components: [{ id: 'api-id', title: 'API', description: '\nChanged body\n', new: false }],
      },
    }
    const fetchMock = mockResponses([accepted, edited])
    render(<App />)
    await submitPath('/tmp/example')

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit component' }))
    expect(screen.getByLabelText('Description')).toHaveValue('Original body\n')
    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), 'Changed body')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(requestBody(fetchMock, 1)).toEqual({
      source_root: '/tmp/example',
      component_id: 'api-id',
      description: '\nChanged body',
      title_changed: false,
      description_changed: true,
    })
  })

  it('retrieves invalid backend-held changes after a browser reload and keeps them correctable', async () => {
    const accepted = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '1'.repeat(40),
      component_count: 0, component_titles: [], components: [],
    }
    const invalid = {
      ...accepted,
      changes: {
        valid: false,
        validation_code: 'title_required',
        validation_item: 'new-id',
        components: [{ id: 'new-id', title: '', description: 'Useful description\n', new: true }],
      },
    }
    const invalidWithWorker = {
      ...accepted,
      changes: {
        valid: false,
        validation_code: 'title_required',
        validation_item: 'new-id',
        components: [
          { id: 'new-id', title: '', description: 'Useful description\n', new: true },
          { id: 'worker-id', title: 'Worker', description: 'Does work.\n', new: true },
        ],
      },
    }
    const corrected = {
      ...accepted,
      changes: {
        valid: true,
        components: [
          { id: 'new-id', title: 'Gateway', description: 'Useful description\n', new: true },
          { id: 'worker-id', title: 'Worker', description: 'Does work.\n', new: true },
        ],
      },
    }
    mockResponses([accepted, invalid, invalidWithWorker, invalidWithWorker, corrected])
    const first = render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add component' }))
    await user.type(screen.getByLabelText('Title'), '   ')
    await user.type(screen.getByLabelText('Description'), 'Useful description')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))
    expect(await screen.findByRole('heading', { name: 'Changes in progress' })).toBeInTheDocument()
    expect(screen.getByText('Untitled component')).toBeInTheDocument()
    expect(screen.queryByText('Add a title.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit component' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add component' }))
    await user.type(screen.getByLabelText('Title'), 'Worker')
    await user.type(screen.getByLabelText('Description'), 'Does work.')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))
    expect(await screen.findByText('Worker')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit component' })).not.toBeInTheDocument()

    first.unmount()
    render(<App />)
    await submitPath('/tmp/example')
    expect(await screen.findByRole('heading', { name: 'Changes in progress' })).toBeInTheDocument()
    expect(screen.getByText('Untitled component')).toBeInTheDocument()
    expect(screen.getByText('Worker')).toBeInTheDocument()
    expect(screen.queryByText('Add a title.')).not.toBeInTheDocument()
    const reloadedUser = userEvent.setup()
    const untitledItem = screen.getByText('Untitled component').closest('li') as HTMLElement
    await reloadedUser.click(within(untitledItem).getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Title')).toHaveValue('')
    await reloadedUser.type(screen.getByLabelText('Title'), 'Gateway')
    await reloadedUser.click(screen.getByRole('button', { name: 'Keep change' }))
    expect(await screen.findByText('Gateway')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('reviews the complete canonical diff before deliberately updating architecture', async () => {
    const base = '1'.repeat(40)
    const candidate = '2'.repeat(40)
    const successor = '3'.repeat(40)
    const pending = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: base,
      component_count: 0, component_titles: [], components: [],
      changes: { valid: true, components: [{ id: 'worker-id', title: 'Worker', description: 'Does work.\n', new: true }] },
    }
    const reviewed = {
      ...pending,
      changes: {
        ...pending.changes,
        review: {
          diff: 'diff --git a/components/worker.md b/components/worker.md\n+id: "worker-id"\n+# Worker\n',
          base_revision: base,
          candidate_tree: candidate,
          generation: 1,
        },
      },
    }
    const accepted = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: successor,
      component_count: 1, component_titles: ['Worker'], components: [{ id: 'worker-id', title: 'Worker', description: 'Does work.\n' }],
      parent_diff: reviewed.changes.review.diff,
    }
    const fetchMock = mockResponses([pending, reviewed, accepted])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Review changes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update architecture' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Review changes' }))

    expect(await screen.findByRole('heading', { name: 'Review changes' })).toBeInTheDocument()
    expect(screen.getByText(/diff --git a\/components\/worker\.md/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update architecture' })).toBeInTheDocument()
    const reviewDetails = screen.getByText('Review details').closest('details') as HTMLElement
    expect(within(reviewDetails).getByText(base)).toBeInTheDocument()
    expect(within(reviewDetails).getByText(candidate)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update architecture' }))

    expect(await screen.findByRole('heading', { name: 'Worker' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Changes in progress' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update architecture' })).not.toBeInTheDocument()
    const technicalDetails = screen.getByText('Technical details').closest('details') as HTMLElement
    expect(within(technicalDetails).getByText(successor)).toBeInTheDocument()
    expect(within(technicalDetails).getByRole('heading', { name: 'Parent diff' })).toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/review')
    expect(requestPath(fetchMock, 2)).toBe('/api/architecture/accept')
    expect(requestBody(fetchMock, 2)).toEqual({
      source_root: '/tmp/example', base_revision: base, candidate_tree: candidate, generation: 1,
    })
  })

  it('turns an invalid quiet pending title into actionable guidance only at review', async () => {
    const pending = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '1'.repeat(40),
      component_count: 0, component_titles: [], components: [],
      changes: { valid: false, validation_code: 'title_required', validation_item: 'worker-id', components: [{ id: 'worker-id', title: '', description: '', new: true }] },
    }
    const blocked = { ...pending, action_error: 'review_failed', changes: { ...pending.changes, review_blocker: 'title_required' } }
    mockResponses([pending, blocked], [200, 422])
    render(<App />)
    await submitPath('/tmp/example')

    expect(await screen.findByText('Untitled component')).toBeInTheDocument()
    expect(screen.queryByText(/add a title/i)).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Review changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Add a title to the untitled component before updating architecture.')
    expect(screen.queryByRole('button', { name: 'Update architecture' })).not.toBeInTheDocument()
    expect(screen.getByText('Untitled component')).toBeInTheDocument()
  })

  it('marks a stale accepted view read-only while preserving visible changes in progress', async () => {
    const stale = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '1'.repeat(40), stale: true,
      action_error: 'architecture_stale', component_count: 1, component_titles: ['Gateway'],
      components: [{ id: 'gateway-id', title: 'Gateway', description: 'Accepted.\n' }],
      changes: { valid: true, components: [{ id: 'gateway-id', title: 'Public Gateway', description: 'Pending.\n', new: false }] },
    }
    mockResponses([stale])
    render(<App />)
    await submitPath('/tmp/example')

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((alert) => alert.textContent?.includes('The current architecture could not be loaded. This earlier view is read-only.'))).toBe(true)
    expect(alerts.some((alert) => alert.textContent?.includes('These changes are out of date because the architecture changed.'))).toBe(true)
    expect(screen.getByText('Public Gateway')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|add component|review changes|update architecture/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/merge|rebase|overwrite|repair/i)).not.toBeInTheDocument()
  })

  it('refreshes every accepted projection together only after the explicit action', async () => {
    const revisionA = 'a'.repeat(40)
    const revisionB = 'b'.repeat(40)
    const acceptedA = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: revisionA,
      component_count: 2, component_titles: ['Gateway A', 'Worker A'],
      components: [
        { id: 'gateway', title: 'Gateway A', filename: 'gateway.md', description: 'Accepted A.\n', relationships: [{ target_id: 'worker', label: 'calls A' }] },
        { id: 'worker', title: 'Worker A', filename: 'worker.md', description: 'Worker A.\n', relationships: [] },
      ],
    }
    const acceptedB = {
      ...acceptedA, revision: revisionB, component_titles: ['Gateway B', 'Records B'],
      components: [
        { id: 'gateway', title: 'Gateway B', filename: 'gateway.md', description: 'Accepted B.\n', relationships: [{ target_id: 'records', label: 'reads from' }] },
        { id: 'records', title: 'Records B', filename: 'records.md', description: 'Records B.\n', relationships: [] },
      ],
    }
    const fetchMock = mockResponses([acceptedA, acceptedB])
    render(<App />)
    await submitPath('/tmp/example')

    expect(screen.getByText('Accepted A.')).toBeInTheDocument()
    expect(screen.queryByText('Gateway B')).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findAllByText('Gateway B')).toHaveLength(2)
    expect(screen.getByText('Accepted B.')).toBeInTheDocument()
    expect(screen.queryByText('Gateway A')).not.toBeInTheDocument()
    expect(graphHarness.calls.at(-1)?.elements).toEqual(expect.arrayContaining([
      { data: { id: 'gateway', label: 'Gateway B' } },
      { data: { id: 'projection:gateway:records:0', source: 'gateway', target: 'records', label: 'reads from', distance: 0 } },
    ]))
    expect(within(screen.getByText('Technical details').closest('details') as HTMLElement).getByText(revisionB)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/refresh')
    expect(requestBody(fetchMock, 1)).toEqual({ source_root: '/tmp/example' })
  })

  it.each([
    ['Title', async (user: ReturnType<typeof userEvent.setup>) => user.type(screen.getByLabelText('Title'), ' changed')],
    ['Description', async (user: ReturnType<typeof userEvent.setup>) => user.type(screen.getByLabelText('Description'), ' changed')],
    ['relationship', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Add relationship' }))
      await user.selectOptions(screen.getByLabelText('Target'), 'worker')
      await user.type(screen.getByLabelText('Label'), 'calls')
    }],
  ])('guards dirty %s values before Refresh', async (_field, makeDirty) => {
    const workspace = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '9'.repeat(40), component_count: 2,
      component_titles: ['Gateway', 'Worker'],
      components: [
        { id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Accepted.\n', relationships: [] },
        { id: 'worker', title: 'Worker', filename: 'worker.md', description: 'Works.\n', relationships: [] },
      ],
    }
    const fetchMock = mockResponses([workspace, workspace])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit component' }))
    await makeDirty(user)

    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave without keeping?')
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('heading', { name: 'Edit component' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await user.click(screen.getByRole('button', { name: 'Leave without keeping' }))
    expect(await screen.findByRole('heading', { name: 'Gateway' })).toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/refresh')
  })

  it('keeps stale pending work inspectable in its old context while accepted projections show the replacement', async () => {
    const current = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: 'b'.repeat(40),
      component_count: 2, component_titles: ['Gateway B', 'Target B'],
      components: [
        { id: 'gateway', title: 'Gateway B', filename: 'gateway.md', description: 'Current.\n', relationships: [] },
        { id: 'target', title: 'Target B', filename: 'target.md', description: 'Current target.\n', relationships: [] },
      ],
      changes: {
        stale: true, valid: true,
        components: [{ id: 'gateway', title: 'Pending Gateway A', description: 'Pending old body.\n', new: false, relationships: [{ target_id: 'target', label: 'old calls' }] }],
        relationship_targets: [
          { id: 'gateway', title: 'Gateway A' },
          { id: 'target', title: 'Target A' },
        ],
      },
    }
    mockResponses([current])
    render(<App />)
    await submitPath('/tmp/example')

    expect(await screen.findByText('These changes started from an older architecture and are read-only.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Components' })).toHaveTextContent('Gateway B')
    expect(screen.queryByRole('button', { name: /add component|review changes|update architecture/i })).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('heading', { name: 'Change details' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Pending Gateway A')
    expect(screen.getByLabelText('Title')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Description')).toHaveValue('Pending old body.\n')
    expect(screen.getByLabelText('Target')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Target A' })).toBeInTheDocument()
    expect(screen.getByLabelText('Label')).toHaveValue('old calls')
    expect(screen.queryByRole('button', { name: 'Keep change' })).not.toBeInTheDocument()
  })

  it.each([
    ['refresh_invalid', 'The current architecture could not be read. This earlier view is read-only.'],
    ['refresh_unsupported', 'The current architecture uses features this version of WorkBraid cannot open.'],
    ['refresh_unavailable', 'The current architecture could not be found. This earlier view is read-only.'],
    ['refresh_changed', 'Architecture changed again while WorkBraid was refreshing. Refresh once more.'],
  ])('presents conclusive %s as a non-current read-only reference', async (actionError, message) => {
    const current = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: 'a'.repeat(40),
      component_count: 1, component_titles: ['Gateway'],
      components: [{ id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Earlier.\n', relationships: [] }],
    }
    mockResponses([current, { ...current, stale: true, action_error: actionError }], [200, 409])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((alert) => alert.textContent).join(' ')).toContain(message)
    expect(screen.queryByRole('button', { name: /add component|edit component|review changes|update architecture/i })).not.toBeInTheDocument()
    expect(screen.getByText('Earlier.')).toBeInTheDocument()
  })

  it('reports an indeterminate Refresh failure without claiming the loaded view is stale', async () => {
    const current = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: 'a'.repeat(40),
      component_count: 1, component_titles: ['Gateway'],
      components: [{ id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Current.\n', relationships: [] }],
    }
    mockResponses([current, { ...current, action_error: 'refresh_failed' }], [200, 503])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("WorkBraid couldn't check for architecture changes. Try Refresh again.")
    expect(screen.queryByText(/earlier view is read-only/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit component' })).toBeInTheDocument()
  })

  it('uses stable identities for accepted index and map projection with collision-only context', async () => {
    mockResponses([{
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '7'.repeat(40),
      component_count: 3, component_titles: ['Gateway', 'Gateway', 'Worker'],
      components: [
        { id: 'gateway-a', title: 'Gateway', filename: 'public.md', description: 'Public body.\n', relationships: [{ target_id: 'worker', label: 'calls' }] },
        { id: 'gateway-b', title: 'Gateway', filename: 'private.md', description: 'Private body.\n', relationships: [{ target_id: 'worker', label: 'reads from' }] },
        { id: 'worker', title: 'Worker', filename: 'worker.md', description: 'Worker body.\n', relationships: [] },
      ],
    }])
    render(<App />)
    await submitPath('/tmp/example')

    const index = await screen.findByRole('navigation', { name: 'Components' })
    expect(within(index).getByRole('button', { name: 'Gateway, public.md' })).toBeInTheDocument()
    expect(within(index).getByRole('button', { name: 'Gateway, private.md' })).toBeInTheDocument()
    expect(within(index).getByRole('button', { name: 'Worker' })).toBeInTheDocument()
    expect(within(index).queryByText('worker.md')).not.toBeInTheDocument()
    expect(screen.getByText('Public body.')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(within(index).getByRole('button', { name: 'Gateway, private.md' }))
    expect(screen.getByText('Private body.')).toBeInTheDocument()
    expect(graphHarness.calls.at(-1)?.elements).toHaveLength(5)

    act(() => graphHarness.select?.({ target: { id: () => 'worker' } }))
    expect(screen.getByRole('heading', { name: 'Worker' })).toBeInTheDocument()
    expect(screen.getByText('Worker body.')).toBeInTheDocument()
  })

  it('authors ordered outgoing relationships with backend-supplied identity choices', async () => {
    const accepted = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '7'.repeat(40),
      component_count: 4, component_titles: ['Gateway', 'Worker', 'Records', 'Records'],
      components: [
        { id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Gateway body.\n', relationships: [
          { target_id: 'worker', label: '  calls: primary  ' },
          { target_id: 'records-a', label: 'reads from' },
        ] },
        { id: 'worker', title: 'Worker', filename: 'worker.md', description: 'Worker body.\n', relationships: [] },
        { id: 'records-a', title: 'Records', filename: 'records-a.md', description: 'A.\n', relationships: [] },
        { id: 'records-b', title: 'Records', filename: 'records-b.md', description: 'B.\n', relationships: [] },
      ],
      changes: {
        valid: true,
        components: [{ id: 'queue', title: 'Queue', description: 'Pending.\n', relationships: [], new: true }],
        relationship_targets: [
          { id: 'gateway', title: 'Gateway' },
          { id: 'worker', title: 'Worker' },
          { id: 'records-a', title: 'Records', context: 'records-a.md' },
          { id: 'records-b', title: 'Records', context: 'records-b.md' },
          { id: 'queue', title: 'Queue', new: true },
        ],
      },
    }
    const kept = {
      ...accepted,
      changes: {
        ...accepted.changes,
        components: [
          ...accepted.changes.components,
          { id: 'gateway', title: 'Gateway', description: 'Gateway body.\n', new: false, relationships: [
            { target_id: 'worker', label: '  calls: primary  ' },
            { target_id: 'queue', label: 'publishes\n events' },
          ] },
        ],
      },
    }
    const fetchMock = mockResponses([accepted, kept])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Gateway' }))
    await user.click(screen.getByRole('button', { name: 'Edit component' }))
    const relationships = screen.getByRole('group', { name: 'Outgoing relationships' })
	expect(within(relationships).getAllByRole('option', { name: 'Queue — New component' })).toHaveLength(2)
	expect(within(relationships).getAllByRole('option', { name: 'Records — records-a.md' })).toHaveLength(2)
	expect(within(relationships).getAllByRole('option', { name: 'Records — records-b.md' })).toHaveLength(2)
	expect(within(relationships).getAllByRole('option', { name: 'Worker' })).toHaveLength(2)
    expect(within(relationships).queryByText(/gateway\.md|worker\.md/)).not.toBeInTheDocument()

    await user.click(within(relationships).getByRole('button', { name: 'Remove relationship 2' }))
    await user.click(within(relationships).getByRole('button', { name: 'Add relationship' }))
    const targets = within(relationships).getAllByLabelText('Target')
    const labels = within(relationships).getAllByLabelText('Label')
    await user.selectOptions(targets[1], 'queue')
    await user.type(labels[1], 'publishes{enter} events')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/components/edit')
    expect(requestBody(fetchMock, 1)).toEqual({
      source_root: '/tmp/example', component_id: 'gateway', relationships_changed: true,
      relationships: [
        { target_id: 'worker', label: '  calls: primary  ' },
        { target_id: 'queue', label: 'publishes\n events' },
      ],
      title_changed: false, description_changed: false,
    })
    expect(graphHarness.calls.at(-1)?.elements).toHaveLength(6)
    expect(graphHarness.calls.at(-1)?.elements).toEqual(expect.arrayContaining([
      { data: { id: 'gateway', label: 'Gateway' } },
	  { data: { id: 'projection:gateway:worker:0', source: 'gateway', target: 'worker', label: '  calls: primary  ', distance: 0 } },
    ]))
    expect(graphHarness.calls.at(-1)?.elements).not.toEqual(expect.arrayContaining([{ data: expect.objectContaining({ id: 'queue' }) }]))
  })

  it.each([
    {
      code: 'relationship_label_required',
      field: 'label',
      message: 'Add a label to this relationship.',
      sourceID: 'gateway',
      sourceName: 'Gateway',
      components: [{ id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Body.\n', relationships: [] }],
      targets: [{ id: 'gateway', title: 'Gateway' }],
      relationship: { target_id: 'gateway', label: '' },
    },
    {
      code: 'relationship_target_required',
      field: 'target',
      message: 'Choose a component for this relationship.',
      sourceID: 'gateway-b',
      sourceName: 'Gateway — private.md',
      components: [
        { id: 'gateway-a', title: 'Gateway', filename: 'public.md', description: 'Public.\n', relationships: [] },
        { id: 'gateway-b', title: 'Gateway', filename: 'private.md', description: 'Private.\n', relationships: [] },
      ],
      targets: [
        { id: 'gateway-a', title: 'Gateway', context: 'public.md' },
        { id: 'gateway-b', title: 'Gateway', context: 'private.md' },
      ],
      relationship: { target_id: '', label: 'calls' },
    },
  ])('localizes $code to its component and field while retaining relationship work', async ({
    code, field, message, sourceID, sourceName, components, targets, relationship,
  }) => {
    const pending = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '7'.repeat(40),
      component_count: components.length, component_titles: components.map((component) => component.title), components,
      changes: {
        valid: false, validation_code: code, validation_item: sourceID,
        components: [{
          id: sourceID,
          title: 'Gateway',
          description: sourceID === 'gateway-b' ? 'Private.\n' : 'Body.\n',
          relationships: [relationship],
          new: false,
        }],
        relationship_targets: targets,
      },
    }
    const blocked = {
      ...pending,
      action_error: 'review_failed',
      changes: {
        ...pending.changes,
        review_blocker: code,
        validation_relationship_position: 1,
        validation_relationship_field: field,
      },
    }
    mockResponses([pending, blocked], [200, 422])
    render(<App />)
    await submitPath('/tmp/example')

    expect(screen.queryByText(message)).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Review changes' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(sourceName)
    expect(alert).toHaveTextContent(message)
    expect(alert).not.toHaveTextContent('before updating architecture')
    await user.click(within(alert).getByRole('button', { name: 'Fix relationship' }))

    const fieldControl = screen.getByLabelText(field === 'label' ? 'Label' : 'Target')
    expect(fieldControl).toHaveAttribute('aria-invalid', 'true')
    expect(fieldControl).toHaveFocus()
    const guidanceID = fieldControl.getAttribute('aria-describedby')
    expect(guidanceID).toBeTruthy()
    expect(document.getElementById(guidanceID!)).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Keep change' })).toBeInTheDocument()
    expect(screen.queryByText(/yaml|frontmatter|uuid|parser|candidate|\bref\b/i)).not.toBeInTheDocument()
  })

  it('guards unsent relationship fields before workbench navigation replaces the editor', async () => {
    const workspace = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '9'.repeat(40), component_count: 2,
      component_titles: ['Gateway', 'Worker'],
      components: [
        { id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Accepted.\n', relationships: [] },
        { id: 'worker', title: 'Worker', filename: 'worker.md', description: 'Works.\n', relationships: [] },
      ],
    }
    mockResponses([workspace])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit component' }))
    await user.click(screen.getByRole('button', { name: 'Add relationship' }))
    await user.selectOptions(screen.getByLabelText('Target'), 'worker')
    await user.type(screen.getByLabelText('Label'), 'calls')

    await user.click(screen.getByRole('button', { name: 'Worker' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave without keeping?')
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Target')).toHaveValue('worker')
    expect(screen.getByLabelText('Label')).toHaveValue('calls')

    await user.click(screen.getByRole('button', { name: 'Worker' }))
    await user.click(screen.getByRole('button', { name: 'Leave without keeping' }))
    expect(await screen.findByRole('heading', { name: 'Worker' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('calls')).not.toBeInTheDocument()
  })

  it('requires confirmation and discards the whole backend-held change set through one action', async () => {
    const pending = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '8'.repeat(40),
      component_count: 0, component_titles: [], components: [],
      changes: { valid: true, components: [{ id: 'worker', title: 'Worker', description: 'Body.\n', new: true }] },
    }
    const discarded = { ...pending, changes: undefined }
    const fetchMock = mockResponses([pending, discarded])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Discard changes' }))
    const confirmation = screen.getByRole('dialog', { name: 'Discard changes?' })
    expect(confirmation).toHaveTextContent('This clears every change in progress. The accepted architecture will not change.')
    await user.click(within(confirmation).getByRole('button', { name: 'Discard changes' }))

    expect(await screen.findByRole('heading', { name: 'Start with a component' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Changes in progress/ })).not.toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/discard')
    expect(requestBody(fetchMock, 1)).toEqual({ source_root: '/tmp/example' })
  })

  it('leaves the workspace for project opening only after backend eligibility succeeds', async () => {
    const ready = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '8'.repeat(40),
      component_count: 0, component_titles: [], components: [],
    }
    let call = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      if (call++ === 0) return new Response(JSON.stringify(ready), { status: 200, headers: { 'Content-Type': 'application/json' } })
      return new Response(null, { status: 204 })
    })
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Open another project' }))

    expect(await screen.findByRole('heading', { name: 'Open a project' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Components' })).not.toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/projects/leave')
  })

  it('keeps the current workspace when backend-held changes block project switching', async () => {
    const review = {
      diff: 'diff --git a/components/worker.md b/components/worker.md\n+# Worker\n',
      base_revision: '8'.repeat(40), candidate_tree: '9'.repeat(40), generation: 2,
    }
    const pending = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '8'.repeat(40),
      component_count: 0, component_titles: [], components: [],
      changes: { valid: true, components: [{ id: 'worker', title: 'Worker', description: '', new: true }], review },
    }
    const blocked = { ...pending, action_error: 'pending_blocks_switch' }
    const fetchMock = mockResponses([pending, blocked, blocked], [200, 409, 409])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Open another project' }))

    expect(await screen.findByRole('heading', { name: 'Changes in progress' })).toBeInTheDocument()
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent('Keep working here or discard these changes before opening another project.')
    expect(notice.parentElement).toHaveClass('workspace-shell')
    expect(notice.nextElementSibling).toHaveClass('architecture-workbench')
    expect(screen.getByText('Worker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update architecture' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Open a project' })).not.toBeInTheDocument()
    expect(requestPath(fetchMock, 1)).toBe('/api/projects/leave')

    await user.click(screen.getByRole('button', { name: 'Dismiss message' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update architecture' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Open another project' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep working here or discard these changes before opening another project.')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('restores backend-held changes when opening another project is blocked after a browser reload', async () => {
    const pending = {
      source_root: '/tmp/project-a', project_name: 'project-a', state: 'empty', revision: '8'.repeat(40),
      component_count: 0, component_titles: [], components: [],
      changes: { valid: true, components: [{ id: 'worker', title: 'Worker', description: '', new: true }] },
      action_error: 'pending_blocks_switch',
    }
    const fetchMock = mockResponses([pending], [409])
    render(<App />)

    await submitPath('/tmp/project-b')

    expect(await screen.findByRole('heading', { name: 'Changes in progress' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Keep working here or discard these changes before opening another project.')
    expect(screen.getByText('Worker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument()
    expect(screen.getByText('/tmp/project-a')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Open a project' })).not.toBeInTheDocument()
    expect(requestPath(fetchMock, 0)).toBe('/api/projects/open')
    expect(requestBody(fetchMock, 0)).toEqual({ source_root: '/tmp/project-b' })
  })

  it('guards dirty editor values before Add component replaces the editor', async () => {
    const workspace = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '9'.repeat(40), component_count: 1,
      component_titles: ['Gateway'],
      components: [{ id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Accepted.\n', relationships: [] }],
    }
    const fetchMock = mockResponses([workspace])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit component' }))
    await user.type(screen.getByLabelText('Title'), ' locally changed')

    await user.click(screen.getByRole('button', { name: 'Add component' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave without keeping?')
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('heading', { name: 'Edit component' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Gateway locally changed')

    await user.click(screen.getByRole('button', { name: 'Add component' }))
    await user.click(screen.getByRole('button', { name: 'Leave without keeping' }))
    expect(screen.getByRole('heading', { name: 'Add component' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['index selection', async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Worker' }))],
    ['map selection', async () => act(() => graphHarness.select?.({ target: { id: () => 'worker' } }))],
    ['Changes in progress', async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /Changes in progress/ }))],
    ['Open another project', async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Open another project' }))],
  ])('guards dirty editor values before %s replaces the task', async (_label, navigate) => {
    const workspace = {
      source_root: '/tmp/example', project_name: 'example', state: 'ready', revision: '9'.repeat(40), component_count: 2,
      component_titles: ['Gateway', 'Worker'],
      components: [
        { id: 'gateway', title: 'Gateway', filename: 'gateway.md', description: 'Accepted.\n', relationships: [] },
        { id: 'worker', title: 'Worker', filename: 'worker.md', description: 'Works.\n', relationships: [] },
      ],
      changes: { valid: true, components: [{ id: 'gateway', title: 'Pending Gateway', description: 'Pending.\n', new: false }] },
    }
    mockResponses([workspace, { ...workspace, action_error: 'pending_blocks_switch' }], [200, 409])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    const pendingItem = screen.getByText('Pending Gateway').closest('li') as HTMLElement
    await user.click(within(pendingItem).getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Title'), ' locally changed')

    await navigate(user)
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave without keeping?')
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Title')).toHaveValue('Pending Gateway locally changed')

    await navigate(user)
    await user.click(screen.getByRole('button', { name: 'Leave without keeping' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Pending Gateway locally changed')).not.toBeInTheDocument()
  })

  it('requires a fresh review when pending changes mutate after the displayed review', async () => {
    const reviewed = {
      source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '1'.repeat(40),
      component_count: 0, component_titles: [], components: [],
      changes: {
        valid: true,
        components: [{ id: 'worker-id', title: 'Worker', description: '', new: true }],
        review: { diff: 'diff --git a/components/worker.md b/components/worker.md', base_revision: '1'.repeat(40), candidate_tree: '2'.repeat(40), generation: 1 },
      },
    }
    const changed = { ...reviewed, action_error: 'review_changed', changes: { valid: true, components: reviewed.changes.components } }
    mockResponses([reviewed, changed], [200, 409])
    render(<App />)
    await submitPath('/tmp/example')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Update architecture' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The changes were edited after this review. Review them again before updating architecture.')
    expect(screen.getByText('Worker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review changes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update architecture' })).not.toBeInTheDocument()
  })

  it.each(['lost response', 'unreadable response body'])(
    'does not offer a duplicate update after an ambiguous %s',
    async (failure) => {
      const reviewed = {
        source_root: '/tmp/example', project_name: 'example', state: 'empty', revision: '1'.repeat(40),
        component_count: 0, component_titles: [], components: [],
        changes: {
          valid: true,
          components: [{ id: 'worker-id', title: 'Worker', description: '', new: true }],
          review: {
            diff: 'diff --git a/components/worker.md b/components/worker.md',
            base_revision: '1'.repeat(40), candidate_tree: '2'.repeat(40), generation: 1,
          },
        },
      }
      let call = 0
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        if (call++ === 0) {
          return new Response(JSON.stringify(reviewed), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        if (failure === 'lost response') throw new Error('response lost after request')
        return new Response('{not-json', { status: 200, headers: { 'Content-Type': 'application/json' } })
      })
      render(<App />)
      await submitPath('/tmp/example')
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Update architecture' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('WorkBraid could not confirm what happened. Open this project again to check its current architecture.')
      expect(alert).not.toHaveTextContent(/try again/i)
      expect(screen.queryByRole('button', { name: 'Update architecture' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Review changes' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /add component|edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(requestBody(fetchMock, 1)).toEqual({
        source_root: '/tmp/example', base_revision: '1'.repeat(40), candidate_tree: '2'.repeat(40), generation: 1,
      })
    },
  )

  it.each([
    ['architecture_unavailable', 409, 'Architecture unavailable', 'could not open the architecture linked to this project'],
    ['architecture_invalid', 409, 'Architecture needs attention', "could not read this project's architecture"],
    ['architecture_unsupported', 422, 'Architecture not supported yet', 'uses features that this version of WorkBraid cannot open yet'],
  ])('shows open failure %s in product language without recovery controls', async (code, status, heading, message) => {
    mockResponses([{ code }], [status])
    render(<App />)
    await submitPath('/tmp/example')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(heading)
    expect(alert).toHaveTextContent(message)
    expect(alert).toHaveTextContent('/tmp/example')
    expect(screen.queryByText('This project has an empty architecture.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry|repair|reset|create|set up/i })).not.toBeInTheDocument()
    expect(alert.textContent ?? '').not.toMatch(/\b(association|store|manifest|accepted ref|canonical|snapshot|uuid|git object)\b/i)
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
    expect(await screen.findByRole('heading', { name: 'Start with a component' })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Start with a component' })).toBeInTheDocument()
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
    ['architecture_invalid', 409, 'Architecture needs attention', "could not read this project's architecture"],
    ['architecture_unsupported', 422, 'Architecture not supported yet', 'uses features that this version of WorkBraid cannot open yet'],
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
