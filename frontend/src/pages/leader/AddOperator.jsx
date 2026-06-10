import { useState, useEffect, useRef } from 'react'
import { UserPlus, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LeaderAddOperator() {
  const { user } = useAuthStore()
  const scanRef = useRef(null)
  const [stations, setStations] = useState([])
  const [projectName, setProjectName] = useState('')
  const [lineName, setLineName] = useState('')
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    short_name: '',
    badge_number: '',
    station_id: '',
    language_pref: 'en',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [scanned, setScanned] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    // Load stations for leader's line
    if (user?.line_id) {
      api.get(`/users/stations?line_id=${user.line_id}`)
        .then(r => setStations(r.data || []))
        .catch(() => {})
    }
    // Load project name
    if (user?.project_id) {
      api.get('/users/projects')
        .then(r => {
          const proj = (r.data || []).find(p => p.id === user.project_id)
          if (proj) setProjectName(proj.project_number)
        })
        .catch(() => {})
    }
    // Load line name
    if (user?.project_id) {
      api.get(`/users/lines?project_id=${user.project_id}`)
        .then(r => {
          const line = (r.data || []).find(l => l.id === user.line_id)
          if (line) setLineName(line.line_type)
        })
        .catch(() => {})
    }
  }, [user])

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
    if (!form.station_id) return toast.error('Please select a station')

    setLoading(true)
    try {
      await api.post('/users/register-operator', {
        employee_id: form.employee_id,
        full_name: form.full_name,
        short_name: form.short_name || form.full_name.split(' ')[0],
        badge_number: form.badge_number || null,
        language_pref: form.language_pref,
        station_id: form.station_id,
      })
      toast.success('Operator registered — awaiting admin approval!')
      setSuccess(true)
      setScanned(false)
      if (scanRef.current) scanRef.current.value = ''
      setForm({ employee_id: '', full_name: '', short_name: '', badge_number: '', station_id: '', language_pref: 'en' })
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

  const languages = [
    { value: 'en', flag: '🇬🇧', name: 'English' },
    { value: 'ms', flag: '🇲🇾', name: 'Malay' },
    { value: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
    { value: 'ne', flag: '🇳🇵', name: 'Nepali' },
  ]

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Add Operator</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Scan badge to register — needs admin approval</div>
      </div>

      {/* Fixed assignment info */}
      <div style={{
        background: 'rgba(99,102,241,.06)', border: '1.5px solid rgba(99,102,241,.15)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 10 }}>
          📍 Operator will be registered under your assignment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Project', value: projectName ? `Proj ${projectName}` : '...' },
            { label: 'Line', value: lineName || '...' },
            { label: 'Shift', value: `${user?.shift === 'Morning' ? '🌅' : '🌙'} ${user?.shift || '—'}` },
            { label: 'Stations', value: `${stations.length} available` },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(99,102,241,.08)', borderRadius: 10,
              padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,.08)', border: '1.5px solid rgba(16,185,129,.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <CheckCircle size={18} color="#10b981" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Operator Registered!</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Sent to admin for approval.</div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>

        {/* Scan */}
        <div style={{ marginBottom: 18, padding: '14px 16px', background: 'rgba(16,185,129,.04)', border: '1.5px solid rgba(16,185,129,.15)', borderRadius: 12 }}>
          <label style={{ ...lbl, color: '#059669' }}>📷 Scan Badge or Type Employee ID</label>
          <input
            ref={scanRef}
            defaultValue=""
            onKeyUp={handleScanKeyUp}
            placeholder="Scan badge or type Employee ID..."
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
                  ✓ Badge captured
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Ali bin Ahmad" style={inp} />
          </div>

          <div>
            <label style={lbl}>Badge Name</label>
            <input value={form.short_name} onChange={e => set('short_name', e.target.value)}
              placeholder="e.g. Ali" style={inp} />
          </div>

          {/* Station select */}
          <div>
            <label style={lbl}>Station <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={form.station_id} onChange={e => set('station_id', e.target.value)}
              style={{ ...inp, cursor: 'pointer' }}>
              <option value="">Select Station</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.station_code} (capacity: {s.capacity})
                </option>
              ))}
            </select>
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
            ⚠️ Requires <strong>admin approval</strong> before operator can log in.
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          marginTop: 16, width: '100%', padding: '12px',
          background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none', borderRadius: 12, color: loading ? '#94a3b8' : '#fff',
          fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <UserPlus size={15} />
          {loading ? 'Registering...' : 'Register Operator'}
        </button>
      </div>
    </div>
  )
}