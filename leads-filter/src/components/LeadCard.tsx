import type { Lead, LeadStatus } from "../types";

const STATUS_CONFIG: Record<string, { label: string; active: string; inactive: string }> = {
  lead:        { label: '🎯 Lead',        active: 'bg-green-600  border-green-500  text-white',  inactive: 'border-green-800  text-green-400  hover:bg-green-900/40' },
  not_a_lead:  { label: '❌ Not a Lead',  active: 'bg-red-700    border-red-600    text-white',  inactive: 'border-red-900   text-red-400    hover:bg-red-900/40' },
  contacted:   { label: '📞 Contacted',   active: 'bg-blue-600   border-blue-500   text-white',  inactive: 'border-blue-800  text-blue-400   hover:bg-blue-900/40' },
  replied:     { label: '💬 Replied',     active: 'bg-purple-600 border-purple-500 text-white',  inactive: 'border-purple-800 text-purple-400 hover:bg-purple-900/40' },
  deal_closed: { label: '🤝 Deal Closed', active: 'bg-yellow-600 border-yellow-500 text-white',  inactive: 'border-yellow-800 text-yellow-400 hover:bg-yellow-900/40' },
}

interface Props {
  lead: Lead
  onUpdate: (placeId: string, updates: Partial<Lead>) => void
}

function Stars({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-gray-600 text-xs">No rating</span>
  const n = parseFloat(rating)
  const full = Math.floor(n)
  return (
    <span className="text-yellow-400 text-sm font-semibold">
      {'★'.repeat(full)}{'☆'.repeat(5 - full)} {n}
    </span>
  )
}

export default function LeadCard({ lead, onUpdate }: Props) {
  const hasWebsite = lead.website && lead.website !== 'Not Found' && lead.website.trim() !== ''

  const borderColor =
    lead.status === 'deal_closed' ? 'border-yellow-700/70' :
    lead.status === 'lead'        ? 'border-green-700/70'  :
    lead.status === 'not_a_lead'  ? 'border-red-900/50'    :
    lead.status === 'contacted'   ? 'border-blue-800/60'   :
    lead.status === 'replied'     ? 'border-purple-800/60' :
    'border-gray-800'

  const handleStatus = (key: string) => {
    const newStatus: LeadStatus = lead.status === key ? null : key as LeadStatus
    const updates: Partial<Lead> = { status: newStatus }
    if (key === 'contacted')   updates.messageSent = true
    if (key === 'replied')     updates.replied = true
    if (key === 'deal_closed') updates.dealClosed = true
    if (key === 'lead')        updates.isLead = true
    if (key === 'not_a_lead')  updates.isLead = false
    onUpdate(lead.placeId, updates)
  }

  return (
    <div className={`bg-gray-900 border ${borderColor} rounded-2xl p-5 flex flex-col gap-4 hover:shadow-xl hover:shadow-black/30 transition-all ${lead.status === 'not_a_lead' ? 'opacity-50' : ''}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-white text-base leading-snug line-clamp-2">{lead.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">{lead.category}</span>
            {lead.isOpenNow && <span className="text-xs px-2 py-0.5 rounded-full bg-green-950 border border-green-800 text-green-400">🟢 Open</span>}
            {lead.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[lead.status]?.active}`}>
                {STATUS_CONFIG[lead.status]?.label}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <Stars rating={lead.rating} />
          {lead.reviewCount !== null && (
            <div className="text-gray-500 text-xs mt-0.5">{lead.reviewCount} reviews</div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {lead.phone && lead.phone !== 'Not Found' && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors">
            <span>📞</span><span>{lead.phone}</span>
          </a>
        )}
        <div className="flex items-start gap-2 text-gray-500">
          <span className="mt-0.5 shrink-0">📍</span>
          <span className="text-xs leading-relaxed line-clamp-2">{lead.address}</span>
        </div>
        {hasWebsite ? (
          <a href={lead.website!} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs transition-colors">
            <span>🌐</span><span className="truncate">{lead.website}</span>
          </a>
        ) : (
          <span className="flex items-center gap-2 text-gray-700 text-xs">
            <span>🌐</span><span>No website</span>
          </span>
        )}
        {lead.social && (
          <a href={lead.social} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-pink-400 hover:text-pink-300 text-xs transition-colors">
            <span>📸</span><span className="truncate">Instagram</span>
          </a>
        )}
      </div>

      {/* Maps + Date */}
      <div className="flex gap-2">
        <a href={lead.mapsUrl} target="_blank" rel="noreferrer"
          className="flex-1 text-center text-xs py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 transition-colors">
          🗺️ Open Maps
        </a>
        <span className="flex-1 text-center text-xs py-1.5 rounded-lg bg-gray-800/40 border border-gray-800 text-gray-600">
          📅 {lead.scrapedDate}
        </span>
      </div>

      {/* Status Buttons */}
      <div className="border-t border-gray-800 pt-3">
        <p className="text-xs text-gray-600 uppercase tracking-wide mb-2 font-medium">Update Status</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => handleStatus(key)}
              className={`text-xs px-2 py-2 rounded-lg border font-medium transition-all ${lead.status === key ? cfg.active : cfg.inactive}`}>
              {cfg.label}
            </button>
          ))}
          {lead.status && (
            <button onClick={() => onUpdate(lead.placeId, { status: null })}
              className="col-span-2 text-xs py-1.5 rounded-lg border border-gray-700 text-gray-600 hover:bg-gray-800 transition-colors">
              ✕ Clear Status
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
