// =====================================================
// ERROR BOUNDARY GLOBAL PARA APLICAÇÃO
// =====================================================
// Descrição: Captura erros de renderização do React em toda a aplicação
//            especialmente erros de insertBefore/removeChild que podem ocorrer
//            em navegadores/webviews móveis antigos

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDOMError: boolean;
  retryCount: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDOMError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Verificar se é um erro de DOM (insertBefore, removeChild, etc)
    const isInsertBeforeError = error.message?.includes('insertBefore') || 
                                error.message?.includes('not a child');
    const isRemoveChildError = error.message?.includes('removeChild');
    const isDOMError = isInsertBeforeError || isRemoveChildError;
    
    // Se for erro de DOM, tentar recuperar automaticamente
    if (isDOMError) {
      console.warn('[GlobalErrorBoundary] ⚠️ Erro de DOM detectado, tentando recuperar:', {
        message: error.message,
        type: isInsertBeforeError ? 'insertBefore' : 'removeChild',
        userAgent: navigator.userAgent
      });
      
      // Retornar estado que permite recuperação
      return {
        hasError: false, // Não marcar como erro para permitir retry
        error: null,
        isDOMError: true
      };
    }
    
    return {
      hasError: true,
      error,
      isDOMError: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isInsertBeforeError = error.message?.includes('insertBefore') || 
                                error.message?.includes('not a child');
    const isRemoveChildError = error.message?.includes('removeChild');
    const isDOMError = isInsertBeforeError || isRemoveChildError;
    
    // Log detalhado do erro
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      isDOMError,
      errorType: isInsertBeforeError ? 'insertBefore' : 
                 isRemoveChildError ? 'removeChild' : 'other'
    };
    
    if (isDOMError) {
      // Para erros de DOM, logar como warning e tentar recuperar
      console.warn('[GlobalErrorBoundary] ⚠️ Erro de DOM capturado (tentando recuperar):', errorDetails);
      
      // Tentar recuperar após um pequeno delay
      setTimeout(() => {
        if (this.state.retryCount < 3) {
          console.log(`[GlobalErrorBoundary] 🔄 Tentativa de recuperação ${this.state.retryCount + 1}/3`);
          this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1
          }));
        }
      }, 100);
      
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
      return;
    }
    
    // Para erros reais, logar como erro
    console.error('[GlobalErrorBoundary] ❌ Erro capturado:', errorDetails);
    
    this.setState({
      errorInfo,
      isDOMError: false
    });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  handleReload = () => {
    // Limpar caches e recarregar
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  render() {
    // Se for erro de DOM e ainda não excedeu tentativas, continuar renderizando
    if (this.state.isDOMError && this.state.retryCount < 3) {
      return this.props.children;
    }
    
    // Se tiver erro real, mostrar fallback
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isOldBrowser = /Chrome\/[1-6][0-9]|Safari\/[1-9][0-9][0-9]|Version\/[1-9]\./.test(navigator.userAgent);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Alert className="max-w-2xl" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-lg font-semibold mb-2">
              Erro ao carregar a aplicação
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm">
                Ocorreu um erro inesperado ao renderizar a aplicação. 
                {isMobile && isOldBrowser && (
                  <span className="block mt-2 text-xs text-gray-600">
                    Detectamos que você está usando um navegador mais antigo. 
                    Tente atualizar o navegador ou usar uma versão mais recente.
                  </span>
                )}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer font-semibold mb-2">
                    Detalhes do erro (modo desenvolvimento)
                  </summary>
                  <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.error.stack && (
                      <div className="mt-2">
                        <strong>Stack:</strong>
                        <pre className="mt-1">{this.state.error.stack}</pre>
                      </div>
                    )}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button 
                  onClick={this.handleReload}
                  variant="default"
                  size="sm"
                >
                  Recarregar página
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

