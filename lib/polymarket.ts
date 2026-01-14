// Polymarket API integration service

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  slug: string;
  imageUrl?: string;
  endDate?: string;
  startDate?: string;
  outcomes: string[];
  volume?: number;
  liquidity?: number;
  marketMakerAddress?: string;
  active?: boolean;
  archived?: boolean;
  closed?: boolean;
  resolutionSource?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  conditionId?: string; // The condition ID for CLOB API
  clobTokenIds?: string[]; // Array of CLOB token IDs [yesTokenId, noTokenId]
  yesPrice?: number | null; // Yes outcome price from Gamma API
  noPrice?: number | null; // No outcome price from Gamma API
  priceChange24h?: number | null; // 24h price change from Gamma API
}

export interface MarketPrice {
  marketId: string;
  outcome: string;
  price: number;
  volume24h?: number;
  change24h?: number;
}

// Use Next.js API routes to proxy requests and avoid CORS issues
const API_BASE = '/api'

export async function fetchMarkets(params?: {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  tags?: string[];
}): Promise<PolymarketMarket[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined) queryParams.append('active', String(params.active));
    if (params?.closed !== undefined) queryParams.append('closed', String(params.closed));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));
    if (params?.tags && params.tags.length > 0) {
      params.tags.forEach(tag => queryParams.append('tags', tag));
    }

    const url = `${API_BASE}/markets?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch markets: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw error;
  }
}

export async function fetchMarketById(marketId: string): Promise<PolymarketMarket | null> {
  try {
    const response = await fetch(`${API_BASE}/markets/${marketId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch market: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching market:', error);
    return null;
  }
}


