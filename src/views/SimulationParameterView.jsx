import React from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
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
  const { t } = useI18n()
  const params = project.parameters
  const set = (key) => (val) =>
    updateProject((p) => ({ ...p, parameters: { ...p.parameters, [key]: val } }))

  const durationOptions = [
    { label: t('params.duration1h'), value: 3600 },
    { label: t('params.duration6h'), value: 21600 },
    { label: t('params.duration12h'), value: 43200 },
    { label: t('params.duration24h'), value: 86400 },
    { label: t('params.duration1w'), value: 604800 },
  ]

  return (
    <div className="view-pad">
      <div className="view-head">
        <h1>{t('params.title')}</h1>
        <p>{t('params.subtitle')}</p>
      </div>

      <div className="panel">
        <div className="panel-title">{t('params.duration')}</div>
        <div className="field-row">
          <div className="field-label">{t('params.runFor')}</div>
          <select
            value={params.simulationDuration}
            onChange={(e) => set('simulationDuration')(parseFloat(e.target.value))}
          >
            {durationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{t('params.environment')}</div>
        <Slider
          label={t('params.waterDepth')}
          unit="m"
          value={params.waterDepth}
          min={2}
          max={50}
          step={1}
          onChange={set('waterDepth')}
          help={t('params.waterDepthHelp')}
        />
        <Slider
          label={t('params.windSpeed')}
          unit="m/s"
          value={params.windSpeed}
          min={0}
          max={20}
          step={0.5}
          onChange={set('windSpeed')}
          help={t('params.windSpeedHelp')}
        />
        <Slider
          label={t('params.windDirection')}
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
        <div className="panel-title">{t('params.flowField')}</div>
        <Slider
          label={t('params.meanFlowSpeed')}
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
            <div className="field-label">{t('params.turbulence')}</div>
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
        <div className="panel-title">{t('params.mediumProperties')}</div>
        <Slider
          label={t('params.viscosity')}
          unit="× water"
          decimals={2}
          value={params.viscosity}
          min={0.5}
          max={2}
          step={0.05}
          onChange={set('viscosity')}
        />
        <Slider
          label={t('params.gravity')}
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
