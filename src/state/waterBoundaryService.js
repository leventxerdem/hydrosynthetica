// Port of WaterBoundaryService.swift — queries OpenStreetMap's Overpass API
// for a water polygon containing (or nearest to) a clicked coordinate.

export class WaterServiceError extends Error {}

export async function detectWaterBody(lat, lon) {
  const query = `
[out:json][timeout:25];
is_in(${lat},${lon})->.a;
(
  way(pivot.a)["natural"="water"];
  relation(pivot.a)["natural"="water"];
  way(pivot.a)["water"="lake"];
  relation(pivot.a)["water"="lake"];

  way["natural"="water"](around:2500,${lat},${lon});
  relation["natural"="water"](around:2500,${lat},${lon});
  way["waterway"="riverbank"](around:2500,${lat},${lon});
);
out geom;`

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new WaterServiceError('network error')
  const data = await res.json()
  return parseOverpassResponse(data, { lat, lng: lon })
}

function parseOverpassResponse(data, target) {
  const elements = data.elements || []
  const candidates = []

  for (const el of elements) {
    let points = null
    if (el.geometry) {
      points = el.geometry
    } else if (el.members) {
      const outer = el.members.find((m) => m.role === 'outer' && m.geometry)
      if (outer) points = outer.geometry
      else if (el.members[0]?.geometry) points = el.members[0].geometry
    }
    if (points && points.length > 2) {
      candidates.push(points.map((p) => ({ lat: p.lat, lng: p.lon })))
    }
  }

  const exact = candidates.find((poly) => containsPoint(target, poly))
  if (exact) return simplify(exact, 0.0005)

  if (candidates.length) {
    const closest = candidates.reduce((best, poly) =>
      distanceToCenter(target, poly) < distanceToCenter(target, best) ? poly : best
    )
    return simplify(closest, 0.0005)
  }

  throw new WaterServiceError('no water body found near this point')
}

function containsPoint(point, polygon) {
  let inside = false
  let j = polygon.length - 1
  for (let i = 0; i < polygon.length; i++) {
    const pi = polygon[i], pj = polygon[j]
    if (
      pi.lat > point.lat !== pj.lat > point.lat &&
      point.lng < ((pj.lng - pi.lng) * (point.lat - pi.lat)) / (pj.lat - pi.lat) + pi.lng
    ) {
      inside = !inside
    }
    j = i
  }
  return inside
}

function distanceToCenter(point, polygon) {
  const cx = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length
  const cy = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length
  const dx = point.lat - cx
  const dy = point.lng - cy
  return dx * dx + dy * dy
}

// Douglas-Peucker simplification
function simplify(points, tolerance) {
  if (points.length <= 2) return points
  let dmax = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end])
    if (d > dmax) {
      index = i
      dmax = d
    }
  }

  if (dmax > tolerance) {
    const r1 = simplify(points.slice(0, index + 1), tolerance)
    const r2 = simplify(points.slice(index), tolerance)
    return r1.slice(0, -1).concat(r2)
  }
  return [points[0], points[end]]
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const x = point.lng, y = point.lat
  const x1 = lineStart.lng, y1 = lineStart.lat
  const x2 = lineEnd.lng, y2 = lineEnd.lat
  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
  return denominator === 0 ? 0 : numerator / denominator
}
