import React, { useState, useRef, useEffect } from 'react'
import { useProject } from './state/ProjectContext.jsx'
import { useController } from './physics/hooks.js'
import { controller } from './physics/controller.js'
import { useI18n } from './i18n/I18nContext.jsx'
import RegionSelectionView from './views/RegionSelectionView.jsx'
import SimulationParameterView from './views/SimulationParameterView.jsx'
import ParticleSettingsView from './views/ParticleSettingsView.jsx'
import SimulationRendererView from './views/SimulationRendererView.jsx'
import AnalysisView from './views/AnalysisView.jsx'
import CollectorPlacementView from './views/CollectorPlacementView.jsx'
import OnboardingTour from './components/OnboardingTour.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import './styles/app.css'

const ONBOARDING_KEY = 'hydrosynthetica.hasSeenOnboarding'

function useSections(t) {
  return [
    { group: t('nav.groupRegion'), items: [{ id: 'region', label: t('nav.region'), icon: IconMap }] },
    {
      group: t('nav.groupSetup'),
      items: [
        { id: 'parameters', label: t('nav.parameters'), icon: IconSliders },
        { id: 'particles', label: t('nav.particles'), icon: IconGrid },
      ],
    },
    { group: t('nav.groupRun'), items: [{ id: 'simulation', label: t('nav.simulation'), icon: IconPlay }] },
    { group: t('nav.groupAnalysis'), items: [{ id: 'analysis', label: t('nav.analysis'), icon: IconChart }] },
    { group: t('nav.groupDeploy'), items: [{ id: 'collector', label: t('nav.collector'), icon: IconCollector }] },
  ]
}

export default function App() {
  const { t } = useI18n()
  const [section, setSection] = useState('region')
  const { project, updateProject, isDirty, saveToFile, loadFromFile, resetProject } = useProject()
  const ctrl = useController()
  const fileInputRef = useRef(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setShowOnboarding(true)
        localStorage.setItem(ONBOARDING_KEY, '1')
      }
    } catch (e) {
      /* ignore */
    }
  }, [])

  const SECTIONS = useSections(t)

  const handleReset = () => {
    controller.stop()
    if (confirm(t('toolbar.resetConfirm'))) {
      resetProject()
    }
  }

  const handleOpen = (e) => {
    const file = e.target.files?.[0]
    if (file) loadFromFile(file)
    e.target.value = ''
  }

  const handleClearData = () => {
    if (confirm(t('toolbar.resetConfirm'))) {
      controller.stop()
      resetProject()
      setShowSettings(false)
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="https://hydrosynthetica.app/image_0.png" alt="" className="brand-mark" />
        <div className="brand-title">{t('appName')}</div>
    </div>

        <nav className="nav">
          {SECTIONS.map((g) => (
            <div key={g.group} className="nav-group">
              <div className="nav-group-label">{g.group}</div>
              {g.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${section === item.id ? 'active' : ''}`}
                  onClick={() => setSection(item.id)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button className="nav-item settings-nav-item" onClick={() => setShowSettings(true)}>
          <IconGear />
          <span>{t('toolbar.settings')}</span>
        </button>

        <div className="sidebar-foot mono">
          {ctrl.isRunning ? <span className="status-dot running" /> : <span className="status-dot idle" />}
          {ctrl.isRunning ? t('status.running') : t('status.idle')}
        </div>
      </aside>

      <div className="main">
        <header className="toolbar">
          <div className="toolbar-title">
            {SECTIONS.flatMap((g) => g.items).find((i) => i.id === section)?.label}
            {isDirty && <span className="dirty-dot" title="Unsaved changes" />}
          </div>
          <div className="toolbar-actions">
            <button className="btn" onClick={handleReset} title={t('toolbar.reset')}>
              <IconReset /> {t('toolbar.reset')}
            </button>
            <button
              className="btn"
              onClick={() => (ctrl.isRunning ? controller.stop() : controller.start(project))}
              title={ctrl.isRunning ? t('toolbar.pause') : t('toolbar.run')}
            >
              {ctrl.isRunning ? <IconPause /> : <IconPlay />} {ctrl.isRunning ? t('toolbar.pause') : t('toolbar.run')}
            </button>
            <div className="btn-divider" />
            <button className="btn" onClick={() => fileInputRef.current?.click()} title={t('toolbar.open')}>
              <IconFolder /> {t('toolbar.open')}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleOpen} />
            <button className="btn btn-accent" onClick={saveToFile} title={t('toolbar.save')}>
              <IconSave /> {t('toolbar.save')}
            </button>
          </div>
        </header>

        <main className="content">
          {section === 'region' && <RegionSelectionView project={project} updateProject={updateProject} />}
          {section === 'parameters' && <SimulationParameterView project={project} updateProject={updateProject} />}
          {section === 'particles' && <ParticleSettingsView project={project} updateProject={updateProject} />}
          {section === 'simulation' && <SimulationRendererView project={project} />}
          {section === 'analysis' && <AnalysisView project={project} />}
          {section === 'collector' && <CollectorPlacementView project={project} />}
        </main>
      </div>

      {showOnboarding && <OnboardingTour onDismiss={() => setShowOnboarding(false)} />}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onReplayTour={() => {
            setShowSettings(false)
            setShowOnboarding(true)
          }}
          onClearData={handleClearData}
        />
      )}
    </div>
  )
}

// --- Minimal inline icon set (no external icon dependency) ---
function IconMap() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 3v16M15 5v16" />
    </svg>
  )
}
function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M21 18h-1" strokeLinecap="round" />
      <circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M8 5v14l11-7Z" />
    </svg>
  )
}
function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M7 15l3.5-4L14 14l4-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconCollector() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3c2.5 1.5 2.5 3.5 0 5s-2.5 3.5 0 5 2.5 3.5 0 5" strokeLinecap="round" />
      <circle cx="12" cy="3" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 18v3" strokeLinecap="round" />
    </svg>
  )
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a8 8 0 0 0-1.7-1L14.8 3h-4l-.5 2.9a8 8 0 0 0-1.7 1l-2.5-1-2 3.5L6.2 11a7.97 7.97 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a8 8 0 0 0 1.7 1l.5 2.9h4l.5-2.9a8 8 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.6Z" strokeLinejoin="round" />
    </svg>
  )
}
function IconReset() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 1 3 6.7" strokeLinecap="round" />
      <path d="M3 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" strokeLinejoin="round" />
    </svg>
  )
}
function IconSave() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 4h11l3 3v13H5V4Z" strokeLinejoin="round" />
      <path d="M8 4v5h7V4M8 14h8v6H8v-6Z" strokeLinejoin="round" />
    </svg>
  )
}
