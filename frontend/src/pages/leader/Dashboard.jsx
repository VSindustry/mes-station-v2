import { useEffect, useState, useCallback } from 'react'
import { Grid3x3, CheckCircle, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'

export default function LeaderDashboard() {
  const { user } = useAuthStore()
  const [occupancy, setOccupancy] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOccupancy = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const r = await api.get('/assignments/occupancy')
      setOccupancy(r.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchOccupancy()
    const interval = setInterval(() => fetchOccupancy(), 30000)
    return () => clearInterval(interval)
  }, [fetchOccupancy])

  const totalStations = occupancy.length
  const fullStations = occupancy.filter(s => s.fill_pct >= 100).length
  const emptyStations = occupancy.filter(s => s.filled === 0).length
  const partialStations = occupancy.filter(s => s.filled > 0 && s.fill_pct < 100).length

  const getHour = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const roleLabel = {
    main_leader: 'Main Leader',
    assistant_leader: 'Asst. Leader',
    floater: 'Floater',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          {getHour()} 👋
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{user?.full_name}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,.1)', color: '#6366f1' }}>
            {roleLabel[user?.role] || user?.role}
          </span>
          {user?.shift && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,.1)', color: '#10b981' }}>
              {user.shift === 'Morning' ? '🌅' : '🌙'} {user.shift} Shift
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Stations', value: totalStations, color: '#6366f1', bg: 'rgba(99,102,241,.08)', icon: Grid3x3 },
          { label: 'Full', value: fullStations, color: '#10b981', bg: 'rgba(16,185,129,.08)', icon: CheckCircle },
          { label: 'Partial', value: partialStations, color: '#f59e0b', bg: 'rgba(245,158,11,.08)', icon: TrendingUp },
          { label: 'Empty', value: emptyStations, color: '#ef4444', bg: 'rgba(239,68,68,.08)', icon: AlertCircle },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 14, padding: '14px 16px',
            border: `1.5px solid ${s.bg}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={14} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: "'Space Mono',monospace" }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <button onClick={() => fetchOccupancy(true)} disabled={refreshing} style={{
        width: '100%', padding: '10px', borderRadius: 12,
        background: 'rgba(99,102,241,.08)', border: '1.5px solid rgba(99,102,241,.2)',
        color: '#6366f1', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Space Grotesk',sans-serif", marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: refreshing ? .6 : 1,
      }}>
        <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>

      {/* Station cards */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>My Stations</div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Loading...</div>
      ) : occupancy.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🏭</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>No stations yet</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Stations will appear once assigned</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {occupancy.map((s, i) => {
            const pct = s.fill_pct || 0
            const color = pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444'
            const bg = pct >= 100 ? 'rgba(16,185,129,.06)' : pct > 0 ? 'rgba(245,158,11,.06)' : 'rgba(239,68,68,.04)'
            return (
              <div key={i} style={{ background: bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${color}25` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Mono',monospace" }}>{s.station_code}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: color, color: '#fff' }}>{s.filled}/{s.capacity}</span>
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>{s.line_type}</div>
                <div style={{ height: 3, background: 'rgba(0,0,0,.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 10 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}