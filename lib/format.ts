/**
 * Format utilities for displaying numbers
 */

/**
 * Format a number as currency with appropriate suffix (k, M, B)
 */
export function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined || isNaN(volume) || volume === 0) {
    return '$0'
  }

  const num = Math.abs(volume)
  
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`
  } else if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(2)}k`
  } else {
    return `$${num.toFixed(2)}`
  }
}

/**
 * Format a number as currency with appropriate suffix (k, M, B) - compact version
 */
export function formatVolumeCompact(volume: number | null | undefined): string {
  if (volume === null || volume === undefined || isNaN(volume) || volume === 0) {
    return '$0'
  }

  const num = Math.abs(volume)
  
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(1)}B`
  } else if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}k`
  } else {
    return `$${num.toFixed(0)}`
  }
}

/**
 * Parse volume from API response (handles string or number)
 */
export function parseVolume(volume: any): number {
  if (volume === null || volume === undefined) {
    return 0
  }
  
  if (typeof volume === 'number') {
    return isNaN(volume) ? 0 : volume
  }
  
  if (typeof volume === 'string') {
    const parsed = parseFloat(volume)
    return isNaN(parsed) ? 0 : parsed
  }
  
  return 0
}




