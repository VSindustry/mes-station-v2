import { Monitor, Smartphone, Bell, X, CheckCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import useViewStore from '../../store/viewStore'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

export default function Topbar({ phone = false }) {
  const { viewMode, setViewMode } = useViewStore()
  const { user } = useAuthStore()
  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifs = () => {
    api.get('/notifications/').then(r => setNotifs(r.data || [])).catch(() => {})
  }

  const markAllRead = async () => {
    await api.patch('/notifications/mark-all-read').catch(() => {})
    fetchNotifs()
  }

  const unread = notifs.filter(n => !n.is_read).length

  const roleLabel = {
    mes_admin: 'MES Admin',
    main_leader: 'Main Leader',
    assistant_leader: 'Asst. Leader',
    floater: 'Floater',
    operator: 'Operator',
  }

  return (
    <div style={{
      height: 56, background: 'rgba(255,255,255,.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0,0,0,.06)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px', flexShrink: 0, gap: 12,
    }}>
      {/* Left */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
          {phone ? 'MES Station' : 'MES Dashboard'}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>
          V.S. Industry · {new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* View toggle — desktop only, admin only */}
        {!phone && user?.role === 'mes_admin' && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,.04)', borderRadius: 10, padding: 3, border: '1.5px solid rgba(0,0,0,.07)' }}>
            {[
              { mode: 'desktop', icon: Monitor },
              { mode: 'phone', icon: Smartphone }
            ].map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 11,
                fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                display: 'flex', alignItems: 'center', gap: 5,
                background: viewMode === mode ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                color: viewMode === mode ? '#fff' : '#64748b',
                transition: 'all .2s',
              }}>
                <Icon size={12} />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <div onClick={() => setShowNotifs(!showNotifs)} style={{
            width: 36, height: 36, borderRadius: 10,
            background: showNotifs ? 'rgba(99,102,241,.1)' : 'rgba(0,0,0,.04)',
            border: `1.5px solid ${showNotifs ? 'rgba(99,102,241,.3)' : 'rgba(0,0,0,.07)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}>
            <Bell size={15} color={showNotifs ? '#6366f1' : '#64748b'} />
            {unread > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, borderRadius: '50%',
                background: '#ef4444', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 800, color: '#fff',
              }}>{unread > 9 ? '9+' : unread}</div>
            )}
          </div>

          {showNotifs && (
            <div style={{
              position: 'absolute', top: 44, right: 0, width: 320,
              background: '#fff', borderRadius: 14,
              border: '1.5px solid rgba(0,0,0,.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,.15)',
              zIndex: 1000, overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Notifications {unread > 0 && (
                    <span style={{ fontSize: 10, background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 20, marginLeft: 6 }}>{unread}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'Space Grotesk',sans-serif" }}>
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>No notifications yet</div>
                  </div>
                ) : notifs.map((n, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,.04)',
                    background: n.is_read ? 'transparent' : 'rgba(99,102,241,.03)',
                    display: 'flex', gap: 10, cursor: 'pointer',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: '#0f172a', marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString('en-MY') : ''}
                      </div>
                    </div>
                    {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,.08)', border: '1.5px solid rgba(99,102,241,.15)',
          borderRadius: 10, padding: '5px 10px',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff',
          }}>
            {user?.full_name?.slice(0, 2).toUpperCase() || 'ME'}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
              {user?.full_name?.split(' ')[0] || 'User'}
            </div>
            <div style={{ fontSize: 9, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase' }}>
              {roleLabel[user?.role] || user?.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}