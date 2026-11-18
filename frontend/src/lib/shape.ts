import type { LatLng } from '../data/routes'

export interface Box { minLat: number; maxLat: number; minLng: number; maxLng: number }

export function bboxOf(lines: LatLng[][]): Box {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const line of lines) {
    for (const [lat, lng] of line) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
  }
  return { minLat, maxLat, minLng, maxLng }
}

/** Projects lat/lng polylines into a w×h SVG viewBox (aspect preserved, centered, padded). Keeps every 3rd vertex: plenty for thumbnails. */
export function projector(box: Box, w: number, h: number, pad = 12) {
  const kx = Math.cos((((box.minLat + box.maxLat) / 2) * Math.PI) / 180)
  const spanX = Math.max(1e-6, (box.maxLng - box.minLng) * kx)
  const spanY = Math.max(1e-6, box.maxLat - box.minLat)
  const s = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY)
  const ox = (w - spanX * s) / 2
  const oy = (h - spanY * s) / 2
  const pt = ([lat, lng]: LatLng): [number, number] => [ox + (lng - box.minLng) * kx * s, oy + (box.maxLat - lat) * s]
  const path = (line: LatLng[]) =>
    line
      .filter((_, i) => i % 3 === 0 || i === line.length - 1)
      .map((p, i) => {
        const [x, y] = pt(p)
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join('')
  return { pt, path }
}
