import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, MapPin, Users, UserPlus, UserCog, Settings, LogOut } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import Topbar from './Topbar'

import LeaderDashboard from '../../pages/leader/Dashboard'
import LeaderAssignments from '../../pages/leader/Assignments'
import LeaderMyTeam from '../../pages/leader/MyTeam'
import LeaderAddOperator from '../../pages/leader/AddOperator'
import LeaderRegister from '../../pages/leader/Register'
import LeaderSettings from '../../pages/leader/Settings'

export default function LeaderShell() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role

  const allNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['main_leader', 'assistant_leader', 'floater'] },
    { to: '/assignments', label: 'Assignments', icon: MapPin, roles: ['main_leader', 'assistant_leader', 'floater'] },
    { to: '/team', label: 'My Team', icon: Users, roles: ['main_leader', 'assistant_leader', 'floater'] },
    { to: '/add-operator', label: 'Add Operator', icon: UserPlus, roles: ['main_leader', 'assistant_leader', 'floater'] },
    { to: '/register', label: 'Register', icon: UserCog, roles: ['main_leader'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['main_leader', 'assistant_leader', 'floater'] },
  ]

  const nav = allNav.filter(n => n.roles.includes(role))

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#f0f4ff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 390, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: '#f8faff',
        boxShadow: '0 0 60px rgba(99,102,241,.15)',
        overflow: 'hidden', position: 'relative',
      }}>

        {/* Topbar */}
        <Topbar phone />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 80px' }}>
          <Routes>
            <Route path="/" element={<LeaderDashboard />} />
            <Route path="/assignments" element={<LeaderAssignments />} />
            <Route path="/team" element={<LeaderMyTeam />} />
            <Route path="/add-operator" element={<LeaderAddOperator />} />
            <Route path="/register" element={<LeaderRegister />} />
            <Route path="/settings" element={<LeaderSettings />} />
          </Routes>
        </div>

        {/* Bottom Nav */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#0f172a',
          borderTop: '1px solid rgba(255,255,255,.06)',
          display: 'flex',
          overflowX: 'auto',
          padding: '8px 4px 16px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          <style>{`::-webkit-scrollbar { display: none; }`}</style>

          {nav.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <div
                key={to}
                onClick={() => navigate(to)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3, cursor: 'pointer', padding: '4px 10px',
                  flexShrink: 0, minWidth: 56,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isActive ? 'rgba(99,102,241,.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s',
                }}>
                  <Icon size={18} color={isActive ? '#6366f1' : '#475569'} />
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap',
                  color: isActive ? '#6366f1' : '#475569',
                }}>
                  {label}
                </span>
              </div>
            )
          })}

          {/* Logout */}
          <div
            onClick={() => { logout(); navigate('/login') }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', padding: '4px 10px',
              flexShrink: 0, minWidth: 56,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(239,68,68,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogOut size={18} color="#ef4444" />
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#ef4444', whiteSpace: 'nowrap' }}>
              Logout
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}