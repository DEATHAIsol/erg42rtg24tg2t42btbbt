/**
 * Category Mapper - Maps Polymarket API categories to filter tags
 * This ensures consistent tag assignment for filtering
 */

// All available filter categories (what users can filter by)
export const FILTER_CATEGORIES = [
  'politics',
  'economics',
  'crypto',
  'sports',
  'entertainment',
  'technology',
  'business',
  'health',
  'science',
  'weather',
  'gaming',
  'nft',
  'defi',
  'stocks',
  'elections',
] as const

export type FilterCategory = typeof FILTER_CATEGORIES[number]

// Display labels for categories
export const CATEGORY_LABELS: Record<FilterCategory, string> = {
  'politics': 'Politics',
  'economics': 'Economics',
  'crypto': 'Crypto',
  'sports': 'Sports',
  'entertainment': 'Entertainment',
  'technology': 'Technology',
  'business': 'Business',
  'health': 'Health',
  'science': 'Science',
  'weather': 'Weather',
  'gaming': 'Gaming',
  'nft': 'NFT',
  'defi': 'DeFi',
  'stocks': 'Stocks',
  'elections': 'Elections',
}

/**
 * Maps Polymarket API category strings to our filter tags
 * This is the single source of truth for category mapping
 */
const CATEGORY_MAP: Record<string, FilterCategory[]> = {
  // Politics & Elections
  'politics': ['politics', 'elections'],
  'us-current-affairs': ['politics', 'elections'],
  'us-current-affairs ': ['politics', 'elections'], // Handle trailing space
  'world': ['politics'],
  'elections': ['elections', 'politics'],
  
  // Economics & Business
  'economics': ['economics'],
  'finance': ['economics', 'business', 'stocks'],
  'business': ['business', 'stocks'],
  'stocks': ['stocks', 'business'],
  
  // Crypto & DeFi
  'crypto': ['crypto', 'defi'],
  'defi': ['defi', 'crypto'],
  'nft': ['nft', 'crypto'],
  
  // Technology
  'tech': ['technology'],
  'technology': ['technology'],
  
  // Entertainment
  'entertainment': ['entertainment'],
  'pop-culture': ['entertainment'],
  'pop-culture ': ['entertainment'], // Handle trailing space
  'culture': ['entertainment'],
  
  // Sports
  'sports': ['sports'],
  
  // Health
  'health': ['health'],
  'coronavirus': ['health'],
  
  // Science
  'science': ['science'],
  
  // Weather
  'weather': ['weather'],
  
  // Gaming
  'gaming': ['gaming'],
}

/**
 * Extract and normalize tags from a market's category field
 */
