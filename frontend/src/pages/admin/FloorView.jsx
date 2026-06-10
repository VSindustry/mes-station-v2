import { useState, useEffect } from 'react'
import { Factory, Users, X } from 'lucide-react'
import api from '../../lib/api'

export default function FloorView() {
  const [occupancy, setOccupancy] = useState([])
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('')
  const [filterLine, setFilterLine] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [stationDetail, setStationDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/assignments/occupancy'),
      api.get('/users/projects'),
    ])
      .then(([occ, proj]) => {
        setOccupancy(occ.data || [])
        setProjects(proj.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!filterProject) { setLines([]); setFilterLine(''); return }
    api.get(`/users/lines?project_id=${filterProject}`)
      .then(r => setLines(r.data || []))
      .catch(() => {})
    setFilterLine('')
  }, [filterProject])

  const openStation = async (station) => {
    setSelectedStation(station)
    setDetailLoading(true)
    try {
      const r = await api.get(`/assignments/station/${station.station_id}?shift=${station.shift}`)
      setStationDetail(r.data)
    } catch {}
    setDetailLoading(false)
  }

  const filtered = occupancy.filter(s => {
    if (filterProject && String(s.project_id) !== String(filterProject)) return false
    if (filterLine && s.line_id !== filterLine) return false
    if (filterShift && String(s.shift) !== filterShift) return false
    return true
  })

  const sel = {
    padding: '7px 12px',
    border: '1.5px solid rgba(0,0,0,.08)',
    borderRadius: 10, fontSize: 12,
    fontFamily: "'Space Grotesk',sans-serif",
    outline: 'none', background: '#fff', cursor: 'pointer',
  }

  const roleColors = {
    main_leader: { bg: 'rgba(99,102,241,.1)', color: '#6366f1', label: 'Main Leader' },
    assistant_leader: { bg: 'rgba(6,182,212,.1)', color: '#06b6d4', label: 'Asst. Leader' },
    floater: { bg: 'rgba(16,185,129,.1)', color: '#10b981', label: 'Floater' },
    operator: { bg: 'rgba(245,158,11,.1)', color: '#f59e0b', label: 'Operator' },
  }

  const PersonCard = ({ name, empId, role, shift }) => {
    const roleInfo = roleColors[role] || { bg: 'rgba(0,0,0,.04)', color: '#64748b', label: role }
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px', borderRadius: 12,
        background: roleInfo.bg, border: `1px solid ${roleInfo.color}25`,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: roleInfo.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {name?.slice(0, 2).toUpperCase() || '??'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{name}</div>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: '#64748b' }}>{empId}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px',
            borderRadius: 20, background: roleInfo.color, color: '#fff',
            display: 'block', marginBottom: 4,
          }}>
            {roleInfo.label}
          </span>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {shift === 'Morning' ? '🌅' : '🌙'} {shift}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Floor View</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Click any station to see full team details</p>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '14px 18px',
        border: '1.5px solid rgba(0,0,0,.06)', marginBottom: 20,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}>
        <Factory size={16} color="#6366f1" />
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={sel}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={String(p.id)}>Project {p.project_number}</option>)}
        </select>
        <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
          style={{ ...sel, opacity: !filterProject ? .5 : 1 }} disabled={!filterProject}>
          <option value="">All Lines</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.line_type}</option>)}
        </select>
        <select value={filterShift} onChange={e => setFilterShift(e.target.value)} style={sel}>
          <option value="">All Shifts</option>
          <option value="Morning">🌅 Morning</option>
          <option value="Night">🌙 Night</option>
        </select>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
          {filtered.length} stations
        </span>
      </div>

      {/* Station grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading floor view...</div>
      ) : occupancy.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No stations yet</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Add projects and stations in Manage Projects first</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No stations match filters</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Try adjusting the filters above</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12 }}>
          {filtered.map((s, i) => {
            const pct = s.fill_pct || 0
            const color = pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444'
            const bg = pct >= 100 ? 'rgba(16,185,129,.06)' : pct > 0 ? 'rgba(245,158,11,.06)' : 'rgba(239,68,68,.04)'
            return (
              <div key={i} onClick={() => openStation(s)} style={{
                background: bg, borderRadius: 14, padding: '14px 16px',
                border: `1.5px solid ${color}30`, cursor: 'pointer',
                transition: 'all .2s', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Mono',monospace" }}>
                    {s.station_code}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: color, color: '#fff' }}>
                    {s.filled}/{s.capacity}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                  Proj {s.project_number} · {s.line_type}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>
                  {s.shift ? (s.shift === 'Morning' ? '🌅' : '🌙') + ' ' + s.shift : 'No shift'}
                </div>
                <div style={{ height: 4, background: 'rgba(0,0,0,.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 10 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <Users size={11} color="#94a3b8" />
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Click to view team</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Station detail modal */}
      {selectedStation && (
        <div
          onClick={() => { setSelectedStation(null); setStationDetail(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 500, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, width: 480,
              maxHeight: '80vh', overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,.2)',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Mono',monospace" }}>
                  {selectedStation.station_code}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Project {selectedStation.project_number} · {selectedStation.line_type} · {selectedStation.shift === 'Morning' ? '🌅' : '🌙'} {selectedStation.shift}
                </div>
              </div>
              <button
                onClick={() => { setSelectedStation(null); setStationDetail(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Leaders section */}
                  {stationDetail?.leaders?.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                        Line Leaders
                      </div>
                      {stationDetail.leaders.map((u, i) => (
                        <PersonCard key={i} name={u.full_name} empId={u.employee_id} role={u.role} shift={u.shift} />
                      ))}
                      <div style={{ height: 1, background: 'rgba(0,0,0,.06)', margin: '4px 0' }} />
                    </>
                  )}

                  {/* Operators section */}
                  {stationDetail?.assignments?.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                        Operators
                      </div>
                      {stationDetail.assignments.map((a, i) => (
                        <PersonCard key={i} name={a.users?.full_name} empId={a.users?.employee_id} role={a.users?.role} shift={a.shift} />
                      ))}
                    </>
                  )}

                  {/* Empty state */}
                  {!stationDetail?.leaders?.length && !stationDetail?.assignments?.length && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div style={{ fontSize: 28, marginBottom: 12 }}>👤</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No one assigned</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>This station has no active assignments</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}