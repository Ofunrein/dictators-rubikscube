import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-dictator-dark flex items-center justify-center text-dictator-chrome font-mono text-sm">
          <div className="text-center space-y-3">
            <p className="text-dictator-red text-base">Something went wrong.</p>
            <p className="opacity-60">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 border border-dictator-chrome/30 rounded hover:border-dictator-red transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
