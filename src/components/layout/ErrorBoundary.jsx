import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error boundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="boundary-screen" role="alert">
        <div className="boundary-card">
          <div className="boundary-icon">
            <AlertTriangle size={28} />
          </div>
          <h1 className="boundary-title">Something went sideways</h1>
          <p className="boundary-desc">
            Savvr hit an unexpected snag rendering this view. Your data is safe and stored locally.
          </p>
          {this.state.error?.message && (
            <pre className="boundary-trace">{this.state.error.message}</pre>
          )}
          <div className="boundary-actions">
            <button type="button" className="btn btn-ghost" onClick={this.handleReset}>
              Try again
            </button>
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>
              <RefreshCw size={16} /> Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
