import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  UserMinus,
  Copy,
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// =====================================================
// INTERFACES
// =====================================================

interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  confirm?: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
  };
}

interface TableActionsProps {
  item: any;
  actions?: ActionItem[];
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onStatusChange?: (item: any, status: string) => void;
  customActions?: ActionItem[];
  showDropdown?: boolean;
  showInline?: boolean;
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
  onStatusChange,
  customActions = [],
  showDropdown = true,
  showInline = false,
}: TableActionsProps) {
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    action: ActionItem | null;
  }>({
    isOpen: false,
    action: null,
  });

  // Ações padrão
  const defaultActions: ActionItem[] = [
    ...(onView ? [{
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => onView(item),
      variant: 'ghost' as const,
    }] : []),
    ...(onEdit ? [{
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => onEdit(item),
      variant: 'ghost' as const,
    }] : []),
    ...(onDelete ? [{
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete(item),
      variant: 'destructive' as const,
      confirm: {
        title: 'Confirmar exclusão',
        description: 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      },
    }] : []),
  ];

  // Ações de status (se aplicável)
  const statusActions: ActionItem[] = onStatusChange ? [
    {
      label: 'Ativar',
      icon: <UserCheck className="h-4 w-4" />,
      onClick: () => onStatusChange(item, 'ativo'),
      variant: 'ghost' as const,
      disabled: item.status === 'ativo',
    },
    {
      label: 'Inativar',
      icon: <UserX className="h-4 w-4" />,
      onClick: () => onStatusChange(item, 'inativo'),
      variant: 'ghost' as const,
      disabled: item.status === 'inativo',
    },
    {
      label: 'Demitir',
      icon: <UserMinus className="h-4 w-4" />,
      onClick: () => onStatusChange(item, 'demitido'),
      variant: 'destructive' as const,
      disabled: item.status === 'demitido',
      confirm: {
        title: 'Confirmar demissão',
        description: 'Tem certeza que deseja demitir este funcionário?',
        confirmText: 'Demitir',
        cancelText: 'Cancelar',
      },
    },
  ] : [];

  // Combinar todas as ações
  const allActions = [
    ...defaultActions,
    ...statusActions,
    ...customActions,
    ...actions,
  ];

  // Função para executar ação
  const handleAction = (action: ActionItem) => {
    if (action.confirm) {
      setConfirmDialog({
        isOpen: true,
        action,
      });
    } else {
      action.onClick();
    }
  };

  // Função para confirmar ação
  const handleConfirm = () => {
    if (confirmDialog.action) {
      confirmDialog.action.onClick();
    }
    setConfirmDialog({
      isOpen: false,
      action: null,
    });
  };

  // Função para cancelar confirmação
  const handleCancel = () => {
    setConfirmDialog({
      isOpen: false,
      action: null,
    });
  };

  // Renderizar ações inline
  if (showInline && !showDropdown) {
    return (
      <div className="flex items-center gap-1">
        {allActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'ghost'}
            size="sm"
            onClick={() => handleAction(action)}
            disabled={action.disabled}
            className="h-8 w-8 p-0"
          >
            {action.icon}
            <span className="sr-only">{action.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  // Renderizar dropdown
  if (showDropdown && allActions.length > 0) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => handleAction(action)}
                disabled={action.disabled}
                className={action.variant === 'destructive' ? 'text-destructive' : ''}
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dialog de confirmação */}
        <AlertDialog open={confirmDialog.isOpen} onOpenChange={handleCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.action?.confirm?.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.action?.confirm?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>
                {confirmDialog.action?.confirm?.cancelText || 'Cancelar'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className={confirmDialog.action?.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {confirmDialog.action?.confirm?.confirmText || 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return null;
}

// =====================================================
// COMPONENTE DE STATUS
// =====================================================

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ativo':
        return { label: 'Ativo', variant: 'default' as const, className: 'bg-green-100 text-green-800' };
      case 'inativo':
        return { label: 'Inativo', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' };
      case 'afastado':
        return { label: 'Afastado', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800' };
      case 'demitido':
        return { label: 'Demitido', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' };
      case 'aposentado':
        return { label: 'Aposentado', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' };
      case 'licenca':
        return { label: 'Licença', variant: 'outline' as const, className: 'bg-purple-100 text-purple-800' };
      default:
        return { label: status, variant: 'default' as const, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={variant || config.variant}
      className={config.className}
    >
      {config.label}
    </Badge>
  );
}

// =====================================================
// COMPONENTE DE AÇÕES EM LOTE
// =====================================================

interface BatchActionsProps {
  selectedItems: any[];
  onDelete?: (items: any[]) => void;
  onStatusChange?: (items: any[], status: string) => void;
  onExport?: (items: any[]) => void;
  onCopy?: (items: any[]) => void;
}

export function BatchActions({
  selectedItems,
  onDelete,
  onStatusChange,
  onExport,
  onCopy,
}: BatchActionsProps) {
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    action: string | null;
  }>({
    isOpen: false,
    action: null,
  });

  const handleAction = (action: string) => {
    setConfirmDialog({
      isOpen: true,
      action,
    });
  };

  const handleConfirm = () => {
    if (confirmDialog.action === 'delete' && onDelete) {
      onDelete(selectedItems);
    } else if (confirmDialog.action === 'status' && onStatusChange) {
      onStatusChange(selectedItems, 'inativo');
    } else if (confirmDialog.action === 'export' && onExport) {
      onExport(selectedItems);
    } else if (confirmDialog.action === 'copy' && onCopy) {
      onCopy(selectedItems);
    }
    setConfirmDialog({
      isOpen: false,
      action: null,
    });
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <span className="text-sm text-muted-foreground">
          {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selecionado{selectedItems.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-1">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('export')}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          )}
          {onCopy && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('copy')}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copiar
            </Button>
          )}
          {onStatusChange && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('status')}
            >
              <UserX className="h-4 w-4 mr-1" />
              Inativar
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={() => setConfirmDialog({ isOpen: false, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar ação em lote
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja executar esta ação em {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selecionado{selectedItems.length === 1 ? '' : 's'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}