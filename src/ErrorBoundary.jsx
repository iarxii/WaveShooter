import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log once to console; in production this could POST to a logging service.
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  handleReload = () => {
    // Full page reload to recover from unrecoverable errors
    window.location.reload()
  }

  handleDismiss = () => {
    this.setState({ hasError: false, error: null })
    if (typeof this.props.onReset === 'function') {
      try { this.props.onReset() } catch { /* ignore */ }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-card">
            <h3>Something went wrong</h3>
            <p className="small" style={{opacity:0.8}}>The app hit an unexpected error. You can reload or dismiss to try continuing.</p>
            {import.meta.env.MODE !== 'production' && this.state.error && (
              <pre className="error-details">{String(this.state.error?.message || this.state.error)}</pre>
            )}
            <div className="error-actions">
              <button className="button" onClick={this.handleReload}>Reload</button>
              <button className="button" onClick={this.handleDismiss} style={{marginLeft:8}}>Dismiss</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
