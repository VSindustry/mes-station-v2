import { useState, useEffect } from 'react'
import { Download, FileSpreadsheet, Users, UserMinus } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function Export() {
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [form, setForm] = useState({
    report_type: 'active',
    project_id: '',
    line_id: '',
    shift: '',
    month_year: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/users/projects').then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.project_id) { setLines([]); return }
    api.get(`/users/lines?project_id=${form.project_id}`).then(r => setLines(r.data || [])).catch(() => {})
    set('line_id', '')
  }, [form.project_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleExport = async () => {
    setLoading(true)
    try {
      const payload = { report_type: form.report_type }
      if (form.project_id) payload.project_id = parseInt(form.project_id)
      if (form.line_id) payload.line_id = form.line_id
      if (form.shift) payload.shift = form.shift
      if (form.month_year) payload.month_year = form.month_year

      const res = await api.post('/export/excel', payload, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      const rtype = form.report_type === 'removed' ? 'Removed' : 'Active'
      a.download = `MES_${rtype}_Report_${form.month_year || 'All'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded!')
    } catch (err) {
      toast.error('Export failed')
    }
    setLoading(false)
  }

  const sel = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(0,0,0,.02)', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 12, fontSize: 13, color: '#0f172a',
    fontFamily: "'Space Grotesk',sans-serif", outline: 'none', cursor: 'pointer',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '.08em', marginBottom: 6,
  }

  const generateMonths = () => {
    const result = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const label = d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
      result.push({ val, label })
    }
    return result
  }

  const monthOptions = generateMonths()
  const isActive = form.report_type === 'active'
  const isRemoved = form.report_type === 'removed'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Export Data</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Export station assignment records to Excel — all timestamps are preserved</p>
      </div>

      {/* Report Type Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => set('report_type', 'active')}
          style={{
            padding: '18px 20px', borderRadius: 16, cursor: 'pointer',
            border: isActive ? '2px solid #10b981' : '2px solid rgba(0,0,0,.06)',
            background: isActive ? 'rgba(16,185,129,.06)' : '#fff',
            boxShadow: isActive ? '0 4px 20px rgba(16,185,129,.15)' : '0 2px 8px rgba(0,0,0,.04)',
            transition: 'all .2s', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isActive ? '#10b981' : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={18} color={isActive ? '#fff' : '#94a3b8'} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#059669' : '#0f172a' }}>
              Active Users
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
            All currently registered users — leaders, floaters and operators with their station assignments and registration timestamps
          </div>
        </button>

        <button
          onClick={() => set('report_type', 'removed')}
          style={{
            padding: '18px 20px', borderRadius: 16, cursor: 'pointer',
            border: isRemoved ? '2px solid #ef4444' : '2px solid rgba(0,0,0,.06)',
            background: isRemoved ? 'rgba(239,68,68,.06)' : '#fff',
            boxShadow: isRemoved ? '0 4px 20px rgba(239,68,68,.15)' : '0 2px 8px rgba(0,0,0,.04)',
            transition: 'all .2s', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isRemoved ? '#ef4444' : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserMinus size={18} color={isRemoved ? '#fff' : '#94a3b8'} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: isRemoved ? '#dc2626' : '#0f172a' }}>
              Removed Users
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
            All deleted or monthly-reset users — includes removal timestamp, registration date, project, line and role
          </div>
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1.5px solid rgba(0,0,0,.06)', boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSpreadsheet size={18} color="#10b981" /> Export Filters
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Month</label>
            <select value={form.month_year} onChange={e => set('month_year', e.target.value)} style={sel}>
              <option value="">All Months</option>
              {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Project</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} style={sel}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>Project {p.project_number}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Line</label>
            <select value={form.line_id} onChange={e => set('line_id', e.target.value)} disabled={!form.project_id} style={sel}>
              <option value="">All Lines</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.line_type}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Shift</label>
            <select value={form.shift} onChange={e => set('shift', e.target.value)} style={sel}>
              <option value="">All Shifts</option>
              <option value="Morning">🌅 Morning Shift</option>
              <option value="Night">🌙 Night Shift</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 20, padding: '14px 16px',
          background: isActive ? 'rgba(16,185,129,.04)' : 'rgba(239,68,68,.04)',
          border: `1.5px solid ${isActive ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)'}`,
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#059669' : '#dc2626', marginBottom: 6 }}>
            {isActive ? '📊 Active Users Report will include:' : '🗂️ Removed Users Report will include:'}
          </div>
          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>
            📅 Month: <strong>{form.month_year ? monthOptions.find(m => m.val === form.month_year)?.label : 'All months'}</strong><br />
            🏭 Project: <strong>{form.project_id ? `Project ${projects.find(p => p.id == form.project_id)?.project_number}` : 'All projects'}</strong><br />
            🔧 Line: <strong>{form.line_id ? lines.find(l => l.id === form.line_id)?.line_type : 'All lines'}</strong><br />
            ⏰ Shift: <strong>{form.shift || 'All shifts'}</strong><br />
            {isActive
              ? '✅ Columns: No, Project, Line, Station, Shift, Employee ID, Badge/PIN, Full Name, Role, Registered, Status'
              : '🗑️ Columns: No, Project, Line, Station, Shift, Employee ID, Badge/PIN, Full Name, Role, Registered, Removed At'}
          </div>
        </div>

        <button onClick={handleExport} disabled={loading} style={{
          marginTop: 20, width: '100%', padding: '13px',
          background: loading ? '#e2e8f0' : isActive
            ? 'linear-gradient(135deg,#10b981,#059669)'
            : 'linear-gradient(135deg,#ef4444,#dc2626)',
          border: 'none', borderRadius: 14, color: loading ? '#94a3b8' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: loading ? 'none' : isActive
            ? '0 4px 20px rgba(16,185,129,.35)'
            : '0 4px 20px rgba(239,68,68,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all .2s',
        }}>
          <Download size={16} />
          {loading ? 'Generating Excel...' : `Download ${isActive ? 'Active Users' : 'Removed Users'} Report`}
        </button>
      </div>
    </div>
  )
}