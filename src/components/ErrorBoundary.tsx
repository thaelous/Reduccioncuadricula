import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un fallo de renderizado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="error-boundary-fallback"
          className="h-full w-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-stone-950 text-stone-100 select-none"
        >
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {this.props.fallbackTitle || 'Error al cargar el modo multijugador'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Ocurrió un problema temporal al montar la sala o los datos de sincronización. La aplicación aisló el fallo para evitar una pantalla en negro.
            </p>
            {this.state.error?.message && (
              <pre className="text-[11px] bg-stone-950 text-stone-400 p-3 rounded-xl border border-stone-800 font-mono w-full overflow-x-auto text-left max-h-28">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar conexión</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
