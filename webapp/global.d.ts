// Global type declarations

// Allow importing CSS files
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Allow importing CSS files as side effects
declare module 'leaflet/dist/leaflet.css';

