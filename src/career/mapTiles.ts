import L from 'leaflet'

type TileStatus = 'loading' | 'ready' | 'error'

type TileProvider = {
  url: string
  options: L.TileLayerOptions
}

// CARTO tiles are occasionally blocked by browser/network privacy filters. Use
// OpenStreetMap first and keep CARTO as a transparent fallback so a single tile
// host outage does not leave the map as a blank grey panel.
const TILE_PROVIDERS: TileProvider[] = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
]

export function addMapTileLayer(map: L.Map, onStatus?: (status: TileStatus) => void) {
  let active = true
  let providerIndex = 0
  let layer: L.TileLayer | null = null

  const mountProvider = () => {
    if (!active) return

    let failedTiles = 0
    const provider = TILE_PROVIDERS[providerIndex]
    const nextLayer = L.tileLayer(provider.url, provider.options)
    layer = nextLayer

    nextLayer.on('tileload', () => {
      if (active && layer === nextLayer) onStatus?.('ready')
    })

    nextLayer.on('tileerror', () => {
      if (!active || layer !== nextLayer) return
      failedTiles += 1

      // One missing edge tile should not replace the whole map. Several errors
      // in the initial viewport indicate that the provider itself is unavailable.
      if (failedTiles < 3) return

      if (providerIndex < TILE_PROVIDERS.length - 1) {
        map.removeLayer(nextLayer)
        providerIndex += 1
        mountProvider()
      } else {
        onStatus?.('error')
      }
    })

    nextLayer.addTo(map)
  }

  onStatus?.('loading')
  mountProvider()

  return () => {
    active = false
    layer?.off()
    if (layer && map.hasLayer(layer)) map.removeLayer(layer)
  }
}
