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

  it('opens a known architecture immediately without presenting setup controls', async () => {
    const revision = 'b'.repeat(40)
    const fetchMock = mockResponses([
      { source_root: '/tmp/example', project_name: 'example', state: 'empty', revision, component_count: 0 },
    ])
    render(<App />)
    await submitPath('/tmp/example')

    expect(await screen.findByRole('heading', { name: 'Architecture ready' })).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'Architecture ready' })).toBeInTheDocument()
    expect(screen.getByText('This architecture has 3 components.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.querySelector('span')?.textContent)).toEqual(['API', 'Worker', 'API'])
    expect(screen.queryByText('This project has an empty architecture.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add component' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /relationship|map|repair/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/markdown|frontmatter|uuid|filename|relationship/i)).not.toBeInTheDocument()
    const details = screen.getByText('Technical details').closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(within(details as HTMLElement).getByText(revision)).toBeInTheDocument()
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
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Gateway')
    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), '\nChanged body\n')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(await screen.findByRole('heading', { name: 'Changes in progress' })).toBeInTheDocument()
    expect(screen.getByText('These changes have not updated the architecture yet.')).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(screen.getByText('Gateway')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add component' }))
    await user.type(screen.getByLabelText('Title'), 'Worker')
    await user.type(screen.getByLabelText('Description'), '\nDoes work\n')
    await user.click(screen.getByRole('button', { name: 'Keep change' }))

    expect(await screen.findByText('Worker')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(requestPath(fetchMock, 1)).toBe('/api/architecture/components/edit')
    expect(requestBody(fetchMock, 1)).toEqual({
      source_root: '/tmp/example', component_id: 'api-id', title: 'Gateway', description: '\nChanged body\n',
      title_changed: true, description_changed: true,
    })
    expect(requestPath(fetchMock, 2)).toBe('/api/architecture/components/add')
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
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
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

    expect(await screen.findByText('This architecture has 1 component.')).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'Architecture changed' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('These changes are out of date because the architecture changed.')
    expect(screen.getByText('Public Gateway')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|add component|review changes|update architecture/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/merge|rebase|overwrite|repair/i)).not.toBeInTheDocument()
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
