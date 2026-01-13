'use client'

import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts'
import { PolymarketMarket } from '@/lib/polymarket'

interface MarketChartProps {
  market: PolymarketMarket
  priceData?: any
}

export function MarketChart({ market, priceData }: MarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: '#131829' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1e2338' },
        horzLines: { color: '#1e2338' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1e2338',
      },
      rightPriceScale: {
        borderColor: '#1e2338',
      },
      watermark: {
        visible: false,
      },
    })

    chartRef.current = chart

    // Create area series
    const areaSeries = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.2)',
      bottomColor: 'rgba(59, 130, 246, 0.05)',
      lineWidth: 2,
    })

    seriesRef.current = areaSeries

    // Generate historical data - use current price if available, otherwise mock
    const generateChartData = () => {
      const data = []
      const now = Math.floor(Date.now() / 1000)
      
      // Use current price from priceData if available, otherwise use market data or default
      const currentPrice = priceData?.yes?.price ?? priceData?.no?.price ?? 
                        market.yesPrice ?? market.noPrice ?? 
                        (market.volume ? 0.5 : 0.45)
      
      // Validate current price
      const basePrice = (currentPrice !== null && currentPrice !== undefined && 
                        !isNaN(currentPrice) && isFinite(currentPrice) && 
                        currentPrice > 0 && currentPrice < 1) 
                        ? currentPrice : 0.5

      // Generate 168 data points (last 7 days, hourly)
      // Use a more realistic price evolution that trends toward current price
      const dataPoints = 168
      const lastTime = now - (now % 3600) // Round down to nearest hour
      
      // Start from a price that makes sense (not too far from current)
      // Use a random walk that trends toward current price
      let previousPrice = basePrice * (0.85 + Math.random() * 0.3) // Start between 85% and 115% of current
      previousPrice = Math.max(0.05, Math.min(0.95, previousPrice))
      
      for (let i = dataPoints; i >= 0; i--) {
        const time = lastTime - i * 3600 // Hourly data, rounded to hours
        
        // Calculate how close we are to the end (current time)
        const progress = (dataPoints - i) / dataPoints
        
        // If this is the current hour and we have a current price, use it
        if (i === 0) {
          data.push({
            time: time as any,
            value: basePrice,
          })
          break
        }
        
        // Create realistic price movement with mean reversion toward current price
        const volatility = 0.02 + (1 - progress) * 0.03 // Higher volatility in the past
        const meanReversion = (basePrice - previousPrice) * 0.1 * progress // Stronger reversion near current
        const randomWalk = (Math.random() - 0.5) * volatility
        const price = Math.max(0.01, Math.min(0.99, previousPrice + meanReversion + randomWalk))
        
        previousPrice = price
        
        data.push({
          time: time as any,
          value: price,
        })
      }
      
      // Ensure data is sorted by time and has no duplicates
      data.sort((a, b) => a.time - b.time)
      
      // Remove duplicates (keep the last one for each timestamp)
      const uniqueData: any[] = []
      const seenTimes = new Set<number>()
      for (let i = data.length - 1; i >= 0; i--) {
        if (!seenTimes.has(data[i].time)) {
          uniqueData.unshift(data[i])
          seenTimes.add(data[i].time)
        }
      }
      
      return uniqueData
    }

    const chartData = generateChartData()
    areaSeries.setData(chartData)
    chart.timeScale().fitContent()
    
    // Update chart when priceData changes (separate effect)
    if (priceData && seriesRef.current) {
      const latestPrice = priceData.yes?.price ?? priceData.no?.price
      if (latestPrice !== null && latestPrice !== undefined) {
        const now = Math.floor(Date.now() / 1000)
        seriesRef.current.update({
          time: now as any,
          value: latestPrice,
        })
        chart.timeScale().scrollToRealTime()
      }
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [market])
  
  // Separate effect to update chart when priceData changes
  useEffect(() => {
    if (seriesRef.current && priceData) {
      const latestPrice = priceData.yes?.price ?? priceData.no?.price
      if (latestPrice !== null && latestPrice !== undefined) {
        const now = Math.floor(Date.now() / 1000)
        seriesRef.current.update({
          time: now as any,
          value: latestPrice,
        })
        if (chartRef.current) {
          chartRef.current.timeScale().scrollToRealTime()
        }
      }
    }
  }, [priceData])

  return (
    <div className="p-4 border-b border-terminal-border">
      <div className="mb-2">
        <h4 className="text-sm font-semibold">Price Chart</h4>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height: '300px' }} />
    </div>
  )
}

