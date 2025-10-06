import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Download,
  Copy,
  Archive,
  User,
  Calendar,
  FileText,
} from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================

interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive' | 'outline';
  condition?: (item: any) => boolean;
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
}

interface TableActionsProps {
  item: any;
  actions?: ActionItem[];
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onDownload?: (item: any) => void;
  onCopy?: (item: any) => void;
  onArchive?: (item: any) => void;
  showDefaultActions?: boolean;
  showViewAction?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  showDownloadAction?: boolean;
  showCopyAction?: boolean;
  showArchiveAction?: boolean;
  deleteConfirmationTitle?: string;
  deleteConfirmationMessage?: string;
  className?: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function TableActions({
  item,
  actions = [],
  onView,
  onEdit,
  onDelete,
  onDownload,
  onCopy,
  onArchive,
  showDefaultActions = true,
  showViewAction = true,
  showEditAction = true,
  showDeleteAction = true,
  showDownloadAction = false,
  showCopyAction = false,
  showArchiveAction = false,
  deleteConfirmationTitle = 'Confirmar Exclusão',
  deleteConfirmationMessage = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
  className = '',
}: TableActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<ActionItem | null>(null);

  // Ações padrão
  const defaultActions: ActionItem[] = [];

  if (showViewAction && onView) {
    defaultActions.push({
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: onView,
      variant: 'default',
    });
  }

  if (showEditAction && onEdit) {
    defaultActions.push({
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit,
      variant: 'default',
    });
  }

  if (showDownloadAction && onDownload) {
    defaultActions.push({
      label: 'Download',
      icon: <Download className="h-4 w-4" />,
      onClick: onDownload,
      variant: 'outline',
    });
  }

  if (showCopyAction && onCopy) {
    defaultActions.push({
      label: 'Copiar',
      icon: <Copy className="h-4 w-4" />,
      onClick: onCopy,
      variant: 'outline',
    });
  }

  if (showArchiveAction && onArchive) {
    defaultActions.push({
      label: 'Arquivar',
      icon: <Archive className="h-4 w-4" />,
      onClick: onArchive,
      variant: 'outline',
    });
  }

  if (showDeleteAction && onDelete) {
    defaultActions.push({
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {
        setActionToConfirm({
          label: 'Excluir',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: onDelete,
          variant: 'destructive',
        });
        setShowDeleteDialog(true);
      },
      variant: 'destructive',
    });
  }

  // Combinar ações padrão com ações customizadas
  const allActions = showDefaultActions ? [...defaultActions, ...actions] : actions;

  // Filtrar ações baseado nas condições
  const availableActions = allActions.filter(action => 
    !action.condition || action.condition(item)
  );

  if (availableActions.length === 0) {
    return null;
  }

  const handleActionClick = (action: ActionItem) => {
    if (action.requiresConfirmation) {
      setActionToConfirm(action);
      setShowDeleteDialog(true);
    } else {
      action.onClick(item);
    }
  };

  const handleConfirmAction = () => {
    if (actionToConfirm) {
      actionToConfirm.onClick(item);
    }
    setShowDeleteDialog(false);
    setActionToConfirm(null);
  };

  const handleCancelAction = () => {
    setShowDeleteDialog(false);
    setActionToConfirm(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableActions.map((action, index) => (
            <React.Fragment key={index}>
              <DropdownMenuItem
                onClick={() => handleActionClick(action)}
                className={`${
                  action.variant === 'destructive' 
                    ? 'text-red-600 focus:text-red-600' 
                    : ''
                }`}
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </DropdownMenuItem>
              {index < availableActions.length - 1 && <DropdownMenuSeparator />}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionToConfirm?.confirmationTitle || deleteConfirmationTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm?.confirmationMessage || deleteConfirmationMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={actionToConfirm?.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =====================================================
// COMPONENTE DE AÇÕES SIMPLES (SEM DROPDOWN)
// =====================================================

interface SimpleActionsProps {
  item: any;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  showViewAction?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function SimpleActions({
  item,
  onView,
  onEdit,
  onDelete,
  showViewAction = true,
  showEditAction = true,
  showDeleteAction = true,
  size = 'sm',
  variant = 'outline',
  className = '',
}: SimpleActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className={`flex items-center space-x-1 ${className}`}>
        {showViewAction && onView && (
          <Button
            variant={variant}
            size={size}
            onClick={() => onView(item)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        
        {showEditAction && onEdit && (
          <Button
            variant={variant}
            size={size}
            onClick={() => onEdit(item)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        
        {showDeleteAction && onDelete && (
          <Button
            variant="destructive"
            size={size}
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TableActions;
