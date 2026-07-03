// Port of SimulationEngine.swift, with two physics fixes applied (flagged
// during the review of the original Swift source):
//
// FIX 1 — Settling velocity used a bare "5000.0" fudge factor and mixed
// g/cm^3 densities directly into an SI (kg, m, s) formula. Real Stokes
// settling velocity needs density in kg/m^3. Converting properly (x1000)
// gives physically correct settling speeds with no magic multiplier needed.
//
// FIX 2 — The inertial drag relaxation used the fixed real-world frame time
// (0.016s) for tau/alpha, while position integration used dt scaled by the
// speed multiplier. That decoupled velocity response from simulated time at
// high speed multipliers (60x/300x). Now both use the same scaled `dt`.
//
// Also fixed: the particle "radius" field was being fed the *diameter*
// value from the UI slider (labelled "Diameter" in ParticleSettingsView).
// Here we take diameter in mm and halve it before using it as a radius.

import { PerlinNoise } from './PerlinNoise.js'

export function makeParticle({
  position,
  z = 0,
  velocity = { x: 0, y: 0 },
  diameterMM,
  densityGCM3,
  noiseOffset,
  releaseTime,
  isActive,
}) {
  return {
    id: Math.random().toString(36).slice(2),
    position,
    z,
    velocity,
    diameterMM,
    densityGCM3,
    noiseOffset,
    releaseTime,
    isActive,
    isStuck: false,
    isSedimented: false,
    speed: 0,
  }
}

function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}
function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y }
}
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y }
}
function scale(a, s) {
  return { x: a.x * s, y: a.y * s }
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y
}
function normalize(v) {
  const l = length(v)
  return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }
}

// Physical constants (SI)
const G0 = 9.81 // m/s^2
const WATER_DENSITY_KGM3 = 1000
const MU_WATER = 0.001 // Pa*s, dynamic viscosity of water at ~20C

export class SimulationEngine {
  constructor(particles, params) {
    this.particles = particles
    this.params = params // { viscosity, turbulence, gravityScale, baseFlowVelocity(px/s), pixelsPerMeter, waterDepth(m), windVelocity(m/s) }
    this.targetSpeed = 1.0
    this.simDurationLimit = 43200
    this.boundaryVertices = []
    this._bounds = null
    this.noiseGen = new PerlinNoise(123)
    this.baseDt = 0.016
    this.accumulatedTime = 0
  }

