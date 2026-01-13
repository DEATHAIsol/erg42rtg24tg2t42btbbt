'use client'

import { ChevronLeft, ChevronRight, Filter, Search, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useState, useEffect } from 'react'

export interface MarketFilters {
  searchQuery: string
  selectedTags: string[]
  sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest'
  minVolume: number
  minLiquidity: number
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  filters: MarketFilters
  onFiltersChange: (filters: MarketFilters) => void
}

import { FILTER_CATEGORIES, CATEGORY_LABELS } from '@/lib/category-mapper'

export function Sidebar({ isOpen, onToggle, filters, onFiltersChange }: SidebarProps) {
  // Use categories from the category mapper
  const categories = FILTER_CATEGORIES
  const categoryLabels = CATEGORY_LABELS

  const updateFilters = (updates: Partial<MarketFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      selectedTags: [],
      sortBy: 'volume',
      minVolume: 0,
      minLiquidity: 0,
    })
  }

  const hasActiveFilters = 
    filters.searchQuery.length > 0 ||
    filters.selectedTags.length > 0 ||
    filters.minVolume > 0 ||
    filters.minLiquidity > 0

  return (
    <div
      className={`transition-all duration-300 border-r border-terminal-border bg-terminal-surface ${
        isOpen ? 'w-72' : 'w-12'
      } flex flex-col overflow-hidden shadow-lg`}
    >
      <div className="flex items-center justify-between p-4 border-b border-terminal-border bg-terminal-bg/50">
        {isOpen && (
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-terminal-accent" />
            <span className="font-semibold text-base text-terminal-text-primary">Filters</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-terminal-border rounded-lg transition-all hover:scale-105"
          title={isOpen ? 'Collapse filters' : 'Expand filters'}
        >
          {isOpen ? <ChevronLeft size={18} className="text-terminal-text-secondary" /> : <ChevronRight size={18} className="text-terminal-text-secondary" />}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="p-4 border-b border-terminal-border bg-terminal-bg/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-terminal-text-secondary uppercase tracking-wide">Search & Filter</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-terminal-accent hover:text-terminal-accent/80 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-terminal-accent/10 transition-colors"
                >
                  <X size={12} />
                  Clear All
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-terminal-text-secondary" size={16} />
              <input
                type="text"
                placeholder="Search markets..."
                value={filters.searchQuery}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="terminal-input w-full pl-9 pr-3 py-2.5 text-sm bg-terminal-bg border-terminal-border focus:border-terminal-accent focus:ring-1 focus:ring-terminal-accent/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-5 custom-scrollbar">
            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-terminal-accent rounded-full"></div>
                <span className="text-sm font-semibold text-terminal-text-primary">Categories</span>
                {filters.selectedTags.length > 0 && (
                  <span className="ml-auto text-xs text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded-full">
                    {filters.selectedTags.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-terminal-accent text-white shadow-lg shadow-terminal-accent/20 scale-105'
                          : 'bg-terminal-bg border border-terminal-border text-terminal-text-secondary hover:border-terminal-accent hover:bg-terminal-border/50 hover:scale-105'
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
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-terminal-accent rounded-full"></div>
                <span className="text-sm font-semibold text-terminal-text-primary">Sort By</span>
              </div>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value as MarketFilters['sortBy'] })}
                className="terminal-input w-full text-sm py-2.5 bg-terminal-bg border-terminal-border focus:border-terminal-accent focus:ring-1 focus:ring-terminal-accent/20"
              >
                <option value="volume">Volume (High to Low)</option>
                <option value="liquidity">Liquidity (High to Low)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {/* Volume Filter */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-terminal-accent rounded-full"></div>
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-semibold text-terminal-text-primary">
                    Min Volume
                  </span>
                  <span className="text-xs font-medium text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded">
                    ${(filters.minVolume / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10000000"
                step="10000"
                value={filters.minVolume}
                onChange={(e) => updateFilters({ minVolume: parseInt(e.target.value) })}
                className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
                style={{
                  background: `linear-gradient(to right, var(--terminal-accent) 0%, var(--terminal-accent) ${(filters.minVolume / 10000000) * 100}%, var(--terminal-border) ${(filters.minVolume / 10000000) * 100}%, var(--terminal-border) 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-terminal-text-muted mt-2">
                <span>$0</span>
                <span>$10M</span>
              </div>
            </div>

            {/* Liquidity Filter */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-terminal-accent rounded-full"></div>
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-semibold text-terminal-text-primary">
                    Min Liquidity
                  </span>
                  <span className="text-xs font-medium text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded">
                    ${(filters.minLiquidity / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="5000000"
                step="5000"
                value={filters.minLiquidity}
                onChange={(e) => updateFilters({ minLiquidity: parseInt(e.target.value) })}
                className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
                style={{
                  background: `linear-gradient(to right, var(--terminal-accent) 0%, var(--terminal-accent) ${(filters.minLiquidity / 5000000) * 100}%, var(--terminal-border) ${(filters.minLiquidity / 5000000) * 100}%, var(--terminal-border) 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-terminal-text-muted mt-2">
                <span>$0</span>
                <span>$5M</span>
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-terminal-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-terminal-accent rounded-full"></div>
                  <span className="text-xs font-semibold text-terminal-text-primary uppercase tracking-wide">Active Filters</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-terminal-accent/20 text-terminal-accent rounded-md text-xs font-medium border border-terminal-accent/30"
                    >
                      {categoryLabels[tag as keyof typeof categoryLabels] || tag}
                    </span>
                  ))}
                  {filters.minVolume > 0 && (
                    <span className="px-2.5 py-1 bg-terminal-accent/20 text-terminal-accent rounded-md text-xs font-medium border border-terminal-accent/30">
                      Vol: ${(filters.minVolume / 1000).toFixed(0)}k+
                    </span>
                  )}
                  {filters.minLiquidity > 0 && (
                    <span className="px-2.5 py-1 bg-terminal-accent/20 text-terminal-accent rounded-md text-xs font-medium border border-terminal-accent/30">
                      Liq: ${(filters.minLiquidity / 1000).toFixed(0)}k+
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

