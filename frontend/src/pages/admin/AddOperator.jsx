import { useState, useEffect, useRef } from 'react'
import { UserPlus, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AddOperator() {
  const scanRef = useRef(null)
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    short_name: '',
    project_id: '',
    line_id: '',
    station_id: '',
    shift: 'Morning',
    badge_number: '',
    language_pref: 'en',
  })
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    api.get('/users/projects').then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.project_id) { setLines([]); set('line_id', ''); set('station_id', ''); return }
    api.get(`/users/lines?project_id=${form.project_id}`).then(r => setLines(r.data || [])).catch(() => {})
    set('line_id', ''); set('station_id', '')
  }, [form.project_id])

  useEffect(() => {
    if (!form.line_id) { setStations([]); set('station_id', ''); return }
    api.get(`/users/stations?line_id=${form.line_id}`).then(r => setStations(r.data || [])).catch(() => {})
    set('station_id', '')
  }, [form.line_id])

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
        set('employee_id', val.toUpperCase())
        set('badge_number', '')
        setScanned(false)
      }
    }
  }

  const handleSubmit = async () => {
    if (!form.employee_id.trim()) return toast.error('Employee ID required — scan badge or type')
    if (!form.full_name.trim()) return toast.error('Full name required')
    if (!form.project_id) return toast.error('Select a project')
    if (!form.line_id) return toast.error('Select a line')
    if (!form.station_id) return toast.error('Select a station')

    setLoading(true)
    try {
      await api.post('/users/admin-add-operator', {
        employee_id: form.employee_id,
        full_name: form.full_name,
        short_name: form.short_name || form.full_name.split(' ')[0],
        project_id: parseInt(form.project_id),
        line_id: form.line_id,
        station_id: form.station_id,
        shift: form.shift,
        badge_number: form.badge_number || null,
        language_pref: form.language_pref,
      })
      toast.success('Operator added and assigned!')
      setSuccess(true)
      setScanned(false)
      if (scanRef.current) scanRef.current.value = ''
      setForm({
        employee_id: '', full_name: '', short_name: '',
        project_id: '', line_id: '', station_id: '',
        shift: 'Morning', badge_number: '', language_pref: 'en'
      })
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Failed to add operator'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
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
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Add Operator</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Scan badge to auto-fill Employee ID — no approval needed</p>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,.08)', border: '1.5px solid rgba(16,185,129,.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Operator Added & Assigned!</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Active immediately. QR can be printed now.</div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>

        {/* Scan input */}
        <div style={{ marginBottom: 24, padding: '16px 18px', background: 'rgba(16,185,129,.04)', border: '1.5px solid rgba(16,185,129,.15)', borderRadius: 14 }}>
          <label style={{ ...lbl, color: '#059669' }}>
            📷 Scan Badge or Type Employee ID
          </label>
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
                {scanned ? '✓ Scanned: ' : 'ID: '}{form.employee_id}
              </span>
              {scanned && form.badge_number && (
                <span style={{ fontSize: 10, background: 'rgba(99,102,241,.1)', color: '#6366f1', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  ✓ Badge number captured
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#059669', marginTop: 6, opacity: .7 }}>
            Badge number is captured automatically from scan for export report
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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

          <div>
            <label style={lbl}>Project <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
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

          <div>
            <label style={lbl}>Station <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={form.station_id} onChange={e => set('station_id', e.target.value)}
              style={{ ...inp, cursor: 'pointer' }} disabled={!form.line_id}>
              <option value="">Select Station</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.station_code} (cap: {s.capacity})</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Shift <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={form.shift} onChange={e => set('shift', e.target.value)}
              style={{ ...inp, cursor: 'pointer' }}>
              <option value="Morning">🌅 Morning Shift</option>
              <option value="Night">🌙 Night Shift</option>
            </select>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Preferred Language</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {languages.map(lang => (
                <div key={lang.value} onClick={() => set('language_pref', lang.value)} style={{
                  flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
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

        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(99,102,241,.04)', border: '1.5px solid rgba(99,102,241,.12)', borderRadius: 12, display: 'flex', gap: 10 }}>
          <CheckCircle size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
            Admin-added operators are <strong>instantly active</strong> and <strong>assigned to the selected station</strong>. Print their QR from Print QR Sheet.
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          marginTop: 20, width: '100%', padding: '13px',
          background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#10b981,#059669)',
          border: 'none', borderRadius: 14, color: loading ? '#94a3b8' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <UserPlus size={16} />
          {loading ? 'Adding...' : 'Add & Assign Operator'}
        </button>
      </div>
    </div>
  )
}