// Port of the (missing-from-export) SimulationDataStore referenced by
// AnalysisView.swift. Shape reconstructed from usage: totals, a
// stuck-count-over-time history, and a speed histogram, plus CSV export.

const SPEED_BUCKET_EDGES = [0, 1, 2, 4, 8, 16, 32, 64, Infinity]

class SimulationDataStore {
  constructor() {
    this.listeners = new Set()
    this._reset()
  }

  _reset() {
    this.totalParticles = 0
    this.stuckParticles = 0
    this.activeParticles = 0
    this.activeAverageSpeed = 0
    this.maxSpeed = 0
    this.history = [] // [{time, stuckCount}]
    this.speedBuckets = [] // [{range, count}]
  }

  reset() {
    this._reset()
    this._notify()
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  _notify() {
    for (const fn of this.listeners) fn()
  }

  recordSnapshot(particles, time) {
    let stuck = 0
    let active = 0
    let activeSpeedSum = 0
    let maxSpeed = 0
    const buckets = SPEED_BUCKET_EDGES.slice(0, -1).map((lo, i) => ({
      lo,
      hi: SPEED_BUCKET_EDGES[i + 1],
      count: 0,
    }))

    for (const p of particles) {
      if (p.isStuck) stuck++
      if (p.isActive && !p.isStuck) {
        active++
        activeSpeedSum += p.speed
        const bucket = buckets.find((b) => p.speed >= b.lo && p.speed < b.hi)
        if (bucket) bucket.count++
      }
      if (p.speed > maxSpeed) maxSpeed = p.speed
    }

    this.totalParticles = particles.length
    this.stuckParticles = stuck
    this.activeParticles = active
    this.activeAverageSpeed = active > 0 ? activeSpeedSum / active : 0
    this.maxSpeed = maxSpeed
    this.history = [...this.history, { time, stuckCount: stuck }]
    this.speedBuckets = buckets
      .filter((b) => b.count > 0 || b.hi !== Infinity)
      .map((b) => ({
        range: b.hi === Infinity ? `${b.lo}+` : `${b.lo}-${b.hi}`,
        count: b.count,
      }))

    this._notify()
  }

  generateCSV() {
    const header = 'time_s,stuck_count\n'
    const rows = this.history.map((h) => `${h.time.toFixed(2)},${h.stuckCount}`).join('\n')
    return header + rows + '\n'
  }
}

export const dataStore = new SimulationDataStore()
