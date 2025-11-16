import React, { useState, useEffect } from 'react'
import { webglDebugger } from '../utils/WebGLDebugger'

export function DebugPanel() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const allLogs = webglDebugger.getLogs()
      setLogs(allLogs.slice(-50)) // Show last 50 logs
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log =>
    filter === 'all' || log.category.toLowerCase() === filter
  )

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return '#ff6b6b'
      case 'warn': return '#ffa500'
      case 'info': return '#87ceeb'
      default: return '#ffffff'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          border: '1px solid #333',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Debug
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '500px',
      height: '400px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      border: '1px solid #333',
      borderRadius: '8px',
      zIndex: 10000,
      fontFamily: 'monospace',
      fontSize: '11px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '8px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>WebGL Debug Panel</h3>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              background: '#333',
              color: 'white',
              border: 'none',
              padding: '2px 4px',
              marginRight: '8px'
            }}
          >
            <option value="all">All</option>
            <option value="webgl">WebGL</option>
            <option value="material">Material</option>
            <option value="shader">Shader</option>
            <option value="performance">Performance</option>
          </select>
          <button
            onClick={() => {
              const data = webglDebugger.exportLogs()
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `webgl-debug-${Date.now()}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            style={{
              background: '#444',
              color: 'white',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '2px',
              cursor: 'pointer',
              marginRight: '4px'
            }}
          >
            Export
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
      }}>
        {filteredLogs.map((log, i) => (
          <div key={i} style={{
            marginBottom: '4px',
            padding: '2px 4px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '2px',
            borderLeft: `3px solid ${getLogColor(log.level)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: getLogColor(log.level), fontWeight: 'bold' }}>
                [{log.category}]
              </span>
              <span style={{ color: '#888', fontSize: '10px' }}>
                {log.timestamp.toFixed(0)}ms
              </span>
            </div>
            <div>{log.message}</div>
            {Object.keys(log.data).length > 0 && (
              <div style={{ color: '#ccc', fontSize: '10px', marginTop: '2px' }}>
                {JSON.stringify(log.data)}
              </div>
            )}
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            No logs to display
          </div>
        )}
      </div>
    </div>
  )
}