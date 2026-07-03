// Direct port of PerlinNoise.swift — classic Ken Perlin noise, used to
// generate a smooth curl-noise potential field for turbulence.

// Deterministic PRNG (same recurrence as ChaChaRandom in the Swift source)
// so the noise permutation table is reproducible across runs for a given seed.
function makeRng(seed) {
  let state = BigInt.asUintN(64, BigInt(seed))
  const MUL = 6364136223846793005n
  const INC = 1442695040888963407n
  const MASK64 = (1n << 64n) - 1n
  return () => {
    state = (state * MUL + INC) & MASK64
    // Use the top 32 bits as a well-mixed uint32
    return Number((state >> 32n) & 0xffffffffn)
  }
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng() % (i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(t, a, b) {
  return a + t * (b - a)
}

function grad(hash, x, y, z) {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

export class PerlinNoise {
  constructor(seed = 1234) {
    const p = Array.from({ length: 256 }, (_, i) => i)
    shuffle(p, makeRng(seed))
    this.permutation = p.concat(p)
  }

  noise(x, y, z) {
    const P = this.permutation
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    const xi = x - Math.floor(x)
    const yi = y - Math.floor(y)
    const zi = z - Math.floor(z)

    const u = fade(xi)
    const v = fade(yi)
    const w = fade(zi)

    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z
    const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(P[AA], xi, yi, zi), grad(P[BA], xi - 1, yi, zi)),
        lerp(u, grad(P[AB], xi, yi - 1, zi), grad(P[BB], xi - 1, yi - 1, zi))
      ),
      lerp(
        v,
        lerp(u, grad(P[AA + 1], xi, yi, zi - 1), grad(P[BA + 1], xi - 1, yi, zi - 1)),
        lerp(u, grad(P[AB + 1], xi, yi - 1, zi - 1), grad(P[BB + 1], xi - 1, yi - 1, zi - 1))
      )
    )
  }
}
