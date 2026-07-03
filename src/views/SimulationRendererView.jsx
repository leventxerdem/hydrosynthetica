import React, { useEffect, useRef, useState } from 'react'
import { controller } from '../physics/controller.js'
import { useController } from '../physics/hooks.js'
import '../styles/renderer.css'

const SIM_W = 800
const SIM_H = 600
const SPEED_OPTIONS = [1, 10, 60, 300]

function speedColor(depthRatio) {
  // Bright cyan at surface -> deep ink blue at max depth (mirrors the Swift HSB ramp)
  const h = 190, s = 70
  const l = 55 - depthRatio * 34
  return `hsl(${h} ${s}% ${l}%)`
}

export default function SimulationRendererView({ project }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const rafRef = useRef(null)
  const ctrl = useController()

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragState = useRef(null)
  const [showVectors, setShowVectors] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function draw() {
      const wrap = wrapRef.current
      if (!wrap) return
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = w + 'px'
        canvas.style.height = h + 'px'
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#0b131f'
      ctx.fillRect(0, 0, w, h)

      // fit sim space (800x600) into the canvas, then apply user zoom/pan
      const fit = Math.min(w / SIM_W, h / SIM_H)
      const scale = fit * zoom
      const baseOffsetX = (w - SIM_W * scale) / 2
      const baseOffsetY = (h - SIM_H * scale) / 2

      const toScreen = (p) => ({
        x: p.x * scale + baseOffsetX + offset.x,
        y: p.y * scale + baseOffsetY + offset.y,
      })

      const region = project.region
      if (region?.waterVerticesSim?.length) {
        const verts = region.waterVerticesSim
        ctx.beginPath()
        const first = toScreen(verts[0])
        ctx.moveTo(first.x, first.y)
        for (const v of verts.slice(1)) {
          const s = toScreen(v)
          ctx.lineTo(s.x, s.y)
        }
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, baseOffsetY, 0, baseOffsetY + SIM_H * scale)
        grad.addColorStop(0, 'rgba(53,150,214,0.35)')
        grad.addColorStop(1, 'rgba(53,214,196,0.15)')
        ctx.fillStyle = grad
        ctx.fill()
        ctx.strokeStyle = 'rgba(53,150,214,0.85)'
        ctx.lineWidth = 2 * scale * 0.02 + 1.4
        ctx.stroke()
      }

      const particles = controller.displayParticles
      const maxDepth = project.parameters?.waterDepth ?? 10
      const colorMode = project.particleSettings?.colorMode ?? 0
      const particleSize = Math.max(1.4, 3 * scale * 0.02 + 1.2)

      for (const p of particles) {
        if (!p.isActive) continue
        const s = toScreen(p.position)

        let color
        if (p.isStuck) {
          color = '#e2933f'
        } else if (colorMode === 0) {
          color = p.isSedimented ? '#3a4f68' : '#35d6c4'
        } else if (colorMode === 1) {
          const t = Math.min(1, p.speed / 40)
          color = `hsl(${190 - t * 150} 75% ${58 - t * 10}%)`
        } else {
          const depthRatio = Math.min(1, Math.max(0, p.z / maxDepth))
          color = p.isSedimented ? 'hsl(216 70% 14%)' : speedColor(depthRatio)
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(s.x, s.y, particleSize / 2, 0, Math.PI * 2)
        ctx.fill()

        if (showVectors && !p.isStuck && !p.isSedimented) {
          const vMag = Math.hypot(p.velocity.x, p.velocity.y)
          if (vMag > 0.1) {
            const tip = toScreen({ x: p.position.x + p.velocity.x, y: p.position.y + p.velocity.y })
            ctx.strokeStyle = 'rgba(255, 214, 92, 0.8)'
            ctx.lineWidth = 1.4
            ctx.beginPath()
            ctx.moveTo(s.x, s.y)
            ctx.lineTo(tip.x, tip.y)
            ctx.stroke()
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, zoom, offset, showVectors])

  const onPointerDown = (e) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset }
  }
  const onPointerMove = (e) => {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    setOffset({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy })
  }
  const onPointerUp = () => {
    dragState.current = null
  }

  const formatTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  }

  const canRun = !!(project.region?.waterVerticesSim?.length && project.parameters)

  return (
    <div className="renderer-view">
      <div className="renderer-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {ctrl.isRunning && (
          <div className="renderer-clock mono">⏱ {formatTime(ctrl.currentTime)}</div>
        )}
        {!canRun && (
          <div className="renderer-empty">
            Define a water region (≥3 vertices) before running the simulation.
          </div>
        )}
      </div>

      <div className="renderer-controls">
        <button
          className="icon-btn"
          disabled={!canRun}
          onClick={() => (ctrl.isRunning ? controller.stop() : controller.start(project))}
        >
          {ctrl.isRunning ? '❚❚' : '▶'}
        </button>

        <div className="btn-divider" />

        <div className="segmented">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              className={ctrl.speedMultiplier === s ? 'active' : ''}
              onClick={() => controller.setSpeedMultiplier(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="zoom-control">
          <span>−</span>
          <input
            type="range"
            min={0.2}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <span>+</span>
        </div>

        <div className="spacer" />

        <label className="toggle-label">
          <input type="checkbox" checked={showVectors} onChange={(e) => setShowVectors(e.target.checked)} />
          Vectors
        </label>
      </div>
    </div>
  )
}
