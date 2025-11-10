declare module '*.glb' {
  const src: string
  export default src
}

declare module '*.fbx' {
  const src: string
  export default src
}

declare module '*.hdr' {
  const src: string
  export default src
}

// Allow importing text via Vite raw query
declare module '*?raw' {
  const src: string
  export default src
}
