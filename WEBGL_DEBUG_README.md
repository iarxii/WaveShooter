# WebGL Debugging System

This system provides comprehensive logging and monitoring for WebGL context issues, material creation, shader compilation, and performance problems.

## Features

- **WebGL Context Monitoring**: Detects context loss and restoration events
- **Material Logging**: Tracks material creation, caching, and property updates
- **Shader Compilation Monitoring**: Logs shader compilation success/failure
- **Performance Monitoring**: Tracks frame times, memory usage, and performance spikes
- **Real-time Debug Panel**: Visual interface to view logs in real-time
- **Export Functionality**: Export logs as JSON for analysis

## Usage

### Debug Panel
A "Debug" button appears in the top-right corner of the SceneViewer. Click it to open the debug panel.

### Console Access
Access the debugger globally via `window.webglDebugger`:

```javascript
// Get all logs
window.webglDebugger.getLogs()

// Get logs by category
window.webglDebugger.getLogs('WebGL')
window.webglDebugger.getLogs('Material')
window.webglDebugger.getLogs('Shader')
window.webglDebugger.getLogs('Performance')

// Get logs by level
window.webglDebugger.getLogs(null, 'error')

// Export all logs
window.webglDebugger.exportLogs()
```

### Log Categories

- **WebGL**: Context events, renderer configuration
- **Material**: Material creation, caching, property updates
- **Shader**: Shader compilation, loading, errors
- **Performance**: Frame timing, memory usage, spikes

### Common Issues to Monitor

1. **Context Loss**: Look for "Context lost" messages
2. **Shader Failures**: "compile_failed" messages indicate shader compilation issues
3. **Performance Spikes**: Frame times > 16.67ms indicate performance problems
4. **Memory Leaks**: Increasing memory usage over time
5. **Material Recreation**: Frequent material creation may indicate optimization issues

### Troubleshooting Steps

1. Open the debug panel and monitor for errors
2. Check browser console for additional WebGL errors
3. Export logs when issues occur: `window.webglDebugger.exportLogs()`
4. Look for patterns in material creation frequency
5. Monitor memory usage for leaks

### Log Analysis

Each log entry contains:
- `timestamp`: Time since debugger initialization (ms)
- `level`: 'info', 'warn', 'error'
- `category`: Log category
- `message`: Human-readable message
- `data`: Additional structured data
- `stack`: Error stack trace (for errors)

### Performance Metrics

The debugger tracks:
- Frame render times
- Memory usage (if available)
- Material creation frequency
- Shader compilation times
- WebGL context events