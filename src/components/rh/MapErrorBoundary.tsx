// =====================================================
// ERROR BOUNDARY PARA COMPONENTES DE MAPA
// =====================================================
// Descrição: Captura erros de renderização do Leaflet/React
//            especialmente erros de removeChild que podem ocorrer
//            em dispositivos mais antigos

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Verificar se é um erro de DOM (geralmente inofensivo em navegadores antigos)
    const isRemoveChildError = error.message?.includes('removeChild') || 
                               error.message?.includes('not a child');
    const isInsertBeforeError = error.message?.includes('insertBefore');
    const isReusedError = error.message?.includes('reused by another instance');
    
    if (isRemoveChildError || isInsertBeforeError || isReusedError) {
      // Para erros de DOM, não mostrar erro ao usuário
      // apenas logar e continuar
      const errorType = isReusedError ? 'reutilização de container' : 
                       isInsertBeforeError ? 'insertBefore' : 'removeChild';
      console.warn(`[MapErrorBoundary] ⚠️ Erro de ${errorType} capturado (ignorado):`, error.message);
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Verificar se é um erro de DOM (geralmente inofensivo em navegadores antigos)
    const isRemoveChildError = error.message?.includes('removeChild') || 
                               error.message?.includes('not a child');
    const isInsertBeforeError = error.message?.includes('insertBefore');
    const isReusedError = error.message?.includes('reused by another instance');
    
    if (isRemoveChildError || isInsertBeforeError || isReusedError) {
      // Ignorar erros de DOM - são geralmente inofensivos em navegadores antigos
      const errorType = isReusedError ? 'reutilização de container' : 
                       isInsertBeforeError ? 'insertBefore' : 'removeChild';
      console.warn(`[MapErrorBoundary] ⚠️ Erro de ${errorType} em componentDidCatch (ignorado)`);
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
      return;
    }

    console.error('[MapErrorBoundary] ❌ Erro capturado:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar o mapa. Por favor, tente novamente.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

