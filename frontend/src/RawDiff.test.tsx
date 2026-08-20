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
