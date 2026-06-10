import { useState, useEffect, useRef } from 'react'
import { UserCog, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function RegisterLeader() {
  const scanRef = useRef(null)
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    short_name: '',
    role: 'main_leader',
    project_id: '',
    line_id: '',
    shift: 'Morning',
    pin: '',
    confirm_pin: '',
    badge_number: '',
    language_pref: 'en',
  })
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    api.get('/users/projects').then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.project_id) { setLines([]); return }
    api.get(`/users/lines?project_id=${form.project_id}`).then(r => setLines(r.data || [])).catch(() => {})
    set('line_id', '')
  }, [form.project_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleScanKeyUp = (e) => {
    if (e.key === 'Enter') {
      const val = scanRef.current?.value || ''
      if (val.includes(';')) {
        const parts = val.split(';')
        const scannedId = parts[0].trim().toUpperCase()
        const scannedPin = parts[1].trim()
        if (scanRef.current) scanRef.current.value = scannedId
        set('employee_id', scannedId)
        set('pin', scannedPin)
        set('confirm_pin', scannedPin)
        set('badge_number', scannedPin)
        setScanned(true)
        toast.success(`Badge scanned! ID: ${scannedId}`)
      } else {
        set('employee_id', val.toUpperCase())
        setScanned(false)
      }
    }
  }

  const pinMatch = form.pin && form.confirm_pin && form.pin === form.confirm_pin
  const pinMismatch = form.confirm_pin && form.pin !== form.confirm_pin

  const handleSubmit = async () => {
    if (!form.employee_id.trim()) return toast.error('Employee ID required')
    if (!form.full_name.trim()) return toast.error('Full name required')
    if (!form.project_id) return toast.error('Select a project')
    if (!form.line_id) return toast.error('Select a line')
    if (!form.pin) return toast.error('PIN required')
    if (form.pin !== form.confirm_pin) return toast.error('PINs do not match')

    setLoading(true)
    try {
      await api.post('/users/register-leader', {
        employee_id: form.employee_id,
        full_name: form.full_name,
        short_name: form.short_name || form.full_name.split(' ')[0],
        role: form.role,
        project_id: parseInt(form.project_id),
        line_id: form.line_id,
        shift: form.shift,
        pin: form.pin,
        badge_number: form.badge_number || form.pin,
        language_pref: form.language_pref,
      })
      toast.success('Leader registered successfully!')
      setSuccess(true)
      setScanned(false)
      if (scanRef.current) scanRef.current.value = ''
      setForm({
        employee_id: '', full_name: '', short_name: '', role: 'main_leader',
        project_id: '', line_id: '', shift: 'Morning', pin: '', confirm_pin: '',
        badge_number: '', language_pref: 'en'
      })
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      console.error('Register error:', err.response?.data)
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg).join(', ')
        : detail || 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(0,0,0,.02)', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 12, fontSize: 13, color: '#0f172a',
    fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
  }

  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '.08em', marginBottom: 6,
  }

  const roles = [
    { value: 'main_leader', label: '👑 Main Leader', desc: 'Full control over line' },
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
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Register Leader</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Scan badge to auto-fill ID and PIN, then complete the rest manually</p>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,.08)', border: '1.5px solid rgba(16,185,129,.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Leader Registered!</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Pending admin approval.</div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>

        {/* Scan input */}
        <div style={{ marginBottom: 24, padding: '16px 18px', background: 'rgba(99,102,241,.04)', border: '1.5px solid rgba(99,102,241,.15)', borderRadius: 14 }}>
          <label style={{ ...lbl, color: '#6366f1' }}>
            📷 Scan Badge or Type Employee ID
          </label>
          <input
            ref={scanRef}
            defaultValue=""
            onKeyUp={handleScanKeyUp}
            placeholder="Click here and scan badge, or type Employee ID..."
            style={{
              ...inp,
              borderColor: scanned ? 'rgba(16,185,129,.4)' : 'rgba(99,102,241,.2)',
              background: scanned ? 'rgba(16,185,129,.04)' : '#fff',
            }}
            autoComplete="off"
            autoFocus
          />
          {form.employee_id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, background: 'rgba(99,102,241,.1)', color: '#6366f1', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>
                ID: {form.employee_id}
              </span>
              {scanned && form.badge_number && (
                <span style={{ fontSize: 10, background: 'rgba(16,185,129,.1)', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  ✓ Badge number captured
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#6366f1', marginTop: 6, opacity: .7 }}>
            Scan auto-fills Employee ID + Badge PIN · Manual typing also works
          </div>
        </div>

        {/* Role */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Role <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {roles.map(r => (
              <div key={r.value} onClick={() => set('role', r.value)} style={{
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
                border: `1.5px solid ${form.role === r.value ? 'rgba(99,102,241,.4)' : 'rgba(0,0,0,.08)'}`,
                background: form.role === r.value ? 'rgba(99,102,241,.06)' : 'rgba(0,0,0,.02)',
              }}>
                <div style={{ fontSize: 14, marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: form.role === r.value ? '#6366f1' : '#64748b', fontWeight: 600 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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
            <label style={lbl}>Project <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={form.project_id} onChange={e => { set('project_id', e.target.value); set('line_id', '') }}
              style={{ ...inp, cursor: 'pointer' }}>
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>Project {p.project_number}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Line <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={form.line_id} onChange={e => set('line_id', e.target.value)}
              style={{ ...inp, cursor: 'pointer' }} disabled={!form.project_id}>
              <option value="">Select Line</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.line_type}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Shift <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['Morning', 'Night'].map(s => (
                <div key={s} onClick={() => set('shift', s)} style={{
                  padding: '12px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
                  border: `1.5px solid ${form.shift === s ? 'rgba(99,102,241,.4)' : 'rgba(0,0,0,.08)'}`,
                  background: form.shift === s ? 'rgba(99,102,241,.06)' : 'rgba(0,0,0,.02)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>{s === 'Morning' ? '🌅' : '🌙'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.shift === s ? '#6366f1' : '#0f172a' }}>{s} Shift</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{s === 'Morning' ? '6AM - 6PM' : '6PM - 6AM'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!scanned && (
            <>
              <div>
                <label style={lbl}>PIN <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={e => { set('pin', e.target.value); set('badge_number', e.target.value) }}
                  placeholder="Enter PIN manually"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Confirm PIN <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="password"
                  value={form.confirm_pin}
                  onChange={e => set('confirm_pin', e.target.value)}
                  placeholder="Re-enter PIN"
                  style={{
                    ...inp,
                    borderColor: pinMismatch ? 'rgba(239,68,68,.5)' : pinMatch ? 'rgba(16,185,129,.5)' : 'rgba(0,0,0,.08)',
                  }}
                />
                {pinMismatch && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>❌ PINs do not match</div>}
                {pinMatch && <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>✅ PINs match!</div>}
              </div>
            </>
          )}

          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Preferred Language</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {languages.map(lang => (
                <div key={lang.value} onClick={() => set('language_pref', lang.value)} style={{
                  flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
                  border: `1.5px solid ${form.language_pref === lang.value ? 'rgba(99,102,241,.4)' : 'rgba(0,0,0,.08)'}`,
                  background: form.language_pref === lang.value ? 'rgba(99,102,241,.06)' : 'rgba(0,0,0,.02)',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{lang.flag}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: form.language_pref === lang.value ? '#6366f1' : '#64748b' }}>{lang.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(245,158,11,.04)', border: '1.5px solid rgba(245,158,11,.15)', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
            Admin registered leaders are <strong>instantly active</strong>. Leader registered leaders need <strong>admin approval</strong>.
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          marginTop: 20, width: '100%', padding: '13px',
          background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none', borderRadius: 14, color: loading ? '#94a3b8' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <UserCog size={16} />
          {loading ? 'Registering...' : 'Register Leader'}
        </button>
      </div>
    </div>
  )
}