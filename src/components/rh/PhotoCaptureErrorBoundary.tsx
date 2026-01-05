import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary específico para PhotoCapture
 * Captura e ignora erros insertBefore durante transições de renderização
 */
export class PhotoCaptureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Verificar se é um erro insertBefore ou removeChild
    const isInsertBeforeError = error.message?.includes('insertBefore') || 
                                 error.message?.includes('insertBefore');
    const isRemoveChildError = error.message?.includes('removeChild') || 
                               error.message?.includes('not a child');
    const isNotFoundError = error.name === 'NotFoundError';

    // Se for um erro de DOM relacionado a insertBefore/removeChild, ignorar silenciosamente
    if ((isInsertBeforeError || isRemoveChildError || isNotFoundError) && 
        (error.message?.includes('Node') || error.message?.includes('child'))) {
      console.warn('[PhotoCaptureErrorBoundary] ⚠️ Erro de DOM capturado e ignorado:', {
        error: error.message,
        type: isInsertBeforeError ? 'insertBefore' : isRemoveChildError ? 'removeChild' : 'NotFoundError',
        timestamp: new Date().toISOString()
      });
      // Não marcar como erro - permitir que o componente continue renderizando
      return { hasError: false, error: null };
    }

    // Para outros erros, marcar como erro real
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isInsertBeforeError = error.message?.includes('insertBefore') || 
                                 error.message?.includes('insertBefore');
    const isRemoveChildError = error.message?.includes('removeChild') || 
                               error.message?.includes('not a child');
    const isNotFoundError = error.name === 'NotFoundError';

    // Se for erro de DOM, apenas logar e não chamar onError
    if ((isInsertBeforeError || isRemoveChildError || isNotFoundError) && 
        (error.message?.includes('Node') || error.message?.includes('child'))) {
      // Já logado em getDerivedStateFromError
      return;
    }

    // Para outros erros, chamar callback se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error('[PhotoCaptureErrorBoundary] Erro capturado:', error, errorInfo);
    }
  }

  render() {
    // Se tiver erro real (não DOM), mostrar fallback
    if (this.state.hasError && this.state.error) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Erro ao renderizar componente de foto. Tente novamente.
          </p>
        </div>
      );
    }

    // Para erros DOM (insertBefore), continuar renderizando normalmente
    return this.props.children;
  }
}

