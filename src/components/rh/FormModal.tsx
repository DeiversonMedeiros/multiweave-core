import React, { useRef, cloneElement, isValidElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  showCloseButton?: boolean;
  showFooter?: boolean;
  className?: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  loading = false,
  disabled = false,
  size = 'lg',
  showCloseButton = true,
  showFooter = true,
  className = '',
}: FormModalProps) {
  const formRef = useRef<{ submit?: () => void } | HTMLFormElement | null>(null);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleSubmit = () => {
    console.log('🔍 [DEBUG] FormModal - handleSubmit chamado');
    console.log('🔍 [DEBUG] FormModal - formRef.current:', formRef.current);
    console.log('🔍 [DEBUG] FormModal - onSubmit:', onSubmit);
    
    // Usar a função submit exposta pelo componente filho
    if (formRef.current && typeof formRef.current.submit === 'function') {
      console.log('🔍 [DEBUG] FormModal - Chamando submit via ref');
      formRef.current.submit();
    } else if (onSubmit) {
      console.log('🔍 [DEBUG] FormModal - Chamando onSubmit diretamente');
      onSubmit();
    } else {
      console.log('🔍 [DEBUG] FormModal - Nenhuma ação de submit disponível');
    }
  };


  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      case '2xl':
        return 'max-w-2xl';
      case '3xl':
        return 'max-w-3xl';
      case '4xl':
        return 'max-w-4xl';
      case '5xl':
        return 'max-w-5xl';
      case '6xl':
        return 'max-w-6xl';
      case '7xl':
        return 'max-w-7xl';
      default:
        return 'max-w-lg';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${getSizeClass(size)} ${className}`}
        onPointerDownOutside={(e) => {
          if (loading) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (loading) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {description || 'Preencha os campos abaixo conforme necessário.'}
              </DialogDescription>
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto">
            {isValidElement(children) && showFooter && onSubmit
              ? cloneElement(children, { ref: formRef })
              : children
            }
          </div>

          {/* Footer */}
          {showFooter && (
            <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              {onSubmit && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || disabled}
                  className="min-w-[100px]"
                >
                  {loading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {submitLabel}
                </Button>
              )}
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// COMPONENTE DE MODAL SIMPLES
// =====================================================

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  showCloseButton?: boolean;
  className?: string;
}

export function SimpleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'lg',
  showCloseButton = true,
  className = '',
}: SimpleModalProps) {
  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      case '2xl':
        return 'max-w-2xl';
      case '3xl':
        return 'max-w-3xl';
      case '4xl':
        return 'max-w-4xl';
      case '5xl':
        return 'max-w-5xl';
      case '6xl':
        return 'max-w-6xl';
      case '7xl':
        return 'max-w-7xl';
      default:
        return 'max-w-lg';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${getSizeClass(size)} ${className}`}
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// COMPONENTE DE MODAL DE CONFIRMAÇÃO
// =====================================================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={loading}
            className="min-w-[100px]"
          >
            {loading && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}