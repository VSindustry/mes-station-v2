import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function Login() {
  const canvasBg = useRef(null)
  const canvas3d = useRef(null)
  const cardRef = useRef(null)
  const rootRef = useRef(null)
  const empIdRef = useRef(null)
  const pinRef = useRef(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const doLogin = async (id, p) => {
    if (!id?.trim() || !p?.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/pin-login', {
        employee_id: id.trim().toUpperCase(),
        pin: p.trim()
      })
      login({
        user_id: res.data.user_id,
        employee_id: res.data.employee_id,
        full_name: res.data.full_name,
        short_name: res.data.short_name,
        role: res.data.role,
        project_id: res.data.project_id,
        line_id: res.data.line_id,
        shift: res.data.shift,
      }, res.data.access_token)
      toast.success(`Welcome, ${res.data.full_name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
      if (empIdRef.current) empIdRef.current.value = ''
      setPin('')
      empIdRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

 const handleEmpIdKeyUp = (e) => {
  if (e.key === 'Enter') {
    const val = empIdRef.current?.value || ''
    if (val.includes(';')) {
      const parts = val.split(';')
      const scannedId = parts[0].trim().toUpperCase()
      const scannedPin = parts[1].trim()
      if (empIdRef.current) empIdRef.current.value = scannedId
      setPin(scannedPin)
      doLogin(scannedId, scannedPin)
    } else {
      pinRef.current?.focus()
    }
  }
}
  const handleManualLogin = () => {
    const id = empIdRef.current?.value?.trim().toUpperCase()
    if (!id) return toast.error('Enter Employee ID')
    if (!pin.trim()) return toast.error('Enter PIN')
    doLogin(id, pin)
  }

  // Counter animation
  const [count1, setCount1] = useState(0)
  const [count2, setCount2] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => {
      let s = 0
      const iv = setInterval(() => { s = Math.min(s + 6, 336); setCount1(s); if (s >= 336) clearInterval(iv) }, 16)
    }, 600)
    const t2 = setTimeout(() => {
      let s = 0
      const iv = setInterval(() => { s = Math.min(s + 1, 7); setCount2(s); if (s >= 7) clearInterval(iv) }, 80)
    }, 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Background canvas
  useEffect(() => {
    const canvas = canvasBg.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight
    const blobs = [
      { x: .2, y: .3, r: .45, c1: 'rgba(99,102,241,.22)', c2: 'rgba(99,102,241,0)', vx: .0004, vy: .0003 },
      { x: .7, y: .2, r: .4, c1: 'rgba(6,182,212,.18)', c2: 'rgba(6,182,212,0)', vx: -.0003, vy: .0005 },
      { x: .5, y: .8, r: .38, c1: 'rgba(16,185,129,.14)', c2: 'rgba(16,185,129,0)', vx: .0005, vy: -.0003 },
      { x: .85, y: .65, r: .35, c1: 'rgba(139,92,246,.15)', c2: 'rgba(139,92,246,0)', vx: -.0004, vy: -.0004 },
      { x: .15, y: .75, r: .32, c1: 'rgba(245,158,11,.12)', c2: 'rgba(245,158,11,0)', vx: .0003, vy: .0005 },
      { x: .6, y: .45, r: .3, c1: 'rgba(236,72,153,.1)', c2: 'rgba(236,72,153,0)', vx: -.0005, vy: .0003 },
    ]
    let t = 0, rafId
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const base = ctx.createLinearGradient(0, 0, W, H)
      base.addColorStop(0, '#eef2ff')
      base.addColorStop(.4, '#f0fafa')
      base.addColorStop(.7, '#faf5ff')
      base.addColorStop(1, '#ecfdf5')
      ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)
      t += .003
      blobs.forEach((b, i) => {
        b.x += b.vx * Math.sin(t + i); b.y += b.vy * Math.cos(t + i * .7)
        if (b.x < .05 || b.x > .95) b.vx *= -1
        if (b.y < .05 || b.y > .95) b.vy *= -1
        const g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r * W)
        g.addColorStop(0, b.c1); g.addColorStop(1, b.c2)
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      })
      for (let x = 0; x < W; x += 30) for (let y = 0; y < H; y += 30) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${.04 + .02 * Math.sin(t + x * .03 + y * .03)})`
        ctx.fill()
      }
      rafId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Three.js
  useEffect(() => {
    const canvas = canvas3d.current
    const root = rootRef.current
    const W = root.offsetWidth, H = root.offsetHeight
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xeef2ff, 0.04)
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100)
    camera.position.set(0, 0, 8)
    scene.add(new THREE.AmbientLight(0xffffff, 1.5))
    const pl1 = new THREE.PointLight(0x6366f1, 6, 20); pl1.position.set(-4, 3, 3); scene.add(pl1)
    const pl2 = new THREE.PointLight(0x06b6d4, 4, 18); pl2.position.set(4, -2, 2); scene.add(pl2)
    const pl3 = new THREE.PointLight(0x10b981, 3, 15); pl3.position.set(0, -4, 1); scene.add(pl3)
    const pl4 = new THREE.PointLight(0xf59e0b, 2, 12); pl4.position.set(3, 4, -1); scene.add(pl4)
    const cfgs = [
      { g: new THREE.TorusKnotGeometry(.52, .15, 100, 16), col: 0x6366f1, w: false },
      { g: new THREE.IcosahedronGeometry(.52, 1), col: 0x06b6d4, w: false },
      { g: new THREE.OctahedronGeometry(.55, 0), col: 0x10b981, w: false },
      { g: new THREE.TorusGeometry(.48, .17, 20, 50), col: 0x8b5cf6, w: false },
      { g: new THREE.DodecahedronGeometry(.48, 0), col: 0xf59e0b, w: false },
      { g: new THREE.IcosahedronGeometry(.4, 0), col: 0xec4899, w: false },
      { g: new THREE.TorusKnotGeometry(.38, .1, 80, 12), col: 0x6366f1, w: true },
      { g: new THREE.OctahedronGeometry(.62, 1), col: 0x06b6d4, w: true },
      { g: new THREE.ConeGeometry(.32, .75, 8), col: 0x10b981, w: false },
      { g: new THREE.TetrahedronGeometry(.55, 0), col: 0x8b5cf6, w: false },
      { g: new THREE.TorusGeometry(.6, .07, 12, 60), col: 0xf59e0b, w: false },
      { g: new THREE.IcosahedronGeometry(.28, 2), col: 0xec4899, w: true },
    ]
    const objs = cfgs.map((cfg, i) => {
      const mat = new THREE.MeshPhongMaterial({
        color: cfg.col, emissive: cfg.col, emissiveIntensity: cfg.w ? .2 : .06,
        wireframe: cfg.w, transparent: true, opacity: cfg.w ? .25 : .72,
        shininess: 200, specular: new THREE.Color(0xffffff),
      })
      const mesh = new THREE.Mesh(cfg.g, mat)
      const angle = (i / cfgs.length) * Math.PI * 2
      const r = 4.0 + Math.random() * 1.8
      mesh.position.set(Math.cos(angle) * r, (Math.random() - .5) * 4.5, (Math.random() - .5) * 3 - 2)
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      mesh.userData = {
        rx: (Math.random() - .5) * .013, ry: (Math.random() - .5) * .017,
        rz: (Math.random() - .5) * .009, fy: Math.random() * Math.PI * 2,
        fs: .004 + Math.random() * .004, oy: mesh.position.y,
        ox: mesh.position.x, be: cfg.w ? .2 : .06,
      }
      scene.add(mesh)
      return mesh
    })
    const pCount = 1500
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(pCount * 3)
    const pCol = new Float32Array(pCount * 3)
    const pVel = new Float32Array(pCount * 3)
    const pCols = [[.39, .4, 1], [.02, .71, .83], [.06, .73, .53], [.55, .36, .98], [.96, .62, .04], [.93, .28, .6]]
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - .5) * 22
      pPos[i * 3 + 1] = (Math.random() - .5) * 14
      pPos[i * 3 + 2] = (Math.random() - .5) * 10
      pVel[i * 3] = (Math.random() - .5) * .004
      pVel[i * 3 + 1] = (Math.random() - .5) * .003
      pVel[i * 3 + 2] = (Math.random() - .5) * .002
      const c = pCols[Math.floor(Math.random() * pCols.length)]
      pCol[i * 3] = c[0]; pCol[i * 3 + 1] = c[1]; pCol[i * 3 + 2] = c[2]
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: .06, vertexColors: true, transparent: true, opacity: .6
    }))
    scene.add(pts)
    const rings = [[0x6366f1, 2.2], [0x06b6d4, 3.4], [0x10b981, 4.6]].map(([col, r], i) => {
      const geo = new THREE.TorusGeometry(r, .02, 8, 80)
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .12 })
      const ring = new THREE.Mesh(geo, mat)
      ring.rotation.x = Math.PI / 2 + i * .3
      ring.rotation.z = i * .35
      ring.position.z = -4 - i * .4
      ring.userData = { spd: (i + 1) * .0022 }
      scene.add(ring)
      return ring
    })
    let mx = 0, my = 0, tmx = 0, tmy = 0
    const onMove = (e) => {
      const rect = root.getBoundingClientRect()
      tmx = ((e.clientX - rect.left) / rect.width - .5) * 2
      tmy = -((e.clientY - rect.top) / rect.height - .5) * 2
      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1400px) rotateY(${tmx * 6}deg) rotateX(${tmy * 4}deg) translateZ(8px)`
        cardRef.current.style.transition = 'transform 0.08s ease'
      }
    }
    const onLeave = () => {
      tmx = 0; tmy = 0
      if (cardRef.current) {
        cardRef.current.style.transform = 'perspective(1400px) rotateY(0deg) rotateX(0deg)'
        cardRef.current.style.transition = 'transform 0.7s cubic-bezier(.22,1,.36,1)'
      }
    }
    root.addEventListener('mousemove', onMove)
    root.addEventListener('mouseleave', onLeave)
    let t = 0, rafId
    const animate = () => {
      t += .008
      rafId = requestAnimationFrame(animate)
      mx += (tmx - mx) * .05; my += (tmy - my) * .05
      camera.position.x += (mx * .5 - camera.position.x) * .04
      camera.position.y += (my * .35 - camera.position.y) * .04
      camera.lookAt(0, 0, 0)
      objs.forEach((o, i) => {
        o.rotation.x += o.userData.rx; o.rotation.y += o.userData.ry; o.rotation.z += o.userData.rz
        o.userData.fy += o.userData.fs
        o.position.y = o.userData.oy + Math.sin(o.userData.fy) * .28
        o.position.x = o.userData.ox + Math.cos(o.userData.fy * .6) * .1
        o.material.emissiveIntensity = o.userData.be + Math.sin(t + i) * .015
      })
      for (let i = 0; i < pCount; i++) {
        pPos[i * 3] += pVel[i * 3]; pPos[i * 3 + 1] += pVel[i * 3 + 1]; pPos[i * 3 + 2] += pVel[i * 3 + 2]
        if (Math.abs(pPos[i * 3]) > 11) pVel[i * 3] *= -1
        if (Math.abs(pPos[i * 3 + 1]) > 7) pVel[i * 3 + 1] *= -1
        if (Math.abs(pPos[i * 3 + 2]) > 5) pVel[i * 3 + 2] *= -1
      }
      pGeo.attributes.position.needsUpdate = true
      pts.rotation.y += .0006
      pl1.intensity = 6 + Math.sin(t * 1.3) * 1.5
      pl2.intensity = 4 + Math.cos(t * .9) * .8
      rings.forEach(r => { r.rotation.z += r.userData.spd; r.rotation.x += r.userData.spd * .3 })
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(rafId)
      root.removeEventListener('mousemove', onMove)
      root.removeEventListener('mouseleave', onLeave)
      renderer.dispose()
    }
  }, [])

  const s = styles
  return (
    <div ref={rootRef} style={s.root}>
      <canvas ref={canvasBg} style={s.bgCanvas} />
      <canvas ref={canvas3d} style={s.canvas3d} />

      {[
        { icon: '✓', bg: 'linear-gradient(135deg,#00c8ff,#0088ff)', title: 'Shift Ready', sub: 'Morning & Night', delay: '0s' },
        { icon: '⬡', bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', title: 'V.S. Industry', sub: 'MES Office', delay: '1.5s' },
        { icon: '●', bg: 'linear-gradient(135deg,#10b981,#059669)', title: 'Station Tracking', sub: 'Live system', delay: '3s' },
      ].map((tag, i) => (
        <div key={i} style={{ ...s.ftag, ...[s.ftag1, s.ftag2, s.ftag3][i], animationDelay: tag.delay }}>
          <div style={{ ...s.ftagIcon, background: tag.bg }}>{tag.icon}</div>
          <div><div style={s.ftagTitle}>{tag.title}</div><div style={s.ftagSub}>{tag.sub}</div></div>
        </div>
      ))}

      <div style={s.cardWrap}>
        <div ref={cardRef} style={s.card}>

          {/* LEFT */}
          <div style={s.lp}>
            <div style={s.brand}>
              <div style={s.bdot} />
              <span style={s.btxt}>V.S. Industry Berhad · MES Office</span>
            </div>
            <div style={s.chip}>
              <div style={s.chipDot} />
              <span style={s.chipTxt}>Station Registration System v2.0</span>
            </div>
            <div style={s.heroH}>
              <span style={{ display: 'block' }}>Control your</span>
              <span style={s.heroGrad}>factory floor.</span>
            </div>
            <p style={s.heroP}>
              Scan your employee badge or enter credentials manually to access the system.
            </p>
            <div style={s.stats}>
              <div style={s.stt}><div style={{ ...s.sv, color: '#6366f1' }}>{count1}</div><div style={s.sl}>Stations</div></div>
              <div style={s.sdiv} />
              <div style={s.stt}><div style={{ ...s.sv, color: '#06b6d4' }}>{count2}</div><div style={s.sl}>Projects</div></div>
              <div style={s.sdiv} />
              <div style={s.stt}><div style={{ ...s.sv, color: '#10b981' }}>2</div><div style={s.sl}>Shifts</div></div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={s.rp}>
            <div style={s.fh}>Welcome back</div>
            <div style={s.fs}>Scan badge or enter credentials manually</div>

            {/* Employee ID — uncontrolled input, scanner uses onKeyUp */}
            <div style={{ marginBottom: 16 }}>
              <div style={s.lbl}>Employee ID</div>
             <input
  ref={empIdRef}
  style={s.inp}
  placeholder="Click here then scan badge, or type ID"
  defaultValue=""
  onKeyUp={handleEmpIdKeyUp}
  autoFocus
  autoComplete="off"
/>
            </div>

            {/* PIN */}
            <div style={{ marginBottom: 16 }}>
              <div style={s.lbl}>PIN</div>
              <input
                ref={pinRef}
                style={s.inp}
                type="password"
                placeholder="Enter PIN or auto-filled by scan"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualLogin() }}
                autoComplete="off"
              />
            </div>

            {/* Hint */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
              background: 'rgba(99,102,241,.04)', border: '1.5px solid rgba(99,102,241,.1)',
              borderRadius: 12, marginBottom: 16,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📷</span>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
                <strong>Scan:</strong> Click Employee ID field → scan badge → auto login!<br />
                <strong>Manual:</strong> Type Employee ID → Tab → type PIN → Enter
              </div>
            </div>

            <button
              onClick={handleManualLogin}
              disabled={loading}
              style={{ ...s.sbtn, opacity: loading ? .7 : 1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'Verifying...' : 'Sign In →'}
            </button>
            <div style={s.foot}>Scan badge to auto-login · Secure · Role-based · Shift-aware</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: { width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif", background: '#f0f4ff' },
  bgCanvas: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  canvas3d: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  ftag: { position: 'absolute', background: 'rgba(255,255,255,.8)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(255,255,255,.9)', borderRadius: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,.08)', animation: 'tagfloat 4s ease-in-out infinite' },
  ftag1: { top: '9%', left: '4%' },
  ftag2: { top: '26%', right: '3%' },
  ftag3: { bottom: '14%', left: '6%' },
  ftagIcon: { width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 },
  ftagTitle: { fontSize: 10, fontWeight: 700, color: '#1e293b' },
  ftagSub: { fontSize: 8, color: '#64748b', marginTop: 1 },
  cardWrap: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { width: 820, maxWidth: '96%', borderRadius: 28, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(40px)', border: '1.5px solid rgba(255,255,255,.9)', boxShadow: '0 32px 80px rgba(99,102,241,.15),0 8px 32px rgba(0,0,0,.08)', display: 'flex', overflow: 'hidden' },
  lp: { flex: 1.3, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(0,0,0,.06)', position: 'relative' },
  brand: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20 },
  bdot: { width: 9, height: 9, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 12px rgba(99,102,241,.5)' },
  btxt: { fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6366f1' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08))', border: '1.5px solid rgba(99,102,241,.2)', borderRadius: 30, padding: '6px 16px', marginBottom: 18, width: 'fit-content' },
  chipDot: { width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,.6)' },
  chipTxt: { fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6366f1' },
  heroH: { fontSize: 42, fontWeight: 900, lineHeight: 1.05, marginBottom: 12, color: '#0f172a', letterSpacing: '-.02em' },
  heroGrad: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  heroP: { fontSize: 12, color: '#475569', lineHeight: 1.85, maxWidth: 270, marginBottom: 26 },
  stats: { display: 'flex', gap: 20 },
  stt: { textAlign: 'center' },
  sv: { fontSize: 22, fontWeight: 800, fontFamily: "'Space Mono', monospace" },
  sl: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.12em', marginTop: 2 },
  sdiv: { width: 1, background: 'rgba(0,0,0,.08)' },
  rp: { flex: 1, padding: '48px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  fh: { fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  fs: { fontSize: 12, color: '#64748b', marginBottom: 24 },
  lbl: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', marginBottom: 6 },
  inp: { width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,.03)', border: '1.5px solid rgba(0,0,0,.08)', borderRadius: 13, color: '#0f172a', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', transition: 'all .2s' },
  sbtn: { width: '100%', padding: 14, border: 'none', borderRadius: 14, color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", cursor: 'pointer', marginTop: 4, background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', boxShadow: '0 6px 28px rgba(99,102,241,.35)', transition: 'all .3s' },
  foot: { fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 12, letterSpacing: '.08em', textTransform: 'uppercase' },
}