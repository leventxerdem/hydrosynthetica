// Reconstructs the SimulationParameters / ParticleSettings SwiftData models
// from how they were used in SimulationParameterView.swift / ParticleSettingsView.swift.

export function createParameters() {
  return {
    simulationDuration: 43200, // seconds (12h default, matches Swift picker default)
    waterDepth: 10.0, // m
    windSpeed: 0.0, // m/s
    windDirection: 0.0, // deg
    flowSpeed: 1.0, // m/s
    flowDirection: 0.0, // deg (fallback if region has none set)
    turbulence: 0.3, // 0..10 (same odd headroom range as the original slider)
    viscosity: 1.0, // x water
    gravityScale: 1.0, // x g
  }
}

export function createParticleSettings() {
  return {
    diameterMM: 1.0, // mm — the Swift UI labeled this "Diameter" but stored it as `radius`
    density: 0.9, // g/cm^3
    count: 5000,
    colorMode: 0, // 0 = uniform, 1 = by speed, 2 = by depth
  }
}

export function createProject(name = 'Untitled Project') {
  return {
    name,
    region: null,
    parameters: createParameters(),
    particleSettings: createParticleSettings(),
    collector: null, // { simPoint: {x,y}, latLng: {lat,lng}, confidence, totalAccumulated, computedAtTime }
  }
}

export const DURATION_OPTIONS = [
  { label: '1 Hour', value: 3600 },
  { label: '6 Hours', value: 21600 },
  { label: '12 Hours', value: 43200 },
  { label: '24 Hours', value: 86400 },
  { label: '1 Week', value: 604800 },
]
