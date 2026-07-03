import React from 'react'
import { useDataStore } from '../physics/hooks.js'
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

function AccumulationChart({ history }) {
  if (!history.length) return <ChartPlaceholder text="Run simulation to gather data" />

  const W = 640, H = 220, PAD = 32
  const maxT = history[history.length - 1].time || 1
  const maxCount = Math.max(1, ...history.map((h) => h.stuckCount))

  const x = (t) => PAD + (t / maxT) * (W - PAD * 2)
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

function SpeedHistogram({ buckets }) {
  if (!buckets.length) return <ChartPlaceholder text="No data" />

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

export default function AnalysisView() {
  const dataStore = useDataStore()

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
          ⬆ Export CSV
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard title="Total Particles" value={dataStore.totalParticles} />
        <MetricCard title="Accumulated" value={dataStore.stuckParticles} accent="#e2933f" />
        <MetricCard title="Active Flow" value={dataStore.activeParticles} accent="#35d6c4" />
        <MetricCard title="Avg Speed (Active)" value={`${dataStore.activeAverageSpeed.toFixed(1)} px/s`} />
        <MetricCard title="Max Speed" value={`${dataStore.maxSpeed.toFixed(1)} px/s`} accent="#e2593f" />
      </div>

      <div className="panel">
        <div className="panel-title">Accumulation Timeline</div>
        <div className="chart-wrap">
          <AccumulationChart history={dataStore.history} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Velocity Distribution</div>
        <div className="chart-wrap">
          <SpeedHistogram buckets={dataStore.speedBuckets} />
        </div>
      </div>
    </div>
  )
}
