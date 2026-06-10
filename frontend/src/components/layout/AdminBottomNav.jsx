import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Factory, FolderKanban, Users, UserCog,
  UserPlus, QrCode, CheckCircle, Download, ClipboardList, Settings
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/floor', label: 'Floor', icon: Factory },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/register-leader', label: 'Register', icon: UserCog },
  { to: '/add-operator', label: 'Add Op', icon: UserPlus },
  { to: '/print-qr', label: 'Print QR', icon: QrCode },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/audit', label: 'Audit', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AdminBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
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
              gap: 3, cursor: 'pointer', padding: '4px 12px',
              flexShrink: 0, minWidth: 60,
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
              fontSize: 9, fontWeight: 600, letterSpacing: '.04em',
              color: isActive ? '#6366f1' : '#475569',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}