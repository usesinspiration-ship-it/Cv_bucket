import type { ReactNode } from 'react'

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatFileSize(size: number) {
  if (!size || size <= 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  let scaledSize = size

  while (scaledSize >= 1024 && unitIndex < units.length - 1) {
    scaledSize /= 1024
    unitIndex++
  }

  return `${scaledSize.toFixed(1)} ${units[unitIndex]}`
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
