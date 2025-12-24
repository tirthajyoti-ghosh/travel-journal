declare module 'leaflet-image' {
  import * as L from 'leaflet';

  /**
   * Generate an image from a Leaflet map
   * @param map - The Leaflet map instance
   * @param callback - Callback function that receives error and canvas
   */
  function leafletImage(
    map: L.Map,
    callback: (err: Error | null, canvas: HTMLCanvasElement) => void
  ): void;

  export default leafletImage;
}

