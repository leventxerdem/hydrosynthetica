import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useDataStore } from '../physics/hooks.js'
import { useController } from '../physics/hooks.js'
import { controller } from '../physics/controller.js'
import { computeAccumulationGrid } from '../physics/accumulationGrid.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import '../styles/analysis.css'

function MetricCard({ title, value, accent }) {
  return (
    <div className="metric-card">
      <div className="metric-value mono" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="metric-title">{title}</div>
    </div>
  )
}

function AccumulationChart({ history, t }) {
  if (!history.length) return <ChartPlaceholder text={t('analysis.runToGather')} />

  const W = 640, H = 220, PAD = 32
  const maxT = history[history.length - 1].time || 1
  const maxCount = Math.max(1, ...history.map((h) => h.stuckCount))

  const x = (time) => PAD + (time / maxT) * (W - PAD * 2)
  const y = (c) => H - PAD - (c / maxCount) * (H - PAD * 2)

  const linePath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${x(h.time)} ${y(h.stuckCount)}`).join(' ')
  const areaPath = `${linePath} L ${x(history[history.length - 1].time)} ${H - PAD} L ${x(0)} ${H - PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      <defs>
        <linearGradient id="accumFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2933f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e2933f" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#21344c" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#21344c" />
      <path d={areaPath} fill="url(#accumFill)" />
      <path d={linePath} fill="none" stroke="#e2933f" strokeWidth="2" />
      <text x={PAD} y={H - 8} fill="#6d8099" fontSize="10">0s</text>
      <text x={W - PAD} y={H - 8} fill="#6d8099" fontSize="10" textAnchor="end">
        {Math.round(maxT)}s
      </text>
      <text x={PAD - 6} y={PAD} fill="#6d8099" fontSize="10" textAnchor="end">
        {maxCount}
      </text>
    </svg>
  )
}

function SpeedHistogram({ buckets, t }) {
  if (!buckets.length) return <ChartPlaceholder text={t('analysis.noData')} />

  const W = 640, H = 220, PAD = 32
  const maxCount = Math.max(1, ...buckets.map((b) => b.count))
  const barW = (W - PAD * 2) / buckets.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#21344c" />
      {buckets.map((b, i) => {
        const barH = (b.count / maxCount) * (H - PAD * 2)
        const x = PAD + i * barW + 3
        const y = H - PAD - barH
        return (
          <g key={b.range}>
            <rect x={x} y={y} width={barW - 6} height={barH} fill="#35d6c4" opacity={0.85} rx="2" />
            <text x={x + (barW - 6) / 2} y={H - PAD + 14} fill="#6d8099" fontSize="9" textAnchor="middle">
              {b.range}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ChartPlaceholder({ text }) {
  return <div className="chart-placeholder">{text}</div>
}

function HeatMapCanvas({ grid, region }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    if (!grid || !region?.waterVerticesSim?.length) return

    const { bounds } = grid
    const bw = Math.max(1, bounds.maxX - bounds.minX)
    const bh = Math.max(1, bounds.maxY - bounds.minY)
    const fit = Math.min(w / bw, h / bh)
    const offX = (w - bw * fit) / 2
    const offY = (h - bh * fit) / 2

    const toScreen = (p) => ({ x: (p.x - bounds.minX) * fit + offX, y: (p.y - bounds.minY) * fit + offY })

    // Water outline for context
    ctx.beginPath()
    const verts = region.waterVerticesSim
    const first = toScreen(verts[0])
    ctx.moveTo(first.x, first.y)
    for (const v of verts.slice(1)) {
      const s = toScreen(v)
      ctx.lineTo(s.x, s.y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(53,150,214,0.06)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(53,150,214,0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.save()
    ctx.clip()

    // Density cells
    const cellScreenSize = grid.cellPx * fit
    for (let cy = 0; cy < grid.rows; cy++) {
      for (let cx = 0; cx < grid.cols; cx++) {
        const count = grid.counts[cy * grid.cols + cx]
        if (count <= 0) continue
        const t = Math.min(1, count / Math.max(1, grid.maxCount))
        const x = bounds.minX + cx * grid.cellPx
        const y = bounds.minY + cy * grid.cellPx
        const s = toScreen({ x, y })
        const alpha = 0.15 + t * 0.75
        const hue = 45 - t * 45 // amber (low) -> red (high), matches accumulation-danger palette
        ctx.fillStyle = `hsla(${hue}, 85%, ${58 - t * 12}%, ${alpha})`
        ctx.fillRect(s.x, s.y, cellScreenSize + 0.5, cellScreenSize + 0.5)
      }
    }
    ctx.restore()
  }, [grid, region])

  return <canvas ref={canvasRef} className="heatmap-canvas" />
}

export default function AnalysisView({ project }) {
  const { t } = useI18n()
  const dataStore = useDataStore()
  const ctrl = useController()
  const [grid, setGrid] = useState(null)

  const recompute = useCallback(() => {
    if (!project.region) return
    setGrid(computeAccumulationGrid(controller.displayParticles, project.region))
  }, [project.region])

  useEffect(() => {
    recompute()
  }, [recompute])

  useEffect(() => {
    if (!ctrl.isRunning) return
    const interval = setInterval(recompute, 1000)
    return () => clearInterval(interval)
  }, [ctrl.isRunning, recompute])

  const exportCSV = () => {
    const csv = dataStore.generateCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'SimulationData.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="view-pad analysis-pad">
      <div className="analysis-export">
        <button className="btn" onClick={exportCSV}>
          ⬆ {t('analysis.exportCsv')}
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard title={t('analysis.totalParticles')} value={dataStore.totalParticles} />
        <MetricCard title={t('analysis.accumulated')} value={dataStore.stuckParticles} accent="#e2933f" />
        <MetricCard title={t('analysis.activeFlow')} value={dataStore.activeParticles} accent="#35d6c4" />
        <MetricCard title={t('analysis.avgSpeed')} value={`${dataStore.activeAverageSpeed.toFixed(1)} px/s`} />
        <MetricCard title={t('analysis.maxSpeed')} value={`${dataStore.maxSpeed.toFixed(1)} px/s`} accent="#e2593f" />
      </div>

      <div className="panel">
        <div className="panel-title">{t('analysis.accumulationTimeline')}</div>
        <div className="chart-wrap">
          <AccumulationChart history={dataStore.history} t={t} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{t('analysis.velocityDistribution')}</div>
        <div className="chart-wrap">
          <SpeedHistogram buckets={dataStore.speedBuckets} t={t} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{t('analysis.heatMap')}</div>
        <div className="heatmap-body">
          <p className="heatmap-sub">{t('analysis.heatMapSub')}</p>

          {!project.region ? (
            <ChartPlaceholder text={t('collector.noRegion')} />
          ) : !grid || grid.totalAccumulated === 0 ? (
            <ChartPlaceholder text={t('analysis.runToGather')} />
          ) : (
            <>
              <div className="heatmap-canvas-wrap">
                <HeatMapCanvas grid={grid} region={project.region} />
              </div>
              <div className="heatmap-stats">
                <div>
                  <span className="stat-label">{t('analysis.cellSize')}</span>{' '}
                  <span className="mono">{grid.cellMeters} m</span>
                </div>
                <div>
                  <span className="stat-label">{t('analysis.peakDensity')}</span>{' '}
                  <span className="mono">
                    {grid.maxCount} {t('analysis.particlesPerCell')}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="heatmap-actions">
            <button className="btn" onClick={recompute}>
              {t('analysis.recompute')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
