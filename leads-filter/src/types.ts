export interface Lead {
  placeId: string
  name: string
  category: string
  phone: string
  address: string
  website: string | null
  social: string | null
  mapsUrl: string
  rating: string | null
  reviewCount: number | null
  isOpenNow: boolean
  openingHours: Record<string, string> | null
  priceRange: string | null
  plusCode: string | null
  photoCount: number | null
  description: string | null
  hasMultipleBranches: boolean
  branchCount: number | null
  branchDetectSource: string | null
  query: string
  scrapedDate: string
  status: LeadStatus
  messageSent: boolean
  replied: boolean
  dealClosed: boolean
  isLead: boolean
}

export type LeadStatus = 'lead' | 'not_a_lead' | 'contacted' | 'replied' | 'deal_closed' | null

export interface Filters {
  category: string
  minRating: number
  maxRating: number      // 👈 add
  hasWebsite: 'all' | 'yes' | 'no'
  hasPhone: 'all' | 'yes' | 'no'
  hasSocial: 'all' | 'yes' | 'no'
  status: string
  minReviews: number
  maxReviews: number     // 👈 add
  isOpenNow: 'all' | 'yes' | 'no'
}
