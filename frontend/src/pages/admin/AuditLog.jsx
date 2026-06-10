import { useState, useEffect } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import api from '../../lib/api'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // 'today' | 'yesterday' | 'all'

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const r = await api.get('/audit/')
      setLogs(r.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  const handleDelete = async (range) => {
    setDeleting(true)
    setConfirmDelete(null)
    setShowDeleteMenu(false)
    try {
      await api.delete(`/audit/?range=${range}`)
      await fetchLogs()
    } catch {}
    setDeleting(false)
  }

  const actionColors = {
    user_registered: { color: '#6366f1', bg: 'rgba(99,102,241,.1)', icon: '👤' },
    user_approved: { color: '#10b981', bg: 'rgba(16,185,129,.1)', icon: '✅' },
    user_rejected: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', icon: '❌' },
    user_suspended: { color: '#f59e0b', bg: 'rgba(245,158,11,.1)', icon: '⛔' },
    user_removed: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', icon: '🗑️' },
    user_reactivated: { color: '#10b981', bg: 'rgba(16,185,129,.1)', icon: '🔄' },
    operator_assigned: { color: '#06b6d4', bg: 'rgba(6,182,212,.1)', icon: '📍' },
    assignment_approved: { color: '#10b981', bg: 'rgba(16,185,129,.1)', icon: '✅' },
    assignment_rejected: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', icon: '❌' },
    qr_printed: { color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', icon: '🖨️' },
    qr_reprinted: { color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', icon: '🔁' },
    qr_expired: { color: '#94a3b8', bg: 'rgba(148,163,184,.1)', icon: '⏰' },
    login: { color: '#10b981', bg: 'rgba(16,185,129,.1)', icon: '🔐' },
    logout: { color: '#64748b', bg: 'rgba(100,116,139,.1)', icon: '🚪' },
    pin_changed: { color: '#f59e0b', bg: 'rgba(245,158,11,.1)', icon: '🔑' },
    export_generated: { color: '#06b6d4', bg: 'rgba(6,182,212,.1)', icon: '📊' },
    project_created: { color: '#6366f1', bg: 'rgba(99,102,241,.1)', icon: '🏭' },
    project_removed: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', icon: '🗑️' },
    line_created: { color: '#6366f1', bg: 'rgba(99,102,241,.1)', icon: '➕' },
    line_removed: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', icon: '➖' },
    station_created: { color: '#10b981', bg: 'rgba(16,185,129,.1)', icon: '📌' },
    station_removed: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', icon: '🗑️' },
  }

  const formatAction = (action) => action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  const deleteOptions = [
    { key: 'today', label: 'Delete Today', icon: '🗓️', color: '#f59e0b' },
    { key: 'yesterday', label: 'Delete Yesterday', icon: '📅', color: '#f59e0b' },
    { key: 'all', label: 'Delete All', icon: '💣', color: '#ef4444' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Confirm Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32, maxWidth: 360, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              Confirm Delete
            </div>
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
              {confirmDelete === 'today' && 'This will permanently delete all audit logs from today.'}
              {confirmDelete === 'yesterday' && 'This will permanently delete all audit logs from yesterday.'}
              {confirmDelete === 'all' && 'This will permanently delete ALL audit logs. This cannot be undone!'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: 'rgba(0,0,0,.05)', border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Space Grotesk',sans-serif", color: '#64748b',
              }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: confirmDelete === 'all' ? '#ef4444' : '#f59e0b',
                border: 'none', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif", color: '#fff',
              }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Audit Log</h1>
          <p style={{ fontSize: 12, color: '#64748b' }}>Complete history of all system actions</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => fetchLogs(true)} disabled={refreshing} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 10, background: 'rgba(99,102,241,.08)', border: '1.5px solid rgba(99,102,241,.2)',
            color: '#6366f1', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Space Grotesk',sans-serif", opacity: refreshing ? .6 : 1,
          }}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>

          {/* Delete Button */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowDeleteMenu(v => !v)} disabled={deleting} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1.5px solid rgba(239,68,68,.2)',
              color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Space Grotesk',sans-serif", opacity: deleting ? .6 : 1,
            }}>
              <Trash2 size={12} />
              {deleting ? 'Deleting...' : 'Clear Logs'}
            </button>

            {showDeleteMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 100,
                background: '#fff', borderRadius: 14, padding: 8,
                boxShadow: '0 8px 30px rgba(0,0,0,.12)', border: '1.5px solid rgba(0,0,0,.06)',
                minWidth: 180,
              }}>
                {deleteOptions.map(opt => (
                  <button key={opt.key} onClick={() => { setShowDeleteMenu(false); setConfirmDelete(opt.key) }} style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: 'transparent', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Space Grotesk',sans-serif", color: opt.color,
                    textAlign: 'left',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(0,0,0,.06)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No audit records yet</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Actions will appear here as they happen</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, i) => {
              const actionInfo = actionColors[log.action] || { color: '#64748b', bg: 'rgba(100,116,139,.1)', icon: '📝' }
              const actor = log.users || {}
              return (
                <div key={log.id} style={{
                  padding: '14px 20px', borderBottom: i < logs.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none',
                  display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'background .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: actionInfo.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {actionInfo.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: actionInfo.bg, color: actionInfo.color,
                      }}>
                        {formatAction(log.action)}
                      </span>
                      {actor.full_name && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          by <strong>{actor.full_name}</strong>
                          {actor.employee_id && <span style={{ fontFamily: "'Space Mono',monospace", color: '#94a3b8', marginLeft: 4 }}>({actor.employee_id})</span>}
                        </span>
                      )}
                    </div>
                    {log.note && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{log.note}</div>}
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </div>
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