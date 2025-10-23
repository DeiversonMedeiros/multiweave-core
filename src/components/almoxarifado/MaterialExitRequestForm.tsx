import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  User, 
  Building2, 
  DollarSign,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { MaterialExitRequest, MaterialExitRequestItem } from '@/services/approvals/approvalService';
import { useUsers } from '@/hooks/useUsers';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useAuth } from '@/lib/auth-context';
import { ItemSelectionModal, SelectedItem } from './ItemSelectionModal';

interface MaterialExitRequestFormProps {
  request?: MaterialExitRequest | null;
  onSubmit: (data: Omit<MaterialExitRequest, 'id' | 'created_at' | 'updated_at'>, items: SelectedItem[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MaterialExitRequestForm({ request, onSubmit, onCancel, isLoading }: MaterialExitRequestFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    funcionario_solicitante_id: request?.funcionario_solicitante_id || user?.id || '',
    funcionario_receptor_id: request?.funcionario_receptor_id || '',
    almoxarifado_id: request?.almoxarifado_id || '',
    centro_custo_id: request?.centro_custo_id || '',
    projeto_id: request?.projeto_id || '',
    data_solicitacao: request?.data_solicitacao || new Date().toISOString(),
    data_aprovacao: request?.data_aprovacao || '',
    data_saida: request?.data_saida || '',
    status: request?.status || 'pendente',
    valor_total: request?.valor_total || '',
    observacoes: request?.observacoes || ''
  });

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Hooks para dados
  const { data: users = [] } = useUsers();
  const { data: costCenters = [] } = useCostCenters();
  const { data: projects = [] } = useProjects();
  const { data: almoxarifados = [] } = useAlmoxarifados();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.funcionario_solicitante_id) {
      alert('Selecione o funcionário solicitante');
      return;
    }
    
    if (!formData.funcionario_receptor_id) {
      alert('Selecione o funcionário que receberá o material');
      return;
    }
    
    if (!formData.almoxarifado_id) {
      alert('Selecione um almoxarifado');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um item do estoque');
      return;
    }

    // Calcular valor total
    const valorTotal = selectedItems.reduce((total, item) => 
      total + (item.quantidade_solicitada * item.valor_unitario), 0
    );

    // Preparar dados para envio
    const submitData = {
      funcionario_solicitante_id: formData.funcionario_solicitante_id,
      funcionario_receptor_id: formData.funcionario_receptor_id,
      almoxarifado_id: formData.almoxarifado_id,
      centro_custo_id: formData.centro_custo_id || undefined,
      projeto_id: formData.projeto_id || undefined,
      data_solicitacao: formData.data_solicitacao,
      data_aprovacao: formData.data_aprovacao || undefined,
      data_saida: formData.data_saida || undefined,
      status: formData.status as any,
      valor_total: valorTotal,
      observacoes: formData.observacoes || undefined
    };

