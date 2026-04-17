import type { ReactNode } from 'react'

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function highlightText(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return text
  }

  const splitter = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'ig')
  const highlighter = new RegExp(`^${escapeRegExp(normalizedQuery)}$`, 'i')
  const parts = text.split(splitter)

  return parts.map((part, index) =>
    highlighter.test(part) ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-0.5 text-slate-900">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
