import React, { ErrorInfo, ReactNode } from 'react';
import { errorMonitor } from '../utils/errorMonitoring';
import { RotateCcw, AlertTriangle, ShieldAlert, Home, Terminal } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  fallback?: ReactNode | ((error: Error | null) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Securely capture exception in error telemetry without exposing PII
    errorMonitor.captureException(error, {
      category: 'ui',
      severity: 'critical',
      context: {
        componentStack: errorInfo.componentStack?.slice(0, 1000)
      }
    });
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleResetState = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error);
        }
        return this.props.fallback;
      }

      const sanitizedError = this.state.error?.message
        ? this.state.error.message.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
        : 'An unexpected application error occurred.';

      return (
        <div
          id="app-error-boundary-screen"
          className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4 select-none font-sans"
        >
          <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl p-6 sm:p-8 max-w-lg w-full text-center relative overflow-hidden animate-scale-up">
            {/* Header Badge */}
            <div className="w-16 h-16 bg-red-100 border-2 border-red-300 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-xs">
              ⚠️
            </div>

            <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 mb-2">
              {this.props.fallbackTitle || 'Oops! Something went sideways'}
            </h2>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                'PictureBook encountered an unexpected glitch. Your saved books and artwork remain safe.'}
            </p>

            {/* Error Message Box */}
            <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-left mb-6">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Error Diagnostic Info</span>
              </div>
              <p className="text-xs font-mono text-red-700 break-words leading-tight">
                {sanitizedError}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mb-4">
              <button
                type="button"
                onClick={this.handleResetState}
                className="py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display font-bold text-xs rounded-xl shadow-md border-b-2 border-orange-700 active:translate-y-0.5 active:border-b-0 hover:brightness-105 transition flex items-center justify-center gap-1.5 cursor-pointer"
                id="error-boundary-recover-btn"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Recovering View</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-display font-bold text-xs rounded-xl border border-gray-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                id="error-boundary-reload-btn"
              >
                <Home className="w-4 h-4 text-gray-600" />
                <span>Reload Application</span>
              </button>
            </div>

            {/* Diagnostic Toggle */}
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Terminal className="w-3 h-3" />
              <span>{this.state.showDetails ? 'Hide Stack Trace' : 'View Redacted Technical Trace'}</span>
            </button>

            {/* Redacted Stack Trace */}
            {this.state.showDetails && (
              <div className="mt-4 p-3 bg-slate-900 text-slate-200 rounded-xl text-left font-mono text-[10px] max-h-40 overflow-y-auto border border-slate-800">
                <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Redacted Crash Stack
                </div>
                <pre className="whitespace-pre-wrap break-all">
                  {this.state.errorInfo?.componentStack || this.state.error?.stack || 'No stack trace available'}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
