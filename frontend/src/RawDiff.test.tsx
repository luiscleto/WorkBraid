import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { RawDiff, rawDiffLines } from './RawDiff'

it('preserves the complete exact diff while classifying display lines and anchoring files and hunks', () => {
  const diff = 'diff --git a/components/api.md b/components/api.md\nindex 123..456 100644\n--- a/components/api.md\n+++ b/components/api.md\n@@ -1 +1 @@\n-old\\x00\n+new\\x00\n\\ No newline at end of file\n'
  const { container } = render(<RawDiff diff={diff} />)

  expect(container.querySelector('[data-testid="raw-diff"]')?.textContent).toBe(diff)
  expect(container.querySelectorAll('.diff-added')).toHaveLength(1)
  expect(container.querySelectorAll('.diff-removed')).toHaveLength(1)
  expect(container.querySelector('[data-diff-path="components/api.md"]')).toHaveAttribute('id')
  expect(container.querySelector('.diff-hunk')).toHaveAttribute('id')
  expect(rawDiffLines(diff).map((line) => line.text).join('')).toBe(diff)
})

it('moves keyboard focus to the requested canonical file without changing the diff', () => {
  const diff = 'diff --git a/components/api.md b/components/api.md\n@@ -0,0 +1 @@\n+API\ndiff --git a/components/worker.md b/components/worker.md\n@@ -0,0 +1 @@\n+Worker\n'
  const { container, rerender } = render(<RawDiff diff={diff} />)

  rerender(<RawDiff diff={diff} focusPath="components/worker.md" focusToken="edge:1" />)

  expect(document.activeElement).toBe(container.querySelector('[data-diff-path="components/worker.md"]'))
  expect(container.querySelector('[data-testid="raw-diff"]')?.textContent).toBe(diff)
})

it('maps Git-quoted UTF-8 and backslash filenames to their canonical focus path', () => {
  // This is the exact post-presentUnifiedDiff representation: each backslash
  // from Git's C-quoted path has one additional presentation escape.
  const diff = 'diff --git "a/components/caf\\\\303\\\\251\\\\\\\\worker.md" "b/components/caf\\\\303\\\\251\\\\\\\\worker.md"\n--- "a/components/caf\\\\303\\\\251\\\\\\\\worker.md"\n+++ "b/components/caf\\\\303\\\\251\\\\\\\\worker.md"\n@@ -1 +1 @@\n-old\n+new\n'
  const canonicalPath = 'components/café\\worker.md'
  const { container, rerender } = render(<RawDiff diff={diff} />)
  const focusedAnchor = () => [...container.querySelectorAll('[data-diff-path]')]
    .find((element) => element.getAttribute('data-diff-path') === canonicalPath)

  expect(rawDiffLines(diff)[0].path).toBe(canonicalPath)
  expect(focusedAnchor()).toHaveAttribute('id')
  rerender(<RawDiff diff={diff} focusPath={canonicalPath} focusToken="quoted-path" />)

  expect(document.activeElement).toBe(focusedAnchor())
  expect(container.querySelector('[data-testid="raw-diff"]')?.textContent).toBe(diff)
})

it('distinguishes exact file metadata from added and removed content with colliding prefixes', () => {
  const diff = 'diff --git a/components/api.md b/components/api.md\n--- a/components/api.md\n+++ b/components/api.md\n@@ -1,2 +1,3 @@\n----\n+++starts with two pluses\n+++\n'
  const lines = rawDiffLines(diff)
  const { container } = render(<RawDiff diff={diff} />)

  expect(lines.filter((line) => line.kind === 'removed').map((line) => line.text)).toEqual(['----\n'])
  expect(lines.filter((line) => line.kind === 'added').map((line) => line.text)).toEqual(['+++starts with two pluses\n', '+++\n'])
  expect(lines.slice(1, 3).map((line) => line.kind)).toEqual(['header', 'header'])
  expect(container.querySelector('[data-testid="raw-diff"]')?.textContent).toBe(diff)
})

it('treats metadata-looking lines inside a hunk as changed content', () => {
  const diff = 'diff --git a/components/api.md b/components/api.md\n--- a/components/api.md\n+++ b/components/api.md\n@@ -1 +1 @@\n--- a/components/api.md\n+++ b/components/api.md\n'
  const lines = rawDiffLines(diff)
  const { container } = render(<RawDiff diff={diff} />)

  expect(lines[1].kind).toBe('header')
  expect(lines[2].kind).toBe('header')
  expect(lines[4]).toMatchObject({ kind: 'removed', text: '--- a/components/api.md\n' })
  expect(lines[5]).toMatchObject({ kind: 'added', text: '+++ b/components/api.md\n' })
  expect(container.querySelector('[data-testid="raw-diff"]')?.textContent).toBe(diff)
})
