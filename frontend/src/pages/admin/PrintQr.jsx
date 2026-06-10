import { useState, useEffect } from 'react'
import { Printer, QrCode, RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function PrintQR() {
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [users, setUsers] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [qrImages, setQrImages] = useState({})
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/users/projects').then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProject) { setLines([]); setSelectedLine(''); setUsers([]); return }
    api.get(`/users/lines?project_id=${selectedProject}`).then(r => setLines(r.data || [])).catch(() => {})
    setSelectedLine('')
    setUsers([])
    setSelectedUsers([])
    setQrImages({})
  }, [selectedProject])

  useEffect(() => {
    if (!selectedLine) { setUsers([]); setSelectedUsers([]); setQrImages({}); return }
    setLoading(true)
    api.get('/users/').then(r => {
      let filtered = (r.data || []).filter(u =>
        u.status === 'active' &&
        u.line_id === selectedLine
      )
      if (selectedShift) filtered = filtered.filter(u => u.shift === selectedShift)
      setUsers(filtered)
      setSelectedUsers(filtered.map(u => u.id))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedLine, selectedShift])

  const toggleUser = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
  }

  const generateQRs = async () => {
    if (!selectedUsers.length) return toast.error('Select at least one user')
    setGenerating(true)
    const imgs = {}
    for (const uid of selectedUsers) {
      try {
        const res = await api.post(`/qr/generate/${uid}`, {}, { responseType: 'blob' })
        imgs[uid] = URL.createObjectURL(res.data)
      } catch {}
    }
    setQrImages(imgs)
    setGenerating(false)
    toast.success(`Generated ${Object.keys(imgs).length} QR codes!`)
  }

  const reprintQR = async (uid) => {
    try {
      const res = await api.post(`/qr/reprint/${uid}`, {}, { responseType: 'blob' })
      setQrImages(prev => ({ ...prev, [uid]: URL.createObjectURL(res.data) }))
      toast.success('QR reprinted!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reprint failed')
    }
  }

  const handlePrint = () => window.print()

  const sel = {
    padding: '9px 12px', border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 10, fontSize: 12, fontFamily: "'Space Grotesk',sans-serif",
    outline: 'none', background: '#fff', cursor: 'pointer',
  }

  const roleColors = {
    main_leader: '#8b5cf6',
    assistant_leader: '#06b6d4',
    floater: '#10b981',
    operator: '#f59e0b',
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Print QR Sheet</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Generate and print QR codes — valid until end of month</p>
      </div>

      {/* Controls */}
      <div className="no-print" style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', border: '1.5px solid rgba(0,0,0,.06)', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={sel}>
          <option value="">Select Project</option>
          {projects.map(p => <option key={p.id} value={p.id}>Project {p.project_number}</option>)}
        </select>
        <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} disabled={!selectedProject} style={sel}>
          <option value="">Select Line</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.line_type}</option>)}
        </select>
        <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={sel}>
          <option value="">All Shifts</option>
          <option value="Morning">🌅 Morning</option>
          <option value="Night">🌙 Night</option>
        </select>
        <button onClick={generateQRs} disabled={generating || !selectedLine || !selectedUsers.length} style={{
          padding: '9px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: !selectedLine || !selectedUsers.length ? .5 : 1,
          boxShadow: '0 2px 12px rgba(99,102,241,.3)',
        }}>
          <QrCode size={14} />
          {generating ? 'Generating...' : `Generate (${selectedUsers.length})`}
        </button>
        {Object.keys(qrImages).length > 0 && (
          <button onClick={handlePrint} style={{
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#10b981,#059669)',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Space Grotesk',sans-serif",
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 12px rgba(16,185,129,.3)',
          }}>
            <Printer size={14} /> Print All
          </button>
        )}
      </div>

      {/* User selection */}
      {users.length > 0 && (
        <div className="no-print" style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', border: '1.5px solid rgba(0,0,0,.06)', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Select users to generate QR</div>
            <button onClick={toggleAll} style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif" }}>
              {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => {
              const color = roleColors[u.role] || '#64748b'
              const isSelected = selectedUsers.includes(u.id)
              const hasQR = !!qrImages[u.id]
              return (
                <div key={u.id} onClick={() => toggleUser(u.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${isSelected ? 'rgba(99,102,241,.3)' : 'rgba(0,0,0,.06)'}`,
                  background: isSelected ? 'rgba(99,102,241,.04)' : '#fff',
                  transition: 'all .2s',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${isSelected ? '#6366f1' : 'rgba(0,0,0,.15)'}`,
                    background: isSelected ? '#6366f1' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color, flexShrink: 0 }}>
                    {u.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{u.employee_id} · {u.role?.replace(/_/g, ' ')} · {u.shift === 'Morning' ? '🌅' : '🌙'} {u.shift}</div>
                  </div>
                  {hasQR && (
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,.1)', padding: '3px 8px', borderRadius: 20 }}>✅ Generated</span>
                      <button onClick={() => reprintQR(u.id)} style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, background: 'rgba(99,102,241,.1)', padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Grotesk',sans-serif" }}>
                        <RefreshCw size={10} /> Reprint
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedLine && (
        <div className="no-print" style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖨️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Select a line to print QR codes</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Choose project, line and shift to see available users</div>
        </div>
      )}

      {loading && (
        <div className="no-print" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading users...</div>
      )}

      {/* Print area */}
      {Object.keys(qrImages).length > 0 && (
        <div id="print-area">
          <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>V.S. Industry Berhad — MES Station Registration</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              QR Codes · {new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16 }}>
            {users.filter(u => qrImages[u.id]).map(u => {
              const color = roleColors[u.role] || '#64748b'
              return (
                <div key={u.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 16, textAlign: 'center', pageBreakInside: 'avoid' }}>
                  <img src={qrImages[u.id]} alt={u.employee_id} style={{ width: 150, height: 150, marginBottom: 10 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{u.full_name}</div>
                  <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color, background: `${color}18`, padding: '2px 10px', borderRadius: 6, display: 'inline-block', marginBottom: 4 }}>{u.employee_id}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{u.role?.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{u.shift === 'Morning' ? '🌅' : '🌙'} {u.shift}</div>
                  <div style={{ marginTop: 8, padding: '4px 8px', background: '#f8faff', borderRadius: 6, fontSize: 9, color: '#64748b' }}>
                    Valid until end of month · Monthly renewal required
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}