  setBoundary(vertices) {
    this.boundaryVertices = vertices
    if (!vertices.length) {
      this._bounds = null
      return
    }
    const xs = vertices.map((v) => v.x)
    const ys = vertices.map((v) => v.y)
    this._bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    }
  }

  step() {
    const dt = this.baseDt * this.targetSpeed
    this.accumulatedTime += dt

    const ppm = Math.max(1e-6, this.params.pixelsPerMeter)
    const gravity = G0 * this.params.gravityScale
    const mu = MU_WATER * this.params.viscosity // Pa*s
    const rhoFluid = WATER_DENSITY_KGM3
    const maxZ = this.params.waterDepth
    const tTurb = this.accumulatedTime
    const windVelocity = this.params.windVelocity || { x: 0, y: 0 }
    const windIsZero = windVelocity.x === 0 && windVelocity.y === 0

    const particles = this.particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      if (p.isStuck) continue

      if (!p.isActive) {
        if (this.accumulatedTime >= p.releaseTime) {
          p.isActive = true
        } else {
          continue
        }
      }

      // --- VERTICAL PHYSICS (Stokes settling), corrected SI units ---
      const rM = p.diameterMM / 1000 / 2 // diameter(mm) -> radius(m)
      const rhoP = p.densityGCM3 * 1000 // g/cm^3 -> kg/m^3

      const vSettling =
        (2 / 9) * (rM * rM * gravity * (rhoP - rhoFluid)) / mu // m/s

      p.z += vSettling * dt

      if (p.z >= maxZ) {
        p.z = maxZ
        p.isSedimented = true
      } else if (p.z <= 0) {
        p.z = 0
        p.isSedimented = false
      } else {
        p.isSedimented = false
      }

      // --- HORIZONTAL PHYSICS ---
      const depthFactor = Math.max(0.2, 1 - (p.z / maxZ) * 0.5)
      const friction = p.isSedimented ? 0.05 : 1.0

      const posMeters = scale(p.position, 1 / ppm)
      let fluidVelocityM = scale(
        this.sampleFractalFluidVelocity(posMeters, tTurb),
        depthFactor
      )

      if (!windIsZero) {
        const windFactor = 0.03 * Math.exp(-0.5 * p.z)
        fluidVelocityM = add(fluidVelocityM, scale(windVelocity, windFactor))
      }

      fluidVelocityM = scale(fluidVelocityM, friction)

      // Inertial velocity relaxation — FIX: use scaled dt, not fixed frame time
      const mass = (4 / 3) * Math.PI * rM ** 3 * rhoP // kg
      const dragCoef = 6 * Math.PI * mu * rM // Stokes drag coefficient (N*s/m)
      const tau = mass / Math.max(1e-9, dragCoef) // s
      const alpha = Math.exp(-dt / tau)

      const prevVelM = scale(p.velocity, 1 / ppm)
      const newVelocityM = add(fluidVelocityM, scale(sub(prevVelM, fluidVelocityM), alpha))
      p.velocity = scale(newVelocityM, ppm)

      // Movement + boundary collision
      const nextPos = add(p.position, scale(p.velocity, dt))
      const b = this._bounds

      const inBounds =
        b &&
        nextPos.x > b.minX &&
        nextPos.x < b.maxX &&
        nextPos.y > b.minY &&
        nextPos.y < b.maxY &&
        this.isPointInside(nextPos, this.boundaryVertices)

      if (inBounds) {
        p.position = nextPos
      } else {
        const hit = this.closestPointAndNormal(nextPos, this.boundaryVertices)
        if (hit) {
          const { point: wallPos, normal: wallNormal } = hit
          const impactSpeed = length(p.velocity)
          if (impactSpeed < 15.0 || Math.random() < 0.2) {
            p.position = wallPos
            p.velocity = { x: 0, y: 0 }
            p.isStuck = true
          } else {
            p.position = add(wallPos, scale(wallNormal, 1.5))
            const v = p.velocity
            const vDotN = dot(v, wallNormal)
            const vNormal = scale(wallNormal, vDotN)
            const vTangent = sub(v, vNormal)
            p.velocity = sub(scale(vTangent, 0.1), scale(vNormal, 0.05))
          }
        } else {
          p.position = sub(nextPos, scale(p.velocity, dt))
          p.velocity = { x: 0, y: 0 }
        }
      }

      p.speed = length(p.velocity)
    }
  }

  sampleFractalFluidVelocity(pos, time) {
    const vBase = scale(this.params.baseFlowVelocity, 1 / Math.max(1e-6, this.params.pixelsPerMeter))
    const turbulence = this.params.turbulence
    if (turbulence < 0.01) return vBase

    const scale1 = 300.0, amp1 = 60.0, speed1 = 0.1
    const scale2 = 100.0, amp2 = 20.0, speed2 = 0.3
    const scale3 = 25.0, amp3 = 5.0, speed3 = 0.8

    const t = time * turbulence
    const eps = 1.0

    const getPotential = (x, y) => {
      const n1 = this.noiseGen.noise(x / scale1, y / scale1, t * speed1) * amp1
      const n2 = this.noiseGen.noise(x / scale2, y / scale2, t * speed2) * amp2
      const n3 = this.noiseGen.noise(x / scale3, y / scale3, t * speed3) * amp3
      return n1 + n2 + n3
    }

    const x = pos.x, y = pos.y
    const pYPlus = getPotential(x, y + eps)
    const pYMinus = getPotential(x, y - eps)
    const pXPlus = getPotential(x + eps, y)
    const pXMinus = getPotential(x - eps, y)

    const dPsidy = (pYPlus - pYMinus) / (2 * eps)
    const dPsidx = (pXPlus - pXMinus) / (2 * eps)

    const turb = scale({ x: dPsidy, y: -dPsidx }, turbulence)
    return add(vBase, turb)
  }

  closestPointAndNormal(p, polygon) {
    if (polygon.length <= 1) return null
    let bestDistSq = Infinity
    let bestPt = p
    let bestNorm = { x: 0, y: 1 }

    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      const v1 = polygon[i], v2 = polygon[j]
      const edge = sub(v2, v1)
      const edgeLenSq = dot(edge, edge)
      if (edgeLenSq <= 0.0001) continue

      const t = Math.max(0, Math.min(1, dot(sub(p, v1), edge) / edgeLenSq))
      const proj = add(v1, scale(edge, t))
      const distSq = dot(sub(p, proj), sub(p, proj))

      if (distSq < bestDistSq) {
        bestDistSq = distSq
        bestPt = proj
        bestNorm = normalize({ x: -edge.y, y: edge.x })
      }
    }
    return { point: bestPt, normal: bestNorm }
  }

  isPointInside(p, polygon) {
    if (polygon.length <= 2) return true
    let inside = false
    let j = polygon.length - 1
    for (let i = 0; i < polygon.length; i++) {
      const pi = polygon[i], pj = polygon[j]
      if (
        pi.y > p.y !== pj.y > p.y &&
        p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x
      ) {
        inside = !inside
      }
      j = i
    }
    return inside
  }
}
