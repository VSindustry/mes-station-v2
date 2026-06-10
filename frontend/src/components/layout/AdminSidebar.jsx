import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Factory, FolderKanban, Users, UserCog,
  UserPlus, QrCode, CheckCircle, Download, ClipboardList,
  LogOut, ChevronRight, DatabaseZap
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

const adminNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
  { to: '/floor', label: 'Floor View', icon: Factory, color: '#06b6d4' },
  { to: '/projects', label: 'Manage Projects', icon: FolderKanban, color: '#8b5cf6' },
  { to: '/team', label: 'My Team', icon: Users, color: '#06b6d4' },
  { to: '/register-leader', label: 'Register Leader', icon: UserCog, color: '#8b5cf6' },
  { to: '/add-operator', label: 'Add Operator', icon: UserPlus, color: '#10b981' },
  { to: '/print-qr', label: 'Print QR Sheet', icon: QrCode, color: '#f59e0b' },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle, color: '#f59e0b' },
  { to: '/export', label: 'Export', icon: Download, color: '#06b6d4' },
  { to: '/audit', label: 'Audit Log', icon: ClipboardList, color: '#ec4899' },
  { to: '/purge', label: 'Data Purge', icon: DatabaseZap, color: '#ef4444' },
]

const mainLeaderNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
  { to: '/floor', label: 'Floor View', icon: Factory, color: '#06b6d4' },
  { to: '/team', label: 'My Team', icon: Users, color: '#06b6d4' },
  { to: '/add-operator', label: 'Add Operator', icon: UserPlus, color: '#10b981' },
  { to: '/register', label: 'Register', icon: UserCog, color: '#8b5cf6' },
]

const leaderNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
  { to: '/floor', label: 'Floor View', icon: Factory, color: '#06b6d4' },
  { to: '/team', label: 'My Team', icon: Users, color: '#06b6d4' },
  { to: '/add-operator', label: 'Add Operator', icon: UserPlus, color: '#10b981' },
]

const roleColors = {
  mes_admin:        { label: 'MES Admin',    color: '#6366f1' },
  main_leader:      { label: 'Main Leader',  color: '#8b5cf6' },
  assistant_leader: { label: 'Asst. Leader', color: '#06b6d4' },
  floater:          { label: 'Floater',      color: '#10b981' },
}

export default function AdminSidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  const role = user?.role
  const nav = role === 'mes_admin' ? adminNav
    : role === 'main_leader' ? mainLeaderNav
    : leaderNav

  const roleInfo = roleColors[role] || { label: role, color: '#6366f1' }

 // Request notification permission on mount
useEffect(() => {
  if (role !== 'mes_admin') return
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}, [role])

// Poll pending approvals every 30s — admin only
useEffect(() => {
  if (role !== 'mes_admin') return
  let prevCount = null

  const fetchPending = () => {
    api.get('/users/')
      .then(r => {
        const count = (r.data || []).filter(u => u.status === 'pending').length
        setPendingCount(count)

        // Fire notification only when count increases
        if (prevCount !== null && count > prevCount) {
          const diff = count - prevCount
          if (Notification.permission === 'granted') {
            new Notification('🔔 MES Station — New Approval', {
              body: `${diff} new user${diff > 1 ? 's' : ''} pending approval!`,
              icon: '/favicon.ico',
              tag: 'approval-notification',
            })
          }
        }
        prevCount = count
      })
      .catch(() => {})
  }

  fetchPending()
  const interval = setInterval(fetchPending, 30000)
  return () => clearInterval(interval)
}, [role])

  return (
    <div style={{
      width: 240,
      background: 'linear-gradient(180deg,#0f172a 0%,#1a1f35 100%)',
      display: 'flex', flexDirection: 'column', height: '100vh',
      flexShrink: 0, borderRight: '1px solid rgba(255,255,255,.06)',
    }}>

      {/* Brand */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,.4)',
          }}>
            <Factory size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>MES Station</div>
            <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {role === 'mes_admin' ? 'Admin Panel v2.0' : 'Leader Panel v2.0'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: '#334155', textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Navigation
        </div>
        {nav.map(({ to, label, icon: Icon, color }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 10, marginBottom: 1,
            textDecoration: 'none', transition: 'all .2s',
            background: isActive ? `${color}18` : 'transparent',
            border: isActive ? `1px solid ${color}30` : '1px solid transparent',
          })}>
            {({ isActive }) => (
              <>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: isActive ? `${color}22` : 'rgba(255,255,255,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isActive ? `0 0 10px ${color}33` : 'none',
                }}>
                  <Icon size={14} color={isActive ? color : '#475569'} />
                </div>
                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? '#f1f5f9' : '#64748b', flex: 1 }}>
                  {label}
                </span>
                {label === 'Approvals' && pendingCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    background: '#ef4444', color: '#fff',
                    borderRadius: 20, padding: '2px 6px',
                    minWidth: 18, textAlign: 'center',
                    animation: 'pulse 2s infinite',
                  }}>
                    {pendingCount}
                  </span>
                )}
                {/* Danger indicator for Data Purge */}
                {label === 'Data Purge' && !isActive && (
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    background: 'rgba(239,68,68,.15)', color: '#ef4444',
                    borderRadius: 20, padding: '2px 6px',
                  }}>
                    ⚠️
                  </span>
                )}
                {isActive && !(label === 'Approvals' && pendingCount > 0) && (
                  <ChevronRight size={12} color={color} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.06)', marginBottom: 8,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: `linear-gradient(135deg,${roleInfo.color},${roleInfo.color}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {user?.full_name?.slice(0, 2).toUpperCase() || 'ME'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{ fontSize: 9, color: roleInfo.color, fontWeight: 600, textTransform: 'uppercase' }}>
              {roleInfo.label}
            </div>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{
            width: '100%', padding: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            borderRadius: 10, color: '#f87171', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}