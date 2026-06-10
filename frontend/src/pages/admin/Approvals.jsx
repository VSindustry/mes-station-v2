import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

export default function Approvals() {
  const [tab, setTab] = useState('users')
  const [pendingUsers, setPendingUsers] = useState([])
  const [pendingAssignments, setPendingAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [userPage, setUserPage] = useState(1)
  const [assignPage, setAssignPage] = useState(1)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [u, a] = await Promise.all([
        api.get('/users/').catch(() => ({ data: [] })),
        api.get('/assignments/pending').catch(() => ({ data: [] })),
      ])
      setPendingUsers((u.data || []).filter(x => x.status === 'pending'))
      setPendingAssignments(a.data || [])
    } catch {}
    setLoading(false)
  }

  const approveUser = async (id) => {
    try {
      await api.patch(`/users/${id}/approve`)
      toast.success('User approved!')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const rejectUser = async (id) => {
    try {
      await api.patch(`/users/${id}/reject`)
      toast.success('User rejected')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const approveAssignment = async (id) => {
    try {
      await api.patch(`/assignments/${id}/approve-reject`, { action: 'approve' })
      toast.success('Assignment approved!')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const rejectAssignment = async (id) => {
    try {
      await api.patch(`/assignments/${id}/approve-reject`, { action: 'reject', reason: 'Rejected by admin' })
      toast.success('Assignment rejected')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const roleColors = {
    main_leader: '#8b5cf6',
    assistant_leader: '#06b6d4',
    floater: '#10b981',
    operator: '#f59e0b',
  }

  // Pagination helpers
  const userTotalPages = Math.ceil(pendingUsers.length / PAGE_SIZE)
  const assignTotalPages = Math.ceil(pendingAssignments.length / PAGE_SIZE)
  const paginatedUsers = pendingUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE)
  const paginatedAssignments = pendingAssignments.slice((assignPage - 1) * PAGE_SIZE, assignPage * PAGE_SIZE)

  const PaginationBar = ({ page, totalPages, setPage, total }) => {
    if (totalPages <= 1) return null
    return (
      <div style={{
        marginTop: 16, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff', borderRadius: 12, padding: '12px 16px',
        border: '1.5px solid rgba(0,0,0,.06)',
      }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1.5px solid rgba(0,0,0,.08)',
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
              width: 32, height: 32, borderRadius: 8,
              border: '1.5px solid rgba(0,0,0,.08)',
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
    )
  }

  const tabBtn = (id, label, icon, count) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: '10px 16px', border: 'none', borderRadius: 12,
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'Space Grotesk',sans-serif",
      background: tab === id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
      color: tab === id ? '#fff' : '#64748b',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all .2s',
    }}>
      {icon} {label}
      {count > 0 && (
        <span style={{
          background: tab === id ? 'rgba(255,255,255,.25)' : '#ef4444',
          color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '1px 6px', borderRadius: 20,
        }}>{count}</span>
      )}
    </button>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Approvals</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Review and approve pending user registrations and station assignments</p>
      </div>

      {/* Tabs */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: 6,
        border: '1.5px solid rgba(0,0,0,.06)', marginBottom: 20,
        display: 'flex', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}>
        {tabBtn('users', 'New Users', <Users size={14} />, pendingUsers.length)}
        {tabBtn('assignments', 'Assignments', <MapPin size={14} />, pendingAssignments.length)}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : tab === 'users' ? (
        pendingUsers.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No pending users</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>All user registrations have been reviewed</div>
          </div>
        ) : (
          <>
            {/* Batch info */}
            <div style={{
              background: 'rgba(99,102,241,.04)', border: '1.5px solid rgba(99,102,241,.15)',
              borderRadius: 12, padding: '10px 16px', marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                🔔 {pendingUsers.length} users pending approval
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Page {userPage} of {userTotalPages} — {PAGE_SIZE} per page
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedUsers.map(u => {
                const color = roleColors[u.role] || '#64748b'
                return (
                  <div key={u.id} style={{
                    background: '#fff', borderRadius: 16, padding: '18px 20px',
                    border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13,
                      background: `${color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 800, color, flexShrink: 0,
                    }}>
                      {u.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{u.full_name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: '#64748b' }}>{u.employee_id}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: `${color}18`, color }}>{u.role?.replace(/_/g, ' ')}</span>
                        {u.projects?.project_number && <span style={{ fontSize: 10, color: '#64748b' }}>Proj {u.projects.project_number}</span>}
                        {u.lines?.line_type && <span style={{ fontSize: 10, color: '#64748b' }}>{u.lines.line_type}</span>}
                        {u.shift && <span style={{ fontSize: 10, color: '#64748b' }}>{u.shift === 'Morning' ? '🌅' : '🌙'} {u.shift}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => approveUser(u.id)} style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Space Grotesk',sans-serif",
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => rejectUser(u.id)} style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none',
                        background: 'rgba(239,68,68,.1)', color: '#ef4444',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Space Grotesk',sans-serif",
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <PaginationBar
              page={userPage}
              totalPages={userTotalPages}
              setPage={setUserPage}
              total={pendingUsers.length}
            />
          </>
        )
      ) : (
        pendingAssignments.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No pending assignments</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>All station assignments have been reviewed</div>
          </div>
        ) : (
          <>
            <div style={{
              background: 'rgba(99,102,241,.04)', border: '1.5px solid rgba(99,102,241,.15)',
              borderRadius: 12, padding: '10px 16px', marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                🔔 {pendingAssignments.length} assignments pending approval
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Page {assignPage} of {assignTotalPages} — {PAGE_SIZE} per page
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedAssignments.map(a => {
                const u = a.users || {}
                const s = a.stations || {}
                const color = roleColors[u.role] || '#64748b'
                return (
                  <div key={a.id} style={{
                    background: '#fff', borderRadius: 16, padding: '18px 20px',
                    border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13,
                      background: 'rgba(99,102,241,.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, color: '#6366f1',
                      fontFamily: "'Space Mono',monospace", flexShrink: 0,
                    }}>
                      {s.station_code?.slice(-2) || '??'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
                        {u.full_name} → {s.station_code}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: '#64748b' }}>{u.employee_id}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: `${color}18`, color }}>{u.role?.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>{a.shift === 'Morning' ? '🌅' : '🌙'} {a.shift}</span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>{a.month_year?.slice(0, 7)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => approveAssignment(a.id)} style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Space Grotesk',sans-serif",
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => rejectAssignment(a.id)} style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none',
                        background: 'rgba(239,68,68,.1)', color: '#ef4444',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Space Grotesk',sans-serif",
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <PaginationBar
              page={assignPage}
              totalPages={assignTotalPages}
              setPage={setAssignPage}
              total={pendingAssignments.length}
            />
          </>
        )
      )}
    </div>
  )
}