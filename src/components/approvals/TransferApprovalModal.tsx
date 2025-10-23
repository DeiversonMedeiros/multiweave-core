import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  ArrowRight, 
  AlertTriangle,
  Clock,
  MessageSquare
} from 'lucide-react';
import { Approval } from '@/services/approvals/approvalService';
import { useUsers } from '@/hooks/useUsers';

interface TransferApprovalModalProps {
  approval: Approval | null;
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (novoAprovadorId: string, motivo: string) => void;
  isLoading?: boolean;
}

export function TransferApprovalModal({ approval, isOpen, onClose, onTransfer, isLoading }: TransferApprovalModalProps) {
  const [novoAprovadorId, setNovoAprovadorId] = useState('');
  const [motivo, setMotivo] = useState('');

  const { data: users = [] } = useUsers();

  const handleTransfer = () => {
    if (novoAprovadorId && motivo.trim()) {
      onTransfer(novoAprovadorId, motivo.trim());
      setNovoAprovadorId('');
      setMotivo('');
    }
  };

  const handleClose = () => {
    setNovoAprovadorId('');
    setMotivo('');
    onClose();
  };

  const getProcessoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'conta_pagar': 'Contas a Pagar',
      'requisicao_compra': 'Requisições de Compra',
      'cotacao_compra': 'Cotações de Compra',
      'solicitacao_saida_material': 'Saídas de Materiais',
      'solicitacao_transferencia_material': 'Transferências de Materiais'
    };
    return labels[tipo] || tipo;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!approval) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transferir Aprovação
          </DialogTitle>
          <DialogDescription>
            Transfira esta aprovação para outro usuário da empresa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Aprovação Atual */}
          <div className="p-4 bg-gray-50 border rounded-lg">
            <h4 className="font-medium mb-3">Aprovação Atual</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Processo:</span>
                <p className="font-medium">{getProcessoLabel(approval.processo_tipo)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nível:</span>
                <Badge variant="outline" className="ml-2">Nível {approval.nivel_aprovacao}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge className={`ml-2 ${getStatusColor(approval.status)}`}>
                  {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Criado em:</span>
                <p className="font-medium">{new Date(approval.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Transferência de Aprovação */}
          {approval.transferido_em && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">Já foi transferida anteriormente</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Transferida em {new Date(approval.transferido_em).toLocaleDateString('pt-BR')}
              </p>
              {approval.motivo_transferencia && (
                <p className="text-sm text-blue-600 mt-1">
                  <strong>Motivo anterior:</strong> {approval.motivo_transferencia}
                </p>
              )}
            </div>
          )}

          {/* Seleção do Novo Aprovador */}
          <div className="space-y-2">
            <Label htmlFor="novo_aprovador">Novo Aprovador *</Label>
            <Select value={novoAprovadorId} onValueChange={setNovoAprovadorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário que receberá a aprovação" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(user => user.id !== approval.aprovador_id) // Excluir o aprovador atual
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.nome}</span>
                        <span className="text-muted-foreground">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O usuário selecionado receberá uma notificação sobre a transferência
            </p>
          </div>

          {/* Motivo da Transferência */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo da Transferência *
            </Label>
            <Textarea
              id="motivo"
              placeholder="Explique o motivo da transferência (ex: férias, licença, ausência temporária, etc.)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será registrado no histórico e visível para o novo aprovador
            </p>
          </div>

          {/* Aviso sobre Transferência */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Importante sobre Transferências</span>
            </div>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• A aprovação será transferida imediatamente para o novo usuário</li>
              <li>• O usuário original será notificado sobre a transferência</li>
              <li>• O novo aprovador receberá uma notificação para processar a aprovação</li>
              <li>• O histórico da transferência será mantido para auditoria</li>
            </ul>
          </div>

          {/* Informações do Novo Aprovador */}
          {novoAprovadorId && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <User className="h-4 w-4" />
                <span className="font-medium">Novo Aprovador Selecionado</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {users.find(u => u.id === novoAprovadorId)?.nome} receberá esta aprovação
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer}
            disabled={!novoAprovadorId || !motivo.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Transferindo...' : 'Transferir Aprovação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
