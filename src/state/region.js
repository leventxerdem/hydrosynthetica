// Reconstructs the Region model referenced by RegionSelectionView.swift /
// SimulationController.swift (not included in the uploaded source — the
// SwiftData model files weren't part of the export). Behavior is inferred
// from usage: a lat/lng polygon + emission point that gets projected into
// an 800x600 simulation space for the physics engine and canvas renderer.

const CANVAS_W = 800
const CANVAS_H = 600
const METERS_PER_DEG_LAT = 111320

export function createRegion() {
  return {
    name: 'New Region',
    waterVertices: [], // [{lat, lng}]
    flowDirection: 0,
    emissionRadius: 10,
    emissionLat: null,
    emissionLon: null,
    // derived (simulation space), populated by normalizeToSimulationSpace()
    waterVerticesSim: [],
    emissionPointSim: null,
    minLat: 0,
    maxLat: 0,
    minLon: 0,
    maxLon: 0,
    pixelsPerMeter: 1,
  }
}

function metersPerDegLon(atLat) {
  return METERS_PER_DEG_LAT * Math.cos((atLat * Math.PI) / 180)
}

// Projects the lat/lng polygon into an 800x600 simulation-space canvas,
// preserving true relative distances (equirectangular projection local to
// the region, which is accurate enough at the km scale a water body spans).
export function normalizeToSimulationSpace(region) {
  if (!region.waterVertices.length) return region

  const lats = region.waterVertices.map((v) => v.lat)
  const lngs = region.waterVertices.map((v) => v.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lngs)
  const maxLon = Math.max(...lngs)

  const avgLat = (minLat + maxLat) / 2
  const mPerDegLon = metersPerDegLon(avgLat)

  const widthMeters = Math.max(1, (maxLon - minLon) * mPerDegLon)
  const heightMeters = Math.max(1, (maxLat - minLat) * METERS_PER_DEG_LAT)

  // Uniform scale (not stretched per-axis) so physics distances stay correct;
  // fit the larger dimension to the canvas and center the rest.
  const ppm = Math.min(CANVAS_W / widthMeters, CANVAS_H / heightMeters)
  const usedW = widthMeters * ppm
  const usedH = heightMeters * ppm
  const offsetX = (CANVAS_W - usedW) / 2
  const offsetY = (CANVAS_H - usedH) / 2

  const project = (lat, lng) => ({
    x: offsetX + (lng - minLon) * mPerDegLon * ppm,
    y: offsetY + (maxLat - lat) * METERS_PER_DEG_LAT * ppm, // north-up
  })

  region.minLat = minLat
  region.maxLat = maxLat
  region.minLon = minLon
  region.maxLon = maxLon
  region.pixelsPerMeter = ppm
  region.waterVerticesSim = region.waterVertices.map((v) => project(v.lat, v.lng))

  const eLat = region.emissionLat ?? (minLat + maxLat) / 2
  const eLon = region.emissionLon ?? (minLon + maxLon) / 2
  region.emissionPointSim = project(eLat, eLon)

  return region
}