export function extractTagsFromCategory(category: string | null | undefined): FilterCategory[] {
  if (!category) return []
  
  // Normalize category: lowercase, trim, replace spaces with hyphens
  const normalized = String(category)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
  
  if (!normalized) return []
  
  // Direct match in category map
  if (CATEGORY_MAP[normalized]) {
    return [...CATEGORY_MAP[normalized]]
  }
  
  // Try matching with trailing space removed
  const trimmed = normalized.trim()
  if (trimmed !== normalized && CATEGORY_MAP[trimmed]) {
    return [...CATEGORY_MAP[trimmed]]
  }
  
  // Partial matching - check if category contains any mapped key
  const matchedTags = new Set<FilterCategory>()
  
  for (const [apiCategory, tags] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(apiCategory) || apiCategory.includes(normalized)) {
      tags.forEach(tag => matchedTags.add(tag))
    }
  }
  
  // Word-based matching - split by hyphens/underscores and match individual words
  const words = normalized.split(/[-_\s]+/).filter(w => w.length > 0)
  for (const word of words) {
    if (CATEGORY_MAP[word]) {
      CATEGORY_MAP[word].forEach(tag => matchedTags.add(tag))
    }
    
    // Keyword matching
    if (word.includes('tech') || word.includes('technology')) {
      matchedTags.add('technology')
    } else if (word.includes('crypto') || word.includes('bitcoin') || word.includes('ethereum')) {
      matchedTags.add('crypto')
      matchedTags.add('defi')
    } else if (word.includes('sport')) {
      matchedTags.add('sports')
    } else if (word.includes('politic') || word.includes('election') || word.includes('current-affair')) {
      matchedTags.add('politics')
      matchedTags.add('elections')
    } else if (word.includes('entertain') || word.includes('culture') || word.includes('pop')) {
      matchedTags.add('entertainment')
    } else if (word.includes('econom') || word.includes('finance')) {
      matchedTags.add('economics')
      matchedTags.add('business')
    } else if (word.includes('business') || word.includes('stock')) {
      matchedTags.add('business')
      matchedTags.add('stocks')
    } else if (word.includes('health') || word.includes('corona')) {
      matchedTags.add('health')
    } else if (word.includes('science')) {
      matchedTags.add('science')
    } else if (word.includes('weather')) {
      matchedTags.add('weather')
    } else if (word.includes('gaming') || word.includes('game')) {
      matchedTags.add('gaming')
    } else if (word.includes('nft')) {
      matchedTags.add('nft')
      matchedTags.add('crypto')
    } else if (word.includes('defi')) {
      matchedTags.add('defi')
      matchedTags.add('crypto')
    }
  }
  
  return Array.from(matchedTags)
}

/**
 * Infer tags from market question and description
 * Uses keyword matching to categorize markets when API doesn't provide categories
 */
function inferTagsFromText(text: string): FilterCategory[] {
  const tags = new Set<FilterCategory>()
  const lowerText = text.toLowerCase()
  
  // Politics & Elections (high priority - check first, but be specific)
  // Avoid matching "win" in sports contexts
  const politicsKeywords = /\b(trump|biden|president|election|vote|politics|political|senate|congress|house|republican|democrat|democratic|governor|mayor|harris|pence|kamala|mike|donald|joe|presidential|primary|caucus|ballot|polling|poll|voter|voting|deport|immigration|border|nomination|candidate|senator|representative|congressman|congresswoman)\b/
  const sportsContext = /\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|hockey|tennis|golf|olympics|super bowl|world cup|championship|playoff|stanley cup|world series|finals|premier league|champions league|league|cup|tournament|match|game|team|player|athlete|sport)\b/
  
  // Only add politics if not in a sports context
  if (politicsKeywords.test(lowerText) && !sportsContext.test(lowerText)) {
    tags.add('politics')
    if (/\b(election|vote|voting|ballot|poll|primary|caucus|presidential|nomination)\b/.test(lowerText)) {
      tags.add('elections')
    }
  }
  
  // Crypto (check before general business terms)
  if (/\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency|blockchain|solana|sol|cardano|ada|polygon|matic|uniswap|doge|dogecoin|shiba|token|coin|wallet|exchange|binance|coinbase|tether|usdt|stablecoin)\b/.test(lowerText)) {
    tags.add('crypto')
    if (/\b(nft|non-fungible)\b/.test(lowerText)) tags.add('nft')
    if (/\b(defi|decentralized|yield|liquidity|staking)\b/.test(lowerText)) tags.add('defi')
  }
  
  // Sports (check before general "game" terms)
  if (/\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|hockey|tennis|golf|olympics|super bowl|world cup|championship|playoff|stanley cup|world series|finals|premier league|champions league|athlete|sport|team|player|win.*league|win.*cup|win.*championship|win.*tournament)\b/.test(lowerText)) {
    tags.add('sports')
  }
  
  // Gaming (check after sports to avoid conflicts)
  if (/\b(video game|gaming|gamer|playstation|ps5|xbox|nintendo|switch|steam|esports|twitch|streamer|console|game console)\b/.test(lowerText)) {
    tags.add('gaming')
  }
  
  // Technology (check before general business)
  if (/\b(apple|iphone|ipad|mac|google|microsoft|msft|amazon|aws|meta|facebook|tesla|tsla|ai|artificial intelligence|machine learning|chatgpt|openai|nvidia|nvda|tech|technology|software|hardware|computer|phone|device|app|platform)\b/.test(lowerText)) {
    tags.add('technology')
  }
  
  // Weather & Climate (check before general science)
  if (/\b(weather|storm|hurricane|tornado|snow|rain|temperature|climate|hottest|coldest|heat|cold|precipitation|drought|flood)\b/.test(lowerText)) {
    tags.add('weather')
    tags.add('science')
  }
  
  // Health (check before general science)
  if (/\b(health|medical|doctor|hospital|disease|illness|treatment|vaccine|vaccination|covid|coronavirus|pandemic|epidemic|drug|medicine|pharmaceutical|fda|who)\b/.test(lowerText)) {
    tags.add('health')
  }
  
  // Science (general)
  if (/\b(science|scientific|research|study|experiment|discovery|space|nasa|mars|moon|planet|earth)\b/.test(lowerText) && !tags.has('weather')) {
    tags.add('science')
  }
  
  // Business & Stocks (check for specific financial terms)
  if (/\b(stock|stocks|share|shares|nasdaq|sp500|s&p|dow|dow jones|trading|invest|investment|company|corporate|earnings|revenue|profit|ipo|merger|acquisition)\b/.test(lowerText)) {
    tags.add('business')
    tags.add('stocks')
  }
  
  // Economics (broader than business)
  if (/\b(economy|economic|gdp|inflation|unemployment|fed|federal reserve|interest rate|recession|depression|unemployment rate)\b/.test(lowerText)) {
    tags.add('economics')
    if (!tags.has('business')) tags.add('business')
  }
  
  // Entertainment
  if (/\b(movie|film|tv|television|show|series|netflix|disney|hbo|streaming|actor|actress|oscar|emmy|grammy|award|celebrity|music|song|album|artist|entertainment|pop culture)\b/.test(lowerText)) {
    tags.add('entertainment')
  }
  
  return Array.from(tags)
}

