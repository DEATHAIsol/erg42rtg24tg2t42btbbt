// SOL Price fetching utility
let cachedSolPrice: number | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 60000 // 1 minute cache

export async function getSolPrice(): Promise<number> {
  const now = Date.now()
  
  // Return cached price if still valid
  if (cachedSolPrice && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedSolPrice
  }

  try {
    // Use CoinGecko free API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { 
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch SOL price')
    }
    
    const data = await response.json()
    cachedSolPrice = data.solana?.usd || 180 // Fallback to ~$180
    lastFetchTime = now
    
    return cachedSolPrice as number
  } catch (error) {
    console.error('Error fetching SOL price:', error)
    // Return cached value or fallback
    return cachedSolPrice ?? 180
  }
}

// For client-side use
export function useSolPrice() {
  if (typeof window === 'undefined') return 180
  
  // Check localStorage cache first
  const cached = localStorage.getItem('sol-price-cache')
  if (cached) {
    const { price, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_DURATION) {
      return price
    }
  }
  
  return cachedSolPrice || 180
}

// Format SOL to USD
export function solToUsd(solAmount: number, solPrice: number): number {
  return solAmount * solPrice
}

// Format USD display
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

