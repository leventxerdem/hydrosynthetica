import React from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { POLYMER_PRESETS } from '../state/polymers.js'
import '../styles/forms.css'

export default function ParticleSettingsView({ project, updateProject }) {
  const { t } = useI18n()
  const settings = project.particleSettings
  const set = (key) => (val) =>
    updateProject((p) => ({ ...p, particleSettings: { ...p.particleSettings, [key]: val } }))

  const colorModes = [t('particles.colorUniform'), t('particles.colorSpeed'), t('particles.colorDepth')]
  const activePolymer = POLYMER_PRESETS.find((poly) => Math.abs(poly.density - settings.density) < 0.005)

  return (
    <div className="view-pad">
      <div className="view-head">
        <h1>{t('particles.title')}</h1>
        <p>{t('particles.subtitle')}</p>
      </div>

      <div className="panel">
        <div className="panel-title">{t('particles.size')}</div>
        <div className="field-row">
          <div>
            <div className="field-label">{t('particles.diameter')}</div>
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
        <div className="panel-title">{t('particles.densitySection')}</div>

        <div className="field-row polymer-row">
          <div className="field-label">{t('particles.polymerPresets')}</div>
          <div className="polymer-chips">
            {POLYMER_PRESETS.map((poly) => (
              <button
                key={poly.id}
                className={`polymer-chip ${activePolymer?.id === poly.id ? 'active' : ''} ${poly.note}`}
                onClick={() => set('density')(poly.density)}
                title={`${poly.density.toFixed(2)} g/cm³ — ${poly.note}`}
              >
                {poly.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div>
            <div className="field-label">{t('particles.density')}</div>
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
          <div className="field-label">{t('particles.colorMode')}</div>
          <div className="segmented">
            {colorModes.map((label, i) => (
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
        <div className="panel-title">{t('particles.countSection')}</div>
        <div className="field-row">
          <div className="field-label">
            {t('particles.count')}: {settings.count}
          </div>
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