/**
 * Extract tags from a market object
 * Handles category, tags array, categories array, and infers from question/description
 */
export function extractMarketTags(market: any): FilterCategory[] {
  const tags = new Set<FilterCategory>()
  
  // Extract from category field (primary source)
  if (market.category) {
    const categoryTags = extractTagsFromCategory(market.category)
    categoryTags.forEach(tag => tags.add(tag))
  }
  
  // Extract from tags array if present
  if (Array.isArray(market.tags)) {
    market.tags.forEach((tag: any) => {
      const normalized = String(tag).trim().toLowerCase()
      const extracted = extractTagsFromCategory(normalized)
      extracted.forEach(t => tags.add(t))
    })
  }
  
  // Extract from categories array if present
  if (Array.isArray(market.categories)) {
    market.categories.forEach((cat: any) => {
      const normalized = String(cat).trim().toLowerCase()
      const extracted = extractTagsFromCategory(normalized)
      extracted.forEach(t => tags.add(t))
    })
  }
  
  // If no tags found from API fields, infer from question and description
  if (tags.size === 0) {
    const question = market.question || market.title || ''
    const description = market.description || ''
    const combinedText = `${question} ${description}`
    
    if (combinedText.trim()) {
      const inferredTags = inferTagsFromText(combinedText)
      inferredTags.forEach(tag => tags.add(tag))
    }
  }
  
  return Array.from(tags)
}

/**
 * Check if a market matches the selected filter tags
 */
export function matchesFilterTags(marketTags: FilterCategory[], selectedTags: string[]): boolean {
  if (selectedTags.length === 0) return true
  
  // Market must have at least one of the selected tags
  return selectedTags.some(selectedTag => 
    marketTags.includes(selectedTag as FilterCategory)
  )
}

