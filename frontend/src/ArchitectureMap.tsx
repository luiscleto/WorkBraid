import cytoscape, { Core, ElementDefinition } from 'cytoscape'
import { useEffect, useMemo, useRef } from 'react'

export type MapComponent = {
  id: string
  title: string
  relationships: { target_id: string; label: string }[]
}

type ArchitectureMapProps = {
  revision: string
  components: MapComponent[]
  selectedID?: string
  onSelect: (id: string) => void
}

export function ArchitectureMap({ revision, components, selectedID, onSelect }: ArchitectureMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const graph = useRef<Core | null>(null)
  const selectHandler = useRef(onSelect)
  // A revision-pinned projection intentionally ignores response-object churn
  // caused by pending edits at the same accepted revision.
  const elements = useMemo(() => projectionElements(components), [revision])

  useEffect(() => {
    selectHandler.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!container.current) return
    const instance = cytoscape({
      container: container.current,
      elements,
      layout: { name: 'cose', animate: false, fit: true, padding: 34 },
      minZoom: 0.35,
      maxZoom: 2.5,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#f8f0dc',
            'border-color': '#27251f',
            'border-width': 1.5,
            color: '#27251f',
            label: 'data(label)',
            'font-family': 'IBM Plex Sans',
            'font-size': 13,
            'text-wrap': 'wrap',
            'text-max-width': '128px',
            width: 116,
            height: 54,
            shape: 'round-rectangle',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#e7dba9',
            'border-color': '#18734f',
            'border-width': 3,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.25,
            'line-color': '#736c5c',
            'target-arrow-color': '#736c5c',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
            'control-point-distances': 'data(distance)',
            'control-point-weights': 0.5,
            label: 'data(label)',
            color: '#514c41',
            'font-family': 'IBM Plex Sans',
            'font-size': 10,
            'text-background-color': '#f4ecd8',
            'text-background-opacity': 1,
            'text-background-padding': '2px',
            'text-rotation': 'autorotate',
          },
        },
      ],
    })
    instance.on('tap', 'node', (event) => selectHandler.current(event.target.id()))
    graph.current = instance
    return () => {
      graph.current = null
      instance.destroy()
    }
  }, [elements])

  useEffect(() => {
    const instance = graph.current
    if (!instance) return
    instance.$(':selected').unselect()
    if (selectedID) instance.getElementById(selectedID).select()
  }, [selectedID])

  if (components.length === 0) {
    return <div className="map-empty">The architecture has no components yet.</div>
  }

  return (
    <section className="map-surface" aria-label="Architecture map">
      <div ref={container} className="map-canvas" data-testid="architecture-map" />
      <button className="map-fit" type="button" onClick={() => graph.current?.fit(undefined, 34)}>
        Fit map
      </button>
    </section>
  )
}

export function projectionElements(components: MapComponent[]): ElementDefinition[] {
  const nodes: ElementDefinition[] = components.map((component) => ({
    data: { id: component.id, label: component.title },
  }))
  const grouped = new Map<string, number>()
  for (const source of components) {
    for (const relationship of source.relationships ?? []) {
      const key = `${source.id}\u0000${relationship.target_id}`
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }
  }
  const seen = new Map<string, number>()
  const edges: ElementDefinition[] = []
  for (const source of components) {
    for (const relationship of source.relationships ?? []) {
      const pair = `${source.id}\u0000${relationship.target_id}`
      const index = seen.get(pair) ?? 0
      seen.set(pair, index + 1)
      const count = grouped.get(pair) ?? 1
      edges.push({
        data: {
          id: `projection:${source.id}:${relationship.target_id}:${index}`,
          source: source.id,
          target: relationship.target_id,
          label: relationship.label,
          distance: count === 1 ? 0 : (index - (count - 1) / 2) * 52,
        },
      })
    }
  }
  return [...nodes, ...edges]
}
