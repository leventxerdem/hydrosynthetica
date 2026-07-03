import React from 'react'
import { DURATION_OPTIONS } from '../state/defaults.js'
import '../styles/forms.css'

function Slider({ label, value, unit, decimals = 1, min, max, step, onChange, help }) {
  return (
    <div className="field-row">
      <div>
        <div className="field-label">{label}</div>
        <div className="field-value mono">
          {value.toFixed(decimals)} {unit}
        </div>
      </div>
      <div className="field-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          title={help}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  )
}

export default function SimulationParameterView({ project, updateProject }) {
  const params = project.parameters
  const set = (key) => (val) =>
    updateProject((p) => ({ ...p, parameters: { ...p.parameters, [key]: val } }))

  return (
    <div className="view-pad">
      <div className="view-head">
        <h1>Physical Parameters</h1>
        <p>Configure fluid dynamics and environmental variables.</p>
      </div>

      <div className="panel">
        <div className="panel-title">Experiment Duration</div>
        <div className="field-row">
          <div className="field-label">Run Simulation For</div>
          <select
            value={params.simulationDuration}
            onChange={(e) => set('simulationDuration')(parseFloat(e.target.value))}
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Environment</div>
        <Slider
          label="Water Depth"
          unit="m"
          value={params.waterDepth}
          min={2}
          max={50}
          step={1}
          onChange={set('waterDepth')}
          help="Total depth of the water column."
        />
        <Slider
          label="Wind Speed"
          unit="m/s"
          value={params.windSpeed}
          min={0}
          max={20}
          step={0.5}
          onChange={set('windSpeed')}
          help="Surface wind speed affecting shallow particles."
        />
        <Slider
          label="Wind Direction"
          unit="°"
          decimals={0}
          value={params.windDirection}
          min={0}
          max={360}
          step={1}
          onChange={set('windDirection')}
        />
      </div>

      <div className="panel">
        <div className="panel-title">Flow Field</div>
        <Slider
          label="Mean Flow Speed"
          unit="m/s"
          decimals={2}
          value={params.flowSpeed}
          min={0.1}
          max={2}
          step={0.05}
          onChange={set('flowSpeed')}
        />
        <div className="field-row">
          <div>
            <div className="field-label">Turbulence Intensity</div>
            <div className="field-value mono">{Math.round(params.turbulence * 100)}%</div>
          </div>
          <div className="field-control">
            <input
              type="range"
              min={0}
              max={10}
              step={0.05}
              value={params.turbulence}
              onChange={(e) => set('turbulence')(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Medium Properties</div>
        <Slider
          label="Relative Viscosity"
          unit="× water"
          decimals={2}
          value={params.viscosity}
          min={0.5}
          max={2}
          step={0.05}
          onChange={set('viscosity')}
        />
        <Slider
          label="Gravity Scale"
          unit="× g"
          decimals={2}
          value={params.gravityScale}
          min={0.5}
          max={1.5}
          step={0.05}
          onChange={set('gravityScale')}
        />
      </div>
    </div>
  )
}
