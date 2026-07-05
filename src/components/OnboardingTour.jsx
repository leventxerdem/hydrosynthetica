import React from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import '../styles/onboarding.css'

const ICONS = ['🗺️', '🎛️', '▶️', '🌀']

export default function OnboardingTour({ onDismiss }) {
  const { t } = useI18n()
  const steps = [
    { icon: ICONS[0], title: t('onboarding.step1Title'), body: t('onboarding.step1Body') },
    { icon: ICONS[1], title: t('onboarding.step2Title'), body: t('onboarding.step2Body') },
    { icon: ICONS[2], title: t('onboarding.step3Title'), body: t('onboarding.step3Body') },
    { icon: ICONS[3], title: t('onboarding.step4Title'), body: t('onboarding.step4Body') },
  ]

  return (
    <div className="onboarding-scrim" onClick={onDismiss}>
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-wave" aria-hidden="true">
          👋
        </div>
        <h2>{t('onboarding.welcome')}</h2>

        <div className="onboarding-steps">
          {steps.map((s) => (
            <div className="onboarding-step" key={s.title}>
              <div className="onboarding-step-icon">{s.icon}</div>
              <div>
                <div className="onboarding-step-title">{s.title}</div>
                <div className="onboarding-step-body">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-accent onboarding-cta" onClick={onDismiss}>
          {t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  )
}
