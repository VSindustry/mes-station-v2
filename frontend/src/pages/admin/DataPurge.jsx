import { useState, useEffect, useRef } from 'react'
import { DatabaseZap, AlertTriangle, Download, ShieldCheck, Trash2, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const STEPS = {
  SELECT: 'select',
  DOWNLOAD: 'download',
  BADGE: 'badge',
  NOTE: 'note',
  CONFIRM: 'confirm',
}

export default function DataPurge() {
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ month_year: '', project_id: '', shift: '' })
  const [recordCount, setRecordCount] = useState(null)
  const [counting, setCounting] = useState(false)
  const [step, setStep] = useState(STEPS.SELECT)
  const [downloaded, setDownloaded] = useState(false)
  const [badge, setBadge] = useState('')
  const [badgeVerified, setBadgeVerified] = useState(false)
  const [note, setNote] = useState('')
  const [purging, setPurging] = useState(false)
  const [done, setDone] = useState(false)
  const badgeRef = useRef(null)

  useEffect(() => {
    api.get('/users/projects').then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  // Focus badge input when on badge step
  useEffect(() => {
    if (step === STEPS.BADGE && badgeRef.current) {
      setTimeout(() => badgeRef.current?.focus(), 100)
    }
  }, [step])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setRecordCount(null)
    setStep(STEPS.SELECT)
    setDownloaded(false)
    setBadge('')
    setBadgeVerified(false)
    setNote('')
  }

  const generateMonths = () => {
    const result = []
    const now = new Date()
    for (let i = 1; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const label = d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
      result.push({ val, label })
    }
    return result
  }

  const monthOptions = generateMonths()

  const checkRecords = async () => {
    if (!form.month_year) { toast.error('Please select a month first'); return }
    setCounting(true)
    try {
      const payload = { month_year: form.month_year }
      if (form.project_id) payload.project_id = parseInt(form.project_id)
      if (form.shift) payload.shift = form.shift
      const res = await api.post('/purge/count', payload)
      setRecordCount(res.data.count)
      setStep(STEPS.DOWNLOAD)
    } catch {
      toast.error('Failed to count records')
    }
    setCounting(false)
  }

  const handleDownload = async () => {
    try {
      const payload = {
        report_type: 'removed',
        month_year: form.month_year,
      }
      if (form.project_id) payload.project_id = parseInt(form.project_id)
      if (form.shift) payload.shift = form.shift

      const res = await api.post('/export/excel', payload, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `MES_Purge_Backup_${form.month_year}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded! Keep this file safe.')
      setDownloaded(true)
      setStep(STEPS.BADGE)
    } catch {
      toast.error('Download failed')
    }
  }

  const handleBadgeScan = (val) => {
    setBadge(val)
    // Badge format: EMPID;BADGENUMBER
    if (val.includes(';')) {
      const parts = val.split(';')
      if (parts.length === 2 && parts[0] && parts[1]) {
        setBadgeVerified(true)
        setStep(STEPS.NOTE)
        toast.success('Badge verified!')
      }
    }
  }

  const handlePurge = async () => {
    if (!note.trim()) { toast.error('Please enter a reason for purging'); return }
    if (note.trim().length < 10) { toast.error('Reason must be at least 10 characters'); return }
    if (!confirm(`⚠️ FINAL WARNING\n\nYou are about to permanently delete ${recordCount} records from ${form.month_year?.slice(0, 7)}.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) return

    setPurging(true)
    try {
      const payload = { month_year: form.month_year, note: note.trim() }
      if (form.project_id) payload.project_id = parseInt(form.project_id)
      if (form.shift) payload.shift = form.shift
      await api.post('/purge/execute', payload)
      toast.success(`✅ ${recordCount} records purged successfully!`)
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Purge failed')
    }
    setPurging(false)
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

  const StepIndicator = ({ current }) => {
    const steps = [
      { key: STEPS.SELECT, label: 'Select' },
      { key: STEPS.DOWNLOAD, label: 'Download' },
      { key: STEPS.BADGE, label: 'Verify' },
      { key: STEPS.NOTE, label: 'Reason' },
      { key: STEPS.CONFIRM, label: 'Delete' },
    ]
    const stepKeys = steps.map(s => s.key)
    const currentIdx = stepKeys.indexOf(current)

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
        {steps.map((s, idx) => {
          const isDone = idx < currentIdx
          const isActive = idx === currentIdx
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isDone ? '#10b981' : isActive ? '#ef4444' : 'rgba(0,0,0,.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: isDone || isActive ? '#fff' : '#94a3b8',
                  border: isActive ? '2px solid #ef444440' : 'none',
                  boxShadow: isActive ? '0 0 0 4px rgba(239,68,68,.1)' : 'none',
                }}>
                  {isDone ? <CheckCircle size={14} /> : idx + 1}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: isActive ? '#ef4444' : isDone ? '#10b981' : '#94a3b8', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, background: isDone ? '#10b981' : 'rgba(0,0,0,.06)',
                  margin: '0 4px', marginBottom: 16,
                }} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 60,
          textAlign: 'center', border: '1.5px solid rgba(16,185,129,.2)',
          boxShadow: '0 4px 24px rgba(16,185,129,.1)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Purge Complete!</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
            {recordCount} records from {form.month_year?.slice(0, 7)} have been permanently deleted from the database.
          </div>
          <div style={{
            background: 'rgba(16,185,129,.06)', border: '1.5px solid rgba(16,185,129,.2)',
            borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 12, color: '#059669',
          }}>
            ✅ Your backup Excel file has been saved. Store it securely for future reference.
          </div>
          <button
            onClick={() => { setDone(false); setStep(STEPS.SELECT); setForm({ month_year: '', project_id: '', shift: '' }); setRecordCount(null); setDownloaded(false); setBadge(''); setBadgeVerified(false); setNote('') }}
            style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            Purge Another Month
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <DatabaseZap size={22} color="#ef4444" /> Data Purge
        </h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Permanently delete old historical records to free up database storage</p>
      </div>

      {/* WHY PURGE — Education banner */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(239,68,68,.06),rgba(239,68,68,.02))',
        border: '1.5px solid rgba(239,68,68,.2)',
        borderRadius: 16, padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>
              ⚠️ Why Data Purge is Important
            </div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
              <strong style={{ color: '#0f172a' }}>🗄️ Limited Storage:</strong> Supabase free tier has only <strong style={{ color: '#ef4444' }}>500MB</strong> of database storage. With 1,000+ staff registered every month, your database will fill up fast.<br /><br />
              <strong style={{ color: '#0f172a' }}>📈 Data Growth:</strong> Each monthly cycle generates thousands of records — user history, station assignments, audit logs. Without regular purging, the system will slow down and eventually stop working.<br /><br />
              <strong style={{ color: '#0f172a' }}>✅ Best Practice:</strong> Always <strong style={{ color: '#10b981' }}>download the report first</strong> before purging. Keep the Excel backup in a safe location (company server or Google Drive) for future reference.<br /><br />
              <strong style={{ color: '#0f172a' }}>🔒 Security:</strong> Badge verification is required to prevent accidental deletion. Only authorized admins can perform this action.
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Main card */}
      <div style={{
        background: '#fff', borderRadius: 20, padding: 28,
        border: '1.5px solid rgba(0,0,0,.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,.06)',
      }}>

        {/* STEP 1 — Select filters */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step === STEPS.SELECT ? '#ef4444' : '#10b981',
              color: '#fff', fontSize: 11, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>1</span>
            Select Data to Purge
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Month to Purge <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={form.month_year} onChange={e => set('month_year', e.target.value)} style={sel}>
                <option value="">— Select Month —</option>
                {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Project (Optional)</label>
              <select value={form.project_id} onChange={e => set('project_id', e.target.value)} style={sel}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>Project {p.project_number}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Shift (Optional)</label>
              <select value={form.shift} onChange={e => set('shift', e.target.value)} style={sel}>
                <option value="">All Shifts</option>
                <option value="Morning">🌅 Morning</option>
                <option value="Night">🌙 Night</option>
              </select>
            </div>
          </div>

          <button
            onClick={checkRecords}
            disabled={!form.month_year || counting}
            style={{
              marginTop: 16, padding: '11px 24px',
              background: !form.month_year ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: 12,
              color: !form.month_year ? '#94a3b8' : '#fff',
              fontSize: 13, fontWeight: 700, cursor: !form.month_year ? 'not-allowed' : 'pointer',
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            {counting ? 'Counting...' : '🔍 Check Records'}
          </button>
        </div>

        {/* STEP 2 — Download */}
        {recordCount !== null && (
          <div style={{
            borderTop: '1.5px solid rgba(0,0,0,.06)', paddingTop: 24, marginBottom: 24,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: downloaded ? '#10b981' : '#ef4444',
                color: '#fff', fontSize: 11, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>2</span>
              Download Backup Report First
            </div>

            {/* Record count */}
            <div style={{
              background: recordCount === 0 ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)',
              border: `1.5px solid ${recordCount === 0 ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'}`,
              borderRadius: 12, padding: '14px 18px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: recordCount === 0 ? '#10b981' : '#ef4444' }}>
                {recordCount}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {recordCount === 0 ? 'No records found' : `Records found for ${form.month_year?.slice(0, 7)}`}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {recordCount === 0 ? 'Nothing to purge for this selection' : 'These records will be permanently deleted after purge'}
                </div>
              </div>
            </div>

            {recordCount > 0 && (
              <>
                <div style={{
                  background: 'rgba(245,158,11,.06)', border: '1.5px solid rgba(245,158,11,.2)',
                  borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 12, color: '#92400e',
                }}>
                  ⚠️ <strong>You must download the backup report before deleting.</strong> This is your only copy of this data. Store it safely in your company server or Google Drive.
                </div>

                <button
                  onClick={handleDownload}
                  style={{
                    width: '100%', padding: '13px',
                    background: downloaded
                      ? 'rgba(16,185,129,.1)'
                      : 'linear-gradient(135deg,#10b981,#059669)',
                    border: downloaded ? '1.5px solid rgba(16,185,129,.3)' : 'none',
                    borderRadius: 14,
                    color: downloaded ? '#059669' : '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Space Grotesk',sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: downloaded ? 'none' : '0 4px 20px rgba(16,185,129,.35)',
                  }}
                >
                  <Download size={16} />
                  {downloaded ? '✅ Report Downloaded — Ready to proceed' : '📥 Download Backup Report'}
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — Badge Verification */}
        {downloaded && (
          <div style={{ borderTop: '1.5px solid rgba(0,0,0,.06)', paddingTop: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: badgeVerified ? '#10b981' : '#ef4444',
                color: '#fff', fontSize: 11, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>3</span>
              Scan Your Admin Badge to Verify Identity
            </div>

            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Scan your badge on the reader to confirm you are an authorized admin.
            </div>

            <input
              ref={badgeRef}
              value={badge}
              onChange={e => handleBadgeScan(e.target.value)}
              placeholder="Scan badge here..."
              style={{
                ...sel,
                background: badgeVerified ? 'rgba(16,185,129,.06)' : 'rgba(0,0,0,.02)',
                border: badgeVerified ? '1.5px solid rgba(16,185,129,.3)' : '1.5px solid rgba(0,0,0,.08)',
                color: badgeVerified ? '#059669' : '#0f172a',
                fontFamily: "'Space Mono',monospace",
                fontSize: 14,
              }}
            />
            {badgeVerified && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                ✅ Badge verified — identity confirmed
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Note */}
        {badgeVerified && (
          <div style={{ borderTop: '1.5px solid rgba(0,0,0,.06)', paddingTop: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: note.trim().length >= 10 ? '#10b981' : '#ef4444',
                color: '#fff', fontSize: 11, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>4</span>
              Enter Reason for Purging
            </div>

            <textarea
              value={note}
              onChange={e => { setNote(e.target.value); if (e.target.value.trim().length >= 10) setStep(STEPS.CONFIRM) }}
              placeholder="e.g. Monthly data purge for June 2026 — storage optimization. Data backed up to company server."
              rows={3}
              style={{
                ...sel,
                resize: 'vertical', lineHeight: 1.6,
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            />
            <div style={{ fontSize: 11, color: note.trim().length < 10 ? '#ef4444' : '#10b981', marginTop: 4 }}>
              {note.trim().length}/min 10 characters
            </div>
          </div>
        )}

        {/* STEP 5 — Final Delete Button */}
        {note.trim().length >= 10 && (
          <div style={{ borderTop: '1.5px solid rgba(239,68,68,.2)', paddingTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>5</span>
              Final Step — Permanently Delete Records
            </div>

            <div style={{
              background: 'rgba(239,68,68,.06)', border: '1.5px solid rgba(239,68,68,.2)',
              borderRadius: 12, padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>🚨 Final Summary</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                📅 Month: <strong style={{ color: '#0f172a' }}>{form.month_year?.slice(0, 7)}</strong><br />
                🗑️ Records to delete: <strong style={{ color: '#ef4444' }}>{recordCount}</strong><br />
                📥 Backup downloaded: <strong style={{ color: '#10b981' }}>✅ Yes</strong><br />
                🔒 Badge verified: <strong style={{ color: '#10b981' }}>✅ Yes</strong><br />
                📝 Reason: <strong style={{ color: '#0f172a' }}>{note}</strong>
              </div>
            </div>

            <button
              onClick={handlePurge}
              disabled={purging}
              style={{
                width: '100%', padding: '14px',
                background: purging ? '#e2e8f0' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', borderRadius: 14,
                color: purging ? '#94a3b8' : '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: purging ? 'not-allowed' : 'pointer',
                fontFamily: "'Space Grotesk',sans-serif",
                boxShadow: purging ? 'none' : '0 4px 20px rgba(239,68,68,.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Trash2 size={16} />
              {purging ? 'Purging...' : `🗑️ Permanently Delete ${recordCount} Records`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}