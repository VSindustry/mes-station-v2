import { useState } from 'react'
import { Settings as SettingsIcon, Eye, EyeOff, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import useViewStore from '../../store/viewStore'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuthStore()
  const { viewMode, setViewMode } = useViewStore()
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

  const inp = {
    flex: 1, padding: '11px 40px 11px 14px',
    background: 'rgba(0,0,0,.02)', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 12, fontSize: 13, color: '#0f172a',
    fontFamily: "'Space Grotesk',sans-serif", outline: 'none', width: '100%',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '.08em', marginBottom: 6,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Manage your account and preferences</p>
      </div>

      {/* Account Info */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsIcon size={16} color="#6366f1" /> Account Information
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', background: 'rgba(99,102,241,.04)', borderRadius: 14, border: '1.5px solid rgba(99,102,241,.12)', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {user?.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{user?.full_name}</div>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase' }}>MES Administrator</div>
            <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: '#64748b' }}>{user?.employee_id}</div>
          </div>
        </div>
      </div>

      {/* View Mode */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 18 }}>🖥️ Display Mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { mode: 'desktop', icon: '🖥️', label: 'Desktop Mode', desc: 'Full sidebar layout, wide tables' },
            { mode: 'phone', icon: '📱', label: 'Phone Mode', desc: 'Centered phone shell, bottom nav' },
          ].map(({ mode, icon, label, desc }) => (
            <div key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all .2s',
              border: `1.5px solid ${viewMode === mode ? 'rgba(99,102,241,.4)' : 'rgba(0,0,0,.08)'}`,
              background: viewMode === mode ? 'rgba(99,102,241,.06)' : 'rgba(0,0,0,.02)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: viewMode === mode ? '#6366f1' : '#0f172a', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{desc}</div>
              {viewMode === mode && <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginTop: 6 }}>✓ Active</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Change PIN */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 18 }}>🔐 Change 6-Digit PIN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              {key === 'confirm_pin' && pinMismatch && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>❌ PINs do not match</div>}
              {key === 'confirm_pin' && pinMatch && <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>✅ PINs match!</div>}
              {/* PIN progress bar */}
              {(key === 'new_pin' || key === 'current_pin') && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 10, background: i < form[key].length ? '#6366f1' : 'rgba(0,0,0,.08)', transition: 'background .2s' }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={handleChangePin} disabled={loading} style={{
          marginTop: 20, width: '100%', padding: '13px',
          background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none', borderRadius: 14, color: loading ? '#94a3b8' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,.35)',
        }}>
          {loading ? 'Changing PIN...' : '🔐 Change PIN'}
        </button>
      </div>
    </div>
  )
}