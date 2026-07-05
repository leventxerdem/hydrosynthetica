// Grids "settled" particles (beached on shore OR sedimented on the bed) into
// equal-area cells across the water body's bounding box — the same gridding
// approach the paper describes for its OA / Kappa field validation (25m x 25m
// cells). Used by both the Analysis heat map and the Collector Placement view.

const DEFAULT_CELL_METERS = 25

export function computeAccumulationGrid(particles, region, cellMeters = DEFAULT_CELL_METERS) {
  const bounds = boundsOf(region?.waterVerticesSim)
  if (!bounds) return null

  const ppm = region.pixelsPerMeter || 1
  const cellPx = Math.max(4, cellMeters * ppm)

  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellPx))
  const rows = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / cellPx))

  const counts = new Array(cols * rows).fill(0)
  let totalAccumulated = 0

  for (const p of particles) {
    if (!(p.isStuck || p.isSedimented)) continue
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((p.position.x - bounds.minX) / cellPx)))
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((p.position.y - bounds.minY) / cellPx)))
    counts[cy * cols + cx]++
    totalAccumulated++
  }

  let maxCount = 0
  let maxIndex = -1
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i]
      maxIndex = i
    }
  }

  const cellCenter = (index) => {
    const cx = index % cols
    const cy = Math.floor(index / cols)
    return {
      x: bounds.minX + (cx + 0.5) * cellPx,
      y: bounds.minY + (cy + 0.5) * cellPx,
    }
  }

  return {
    bounds,
    cellPx,
    cellMeters,
    cols,
    rows,
    counts,
    maxCount,
    maxIndex,
    totalAccumulated,
    peakCenter: maxIndex >= 0 ? cellCenter(maxIndex) : null,
    cellCenter,
  }
}

function boundsOf(vertices) {
  if (!vertices || !vertices.length) return null
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}
