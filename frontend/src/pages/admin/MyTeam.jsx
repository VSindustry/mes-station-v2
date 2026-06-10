import { useState, useEffect } from 'react'
import { Search, X, Trash2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

export default function MyTeam() {
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [stations, setStations] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterLine, setFilterLine] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [filterStation, setFilterStation] = useState('')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    Promise.all([
      api.get('/users/'),
      api.get('/users/projects'),
      api.get('/assignments/'),
    ])
      .then(([u, p, a]) => {
        setUsers(u.data || [])
        setProjects(p.data || [])
        setAssignments(a.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!filterProject) { setLines([]); setFilterLine(''); setStations([]); setFilterStation(''); return }
    api.get(`/users/lines?project_id=${filterProject}`)
      .then(r => setLines(r.data || []))
      .catch(() => {})
    setFilterLine('')
    setStations([])
    setFilterStation('')
  }, [filterProject])

  useEffect(() => {
    if (!filterLine) { setStations([]); setFilterStation(''); return }
    api.get(`/users/stations?line_id=${filterLine}`)
      .then(r => setStations(r.data || []))
      .catch(() => {})
    setFilterStation('')
  }, [filterLine])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, filterRole, filterStatus, filterProject, filterLine, filterShift, filterStation])

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

  const approveUser = async (id) => {
    try {
      await api.patch(`/users/${id}/approve`)
      toast.success('User approved!')
      fetchAll()
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const removeUser = async (id, name) => {
    if (!confirm(`Remove ${name}? They will be permanently deleted.`)) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('User removed')
      setUsers(prev => prev.filter(u => u.id !== id))
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const filtered = users.filter(u => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.employee_id?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && u.role !== filterRole) return false
    if (filterStatus && u.status !== filterStatus) return false
    if (filterProject && String(u.project_id) !== String(filterProject)) return false
    if (filterLine && u.line_id !== filterLine) return false
    if (filterShift && u.shift !== filterShift) return false
    if (filterStation) {
      const stationId = getOperatorStationId(u.id)
      if (stationId !== filterStation) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const roleColors = {
    mes_admin:        { bg: 'rgba(99,102,241,.1)',  color: '#6366f1', label: 'MES Admin' },
    main_leader:      { bg: 'rgba(139,92,246,.1)',  color: '#8b5cf6', label: 'Main Leader' },
    assistant_leader: { bg: 'rgba(6,182,212,.1)',   color: '#06b6d4', label: 'Asst. Leader' },
    floater:          { bg: 'rgba(16,185,129,.1)',  color: '#10b981', label: 'Floater' },
    operator:         { bg: 'rgba(245,158,11,.1)',  color: '#f59e0b', label: 'Operator' },
  }

  const statusColors = {
    active:    { bg: 'rgba(16,185,129,.1)',  color: '#10b981' },
    pending:   { bg: 'rgba(245,158,11,.1)',  color: '#f59e0b' },
    inactive:  { bg: 'rgba(100,116,139,.1)', color: '#64748b' },
    suspended: { bg: 'rgba(239,68,68,.1)',   color: '#ef4444' },
  }

  const sel = {
    padding: '7px 12px', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 10, fontSize: 11,
    fontFamily: "'Space Grotesk',sans-serif",
    outline: 'none', background: '#fff', cursor: 'pointer',
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>My Team</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>All users across all projects and lines</p>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '14px 18px',
        border: '1.5px solid rgba(0,0,0,.06)', marginBottom: 20,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or ID..."
            style={{ ...sel, width: '100%', paddingLeft: 30 }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={sel}>
          <option value="">All Roles</option>
          <option value="main_leader">Main Leader</option>
          <option value="assistant_leader">Asst. Leader</option>
          <option value="floater">Floater</option>
          <option value="operator">Operator</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={sel}>
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={String(p.id)}>Project {p.project_number}</option>
          ))}
        </select>
        <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
          style={{ ...sel, opacity: !filterProject ? .5 : 1 }} disabled={!filterProject}>
          <option value="">All Lines</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.line_type}</option>)}
        </select>
        <select value={filterStation} onChange={e => setFilterStation(e.target.value)}
          style={{ ...sel, opacity: !filterLine ? .5 : 1 }} disabled={!filterLine}>
          <option value="">All Stations</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.station_code}</option>)}
        </select>
        <select value={filterShift} onChange={e => setFilterShift(e.target.value)} style={sel}>
          <option value="">All Shifts</option>
          <option value="Morning">🌅 Morning</option>
          <option value="Night">🌙 Night</option>
        </select>
        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {filtered.length} users
        </span>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1.5px solid rgba(0,0,0,.06)',
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,.02)', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                {['Employee', 'ID', 'Role', 'Project', 'Line', 'Station', 'Shift', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
              ) : paginated.map(u => {
                const roleInfo = roleColors[u.role] || { bg: 'rgba(0,0,0,.04)', color: '#64748b', label: u.role }
                const statusInfo = statusColors[u.status] || { bg: 'rgba(0,0,0,.04)', color: '#64748b' }
                const stationCode = getOperatorStation(u.id)
                return (
                  <tr key={u.id}
                    style={{ borderBottom: '1px solid rgba(0,0,0,.04)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelected(u)}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, background: roleInfo.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: roleInfo.color, flexShrink: 0,
                        }}>
                          {u.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{u.short_name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: "'Space Mono',monospace", color: '#64748b' }}>
                      {u.employee_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: roleInfo.bg, color: roleInfo.color }}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {u.projects?.project_number ? `Proj ${u.projects.project_number}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {u.lines?.line_type || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.role === 'operator' ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: stationCode !== '—' ? 'rgba(99,102,241,.1)' : 'rgba(0,0,0,.04)',
                          color: stationCode !== '—' ? '#6366f1' : '#94a3b8',
                          fontFamily: "'Space Mono',monospace",
                        }}>
                          {stationCode}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {u.shift ? (u.shift === 'Morning' ? '🌅' : '🌙') + ' ' + u.shift : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusInfo.bg, color: statusInfo.color }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {u.status === 'pending' && (
                          <button onClick={() => approveUser(u.id)} style={{
                            padding: '5px 10px', borderRadius: 8, border: 'none',
                            background: 'rgba(16,185,129,.1)', color: '#10b981',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}>
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                        {u.role !== 'mes_admin' && (
                          <button onClick={() => removeUser(u.id, u.full_name)} style={{
                            padding: '5px 10px', borderRadius: 8, border: 'none',
                            background: 'rgba(239,68,68,.1)', color: '#ef4444',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}>
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid rgba(0,0,0,.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0,0,0,.01)',
          }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(0,0,0,.08)',
                  background: page === 1 ? 'rgba(0,0,0,.02)' : '#fff',
                  color: page === 1 ? '#cbd5e1' : '#0f172a',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) => p === '...' ? (
                  <span key={`dot-${idx}`} style={{ fontSize: 12, color: '#94a3b8', padding: '0 4px' }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: page === p ? 'none' : '1.5px solid rgba(0,0,0,.08)',
                      background: page === p ? '#6366f1' : '#fff',
                      color: page === p ? '#fff' : '#0f172a',
                      fontSize: 12, fontWeight: page === p ? 700 : 400,
                      cursor: 'pointer',
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}
                  >
                    {p}
                  </button>
                ))
              }

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(0,0,0,.08)',
                  background: page === totalPages ? 'rgba(0,0,0,.02)' : '#fff',
                  color: page === totalPages ? '#cbd5e1' : '#0f172a',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 500, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, width: 420,
            overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.2)',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>User Details</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              {[
                ['Full Name', selected.full_name],
                ['Employee ID', selected.employee_id],
                ['Role', selected.role?.replace(/_/g, ' ')],
                ['Project', selected.projects?.project_number ? `Project ${selected.projects.project_number}` : '—'],
                ['Line', selected.lines?.line_type || '—'],
                ['Station', selected.role === 'operator' ? getOperatorStation(selected.id) : '—'],
                ['Shift', selected.shift || '—'],
                ['Status', selected.status],
                ['Language', selected.language_pref],
                ['Last Login', selected.last_login_at ? new Date(selected.last_login_at).toLocaleString('en-MY') : 'Never'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.04)',
                }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
              {selected.role !== 'mes_admin' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  {selected.status === 'pending' && (
                    <button onClick={() => approveUser(selected.id)} style={{
                      flex: 1, padding: 11, borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg,#10b981,#059669)',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
                    }}>
                      ✅ Approve User
                    </button>
                  )}
                  <button onClick={() => removeUser(selected.id, selected.full_name)} style={{
                    flex: 1, padding: 11, borderRadius: 12, border: 'none',
                    background: 'rgba(239,68,68,.1)', color: '#ef4444',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}>
                    🗑 Remove User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}