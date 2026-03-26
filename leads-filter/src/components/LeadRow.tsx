import type { Lead, LeadStatus } from '../types'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lead:        { label: '🎯 Lead',        color: '#4ade80', bg: 'rgba(21,128,61,0.25)'  },
  not_a_lead:  { label: '❌ Not a Lead',  color: '#f87171', bg: 'rgba(127,29,29,0.25)'  },
  contacted:   { label: '📞 Contacted',   color: '#60a5fa', bg: 'rgba(29,78,216,0.25)'  },
  replied:     { label: '💬 Replied',     color: '#c084fc', bg: 'rgba(126,34,206,0.25)' },
  deal_closed: { label: '🤝 Closed',      color: '#fbbf24', bg: 'rgba(161,98,7,0.25)'   },
}

const ACTION_BUTTONS = [
  { key: 'lead',        label: '🎯',  title: 'Mark as Lead',        activeColor: '#16a34a' },
  { key: 'not_a_lead',  label: '❌',  title: 'Mark as Not a Lead',  activeColor: '#b91c1c' },
  { key: 'contacted',   label: '📞',  title: 'Mark as Contacted',   activeColor: '#1d4ed8' },
  { key: 'replied',     label: '💬',  title: 'Mark as Replied',     activeColor: '#7e22ce' },
  { key: 'deal_closed', label: '🤝',  title: 'Mark as Deal Closed', activeColor: '#a16207' },
]

interface Props {
  lead: Lead
  onUpdate: (placeId: string, updates: Partial<Lead>) => void
  isEven: boolean
}

export default function LeadRow({ lead, onUpdate, isEven }: Props) {
  const hasWebsite = lead.website && lead.website !== 'Not Found' && lead.website.trim() !== ''
  const rating = lead.rating ? parseFloat(lead.rating) : null
  const status = lead.status ? STATUS_CONFIG[lead.status] : null

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
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 120px 80px 130px 100px 110px 200px',
      padding: '10px 16px',
      gap: 8,
      alignItems: 'center',
      background: lead.status === 'not_a_lead'
        ? 'rgba(127,29,29,0.08)'
        : isEven ? '#0f172a' : '#111827',
      borderBottom: '1px solid #1f2937',
      opacity: lead.status === 'not_a_lead' ? 0.5 : 1,
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
      onMouseLeave={e => (e.currentTarget.style.background = lead.status === 'not_a_lead' ? 'rgba(127,29,29,0.08)' : isEven ? '#0f172a' : '#111827')}
    >
      {/* Name + Address */}
      <div style={{ minWidth: 0 }}>
        <a href={lead.mapsUrl} target="_blank" rel="noreferrer"
          style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={lead.name}>
          {lead.name}
        </a>
        <div style={{ fontSize: 11, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}
          title={lead.address}>
          📍 {lead.address}
        </div>
      </div>

      {/* Category */}
      <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {lead.category}
      </div>

      {/* Rating */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', whiteSpace: 'nowrap' }}>
        {rating ? `★ ${rating}` : <span style={{ color: '#374151' }}>—</span>}
      </div>

      {/* Phone */}
      <div>
        {lead.phone && lead.phone !== 'Not Found' ? (
          <a href={`tel:${lead.phone}`}
            style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {lead.phone}
          </a>
        ) : <span style={{ color: '#374151', fontSize: 12 }}>—</span>}
      </div>

      {/* Website */}
      <div>
        {hasWebsite ? (
          <a href={lead.website!} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>
            🌐 Visit
          </a>
        ) : lead.social ? (
          <a href={lead.social} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: '#f472b6', textDecoration: 'none' }}>
            📸 IG
          </a>
        ) : (
          <span style={{ fontSize: 12, color: '#374151' }}>None</span>
        )}
      </div>

      {/* Status Badge */}
      <div>
        {status ? (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            color: status.color, background: status.bg, whiteSpace: 'nowrap'
          }}>
            {status.label}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#374151' }}>Untagged</span>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
        {ACTION_BUTTONS.map(btn => (
          <button key={btn.key} onClick={() => handleStatus(btn.key)} title={btn.title}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: lead.status === btn.key ? btn.activeColor : '#1f2937',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { if (lead.status !== btn.key) e.currentTarget.style.background = '#374151' }}
            onMouseLeave={e => { e.currentTarget.style.background = lead.status === btn.key ? btn.activeColor : '#1f2937' }}
          >
            {btn.label}
          </button>
        ))}
        {lead.status && (
          <button onClick={() => onUpdate(lead.placeId, { status: null })} title="Clear status"
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid #374151',
              cursor: 'pointer', fontSize: 12, background: 'transparent', color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
