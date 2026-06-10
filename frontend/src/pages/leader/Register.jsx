import { useState, useRef } from 'react'
import { UserCog, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LeaderRegister() {
  const { user } = useAuthStore()
  const scanRef = useRef(null)
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    short_name: '',
    role: 'assistant_leader',
    badge_number: '',
    language_pref: 'en',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [scanned, setScanned] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleScanKeyUp = (e) => {
    if (e.key === 'Enter') {
      const val = scanRef.current?.value || ''
      if (val.includes(';')) {
        const parts = val.split(';')
        const scannedId = parts[0].trim().toUpperCase()
        const scannedBadge = parts[1].trim()
        if (scanRef.current) scanRef.current.value = scannedId
        set('employee_id', scannedId)
        set('badge_number', scannedBadge)
        setScanned(true)
        toast.success(`Badge scanned! ID: ${scannedId}`)
      } else {
        set('employee_id', e.target.value.toUpperCase())
        set('badge_number', '')
        setScanned(false)
      }
    }
  }

  const handleSubmit = async () => {
    if (!form.employee_id.trim()) return toast.error('Employee ID required')
    if (!form.full_name.trim()) return toast.error('Full name required')
    if (!form.badge_number.trim()) return toast.error('Please scan badge to get badge number')

    setLoading(true)
    try {
      await api.post('/users/register-leader', {
        employee_id: form.employee_id,
        full_name: form.full_name,
        short_name: form.short_name || form.full_name.split(' ')[0],
        role: form.role,
        project_id: user?.project_id,
        line_id: user?.line_id,
        shift: user?.shift,
        pin: form.badge_number,
        badge_number: form.badge_number,
        language_pref: form.language_pref,
      })
      toast.success('Registered — awaiting admin approval!')
      setSuccess(true)
      setScanned(false)
      if (scanRef.current) scanRef.current.value = ''
      setForm({ employee_id: '', full_name: '', short_name: '', role: 'assistant_leader', badge_number: '', language_pref: 'en' })
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(0,0,0,.02)', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 12, fontSize: 13, color: '#0f172a',
    fontFamily: "'Space Grotesk',sans-serif", outline: 'none',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '.08em', marginBottom: 6,
  }

  const roles = [
    { value: 'assistant_leader', label: '🤝 Assistant Leader', desc: 'Supports main leader' },
    { value: 'floater', label: '🔄 Floater', desc: 'Flexible across stations' },
  ]

  const languages = [
    { value: 'en', flag: '🇬🇧', name: 'English' },
    { value: 'ms', flag: '🇲🇾', name: 'Malay' },
    { value: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
    { value: 'ne', flag: '🇳🇵', name: 'Nepali' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Register</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>Register assistant leader or floater for your line</div>
      </div>

      {/* Line info */}
      <div style={{ background: 'rgba(99,102,241,.06)', border: '1.5px solid rgba(99,102,241,.15)', borderRadius: 12, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 18 }}>📍</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>Auto-assigned to your line</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>
            {user?.shift === 'Morning' ? '🌅' : '🌙'} {user?.shift} Shift · Needs admin approval
          </div>
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,.08)', border: '1.5px solid rgba(16,185,129,.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <CheckCircle size={18} color="#10b981" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Registered!</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Pending admin approval.</div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>

        {/* Role */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Role <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {roles.map(r => (
              <div key={r.value} onClick={() => set('role', r.value)} style={{
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${form.role === r.value ? 'rgba(99,102,241,.4)' : 'rgba(0,0,0,.08)'}`,
                background: form.role === r.value ? 'rgba(99,102,241,.06)' : 'rgba(0,0,0,.02)',
              }}>
                <div style={{ fontSize: 13, marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 10, color: form.role === r.value ? '#6366f1' : '#64748b', fontWeight: 600 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badge Scanner */}
        <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(16,185,129,.04)', border: '1.5px solid rgba(16,185,129,.15)', borderRadius: 12 }}>
          <label style={{ ...lbl, color: '#059669' }}>📷 Scan Badge <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            ref={scanRef}
            defaultValue=""
            onKeyUp={handleScanKeyUp}
            placeholder="Scan badge to auto-fill Employee ID..."
            style={{
              ...inp,
              borderColor: scanned ? 'rgba(16,185,129,.4)' : 'rgba(16,185,129,.2)',
              background: scanned ? 'rgba(16,185,129,.04)' : '#fff',
            }}
            autoComplete="off"
            autoFocus
          />
          {form.employee_id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, background: 'rgba(16,185,129,.1)', color: '#059669', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>
                {scanned ? '✓ ' : ''}{form.employee_id}
              </span>
              {scanned && form.badge_number && (
                <span style={{ fontSize: 10, background: 'rgba(99,102,241,.1)', color: '#6366f1', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  ✓ Badge captured — used as PIN
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#059669', marginTop: 6, opacity: .7 }}>
            Badge number will be used as login PIN automatically
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Ahmad bin Razali" style={inp} />
          </div>

          <div>
            <label style={lbl}>Badge Name</label>
            <input value={form.short_name} onChange={e => set('short_name', e.target.value)}
              placeholder="e.g. Ahmad" style={inp} />
          </div>

          <div>
            <label style={lbl}>Preferred Language</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {languages.map(lang => (
                <div key={lang.value} onClick={() => set('language_pref', lang.value)} style={{
                  padding: '10px 6px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  border: `1.5px solid ${form.language_pref === lang.value ? 'rgba(99,102,241,.4)' : 'rgba(0,0,0,.08)'}`,
                  background: form.language_pref === lang.value ? 'rgba(99,102,241,.06)' : 'rgba(0,0,0,.02)',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{lang.flag}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: form.language_pref === lang.value ? '#6366f1' : '#64748b' }}>{lang.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245,158,11,.04)', border: '1.5px solid rgba(245,158,11,.15)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
            ⚠️ Requires <strong>admin approval</strong> before they can log in. Badge number is used as their PIN.
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          marginTop: 18, width: '100%', padding: '12px',
          background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none', borderRadius: 12, color: loading ? '#94a3b8' : '#fff',
          fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <UserCog size={15} />
          {loading ? 'Registering...' : 'Register'}
        </button>
      </div>
    </div>
  )
}