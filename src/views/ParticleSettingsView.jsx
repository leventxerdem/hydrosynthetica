import React from 'react'
import '../styles/forms.css'

const COLOR_MODES = ['Uniform', 'By Speed', 'By Depth']

export default function ParticleSettingsView({ project, updateProject }) {
  const settings = project.particleSettings
  const set = (key) => (val) =>
    updateProject((p) => ({ ...p, particleSettings: { ...p.particleSettings, [key]: val } }))

  return (
    <div className="view-pad">
      <div className="view-head">
        <h1>Particle Settings</h1>
        <p>Define particle characteristics for the Stokes-based microplastic simulation.</p>
      </div>

      <div className="panel">
        <div className="panel-title">Particle Size</div>
        <div className="field-row">
          <div>
            <div className="field-label">Diameter</div>
            <div className="field-value mono">{settings.diameterMM.toFixed(2)} mm</div>
          </div>
          <div className="field-control">
            <input
              type="range"
              min={0.1}
              max={5.0}
              step={0.1}
              value={settings.diameterMM}
              onChange={(e) => set('diameterMM')(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Density / Polymer Type</div>
        <div className="field-row">
          <div>
            <div className="field-label">Relative Density</div>
            <div className="field-value mono">{settings.density.toFixed(2)} g/cm³</div>
          </div>
          <div className="field-control">
            <input
              type="range"
              min={0.5}
              max={1.4}
              step={0.05}
              value={settings.density}
              onChange={(e) => set('density')(parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field-label">Color Mode</div>
          <div className="segmented">
            {COLOR_MODES.map((label, i) => (
              <button
                key={label}
                className={settings.colorMode === i ? 'active' : ''}
                onClick={() => set('colorMode')(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Particle Count</div>
        <div className="field-row">
          <div className="field-label">Count: {settings.count}</div>
          <div className="stepper">
            <button onClick={() => set('count')(Math.max(500, settings.count - 500))}>−</button>
            <span className="mono">{settings.count}</span>
            <button onClick={() => set('count')(Math.min(20000, settings.count + 500))}>+</button>
          </div>
        </div>
      </div>
    </div>
  )
}
