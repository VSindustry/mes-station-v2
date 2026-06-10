import { useState, useEffect } from 'react'
import { Search, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LeaderMyTeam() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState([])
  const [stations, setStations] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStation, setFilterStation] = useState('')

 useEffect(() => {
  const load = async () => {
    setLoading(true)
    try {
      const [u, a] = await Promise.all([
        api.get('/users/'),
        api.get('/assignments/'),
      ])
      setUsers(u.data || [])
      setAssignments(a.data || [])

      if (user?.line_id) {
        const s = await api.get(`/users/stations?line_id=${user.line_id}`)
        setStations(s.data || [])
      }
    } catch {}
    setLoading(false)
  }
  load()
}, [user?.line_id])

  const fetchAll = async () => {
    try {
      const [u, a] = await Promise.all([api.get('/users/'), api.get('/assignments/')])
      setUsers(u.data || [])
      setAssignments(a.data || [])
    } catch {}
  }

  const getOperatorStation = (userId) => {
    const a = assignments.find(a => a.user_id === userId && a.status === 'active')
    return a?.stations?.station_code || '—'
  }

  const getOperatorStationId = (userId) => {
    const a = assignments.find(a => a.user_id === userId && a.status === 'active')
    return a?.station_id || null
  }

  const removeUser = async (id, name, role) => {
    const hierarchy = {
      main_leader: ['assistant_leader', 'floater', 'operator'],
      assistant_leader: ['floater', 'operator'],
      floater: ['operator'],
    }
    if (!hierarchy[user?.role]?.includes(role)) return toast.error('You cannot remove this user')
    if (!confirm(`Remove ${name}?`)) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('User removed')
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const canRemove = (targetRole) => {
    const hierarchy = {
      main_leader: ['assistant_leader', 'floater', 'operator'],
      assistant_leader: ['floater', 'operator'],
      floater: ['operator'],
    }
    return hierarchy[user?.role]?.includes(targetRole)
  }

  const filtered = users.filter(u => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.employee_id?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && u.role !== filterRole) return false
    if (filterStation) {
      const stationId = getOperatorStationId(u.id)
      if (stationId !== filterStation) return false
    }
    return true
  })

  const roleColors = {
    main_leader:      { color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', label: 'Main Leader' },
    assistant_leader: { color: '#06b6d4', bg: 'rgba(6,182,212,.1)',  label: 'Asst. Leader' },
    floater:          { color: '#10b981', bg: 'rgba(16,185,129,.1)', label: 'Floater' },
    operator:         { color: '#f59e0b', bg: 'rgba(245,158,11,.1)', label: 'Operator' },
  }

  const statusColors = {
    active:  '#10b981',
    pending: '#f59e0b',
    inactive: '#94a3b8',
  }

  const sel = {
    padding: '9px 12px', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 10, fontSize: 12,
    fontFamily: "'Space Grotesk',sans-serif",
    outline: 'none', background: '#fff', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>My Team</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{filtered.length} members in your line</div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or ID..."
            style={{ ...sel, width: '100%', paddingLeft: 30 }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={sel}>
          <option value="">All Roles</option>
          <option value="assistant_leader">Asst. Leader</option>
          <option value="floater">Floater</option>
          <option value="operator">Operator</option>
        </select>
        <select value={filterStation} onChange={e => setFilterStation(e.target.value)} style={sel}>
          <option value="">All Stations</option>
          {stations.map(s => (
            <option key={s.id} value={s.id}>{s.station_code}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>No team members found</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Try adjusting filters</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => {
            const roleInfo = roleColors[u.role] || { color: '#64748b', bg: 'rgba(0,0,0,.06)', label: u.role }
            const stationCode = getOperatorStation(u.id)
            return (
              <div key={u.id} style={{
                background: '#fff', borderRadius: 14, padding: '12px 14px',
                border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 11, background: roleInfo.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: roleInfo.color, flexShrink: 0,
                }}>
                  {u.full_name?.slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
                    {u.full_name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: '#94a3b8' }}>
                      {u.employee_id}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: roleInfo.bg, color: roleInfo.color }}>
                      {roleInfo.label}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: statusColors[u.status] || '#64748b' }}>
                      ● {u.status}
                    </span>
                    {u.shift && (
                      <span style={{ fontSize: 9, color: '#64748b' }}>
                        {u.shift === 'Morning' ? '🌅' : '🌙'} {u.shift}
                      </span>
                    )}
                    {/* Station badge for operators */}
                    {u.role === 'operator' && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                        background: stationCode !== '—' ? 'rgba(99,102,241,.1)' : 'rgba(0,0,0,.04)',
                        color: stationCode !== '—' ? '#6366f1' : '#94a3b8',
                        fontFamily: "'Space Mono',monospace",
                      }}>
                        📍 {stationCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove btn */}
                {canRemove(u.role) && (
                  <button onClick={() => removeUser(u.id, u.full_name, u.role)} style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'rgba(239,68,68,.08)', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}