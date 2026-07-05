import React from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import '../styles/settings.css'

export default function SettingsModal({ onClose, onReplayTour, onClearData }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div className="onboarding-scrim" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>{t('settings.title')}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-label">{t('settings.language')}</div>
          <div className="segmented">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              English
            </button>
            <button className={lang === 'tr' ? 'active' : ''} onClick={() => setLang('tr')}>
              Türkçe
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-label">{t('settings.showTour')}</div>
          <button className="btn" onClick={onReplayTour}>
            {t('settings.showTourBtn')}
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t('settings.dataSection')}</div>
            <div className="settings-row-sub">{t('settings.clearProject')}</div>
          </div>
          <button className="btn" onClick={onClearData}>
            {t('settings.clearProjectBtn')}
          </button>
        </div>

        <button className="btn settings-close" onClick={onClose}>
          {t('settings.close')}
        </button>
      </div>
    </div>
  )
}