    onSubmit(submitData, selectedItems);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pendente': 'Pendente',
      'aprovado': 'Aprovado',
      'rejeitado': 'Rejeitado',
      'cancelado': 'Cancelado',
      'entregue': 'Entregue'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {request ? 'Editar Solicitação de Saída' : 'Nova Solicitação de Saída de Material'}
          </DialogTitle>
          <DialogDescription>
            {request 
              ? 'Atualize os dados da solicitação de saída de material'
              : 'Preencha os dados para solicitar a saída de materiais'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Funcionário Solicitante */}
              <div className="space-y-2">
                <Label htmlFor="funcionario_solicitante_id">Funcionário Solicitante *</Label>
                <Select 
                  value={formData.funcionario_solicitante_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, funcionario_solicitante_id: value }))}
                  disabled={!!request} // Não permitir alterar após criação
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
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
                {request && (
                  <p className="text-xs text-muted-foreground">
                    O funcionário solicitante não pode ser alterado após a criação
                  </p>
                )}
              </div>

              {/* Funcionário Receptor */}
              <div className="space-y-2">
                <Label htmlFor="funcionario_receptor_id">Funcionário que Receberá o Material *</Label>
                <Select 
                  value={formData.funcionario_receptor_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, funcionario_receptor_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário que receberá o material" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
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
                  Funcionário técnico que receberá os materiais para executar o serviço
                </p>
              </div>

              {/* Almoxarifado */}
              <div className="space-y-2">
                <Label htmlFor="almoxarifado_id">Almoxarifado *</Label>
                <Select 
                  value={formData.almoxarifado_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, almoxarifado_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o almoxarifado" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Aqui você pode adicionar a lista de almoxarifados */}
                    <SelectItem value="almoxarifado-1">Almoxarifado Central</SelectItem>
                    <SelectItem value="almoxarifado-2">Almoxarifado Secundário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Centro de Custo */}
              <div className="space-y-2">
                <Label htmlFor="centro_custo_id">Centro de Custo</Label>
                <Select 
                  value={formData.centro_custo_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, centro_custo_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o centro de custo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{cc.nome}</span>
                          <span className="text-muted-foreground">({cc.codigo})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Projeto */}
              <div className="space-y-2">
                <Label htmlFor="projeto_id">Projeto</Label>
                <Select 
                  value={formData.projeto_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projeto_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{project.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Itens Selecionados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itens do Estoque</CardTitle>
              <CardDescription>
                Selecione os materiais e equipamentos que serão solicitados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedItems.length} item(s) selecionado(s)
                  </p>
                  {selectedItems.length > 0 && (
                    <p className="text-sm font-medium">
                      Valor Total: R$ {selectedItems.reduce((total, item) => 
                        total + (item.quantidade_solicitada * item.valor_unitario), 0
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsItemModalOpen(true)}
                  disabled={!formData.almoxarifado_id}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {selectedItems.length > 0 ? 'Editar Itens' : 'Selecionar Itens'}
                </Button>
              </div>

              {!formData.almoxarifado_id && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Selecione um almoxarifado para escolher os itens
                </div>
              )}

              {selectedItems.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedItems.map((item, index) => (
                    <div key={`${item.material_id}-${item.almoxarifado_id}`} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">{item.material_nome}</span>
                          <Badge variant="outline">{item.material_codigo}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.almoxarifado_nome} | {item.quantidade_solicitada} {item.material_unidade} | 
                          R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                        </p>
                      </div>
                      <div className="text-sm font-medium">
                        R$ {(item.quantidade_solicitada * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Valores e Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valores e Datas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Valor Total - Calculado automaticamente */}
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      value={selectedItems.reduce((total, item) => 
                        total + (item.quantidade_solicitada * item.valor_unitario), 0
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      className="pl-10 bg-gray-50"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Calculado automaticamente baseado nos itens selecionados
                  </p>
                </div>

                {/* Data de Solicitação */}
                <div className="space-y-2">
                  <Label htmlFor="data_solicitacao">Data de Solicitação</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="data_solicitacao"
                      type="datetime-local"
                      value={formData.data_solicitacao ? new Date(formData.data_solicitacao).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_solicitacao: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Status (apenas para edição) */}
              {request && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="rejeitado">Rejeitado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Data de Aprovação (apenas para edição) */}
              {request && formData.status === 'aprovado' && (
                <div className="space-y-2">
                  <Label htmlFor="data_aprovacao">Data de Aprovação</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="data_aprovacao"
                      type="datetime-local"
                      value={formData.data_aprovacao ? new Date(formData.data_aprovacao).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_aprovacao: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Data de Saída (apenas para edição) */}
              {request && formData.status === 'entregue' && (
                <div className="space-y-2">
                  <Label htmlFor="data_saida">Data de Saída</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="data_saida"
                      type="datetime-local"
                      value={formData.data_saida ? new Date(formData.data_saida).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_saida: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre a solicitação (opcional)"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Aviso sobre Aprovações */}
          {!request && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Sobre o Processo de Aprovação</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Após criar esta solicitação, ela será enviada automaticamente para aprovação 
                conforme as configurações definidas no sistema. Você será notificado sobre 
                o status da aprovação.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (request ? 'Atualizar' : 'Criar Solicitação')}
            </Button>
          </DialogFooter>
        </form>

        {/* Modal de Seleção de Itens */}
        <ItemSelectionModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          onConfirm={(items) => {
            setSelectedItems(items);
            setIsItemModalOpen(false);
          }}
          selectedItems={selectedItems}
          almoxarifadoId={formData.almoxarifado_id}
        />
      </DialogContent>
    </Dialog>
  );
}
