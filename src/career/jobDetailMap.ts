export type CoordinateCandidate = {
  lat?: number | null
  lng?: number | null
}

export type PostingMapPin = {
  id: string
  lat: number
  lng: number
}

const KOREAN_REGION_CENTERS: Array<[string, Omit<PostingMapPin, 'id'>]> = [
  ['역삼동', { lat: 37.5007, lng: 127.0365 }],
  ['삼성동', { lat: 37.5146, lng: 127.0565 }],
  ['서초동', { lat: 37.4919, lng: 127.0076 }],
  ['성수동', { lat: 37.5446, lng: 127.0559 }],
  ['여의도동', { lat: 37.5219, lng: 126.9245 }],
  ['판교동', { lat: 37.3917, lng: 127.0927 }],
]

function isInKorea(pin: PostingMapPin) {
  return pin.lat >= 33 && pin.lat <= 39 && pin.lng >= 124 && pin.lng <= 132
}

function findKoreanRegionCenter(region?: string | null) {
  if (!region) return undefined
  return KOREAN_REGION_CENTERS.find(([name]) => region.includes(name))?.[1]
}

function normalizeCandidate(
  id: string,
  candidate?: CoordinateCandidate | null,
): PostingMapPin | undefined {
  if (candidate?.lat == null || candidate.lng == null) return undefined
  if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) return undefined

  return { id, lat: candidate.lat, lng: candidate.lng }
}

export function resolvePostingPin(
  id: string,
  detail?: CoordinateCandidate | null,
  livePin?: CoordinateCandidate | null,
  fallbackPin?: CoordinateCandidate | null,
): PostingMapPin | undefined {
  return normalizeCandidate(id, detail)
    ?? normalizeCandidate(id, livePin)
    ?? normalizeCandidate(id, fallbackPin)
}

export function resolvePostingMapPin(
  id: string,
  region?: string | null,
  detail?: CoordinateCandidate | null,
  livePin?: CoordinateCandidate | null,
  fallbackPin?: CoordinateCandidate | null,
): PostingMapPin | undefined {
  const regionCenter = findKoreanRegionCenter(region)
  if (!regionCenter) return resolvePostingPin(id, detail, livePin, fallbackPin)

  const precisePin = [detail, livePin, fallbackPin]
    .map((candidate) => normalizeCandidate(id, candidate))
    .find((candidate): candidate is PostingMapPin => candidate != null && isInKorea(candidate))

  return precisePin ?? { id, ...regionCenter }
}
