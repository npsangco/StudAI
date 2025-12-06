import React from 'react';

/**
 * Error Boundary Component - Catches all unhandled errors in React components
 * Prevents white screen of death and shows user-friendly error message
 * Industry standard used by Kahoot, Quizizz, and all major quiz platforms
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('🚨 Error Boundary caught an error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);

    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Optional: Send to error tracking service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoBack = () => {
    // Clear error state and go back
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when error occurs
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center px-4">
          <div className="text-center bg-white/20 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-white/40 max-w-md w-full">
            {/* Friendly emoji */}
            <div className="text-5xl sm:text-6xl mb-4 animate-bounce">😅</div>

            {/* Error heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-black drop-shadow-sm mb-3">
              Oops! Something went wrong
            </h2>

            {/* Reassuring message */}
            <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
              Don't worry, your progress is safe. This is just a small hiccup.
              Click below to continue your quiz experience.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn-branded-yellow text-black font-bold px-6 sm:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/40 hover:scale-105"
              >
                🔄 Reload Page
              </button>
              <button
                onClick={this.handleGoBack}
                className="bg-white/30 backdrop-blur-md text-black font-semibold px-6 sm:px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-white/40 hover:bg-white/40"
              >
                ← Go Back
              </button>
            </div>

            {/* Debug info (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  🔧 Developer Info (Click to expand)
                </summary>
                <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200 text-xs overflow-auto max-h-48">
                  <p className="font-bold text-red-800 mb-2">Error:</p>
                  <pre className="text-red-700 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <p className="font-bold text-red-800 mt-3 mb-2">Component Stack:</p>
                      <pre className="text-red-700 whitespace-pre-wrap break-words text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
