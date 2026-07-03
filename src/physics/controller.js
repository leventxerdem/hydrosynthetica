// Port of SimulationController.swift. The Swift version ran the engine in a
// detached background Task; in the browser we run it in the main-thread
// animation loop (requestAnimationFrame), batching physics steps per frame
// according to the speed multiplier — same batching strategy as the original
// (cap steps per tick so the UI never fully locks up at 300x).

import { SimulationEngine, makeParticle } from './SimulationEngine.js'
import { normalizeToSimulationSpace } from '../state/region.js'
import { dataStore } from './dataStore.js'

const EMISSION_FALLBACK = { x: 400, y: 300 }
const STEP_BATCH = 10
const MAX_STEPS_PER_TICK = 400

class SimulationController {
  constructor() {
    this.listeners = new Set()
    this.engine = null
    this.rafId = null
    this.lastSnapshotAt = 0

    this.isRunning = false
    this.currentTime = 0
    this.totalDuration = 43200
    this.displayParticles = []
    this.speedMultiplier = 1.0
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  _notify() {
    for (const fn of this.listeners) fn()
  }

  setSpeedMultiplier(v) {
    this.speedMultiplier = v
    this._notify()
  }

  start(project) {
    if (this.isRunning && this.engine) return
    this.stop()
    dataStore.reset()

    const params = project.parameters
    if (!params) return

    this.currentTime = 0
    this.totalDuration = params.simulationDuration < 60 ? 3600 : params.simulationDuration

    // Geometry
    let pixelsPerMeter = 1
    let boundary = []
    let region = project.region
    if (region) {
      if (!region.waterVerticesSim.length) normalizeToSimulationSpace(region)
      boundary = region.waterVerticesSim
      pixelsPerMeter = region.pixelsPerMeter || 1
    }

    // Flow
    const realFlowVelocity = params.flowSpeed * pixelsPerMeter
    const flowAngle = ((region?.flowDirection ?? params.flowDirection) * Math.PI) / 180
    const flowVector = {
      x: Math.cos(flowAngle) * realFlowVelocity,
      y: Math.sin(flowAngle) * realFlowVelocity,
    }

    // Wind (m/s, not pixel-scaled — matches original)
    const windAngle = (params.windDirection * Math.PI) / 180
    const windVector = {
      x: Math.cos(windAngle) * params.windSpeed,
      y: Math.sin(windAngle) * params.windSpeed,
    }

    // Particles
    const settings = project.particleSettings
    const count = settings?.count ?? 1000
    const diameterMM = settings?.diameterMM ?? 1.0
    const density = settings?.density ?? 1.0
    const emissionPt = region?.emissionPointSim ?? EMISSION_FALLBACK
    const emissionRadiusMeters = region?.emissionRadius ?? 10
    const emissionRadiusPixels = emissionRadiusMeters * pixelsPerMeter

    const initParticles = generateParticles({
      count,
      center: emissionPt,
      diameterMM,
      density,
      duration: this.totalDuration,
      emissionRadiusPixels,
    })

    const engine = new SimulationEngine(initParticles, {
      viscosity: params.viscosity,
      turbulence: params.turbulence,
      gravityScale: params.gravityScale,
      baseFlowVelocity: flowVector,
      pixelsPerMeter,
      waterDepth: params.waterDepth,
      windVelocity: windVector,
    })
    engine.setBoundary(boundary)
    engine.simDurationLimit = this.totalDuration

    this.engine = engine
    this.isRunning = true
    this.displayParticles = initParticles
    this.lastSnapshotAt = performance.now()
    this._notify()

    this._tick()
  }

  _tick = () => {
    if (!this.isRunning || !this.engine) return
    const engine = this.engine

    engine.targetSpeed = this.speedMultiplier
    const steps = Math.max(1, this.speedMultiplier)
    let completed = 0
    while (completed < steps) {
      for (let i = 0; i < STEP_BATCH; i++) engine.step()
      completed += STEP_BATCH
      if (completed > MAX_STEPS_PER_TICK) break
    }

    this.displayParticles = engine.particles
    this.currentTime = engine.accumulatedTime

    const now = performance.now()
    if (now - this.lastSnapshotAt > 500) {
      dataStore.recordSnapshot(engine.particles, engine.accumulatedTime)
      this.lastSnapshotAt = now
    }

    this._notify()

    if (this.currentTime >= this.totalDuration) {
      this.stop()
      return
    }

    this.rafId = requestAnimationFrame(this._tick)
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.isRunning = false
    this._notify()
  }
}

function generateParticles({ count, center, diameterMM, density, duration, emissionRadiusPixels }) {
  const res = []
  const burstCount = Math.floor(count * 0.2)
  const spreadDuration = duration * 0.1

  for (let i = 0; i < count; i++) {
    const a = Math.random() * 2 * Math.PI
    const r = Math.random() * emissionRadiusPixels
    const pos = { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r }
    const t = i < burstCount ? 0 : Math.random() * spreadDuration

    res.push(
      makeParticle({
        position: pos,
        z: 0,
        diameterMM: diameterMM * (0.8 + Math.random() * 0.4),
        densityGCM3: density * (0.95 + Math.random() * 0.1),
        noiseOffset: Math.random() * 10,
        releaseTime: t,
        isActive: t === 0,
      })
    )
  }
  return res.sort((a, b) => a.releaseTime - b.releaseTime)
}

export const controller = new SimulationController()
