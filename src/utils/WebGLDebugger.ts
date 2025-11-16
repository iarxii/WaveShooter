// Debug logging utility for WebGL and performance monitoring
class WebGLDebugger {
  constructor() {
    this.logs = []
    this.maxLogs = 1000
    this.contextLost = false
    this.contextListenersAttached = false
    this.startTime = performance.now()

    this.setupContextLossDetection()
    this.setupPerformanceMonitoring()
  }

  log(level, category, message, data = {}) {
    const entry = {
      timestamp: performance.now() - this.startTime,
      level,
      category,
      message,
      data,
      stack: level === 'error' ? new Error().stack : undefined
    }

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    const logMethod = level === 'error' ? console.error :
                     level === 'warn' ? console.warn :
                     level === 'info' ? console.info : console.log

    logMethod(`[${category}] ${message}`, data)
  }

  setupContextLossDetection() {
    // Use a mutation observer to wait for canvas to be added to DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'CANVAS') {
            this.attachContextLossListeners(node as HTMLCanvasElement)
          }
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Also check for existing canvas
    const existingCanvas = document.querySelector('canvas')
    if (existingCanvas) {
      this.attachContextLossListeners(existingCanvas)
    }
  }

  attachContextLossListeners(canvas: HTMLCanvasElement) {
    if (this.contextListenersAttached) return
    this.contextListenersAttached = true

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      this.contextLost = true
      this.log('error', 'WebGL', 'Context lost', {
        timestamp: performance.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        canvas: canvas.id || 'unnamed'
      })

      // Try to restore context
      setTimeout(() => {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (gl) {
          this.log('info', 'WebGL', 'Context restoration successful')
        } else {
          this.log('error', 'WebGL', 'Context restoration failed')
        }
      }, 100)
    })

    canvas.addEventListener('webglcontextrestored', (event) => {
      this.contextLost = false
      this.log('info', 'WebGL', 'Context restored', {
        timestamp: performance.now()
      })
    })

    this.log('info', 'WebGL', 'Context loss detection attached to canvas')
  }

  setupPerformanceMonitoring() {
    let frameCount = 0
    let lastTime = performance.now()

    const monitorFrame = () => {
      frameCount++
      const now = performance.now()
      const delta = now - lastTime

      if (delta > 16.67 * 2) { // More than 2 frames worth of time
        this.log('warn', 'Performance', `Frame time spike: ${delta.toFixed(2)}ms`, {
          frameCount,
          delta,
          memory: this.getMemoryInfo()
        })
      }

      if (frameCount % 60 === 0) { // Log every ~1 second at 60fps
        this.log('info', 'Performance', `Frame ${frameCount}`, {
          fps: 1000 / delta,
          memory: this.getMemoryInfo()
        })
      }

      lastTime = now
      requestAnimationFrame(monitorFrame)
    }

    requestAnimationFrame(monitorFrame)
  }

  getMemoryInfo(): { used: number; total: number; limit: number } | null {
    if ('memory' in performance) {
      const mem = (performance as any).memory
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit
      }
    }
    return null
  }

  logMaterialEvent(action, materialType, shaderKey, data = {}) {
    this.log('info', 'Material', `${action}: ${materialType} (${shaderKey})`, {
      ...data,
      totalMaterials: this.logs.filter(l => l.category === 'Material').length
    })
  }

  logShaderEvent(action, shaderKey, success = true, data = {}) {
    this.log(success ? 'info' : 'error', 'Shader', `${action}: ${shaderKey}`, data)
  }

  getLogs(category = null, level = null) {
    return this.logs.filter(log =>
      (!category || log.category === category) &&
      (!level || log.level === level)
    )
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Global instance
export const webglDebugger = new WebGLDebugger()

// Make debugger available globally for console access
if (typeof window !== 'undefined') {
  (window as any).webglDebugger = webglDebugger
}

// Convenience functions
export const logMaterial = (action, materialType, shaderKey, data) =>
  webglDebugger.logMaterialEvent(action, materialType, shaderKey, data)

export const logShader = (action, shaderKey, success, data) =>
  webglDebugger.logShaderEvent(action, shaderKey, success, data)

export const logWebGL = (level, message, data) =>
  webglDebugger.log(level, 'WebGL', message, data)

export const logPerformance = (level, message, data) =>
  webglDebugger.log(level, 'Performance', message, data)