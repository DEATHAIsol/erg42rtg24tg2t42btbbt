'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts'
import { PolymarketMarket } from '@/lib/polymarket'
import { LineChart } from 'lucide-react'

interface MarketChartProps {
  market: PolymarketMarket
  priceData?: any
}

type Range = '1d' | '1w' | '1m' | 'max'
const RANGES: Range[] = ['1d', '1w', '1m', 'max']
const RANGE_LABEL: Record<Range, string> = { '1d': '1D', '1w': '1W', '1m': '1M', max: 'ALL' }

interface Point {
  time: number
  value: number
}

/** Reads a CSS custom property so the chart follows the active theme. */
function themeColors() {
  if (typeof window === 'undefined') {
    return { bg: '#12100F', text: '#A39C95', grid: '#1E1B19', border: '#262220', line: '#FF7D5A' }
  }
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--chart-bg', '#12100F'),
    text: v('--chart-text', '#A39C95'),
    grid: v('--chart-grid', '#1E1B19'),
    border: v('--chart-border', '#262220'),
    line: v('--chart-line', '#FF7D5A'),
  }
}

export function MarketChart({ market, priceData }: MarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  const [range, setRange] = useState<Range>('1w')
  const [points, setPoints] = useState<Point[] | null>(null)
  const [loading, setLoading] = useState(true)

  /* --------------------------- Fetch real history -------------------------- */
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/markets/${market.id}/history?range=${range}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return
        setPoints(Array.isArray(body?.points) ? body.points : [])
      })
      .catch(() => {
        if (!cancelled) setPoints([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [market.id, range])

  /* ------------------------------ Draw / redraw ---------------------------- */
  useEffect(() => {
    if (!chartContainerRef.current || !points || points.length === 0) return

    const c = themeColors()
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: c.bg },
        textColor: c.text,
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
      },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: c.border },
      rightPriceScale: { borderColor: c.border },
      crosshair: { mode: 1 },
      watermark: { visible: false },
    })
    chartRef.current = chart

    const series = chart.addAreaSeries({
      lineColor: c.line,
      topColor: 'rgba(255, 125, 90, 0.22)',
      bottomColor: 'rgba(255, 125, 90, 0.01)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (p: number) => `${(p * 100).toFixed(1)}¢`,
        minMove: 0.001,
      },
    })
    seriesRef.current = series
    series.setData(points as any)
    chart.timeScale().fitContent()

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('theme-changed', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('theme-changed', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [points])

  /* ------------------- Append the live price as it updates ------------------ */
  useEffect(() => {
    if (!seriesRef.current || !priceData) return
    const latest = priceData.yes?.price
    if (typeof latest !== 'number' || !isFinite(latest) || latest <= 0 || latest >= 1) return
    try {
      seriesRef.current.update({ time: Math.floor(Date.now() / 1000) as any, value: latest })
    } catch {
      /* out-of-order update — safe to ignore */
    }
  }, [priceData])

  const isEmpty = !loading && (!points || points.length === 0)

  return (
    <div className="p-4 border-b border-terminal-border">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="section-label">Price history</h4>
        <div className="flex items-center gap-0.5 p-0.5 bg-terminal-bg rounded-lg border border-terminal-border">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors num ${
                range === r
                  ? 'bg-terminal-elevated text-terminal-text-primary'
                  : 'text-terminal-text-muted hover:text-terminal-text-secondary'
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton w-full rounded-lg" style={{ height: 260 }} />
      ) : isEmpty ? (
        <div
          className="w-full rounded-lg border border-terminal-border/60 flex flex-col items-center justify-center text-center px-6"
          style={{ height: 260 }}
        >
          <LineChart size={22} className="text-terminal-text-muted mb-2" />
          <p className="text-sm font-medium text-terminal-text-secondary">No price history yet</p>
          <p className="text-xs text-terminal-text-muted mt-1">
            Polymarket hasn&apos;t published trades for this market over this range.
          </p>
        </div>
      ) : (
        <div
          ref={chartContainerRef}
          className="w-full rounded-lg overflow-hidden border border-terminal-border/60"
          style={{ height: 260 }}
        />
      )}
    </div>
  )
}
