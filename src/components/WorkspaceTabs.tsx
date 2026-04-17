import type { ReactNode } from 'react'

export interface WorkspaceTabItem {
  id: string
  label: string
  description: string
  icon: ReactNode
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function WorkspaceTabs({ tabs, activeTab, onChange }: WorkspaceTabsProps) {
  return (
    <div className="glass-panel overflow-x-auto p-2">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-w-[190px] items-start gap-3 rounded-[24px] px-4 py-3 text-left transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                  : 'bg-white/70 text-slate-700 hover:bg-brand-50 hover:text-brand-800'
              }`}
            >
              <div
                className={`rounded-2xl p-2 ${
                  isActive ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700'
                }`}
              >
                {tab.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{tab.label}</div>
                <div
                  className={`mt-1 text-xs leading-5 ${
                    isActive ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  {tab.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
