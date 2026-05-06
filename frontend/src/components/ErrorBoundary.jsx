import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack ?? '');
  }

  render() {
    if (this.state.hasError) {
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
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded border border-red-500/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/10"
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
