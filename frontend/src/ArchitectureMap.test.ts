import { expect, it } from 'vitest'
import { deterministicPositions, projectionElements } from './ArchitectureMap'

it('projects disconnected, cyclic, and parallel accepted relationships with local edge keys', () => {
  const elements = projectionElements([
    { id: 'a', title: 'A', relationships: [{ target_id: 'b', label: 'calls' }, { target_id: 'b', label: 'reads from' }] },
    { id: 'b', title: 'B', relationships: [{ target_id: 'a', label: 'responds to' }] },
    { id: 'c', title: 'Disconnected', relationships: [] },
  ])
  const nodes = elements.filter((element) => !('source' in element.data))
  const edges = elements.filter((element) => 'source' in element.data)

  expect(nodes.map((node) => node.data.id)).toEqual(['a', 'b', 'c'])
  expect(edges).toHaveLength(3)
  expect(edges.map((edge) => edge.data.label)).toEqual(['calls', 'reads from', 'responds to'])
  expect(new Set(edges.map((edge) => edge.data.id)).size).toBe(3)
  expect(edges[0].data.distance).not.toBe(edges[1].data.distance)
})

it('uses one deterministic union-ID position basis across review sides', () => {
  const layoutIDs = ['worker', 'api', 'new-component']
  const before = projectionElements([
    { id: 'api', title: 'API', relationships: [] },
    { id: 'worker', title: 'Worker', relationships: [] },
  ], { reviewSide: 'before', layoutComponentIDs: layoutIDs })
  const withChanges = projectionElements([
    { id: 'api', title: 'API', relationships: [] },
    { id: 'worker', title: 'Worker', relationships: [] },
    { id: 'new-component', title: 'New', relationships: [] },
  ], { reviewSide: 'with', layoutComponentIDs: [...layoutIDs].reverse() })

  const positions = (elements: ReturnType<typeof projectionElements>) => new Map(elements.filter((element) => !('source' in element.data)).map((element) => [element.data.id, element.position]))
  expect(positions(before).get('api')).toEqual(positions(withChanges).get('api'))
  expect(positions(before).get('worker')).toEqual(positions(withChanges).get('worker'))
  expect(deterministicPositions(layoutIDs)).toEqual(deterministicPositions([...layoutIDs].reverse()))
})

it('keeps active topology separate from exact added and removed occurrence annotations', () => {
  const components = [
    {
      id: 'api', title: 'API', relationships: [
        { target_id: 'worker', label: 'calls', projection_key: 'review:with:api:0' },
        { target_id: 'worker', label: 'calls', projection_key: 'review:with:api:1' },
      ],
    },
    { id: 'worker', title: 'Worker', relationships: [] },
  ]
  const relationships = [
    { key: 'review:with:api:1', source_id: 'api', target_id: 'worker', label: 'calls', status: 'added' as const, path: 'components/api.md', occurrence: 2 },
    { key: 'review:removed:api:2', before_key: 'review:before:api:2', source_id: 'api', target_id: 'worker', label: 'reads', status: 'removed' as const, path: 'components/api.md', occurrence: 1 },
  ]

  const elements = projectionElements(components, {
    reviewSide: 'with',
    layoutComponentIDs: ['api', 'worker'],
    reviewComponents: [{ component_id: 'api', status: 'content_changed', path: 'components/api.md' }],
    reviewRelationships: relationships,
  })
  const edges = elements.filter((element) => 'source' in element.data)

  expect(edges).toHaveLength(3)
  expect(edges.find((edge) => edge.data.id === 'review:with:api:1')?.data.reviewStatus).toBe('added')
  expect(edges.find((edge) => edge.data.id === 'review:removed:api:2')?.data.annotation).toBe(true)
  expect(edges.find((edge) => edge.data.id === 'review:removed:api:2')?.data.displayLabel).toBe('Removed — reads')
  expect(elements.find((element) => element.data.id === 'api')?.data.displayLabel).toContain('Content changed')
})
