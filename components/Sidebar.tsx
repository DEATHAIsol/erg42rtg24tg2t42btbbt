'use client'

import { ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react'
import { FILTER_CATEGORIES, CATEGORY_LABELS } from '@/lib/category-mapper'

export type MarketStatusFilter = 'open' | 'resolved' | 'all'

export interface MarketFilters {
  status: MarketStatusFilter
  searchQuery: string
  selectedTags: string[]
  sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest'
  minVolume: number
  minLiquidity: number
  minOdds: number // 0-100 (percentage)
  maxOdds: number // 0-100 (percentage)
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  filters: MarketFilters
  onFiltersChange: (filters: MarketFilters) => void
  /** Mobile overlay state — optional so existing call sites keep working */
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ isOpen, onToggle, filters, onFiltersChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const categories = FILTER_CATEGORIES
  const categoryLabels = CATEGORY_LABELS

  const updateFilters = (updates: Partial<MarketFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const clearFilters = () => {
    onFiltersChange({
      status: 'open',
      searchQuery: '',
      selectedTags: [],
      sortBy: 'volume',
      minVolume: 0,
      minLiquidity: 0,
      minOdds: 1,
      maxOdds: 99,
    })
  }

  const hasActiveFilters =
    filters.searchQuery.length > 0 ||
    filters.selectedTags.length > 0 ||
    filters.minVolume > 0 ||
    filters.minLiquidity > 0 ||
    filters.minOdds > 1 ||
    filters.maxOdds < 99

  const filterBody = (
    <>
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">Search &amp; Filter</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-terminal-accent hover:text-terminal-accent-hover flex items-center gap-1 px-2 py-1 rounded-md hover:bg-terminal-accent/10 transition-colors"
            >
              <X size={12} />
              Clear all
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-text-muted pointer-events-none" size={15} />
          <input
            type="text"
            placeholder="Search markets…"
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            className="terminal-input pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6 custom-scrollbar">
        {/* Market status */}
        <div>
          <div className="section-label mb-3">Status</div>
          <div className="flex gap-1 p-1 bg-terminal-bg rounded-lg border border-terminal-border">
            {([
              { id: 'open', label: 'Open' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'all', label: 'All' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => updateFilters({ status: opt.id })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filters.status === opt.id
                    ? 'bg-terminal-elevated text-terminal-text-primary border border-terminal-border-strong'
                    : 'text-terminal-text-muted hover:text-terminal-text-primary border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="section-label">Categories</span>
            {filters.selectedTags.length > 0 && (
              <span className="ml-auto text-xs text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded-full num">
                {filters.selectedTags.length}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const isSelected = filters.selectedTags.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => {
                    const newTags = isSelected
                      ? filters.selectedTags.filter((t) => t !== category)
                      : [...filters.selectedTags, category]
                    updateFilters({ selectedTags: newTags })
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                    isSelected
                      ? 'bg-terminal-accent/15 border-terminal-accent/50 text-terminal-accent'
                      : 'bg-terminal-bg border-terminal-border text-terminal-text-secondary hover:border-terminal-border-strong hover:text-terminal-text-primary'
                  }`}
                >
                  {categoryLabels[category as keyof typeof categoryLabels] || category}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sort By */}
        <div>
          <div className="section-label mb-3">Sort by</div>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as MarketFilters['sortBy'] })}
            className="terminal-select"
          >
            <option value="volume">Volume (high to low)</option>
            <option value="liquidity">Liquidity (high to low)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* Volume & Liquidity Filters */}
        <div>
          <div className="section-label mb-3">Thresholds</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-terminal-text-secondary mb-1.5 block">Min volume</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-text-muted text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  value={filters.minVolume || ''}
                  onChange={(e) => updateFilters({ minVolume: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="terminal-input pl-7 num"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-terminal-text-secondary mb-1.5 block">Min liquidity</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-text-muted text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  value={filters.minLiquidity || ''}
                  onChange={(e) => updateFilters({ minLiquidity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="terminal-input pl-7 num"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Odds Range Filter */}
        <div>
          <div className="section-label mb-3">Yes odds range</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-terminal-text-secondary mb-1.5 block">Min</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minOdds}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    updateFilters({
                      minOdds: val,
                      maxOdds: Math.max(val, filters.maxOdds),
                    })
                  }}
                  className="terminal-input pr-7 num"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-text-muted text-sm pointer-events-none">¢</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-terminal-text-secondary mb-1.5 block">Max</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxOdds}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    updateFilters({
                      maxOdds: val,
                      minOdds: Math.min(val, filters.minOdds),
                    })
                  }}
                  className="terminal-input pr-7 num"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-text-muted text-sm pointer-events-none">¢</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-terminal-border">
            <div className="section-label mb-3">Active filters</div>
            <div className="flex flex-wrap gap-1.5">
              {filters.selectedTags.map((tag) => (
                <span key={tag} className="badge-accent">
                  {categoryLabels[tag as keyof typeof categoryLabels] || tag}
                </span>
              ))}
              {filters.minVolume > 0 && (
                <span className="badge-accent num">Vol ≥ ${(filters.minVolume / 1000).toFixed(0)}k</span>
              )}
              {filters.minLiquidity > 0 && (
                <span className="badge-accent num">Liq ≥ ${(filters.minLiquidity / 1000).toFixed(0)}k</span>
              )}
              {(filters.minOdds > 1 || filters.maxOdds < 99) && (
                <span className="badge-success num">
                  {filters.minOdds}¢–{filters.maxOdds}¢
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex transition-all duration-300 border-r border-terminal-border bg-terminal-surface ${
          isOpen ? 'w-72' : 'w-12'
        } flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between p-3 border-b border-terminal-border min-h-[49px]">
          {isOpen && (
            <div className="flex items-center gap-2 pl-1">
              <Filter size={15} className="text-terminal-accent" />
              <span className="font-semibold text-sm text-terminal-text-primary">Filters</span>
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-terminal-accent" />}
            </div>
          )}
          <button
            onClick={onToggle}
            className="icon-button h-8 w-8"
            title={isOpen ? 'Collapse filters' : 'Expand filters'}
            aria-label={isOpen ? 'Collapse filters' : 'Expand filters'}
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        {isOpen && filterBody}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative w-[300px] max-w-[85vw] h-full bg-terminal-surface border-r border-terminal-border flex flex-col shadow-modal animate-slide-in-left">
            <div className="flex items-center justify-between p-3 border-b border-terminal-border">
              <div className="flex items-center gap-2 pl-1">
                <Filter size={15} className="text-terminal-accent" />
                <span className="font-semibold text-sm">Filters</span>
              </div>
              <button onClick={onMobileClose} className="icon-button h-8 w-8" aria-label="Close filters">
                <X size={16} />
              </button>
            </div>
            {filterBody}
          </div>
        </div>
      )}
    </>
  )
}
