import { useEffect, useState, useCallback } from 'react'
import { Grid3x3, AlertCircle, TrendingUp, CheckCircle, RefreshCw, RotateCcw } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [occupancy, setOccupancy] = useState([])
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterProject, setFilterProject] = useState('')
  const [filterLine, setFilterLine] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const [occ, proj] = await Promise.all([
        api.get('/assignments/occupancy'),
        api.get('/users/projects'),
      ])
      setOccupancy(occ.data || [])
      setProjects(proj.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!filterProject) { setLines([]); setFilterLine(''); return }
    api.get(`/users/lines?project_id=${filterProject}`)
      .then(r => setLines(r.data || []))
      .catch(() => {})
    setFilterLine('')
  }, [filterProject])

  const handleMonthlyReset = async () => {
    setResetting(true)
    setShowResetConfirm(false)
    try {
      await api.post('/auth/manual-reset')
      toast.success('Monthly reset completed! All users cleared.')
      fetchData(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed')
    }
    setResetting(false)
  }

  const filtered = occupancy.filter(s => {
    if (filterProject && String(s.project_id) !== String(filterProject)) return false
    if (filterLine && s.line_id !== filterLine) return false
    if (filterShift && String(s.shift) !== filterShift) return false
    return true
  })

  const uniqueStations = [...new Map(filtered.map(s => [s.station_id, s])).values()]
  const totalStations = uniqueStations.length
  const fullStations = filtered.filter(s => s.fill_pct >= 100).length
  const emptyStations = filtered.filter(s => s.filled === 0).length
  const partialStations = filtered.filter(s => s.filled > 0 && s.fill_pct < 100).length

  const stats = [
    { label: 'Total Stations', value: totalStations, icon: Grid3x3, color: '#6366f1', bg: 'rgba(99,102,241,.08)', border: 'rgba(99,102,241,.15)' },
    { label: 'Fully Assigned', value: fullStations, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.15)' },
    { label: 'Partial', value: partialStations, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.15)' },
    { label: 'Empty', value: emptyStations, icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.15)' },
  ]

  const getHour = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const sel = {
    padding: '6px 10px',
    border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 8, fontSize: 11,
    fontFamily: "'Space Grotesk',sans-serif",
    outline: 'none', background: '#fff', cursor: 'pointer',
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Confirm Reset Modal */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32,
            maxWidth: 400, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              Monthly Reset
            </div>
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 8, lineHeight: 1.7 }}>
              This will <strong>permanently delete ALL users</strong> except Admin.
              All data will be saved to export history first.
            </div>
            <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', marginBottom: 24, padding: '8px 12px', background: 'rgba(239,68,68,.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,.15)' }}>
              Projects, Lines and Stations will NOT be affected.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowResetConfirm(false)} style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'rgba(0,0,0,.05)', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Space Grotesk',sans-serif", color: '#64748b',
              }}>
                Cancel
              </button>
              <button onClick={handleMonthlyReset} style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif", color: '#fff',
                boxShadow: '0 4px 16px rgba(239,68,68,.35)',
              }}>
                Yes, Reset Month
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
            {getHour()}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: 12, color: '#64748b' }}>Factory floor overview — all projects and shifts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Monthly Reset Button — admin only */}
          {user?.role === 'mes_admin' && (
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,.08)', border: '1.5px solid rgba(239,68,68,.2)',
                color: '#ef4444', fontSize: 11, fontWeight: 700,
                cursor: resetting ? 'not-allowed' : 'pointer',
                fontFamily: "'Space Grotesk',sans-serif",
                opacity: resetting ? .6 : 1,
              }}
            >
              <RotateCcw size={12} style={{ animation: resetting ? 'spin 1s linear infinite' : 'none' }} />
              {resetting ? 'Resetting...' : 'Reset Month'}
            </button>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(99,102,241,.08)', border: '1.5px solid rgba(99,102,241,.2)',
              color: '#6366f1', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
              opacity: refreshing ? .6 : 1,
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 16, padding: '18px 20px',
            border: `1.5px solid ${s.border}`,
            boxShadow: '0 2px 12px rgba(0,0,0,.04)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {s.label}
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={16} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: s.color, fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Station occupancy */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid rgba(0,0,0,.06)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Station Occupancy</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
              Live · auto-refreshes every 30s · Morning & Night shifts
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={sel}>
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={String(p.id)}>Project {p.project_number}</option>
              ))}
            </select>
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
              style={{ ...sel, opacity: !filterProject ? .5 : 1 }} disabled={!filterProject}>
              <option value="">All Lines</option>
              {lines.map(l => (
                <option key={l.id} value={l.id}>{l.line_type}</option>
              ))}
            </select>
            <select value={filterShift} onChange={e => setFilterShift(e.target.value)} style={sel}>
              <option value="">All Shifts</option>
              <option value="Morning">🌅 Morning</option>
              <option value="Night">🌙 Night</option>
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['#10b981', 'Full'], ['#f59e0b', 'Partial'], ['#ef4444', 'Empty']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading stations...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {occupancy.length === 0 ? 'No stations yet' : 'No stations match filters'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {occupancy.length === 0
                ? 'Add projects and stations in Manage Projects first'
                : 'Try adjusting the filters above'}
            </div>
          </div>
        ) : (
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
            {filtered.map((s, i) => {
              const pct = s.fill_pct || 0
              const color = pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444'
              const bg = pct >= 100 ? 'rgba(16,185,129,.06)' : pct > 0 ? 'rgba(245,158,11,.06)' : 'rgba(239,68,68,.04)'
              return (
                <div key={i} style={{
                  background: bg, borderRadius: 12,
                  padding: '12px 14px', border: `1px solid ${color}25`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', fontFamily: "'Space Mono',monospace" }}>
                      {s.station_code}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: color, color: '#fff' }}>
                      {s.filled}/{s.capacity}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>
                    {s.line_type} · Proj {s.project_number}
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>
                    {s.shift === 'Morning' ? '🌅' : '🌙'} {s.shift || 'No shift'}
                  </div>
                  <div style={{ height: 3, background: 'rgba(0,0,0,.06)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 10 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}