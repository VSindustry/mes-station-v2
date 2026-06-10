import { useEffect, useState } from 'react'
import { MapPin, UserPlus, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LeaderAssignments() {
  const { user } = useAuthStore()
  const [stations, setStations] = useState([])
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [assigning, setAssigning] = useState(false)
  const monthYear = new Date().toISOString().slice(0, 7) + '-01'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [occ, users] = await Promise.all([
        api.get('/assignments/occupancy'),
        api.get('/users/'),
      ])
      setStations(occ.data || [])
      setOperators((users.data || []).filter(u => u.role === 'operator' && u.status === 'active'))
    } catch {}
    setLoading(false)
  }

  const assign = async () => {
    if (!selectedUser) return toast.error('Select an operator')
    setAssigning(true)
    try {
      await api.post('/assignments/', {
        station_id: modal.station_id,
        user_id: selectedUser,
        month_year: monthYear,
        shift: user?.shift || 'Morning',
      })
      toast.success('Assignment submitted — awaiting admin approval')
      setModal(null)
      setSelectedUser('')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Assignment failed')
    }
    setAssigning(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Assignments</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {user?.shift === 'Morning' ? '🌅' : '🌙'} {user?.shift} Shift · {new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Loading...</div>
      ) : stations.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📍</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>No stations in your line</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Contact admin to set up stations</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stations.map((s, i) => {
            const pct = s.fill_pct || 0
            const color = pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444'
            const bg = pct >= 100 ? 'rgba(16,185,129,.06)' : pct > 0 ? 'rgba(245,158,11,.06)' : 'rgba(239,68,68,.04)'
            return (
              <div key={i} style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px',
                border: `1.5px solid ${color}25`, boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Mono',monospace" }}>{s.station_code}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: color, color: '#fff' }}>{s.filled}/{s.capacity}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(0,0,0,.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 10 }} />
                </div>
                {pct < 100 ? (
                  <button onClick={() => { setModal(s); setSelectedUser('') }} style={{
                    width: '100%', padding: '9px', borderRadius: 10,
                    border: '1.5px solid rgba(99,102,241,.25)',
                    background: 'rgba(99,102,241,.06)', color: '#6366f1',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Space Grotesk',sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <UserPlus size={13} /> Assign Operator
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <CheckCircle size={13} /> Fully Assigned
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center', zIndex: 500, padding: '0',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '20px 20px 0 0', width: '100%',
            maxWidth: 420, padding: 24, boxShadow: '0 -8px 40px rgba(0,0,0,.15)',
          }}>
            <div style={{ width: 40, height: 4, background: 'rgba(0,0,0,.1)', borderRadius: 10, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Assign to {modal.station_code}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 20 }}>{modal.filled}/{modal.capacity} filled · {user?.shift} Shift</div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Select Operator</div>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{
              width: '100%', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.08)',
              borderRadius: 12, fontSize: 13, color: '#0f172a',
              fontFamily: "'Space Grotesk',sans-serif", outline: 'none',
              background: '#fff', marginBottom: 14,
            }}>
              <option value="">Choose an operator...</option>
              {operators.map(u => <option key={u.id} value={u.id}>{u.full_name} · {u.employee_id}</option>)}
            </select>

            <div style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              ⚠️ Assignment will be <strong>Pending</strong> until approved by admin.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,.1)',
                background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
              }}>Cancel</button>
              <button onClick={assign} disabled={assigning || !selectedUser} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Space Grotesk',sans-serif",
                opacity: assigning || !selectedUser ? .6 : 1,
              }}>
                {assigning ? 'Assigning...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}