// =====================================================
// COMPONENTE DE IMAGEM COM LAZY LOADING
// Sistema ERP MultiWeave Core
// =====================================================

import { useState, useRef, useEffect } from 'react';
import { getCachedImageUrl } from '@/lib/imageOptimization';

export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de imagem com lazy loading usando Intersection Observer
 * 
 * @example
 * <LazyImage 
 *   src="/path/to/image.jpg"
 *   alt="Descrição"
 *   className="w-full h-auto"
 * />
 */
export function LazyImage({
  src,
  alt,
  className = '',
  priority = false,
  placeholder,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Se priority, carregar imediatamente
    if (priority) {
      setIsInView(true);
      return;
    }

    // Verificar se Intersection Observer é suportado
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: carregar imediatamente se não suportado
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Começar a carregar 50px antes de entrar na viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Obter URL do cache se disponível
  const imageUrl = isInView ? getCachedImageUrl(src) : undefined;

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && !hasError && placeholder && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ backgroundImage: placeholder ? `url(${placeholder})` : undefined }}
        >
          {!placeholder && (
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

