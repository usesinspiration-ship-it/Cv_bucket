import { Search, SlidersHorizontal } from 'lucide-react'
import type { SearchFilters } from '../types/cv'

interface SearchToolbarProps {
  filters: SearchFilters
  onChange: (patch: Partial<SearchFilters>) => void
}

export function SearchToolbar({ filters, onChange }: SearchToolbarProps) {
  return (
    <div className="glass-panel p-6 shadow-panel border-none animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Search Workspace</h3>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Filter by keyword, name, or skill
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div className="relative group">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-brand-500" />
          <input
            className="field pl-11"
            placeholder="Search within CV text..."
            value={filters.query}
            onChange={(event) =>
              onChange({
                query: event.target.value,
                page: 1,
              })
            }
          />
        </div>
        <div className="relative group">
          <input
            className="field px-5"
            placeholder="Candidate name"
            value={filters.name}
            onChange={(event) =>
              onChange({
                name: event.target.value,
                page: 1,
              })
            }
          />
        </div>
        <div className="relative group">
          <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-brand-500" />
          <input
            className="field pl-11"
            placeholder="Skill tag (e.g. React)"
            value={filters.skill}
            onChange={(event) =>
              onChange({
                skill: event.target.value,
                page: 1,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
