import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function LeaderSettings() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleShow = (k) => setShow(s => ({ ...s, [k]: !s[k] }))

  const pinMatch = form.new_pin && form.confirm_pin && form.new_pin === form.confirm_pin
  const pinMismatch = form.confirm_pin && form.new_pin !== form.confirm_pin

  const handleChangePin = async () => {
    if (form.current_pin.length !== 6) return toast.error('Current PIN must be 6 digits')
    if (form.new_pin.length !== 6) return toast.error('New PIN must be 6 digits')
    if (form.new_pin !== form.confirm_pin) return toast.error('PINs do not match')
    setLoading(true)
    try {
      await api.post('/users/change-pin', { current_pin: form.current_pin, new_pin: form.new_pin })
      toast.success('PIN changed successfully!')
      setForm({ current_pin: '', new_pin: '', confirm_pin: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change PIN')
    }
    setLoading(false)
  }

  const roleLabel = {
    main_leader: 'Main Leader',
    assistant_leader: 'Assistant Leader',
    floater: 'Floater',
  }

  const inp = {
    width: '100%', padding: '11px 40px 11px 14px',
    background: 'rgba(0,0,0,.02)', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 12, fontSize: 13, color: '#0f172a',
    fontFamily: "'Space Grotesk',sans-serif", outline: 'none',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '.08em', marginBottom: 6,
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Settings</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>Account and preferences</div>
      </div>

      {/* Account info */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
            {user?.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{user?.full_name}</div>
            <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{roleLabel[user?.role]}</div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: '#94a3b8' }}>{user?.employee_id}</div>
          </div>
        </div>

        {[
          ['Shift', user?.shift ? (user.shift === 'Morning' ? '🌅 Morning' : '🌙 Night') : '—'],
          ['Language', user?.language_pref?.toUpperCase() || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Change PIN */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>🔐 Change 6-Digit PIN</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'current_pin', label: 'Current PIN', showKey: 'current' },
            { key: 'new_pin', label: 'New PIN', showKey: 'new' },
            { key: 'confirm_pin', label: 'Confirm New PIN', showKey: 'confirm' },
          ].map(({ key, label, showKey }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  value={form[key]}
                  onChange={e => set(key, e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digits"
                  maxLength={6}
                  style={{
                    ...inp,
                    letterSpacing: form[key] ? '0.3em' : 'normal',
                    borderColor: key === 'confirm_pin'
                      ? pinMismatch ? 'rgba(239,68,68,.5)' : pinMatch ? 'rgba(16,185,129,.5)' : 'rgba(0,0,0,.08)'
                      : 'rgba(0,0,0,.08)',
                  }}
                />
                <button onClick={() => toggleShow(showKey)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {key === 'new_pin' && (
                <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 10, background: i < form.new_pin.length ? '#6366f1' : 'rgba(0,0,0,.08)', transition: 'background .2s' }} />
                  ))}
                </div>
              )}
              {key === 'confirm_pin' && pinMismatch && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>❌ PINs do not match</div>}
              {key === 'confirm_pin' && pinMatch && <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>✅ PINs match!</div>}
            </div>
          ))}
        </div>

        <button onClick={handleChangePin} disabled={loading} style={{
          marginTop: 16, width: '100%', padding: '12px',
          background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none', borderRadius: 12, color: loading ? '#94a3b8' : '#fff',
          fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,.35)',
        }}>
          {loading ? 'Changing...' : '🔐 Change PIN'}
        </button>
      </div>

      {/* Logout */}
      <button onClick={() => { logout(); navigate('/login') }} style={{
        width: '100%', padding: '12px', borderRadius: 12,
        border: '1.5px solid rgba(239,68,68,.2)',
        background: 'rgba(239,68,68,.06)', color: '#ef4444',
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Space Grotesk',sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        🚪 Sign Out
      </button>
    </div>
  )
}