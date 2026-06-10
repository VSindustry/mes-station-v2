import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, FolderKanban } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ManageProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [expandedLines, setExpandedLines] = useState({})

  // Add project
  const [newProject, setNewProject] = useState('')
  const [addingProject, setAddingProject] = useState(false)

  // Add line
  const [addingLine, setAddingLine] = useState(null)
  const [newLineType, setNewLineType] = useState('Mainline')

  // Add station
  const [addingStation, setAddingStation] = useState(null)
  const [newStationCode, setNewStationCode] = useState('')
  const [newStationCapacity, setNewStationCapacity] = useState(1)

  const lineTypes = ['Mainline', 'Miniline', 'Subline', 'Packing']

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const r = await api.get('/projects/')
      setProjects(r.data || [])
    } catch { toast.error('Failed to load projects') }
    setLoading(false)
  }

  const addProject = async () => {
    if (!newProject.trim()) return toast.error('Enter project number')
    setAddingProject(true)
    try {
      await api.post('/projects/', { project_number: newProject.trim() })
      toast.success(`Project ${newProject} created!`)
      setNewProject('')
      fetchProjects()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setAddingProject(false)
  }

  const removeProject = async (id, num) => {
    if (!confirm(`Remove Project ${num}? This will also remove all its lines and stations.`)) return
    try {
      await api.delete(`/projects/${id}`)
      toast.success('Project removed')
      fetchProjects()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const addLine = async (projectId) => {
    try {
      await api.post('/projects/lines', { project_id: projectId, line_type: newLineType })
      toast.success(`${newLineType} added!`)
      setAddingLine(null)
      fetchProjects()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const removeLine = async (lineId, lineType) => {
    if (!confirm(`Remove ${lineType}? All stations will be removed.`)) return
    try {
      await api.delete(`/projects/lines/${lineId}`)
      toast.success('Line removed')
      fetchProjects()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const addStation = async (lineId) => {
    if (!newStationCode.trim()) return toast.error('Enter station code')
    try {
      await api.post('/projects/stations', {
        line_id: lineId,
        station_code: newStationCode.trim().toUpperCase(),
        capacity: newStationCapacity
      })
      toast.success(`Station ${newStationCode.toUpperCase()} added!`)
      setAddingStation(null)
      setNewStationCode('')
      setNewStationCapacity(1)
      fetchProjects()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const removeStation = async (stationId, code) => {
    if (!confirm(`Remove station ${code}?`)) return
    try {
      await api.delete(`/projects/stations/${stationId}`)
      toast.success('Station removed')
      fetchProjects()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const inp = { padding: '8px 12px', border: '1.5px solid rgba(0,0,0,.08)', borderRadius: 10, fontSize: 12, fontFamily: "'Space Grotesk',sans-serif", outline: 'none', background: '#fff' }
  const btn = (color) => ({
    padding: '7px 14px', borderRadius: 9, border: 'none', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
    background: color === 'indigo' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : color === 'red' ? 'rgba(239,68,68,.1)' : 'rgba(99,102,241,.08)',
    color: color === 'indigo' ? '#fff' : color === 'red' ? '#ef4444' : '#6366f1',
    display: 'flex', alignItems: 'center', gap: 5,
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Manage Projects</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Add projects, lines and stations for your factory floor</p>
      </div>

      {/* Add Project */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1.5px solid rgba(0,0,0,.06)', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>➕ Add New Project</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={newProject} onChange={e => setNewProject(e.target.value.toUpperCase())}
            placeholder="Project number e.g. 308" style={{ ...inp, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && addProject()} />
          <button onClick={addProject} disabled={addingProject} style={{ ...btn('indigo'), padding: '8px 18px' }}>
            <Plus size={14} /> {addingProject ? 'Adding...' : 'Add Project'}
          </button>
        </div>
      </div>

      {/* Projects list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1.5px solid rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No projects yet</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Add your first project above</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map(project => (
            <div key={project.id} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(0,0,0,.06)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
              {/* Project header */}
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: expanded[project.id] ? 'rgba(99,102,241,.03)' : '#fff' }}
                onClick={() => setExpanded(e => ({ ...e, [project.id]: !e[project.id] }))}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderKanban size={18} color="#6366f1" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Project {project.project_number}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{(project.lines || []).length} lines · {(project.lines || []).reduce((a, l) => a + (l.stations || []).length, 0)} stations</div>
                </div>
                <button onClick={e => { e.stopPropagation(); removeProject(project.id, project.project_number) }} style={{ ...btn('red'), padding: '5px 10px' }}>
                  <Trash2 size={12} />
                </button>
                {expanded[project.id] ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
              </div>

              {/* Lines */}
              {expanded[project.id] && (
                <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                  {/* Add line */}
                  <div style={{ padding: '12px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {addingLine === project.id ? (
                      <>
                        <select value={newLineType} onChange={e => setNewLineType(e.target.value)} style={{ ...inp, flex: 1 }}>
                          {lineTypes.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                        </select>
                        <button onClick={() => addLine(project.id)} style={btn('indigo')}><Plus size={13} /> Add</button>
                        <button onClick={() => setAddingLine(null)} style={btn('gray')}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setAddingLine(project.id)} style={btn('gray')}>
                        <Plus size={13} /> Add Line
                      </button>
                    )}
                  </div>

                  {(project.lines || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>No lines yet — add one above</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(project.lines || []).map(line => (
                        <div key={line.id} style={{ border: '1.5px solid rgba(0,0,0,.06)', borderRadius: 12, overflow: 'hidden' }}>
                          {/* Line header */}
                          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,.02)', cursor: 'pointer' }}
                            onClick={() => setExpandedLines(e => ({ ...e, [line.id]: !e[line.id] }))}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{line.line_type}</span>
                              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{(line.stations || []).length} stations</span>
                            </div>
                            <button onClick={e => { e.stopPropagation(); removeLine(line.id, line.line_type) }} style={{ ...btn('red'), padding: '4px 8px' }}>
                              <Trash2 size={11} />
                            </button>
                            {expandedLines[line.id] ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                          </div>

                          {/* Stations */}
                          {expandedLines[line.id] && (
                            <div style={{ padding: '10px 14px' }}>
                              {/* Add station */}
                              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                                {addingStation === line.id ? (
                                  <>
                                    <input value={newStationCode} onChange={e => setNewStationCode(e.target.value.toUpperCase())}
                                      placeholder="ST-01" style={{ ...inp, width: 100 }} />
                                    <input type="number" value={newStationCapacity} onChange={e => setNewStationCapacity(parseInt(e.target.value))}
                                      min={1} max={10} style={{ ...inp, width: 70 }} />
                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>capacity</span>
                                    <button onClick={() => addStation(line.id)} style={btn('indigo')}><Plus size={12} /> Add</button>
                                    <button onClick={() => { setAddingStation(null); setNewStationCode(''); }} style={btn('gray')}>Cancel</button>
                                  </>
                                ) : (
                                  <button onClick={() => setAddingStation(line.id)} style={{ ...btn('gray'), fontSize: 10 }}>
                                    <Plus size={12} /> Add Station
                                  </button>
                                )}
                              </div>

                              {/* Station chips */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(line.stations || []).length === 0 ? (
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>No stations yet</span>
                                ) : (line.stations || []).map(st => (
                                  <div key={st.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.2)',
                                    borderRadius: 8, padding: '4px 10px',
                                  }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', fontFamily: "'Space Mono',monospace" }}>{st.station_code}</span>
                                    <span style={{ fontSize: 9, color: '#94a3b8' }}>cap:{st.capacity}</span>
                                    <button onClick={() => removeStation(st.id, st.station_code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}>
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}