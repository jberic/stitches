import { Component, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface State {
  crashed: boolean
}

/**
 * If anything below it throws while drawing the page, this shows a plain
 * message and a Reload button instead of a blank screen. The link keeps the
 * words and settings, so reloading picks up where you were.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <div className="crashed" role="alert">
        <h2>Something went wrong</h2>
        <p>Reload the page to carry on. Your words and settings are kept.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
