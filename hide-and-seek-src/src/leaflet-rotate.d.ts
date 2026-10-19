// Typene leaflet-rotate legger til på kartet. Pakken har ingen egne typer.
import 'leaflet'

declare module 'leaflet' {
  interface MapOptions {
    rotate?: boolean
    touchRotate?: boolean
    shiftKeyRotate?: boolean
    rotateControl?: boolean | object
    bearing?: number
  }
  interface Map {
    /** Grader med klokken. 0 = nord opp. */
    setBearing(deg: number): this
    getBearing(): number
    touchRotate: Handler
    compassBearing: Handler
  }
}
