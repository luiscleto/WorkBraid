import { expect, it } from 'vitest'
import { projectionElements } from './ArchitectureMap'

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
