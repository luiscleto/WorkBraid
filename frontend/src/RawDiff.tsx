import { useEffect, useMemo, useRef } from 'react'

type RawDiffProps = {
  diff: string
  focusPath?: string
  focusToken?: string
}

type DiffLine = {
  text: string
  kind: 'added' | 'removed' | 'header' | 'hunk' | 'context'
  path?: string
  anchor?: string
}

export function RawDiff({ diff, focusPath, focusToken }: RawDiffProps) {
  const lines = useMemo(() => rawDiffLines(diff), [diff])
  const fileAnchors = useRef(new Map<string, HTMLSpanElement>())

  useEffect(() => {
    if (!focusPath) return
    const target = fileAnchors.current.get(focusPath)
    if (!target) return
    target.focus()
    target.scrollIntoView?.({ block: 'nearest' })
  }, [focusPath, focusToken, diff])

  return (
    <pre className="raw-diff" data-testid="raw-diff" aria-label="Complete architecture diff">
      {lines.map((line, index) => (
        <span
          className={`diff-line diff-${line.kind}`}
          data-diff-path={line.path}
          id={line.anchor}
          key={`${index}:${line.anchor ?? ''}`}
          tabIndex={line.path || line.kind === 'hunk' ? -1 : undefined}
          aria-label={diffLineLabel(line.kind)}
          ref={line.path ? (element) => {
            if (element) fileAnchors.current.set(line.path as string, element)
            else fileAnchors.current.delete(line.path as string)
          } : undefined}
        >{line.text}</span>
      ))}
    </pre>
  )
}

export function rawDiffLines(diff: string): DiffLine[] {
  const sourceLines = diff.match(/[^\n]*\n|[^\n]+$/g) ?? []
  let currentPath = ''
  let hunk = 0
  return sourceLines.map((text) => {
    const fileMatch = text.match(/^diff --git a\/(.+) b\/(.+)\n?$/)
    if (fileMatch && fileMatch[1] === fileMatch[2]) {
      currentPath = fileMatch[2]
      hunk = 0
      return { text, kind: 'header', path: currentPath, anchor: `diff-file-${stableAnchor(currentPath)}` }
    }
    if (text.startsWith('@@')) {
      hunk += 1
      return { text, kind: 'hunk', anchor: `diff-hunk-${stableAnchor(currentPath)}-${hunk}` }
    }
    if (text.startsWith('+') && !text.startsWith('+++')) return { text, kind: 'added' }
    if (text.startsWith('-') && !text.startsWith('---')) return { text, kind: 'removed' }
    if (text.startsWith('index ') || text.startsWith('new file ') || text.startsWith('deleted file ') || text.startsWith('---') || text.startsWith('+++')) {
      return { text, kind: 'header' }
    }
    return { text, kind: 'context' }
  })
}

function stableAnchor(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function diffLineLabel(kind: DiffLine['kind']) {
  if (kind === 'added') return 'Added line'
  if (kind === 'removed') return 'Removed line'
  if (kind === 'hunk') return 'Diff hunk'
  if (kind === 'header') return 'Diff header'
  return undefined
}
