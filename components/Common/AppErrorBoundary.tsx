import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado ao renderizar a interface.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro capturado pela AppErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-500/10 p-3 text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black">Falha ao carregar a tela</h2>
              <p className="text-sm text-zinc-400">O app evitou cair em uma tela preta e capturou o erro de execução.</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-300">
            {this.state.message}
          </div>

          <button
            onClick={this.handleReload}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-safety-yellow px-4 py-3 font-bold text-black hover:bg-yellow-400"
          >
            <RefreshCw size={16} />
            Recarregar app
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
