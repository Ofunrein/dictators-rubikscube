import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error, prevState) {
    // Ignore errors thrown during recovery (children haven't been replaced yet)
    if (prevState && prevState.recovering) {
      return null;
    }
    return { hasError: true, error, recovering: false };
  }

  componentDidCatch(error, info) {
    if (!this.state.recovering) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, recovering: true });
  };

  componentDidUpdate(prevProps) {
    // Once children have changed (parent provided new children), stop recovering
    if (this.state.recovering && prevProps.children !== this.props.children) {
      this.setState({ recovering: false });
    }
  }

  render() {
    if (this.state.hasError && !this.state.recovering) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="p-8 text-center">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-red-500">
              Something went wrong
            </p>
            <p className="mb-6 font-mono text-sm text-gray-400">
              {this.state.error?.message}
            </p>
            <button
              onClick={this.handleReset}
              className="rounded border border-red-500/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    if (this.state.recovering) {
      return null;
    }
    return this.props.children;
  }
}
