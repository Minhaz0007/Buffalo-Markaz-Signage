import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-mosque-navy text-white p-8">
          <h2 className="text-4xl font-bold text-red-500 mb-4">Something went wrong.</h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl text-center">
            The application encountered an error. Please try refreshing the page.
          </p>
          <div className="bg-black/30 p-4 rounded border border-white/10 max-w-4xl overflow-auto">
            <pre className="text-sm font-mono text-red-300">
              {this.state.error?.toString()}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-3 bg-mosque-gold text-mosque-navy font-bold rounded hover:bg-white transition-colors"
          >
            Reload Application
          </button>
          <button
            onClick={() => {
                localStorage.clear();
                window.location.reload();
            }}
            className="mt-4 px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
          >
            Reset Settings & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
