import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { controller } from '../physics/controller.js'
import { computeAccumulationGrid } from '../physics/accumulationGrid.js'
import { simToLatLng } from '../state/region.js'
import { useProject } from '../state/ProjectContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import '../styles/collector.css'

export default function CollectorPlacementView({ project }) {
  const { t } = useI18n()
  const { updateProject } = useProject()
  const [copied, setCopied] = useState(false)
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  const region = project.region
  const collector = project.collector

  const compute = () => {
    if (!region?.waterVerticesSim?.length) return
    const grid = computeAccumulationGrid(controller.displayParticles, region)
    if (!grid || !grid.peakCenter || grid.maxCount === 0) return

    const latLng = simToLatLng(region, grid.peakCenter)
    updateProject((p) => ({
      ...p,
      collector: {
        simPoint: grid.peakCenter,
        latLng,
        confidence: grid.totalAccumulated > 0 ? grid.maxCount / grid.totalAccumulated : 0,
        totalAccumulated: grid.totalAccumulated,
        peakCount: grid.maxCount,
        computedAtTime: controller.currentTime,
      },
    }))
  }

  // Preview map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return
    const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: false })
    mapRef.current = map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map)
    map.setView([39, 35], 4)
    return () => map.remove()
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    const group = L.layerGroup().addTo(map)
    layerRef.current = group

    if (region?.waterVertices?.length > 2) {
      L.polygon(
        region.waterVertices.map((v) => [v.lat, v.lng]),
        { color: '#35d6c4', weight: 2, fillColor: '#35d6c4', fillOpacity: 0.15 }
      ).addTo(group)
    }

    if (collector?.latLng) {
      L.circleMarker([collector.latLng.lat, collector.latLng.lng], {
        radius: 10,
        color: '#e2933f',
        fillColor: '#e2933f',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip(t('renderer.collector'), { permanent: true, direction: 'top', offset: [0, -8] })
        .addTo(group)
      map.setView([collector.latLng.lat, collector.latLng.lng], 15)
    } else if (region?.waterVertices?.length > 2) {
      const bounds = L.latLngBounds(region.waterVertices.map((v) => [v.lat, v.lng]))
      map.fitBounds(bounds, { padding: [24, 24] })
    }
  }, [region, collector, t])

  const copyCoords = () => {
    if (!collector?.latLng) return
    const text = `${collector.latLng.lat.toFixed(6)}, ${collector.latLng.lng.toFixed(6)}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const exportGeoJSON = () => {
    if (!collector?.latLng) return
    const geojson = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [collector.latLng.lng, collector.latLng.lat] },
      properties: {
        name: 'Passive Helical Collector — Suggested Placement',
        confidence: collector.confidence,
        peakCellParticles: collector.peakCount,
        totalAccumulatedParticles: collector.totalAccumulated,
        simulatedTimeSeconds: collector.computedAtTime,
      },
    }
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'collector_placement.geojson'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="collector-view">
      <div className="view-pad" style={{ paddingBottom: 0 }}>
        <div className="view-head">
          <h1>{t('collector.title')}</h1>
          <p>{t('collector.subtitle')}</p>
        </div>
      </div>

      <div className="collector-body">
        <div className="collector-map-wrap">
          <div ref={mapElRef} className="collector-map" />
        </div>

        <div className="collector-panel">
          {!region ? (
            <div className="collector-empty">{t('collector.noRegion')}</div>
          ) : (
            <>
              {!collector && <div className="collector-empty">{t('collector.needsRun')}</div>}

              {collector && (
                <div className="collector-result">
                  <div className="collector-result-label">{t('collector.suggested')}</div>
                  <div className="collector-coords mono">
                    {collector.latLng.lat.toFixed(6)}, {collector.latLng.lng.toFixed(6)}
                  </div>

                  <div className="collector-confidence">
                    <div className="stat-label">
                      {t('collector.confidence')}
                      <span className="info-dot" title={t('collector.confidenceHelp')}>
                        ⓘ
                      </span>
                    </div>
                    <div className="confidence-bar">
                      <div
                        className="confidence-bar-fill"
                        style={{ width: `${Math.round(collector.confidence * 100)}%` }}
                      />
                    </div>
                    <div className="mono confidence-value">{Math.round(collector.confidence * 100)}%</div>
                  </div>

                  <div className="collector-actions">
                    <button className="btn" onClick={copyCoords}>
                      {copied ? t('collector.copied') : t('collector.copyCoords')}
                    </button>
                    <button className="btn" onClick={exportGeoJSON}>
                      {t('collector.exportGeoJSON')}
                    </button>
                  </div>
                </div>
              )}

              <button className="btn btn-accent collector-compute-btn" onClick={compute}>
                {collector ? t('collector.recompute') : t('collector.compute')}
              </button>

              <div className="collector-note">{t('collector.gridNote')}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
