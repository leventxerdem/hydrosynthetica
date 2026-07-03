import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import { createRegion, normalizeToSimulationSpace } from '../state/region.js'
import { detectWaterBody, WaterServiceError } from '../state/waterBoundaryService.js'
import '../styles/region.css'

const TILE_LAYERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

export default function RegionSelectionView({ project, updateProject }) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const polygonRef = useRef(null)
  const markersRef = useRef([])

  const [waterVertices, setWaterVertices] = useState(project.region?.waterVertices || [])
  const [emissionPoint, setEmissionPoint] = useState(
    project.region?.emissionLat != null
      ? { lat: project.region.emissionLat, lng: project.region.emissionLon }
      : null
  )
  const [flowDirection, setFlowDirection] = useState(project.region?.flowDirection ?? 0)
  const [emissionRadius, setEmissionRadius] = useState(project.region?.emissionRadius ?? 10)
  const [isMagicMode, setIsMagicMode] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [mapStyle, setMapStyle] = useState('satellite')
  const [lastClick, setLastClick] = useState(null)

  const isMagicModeRef = useRef(isMagicMode)
  isMagicModeRef.current = isMagicMode

  // --- init map once ---
  useEffect(() => {
    const map = L.map(mapElRef.current, {
      center: [39.0, 35.0],
      zoom: 6,
      zoomControl: true,
    })
    mapRef.current = map

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      setLastClick({ lat, lng })
      if (isMagicModeRef.current) {
        runAutoDetect(lat, lng)
      } else if (e.originalEvent.altKey) {
        setEmissionPoint({ lat, lng })
      } else {
        setWaterVertices((v) => [...v, { lat, lng }])
      }
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- tile layer swap ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) map.removeLayer(tileRef.current)
    const layer = TILE_LAYERS[mapStyle]
    tileRef.current = L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: 19 }).addTo(map)
  }, [mapStyle])

  // --- redraw polygon + markers ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (polygonRef.current) {
      map.removeLayer(polygonRef.current)
      polygonRef.current = null
    }
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    if (waterVertices.length > 2) {
      polygonRef.current = L.polygon(
        waterVertices.map((v) => [v.lat, v.lng]),
        { color: '#35d6c4', weight: 2, fillColor: '#35d6c4', fillOpacity: 0.2 }
      ).addTo(map)
    }

    waterVertices.forEach((v, i) => {
      const marker = L.circleMarker([v.lat, v.lng], {
        radius: 4,
        color: '#35d6c4',
        fillColor: '#0b131f',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map)
      marker.bindTooltip(`v${i + 1}`, { permanent: false })
      markersRef.current.push(marker)
    })

    if (emissionPoint) {
      const marker = L.circleMarker([emissionPoint.lat, emissionPoint.lng], {
        radius: 7,
        color: '#e2933f',
        fillColor: '#e2933f',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map)
      marker.bindTooltip('Emission point', { permanent: false })
      markersRef.current.push(marker)
    }
  }, [waterVertices, emissionPoint])

  const runAutoDetect = useCallback(async (lat, lng) => {
    setIsDetecting(true)
    setErrorMessage(null)
    try {
      const polygon = await detectWaterBody(lat, lng)
      setWaterVertices(polygon)
      setEmissionPoint({ lat, lng })
    } catch (err) {
      setErrorMessage(
        err instanceof WaterServiceError
          ? 'Detection failed: try clicking closer to the center of a water body.'
          : 'Detection failed: network error reaching OpenStreetMap.'
      )
      console.error('Water detection error:', err)
    } finally {
      setIsDetecting(false)
    }
  }, [])

  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(null), 3500)
    return () => clearTimeout(t)
  }, [errorMessage])

  const clearAll = () => {
    setWaterVertices([])
    setEmissionPoint(null)
  }

  const applyRegion = () => {
    const region = project.region ? { ...project.region } : createRegion()
    region.waterVertices = waterVertices
    region.flowDirection = flowDirection
    region.emissionRadius = emissionRadius
    region.emissionLat = emissionPoint?.lat ?? waterVertices[0]?.lat ?? 0
    region.emissionLon = emissionPoint?.lng ?? waterVertices[0]?.lng ?? 0
    normalizeToSimulationSpace(region)
    updateProject((p) => ({ ...p, region }))
  }

  return (
    <div className="region-view">
      <div className="region-map-wrap">
        <div ref={mapElRef} className="region-map" />

        {isDetecting && (
          <div className="map-overlay">
            <div className="map-overlay-card">
              <div className="spinner" />
              <div className="overlay-title">Detecting Water Body…</div>
              <div className="overlay-sub mono">Querying OpenStreetMap</div>
            </div>
          </div>
        )}

        {errorMessage && <div className="map-toast">{errorMessage}</div>}

        <div className="map-style-picker">
          <div className="segmented">
            <button className={mapStyle === 'standard' ? 'active' : ''} onClick={() => setMapStyle('standard')}>
              Map
            </button>
            <button className={mapStyle === 'satellite' ? 'active' : ''} onClick={() => setMapStyle('satellite')}>
              Satellite
            </button>
          </div>
        </div>
      </div>

      <div className="region-controls">
        <div className="region-controls-top">
          <div>
            <div className="region-title">Region Selection</div>
            {lastClick ? (
              <div className="mono region-coord">
                {lastClick.lat.toFixed(4)}, {lastClick.lng.toFixed(4)}
              </div>
            ) : (
              <div className="region-coord">Click the map to add water-body vertices</div>
            )}
          </div>
          <div className="region-actions">
            <button
              className={`btn ${isMagicMode ? 'btn-accent' : ''}`}
              onClick={() => setIsMagicMode((v) => !v)}
              title="Automatically detect water boundaries using OpenStreetMap"
            >
              ✨ Auto-Detect
            </button>
            <div className="btn-divider" />
            <button
              className="btn"
              onClick={clearAll}
              disabled={!waterVertices.length && !emissionPoint}
            >
              🗑 Clear
            </button>
          </div>
        </div>

        <div className="region-controls-bottom">
          <div className="stat-block">
            <div className="stat-label">Vertices</div>
            <div className="stat-value mono">{waterVertices.length}</div>
          </div>

          <div className="stat-block">
            <div className="stat-label">Flow Direction</div>
            <div className="stat-value mono">↑ {Math.round(flowDirection)}°</div>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={flowDirection}
            onChange={(e) => setFlowDirection(parseFloat(e.target.value))}
            style={{ width: 110 }}
          />

          {emissionPoint ? (
            <>
              <div className="stat-block">
                <div className="stat-label">Emission Radius</div>
                <div className="stat-value mono">{Math.round(emissionRadius)} m</div>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={emissionRadius}
                onChange={(e) => setEmissionRadius(parseFloat(e.target.value))}
                style={{ width: 90 }}
              />
            </>
          ) : (
            <div className="hint-warning">⚠ Alt/Option + Click for emission point</div>
          )}

          <div className="spacer" />
          <button className="btn btn-accent" onClick={applyRegion} disabled={waterVertices.length < 3}>
            ✓ Apply Region
          </button>
        </div>
      </div>
    </div>
  )
}
