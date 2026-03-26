import { useState, useEffect, useMemo } from 'react'
import type { Filters, Lead } from './types'
import FilterBar from './components/FilterBar'
import LeadCard from './components/LeadCard'
import LeadRow from './components/LeadRow'

const defaultFilters: Filters = {
  category: 'All',
  minRating: 0,
  maxRating: 5,          // 👈 add
  hasWebsite: 'all',
  hasPhone: 'all',
  hasSocial: 'all',
  status: 'all',
  minReviews: 0,
  maxReviews: 999999,    // 👈 add
  isOpenNow: 'all',
}


function App() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  useEffect(() => {
    fetch('/api/leads')
      .then(r => {
        if (!r.ok) throw new Error('Server error — is the backend running?')
        return r.json()
      })
      .then(data => { setLeads(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const categories = useMemo(() =>
    ['All', ...Array.from(new Set(leads.map(l => l.category))).sort()],
    [leads]
  )
  

  const filtered = useMemo(() => leads.filter(lead => {
    if (filters.category !== 'All' && lead.category !== filters.category) return false

    const rating = lead.rating ? parseFloat(lead.rating) : null
if (filters.minRating > 0 && (!rating || rating < filters.minRating)) return false
if (filters.maxRating < 5 && (!rating || rating > filters.maxRating)) return false

const reviews = lead.reviewCount ?? 0
if (filters.minReviews > 0 && reviews < filters.minReviews) return false
if (filters.maxReviews < 999999 && reviews > filters.maxReviews) return false

    const hasWebsite = lead.website && lead.website !== 'Not Found' && lead.website.trim() !== ''
    if (filters.hasWebsite === 'yes' && !hasWebsite) return false
    if (filters.hasWebsite === 'no' && hasWebsite) return false
    // NEW
const validStatuses = ['lead', 'not_a_lead', 'contacted', 'replied', 'deal_closed']
const isUntagged = !lead.status || !validStatuses.includes(lead.status)
if (filters.status === 'untagged' && !isUntagged) return false
if (filters.status !== 'all' && filters.status !== 'untagged' && lead.status !== filters.status) return false

const hasSocial = lead.social && lead.social.trim() !== ''
if (filters.hasSocial === 'yes' && !hasSocial) return false
if (filters.hasSocial === 'no' && hasSocial) return false


    if (filters.isOpenNow === 'yes' && !lead.isOpenNow) return false
    if (filters.isOpenNow === 'no' && lead.isOpenNow) return false
const hasPhone = lead.phone && lead.phone.trim() !== '' && lead.phone !== 'Not Found'
if (filters.hasPhone === 'yes' && !hasPhone) return false
if (filters.hasPhone === 'no' && hasPhone) return false

    return true
  }), [leads, filters])

  const bulkUpdate = async (updates: Partial<Lead>) => {
  if (!window.confirm(`Apply this status to all ${filtered.length} filtered leads?`)) return
  try {
    const updated = await Promise.all(
      filtered.map(lead =>
        fetch(`/api/leads/${encodeURIComponent(lead.placeId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }).then(r => r.json())
      )
    )
    setLeads(prev =>
      prev.map(lead => {
        const match = updated.find(u => u.placeId === lead.placeId)
        return match ? match : lead
      })
    )
  } catch {
    alert('Bulk update failed. Make sure the server is running.')
  }
}


  const updateLead = async (placeId: string, updates: Partial<Lead>) => {
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(placeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await res.json()
      setLeads(prev => prev.map(l => l.placeId === placeId ? updated : l))
    } catch {
      alert('Failed to save. Make sure the server is running.')
    }
  }
const validStatuses = ['lead', 'not_a_lead', 'contacted', 'replied', 'deal_closed']

  const stats = useMemo(() => ({
    total: leads.length,
untagged: leads.filter(l => !l.status || !validStatuses.includes(l.status)).length,
    leads: leads.filter(l => l.status === 'lead').length,
    notLead: leads.filter(l => l.status === 'not_a_lead').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    replied: leads.filter(l => l.status === 'replied').length,
    closed: leads.filter(l => l.status === 'deal_closed').length,
  }), [leads])

  if (loading) return (
    <div style={{ background: '#030712', minHeight: '100vh' }} className="flex items-center justify-center">
      <div className="text-white text-xl animate-pulse">⏳ Loading leads...</div>
    </div>
  )

  if (error) return (
    <div style={{ background: '#030712', minHeight: '100vh' }} className="flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <div className="text-red-400 text-xl font-bold">Error loading leads</div>
        <div className="text-gray-400 mt-2">{error}</div>
        <div className="text-gray-500 mt-3 text-sm">
          Make sure <code className="bg-gray-800 px-1 rounded">server.js</code> is running and{' '}
          <code className="bg-gray-800 px-1 rounded">../datasets/leads.json</code> exists.
        </div>
      </div>
    </div>
  )

  const statCards = [
    { label: 'Total',      value: stats.total,     border: '#374151', bg: 'rgba(55,65,81,0.5)',   text: '#fff' },
    { label: 'Untagged',   value: stats.untagged,  border: '#374151', bg: 'rgba(55,65,81,0.2)',   text: '#9ca3af' },
    { label: '🎯 Leads',   value: stats.leads,     border: '#15803d', bg: 'rgba(21,128,61,0.2)',  text: '#4ade80' },
    { label: '❌ Not Lead',value: stats.notLead,   border: '#7f1d1d', bg: 'rgba(127,29,29,0.2)',  text: '#f87171' },
    { label: '📞 Contacted',value:stats.contacted, border: '#1d4ed8', bg: 'rgba(29,78,216,0.2)',  text: '#60a5fa' },
    { label: '💬 Replied', value: stats.replied,   border: '#7e22ce', bg: 'rgba(126,34,206,0.2)', text: '#c084fc' },
    { label: '🤝 Closed',  value: stats.closed,    border: '#a16207', bg: 'rgba(161,98,7,0.2)',   text: '#fbbf24' },
  ]

  function BulkButton({ label, onClick, activeColor, hoverColor }: {
  label: string
  onClick: () => void
  activeColor: string
  hoverColor: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 600, color: '#fff',
        background: hover ? hoverColor : activeColor,
        transition: 'background 0.15s',
        whiteSpace: 'nowrap'
      }}>
      {label}
    </button>
  )
}


  return (
    <div style={{ background: '#030712', minHeight: '100vh', color: 'white' }}>
      {/* Sticky Header */}
      <header style={{ background: 'rgba(17,24,39,0.9)', borderBottom: '1px solid #1f2937', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎯 Leads Filter</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Cold outreach · {leads.length} leads · {filtered.length} showing</p>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: 13 }}>View:</span>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #374151' }}>
              <button
                onClick={() => setViewMode('card')}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: viewMode === 'card' ? '#3b82f6' : '#1f2937',
                  color: viewMode === 'card' ? '#fff' : '#9ca3af',
                  transition: 'all 0.15s'
                }}>
                ⊞ Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: viewMode === 'list' ? '#3b82f6' : '#1f2937',
                  color: viewMode === 'list' ? '#fff' : '#9ca3af',
                  transition: 'all 0.15s'
                }}>
                ☰ List
              </button>
            </div>
            <span style={{ color: '#4b5563', fontSize: 12 }}>
              {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ padding: '8px 24px 12px', display: 'flex', gap: 10, overflowX: 'auto' }}>
          {statCards.map(s => (
            <div key={s.label} style={{
              borderRadius: 10, padding: '8px 16px', border: `1px solid ${s.border}`,
              background: s.bg, textAlign: 'center', minWidth: 80, flexShrink: 0
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.text }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Filters */}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          onReset={() => setFilters(defaultFilters)}
        />
        {/* Bulk Actions */}
{filtered.length > 0 && (
  <div style={{
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    padding: '12px 16px', background: '#0f172a',
    border: '1px solid #1e3a5f', borderRadius: 12,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
      <span style={{ fontSize: 16 }}>⚡</span>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>
        Bulk apply to{' '}
        <strong style={{ color: '#60a5fa' }}>{filtered.length}</strong>{' '}
        filtered lead{filtered.length !== 1 ? 's' : ''}:
      </span>
    </div>

    {[
      { label: '🎯 All as Lead',        updates: { status: 'lead'        as const, isLead: true },             active: '#16a34a', hover: '#15803d' },
      { label: '❌ All as Not a Lead',  updates: { status: 'not_a_lead'  as const, isLead: false },            active: '#b91c1c', hover: '#991b1b' },
      { label: '📞 All as Contacted',   updates: { status: 'contacted'   as const, messageSent: true },        active: '#1d4ed8', hover: '#1e40af' },
      { label: '💬 All as Replied',     updates: { status: 'replied'     as const, replied: true },            active: '#7e22ce', hover: '#6b21a8' },
      { label: '🤝 All as Deal Closed', updates: { status: 'deal_closed' as const, dealClosed: true },         active: '#a16207', hover: '#92400e' },
      { label: '✕ Clear All Status',   updates: { status: null          as const },                     active: '#374151', hover: '#4b5563' },
    ].map(btn => (
      <BulkButton key={btn.label} label={btn.label} activeColor={btn.active} hoverColor={btn.hover}
        onClick={() => bulkUpdate(btn.updates as Partial<Lead>)} />
    ))}
  </div>
)}


        {/* Results */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ color: '#6b7280', fontSize: 18, marginTop: 12 }}>No leads match these filters</div>
            <button onClick={() => setFilters(defaultFilters)}
              style={{ marginTop: 16, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}>
              ↺ Clear all filters
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* Card Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {filtered.map(lead => (
              <LeadCard key={lead.placeId} lead={lead} onUpdate={updateLead} />
            ))}
          </div>
        ) : (
          /* List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 120px 80px 130px 100px 110px 200px',
              padding: '10px 16px',
              background: '#111827',
              borderBottom: '1px solid #1f2937',
              fontSize: 11,
              color: '#6b7280',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              gap: 8
            }}>
              <span>Name / Address</span>
              <span>Category</span>
              <span>Rating</span>
              <span>Phone</span>
              <span>Website</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filtered.map((lead, i) => (
              <LeadRow
                key={lead.placeId}
                lead={lead}
                onUpdate={updateLead}
                isEven={i % 2 === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
