import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Users, 
  DollarSign, 
  Building2, 
  User,
  X
} from 'lucide-react';
import { ApprovalConfig } from '@/services/approvals/approvalService';
import { useUsers } from '@/hooks/useUsers';
import { useCostCenters } from '@/hooks/useCostCenters';

interface ApprovalConfigFormProps {
  config?: ApprovalConfig | null;
  onSubmit: (data: Omit<ApprovalConfig, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface Aprovador {
  user_id: string;
  is_primary: boolean;
  ordem: number;
}

export function ApprovalConfigForm({ config, onSubmit, onCancel, isLoading }: ApprovalConfigFormProps) {
  const [formData, setFormData] = useState({
    processo_tipo: config?.processo_tipo || '',
    centro_custo_id: config?.centro_custo_id || '',
    departamento: config?.departamento || '',
    classe_financeira: config?.classe_financeira || '',
    usuario_id: config?.usuario_id || '',
    valor_limite: config?.valor_limite || '',
    nivel_aprovacao: config?.nivel_aprovacao || 1,
    aprovadores: config?.aprovadores || [] as Aprovador[],
    ativo: config?.ativo ?? true
  });

  const [criteriaEnabled, setCriteriaEnabled] = useState({
    centro_custo: !!config?.centro_custo_id,
    departamento: !!config?.departamento,
    classe_financeira: !!config?.classe_financeira,
    usuario: !!config?.usuario_id
  });

  // Hooks para dados
  const { data: users = [] } = useUsers();
  const { data: costCenters = [] } = useCostCenters();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se pelo menos um aprovador foi configurado
    if (formData.aprovadores.length === 0) {
      alert('Configure pelo menos um aprovador');
      return;
    }

    // Preparar dados para envio
    const submitData = {
      processo_tipo: formData.processo_tipo as any,
      centro_custo_id: criteriaEnabled.centro_custo ? formData.centro_custo_id || undefined : undefined,
      departamento: criteriaEnabled.departamento ? formData.departamento || undefined : undefined,
      classe_financeira: criteriaEnabled.classe_financeira ? formData.classe_financeira || undefined : undefined,
      usuario_id: criteriaEnabled.usuario ? formData.usuario_id || undefined : undefined,
      valor_limite: formData.valor_limite ? parseFloat(formData.valor_limite) : undefined,
      nivel_aprovacao: formData.nivel_aprovacao,
      aprovadores: formData.aprovadores,
      ativo: formData.ativo
    };

    onSubmit(submitData);
  };

  const addAprovador = () => {
    const newAprovador: Aprovador = {
      user_id: '',
      is_primary: false,
      ordem: formData.aprovadores.length + 1
    };
    setFormData(prev => ({
      ...prev,
      aprovadores: [...prev.aprovadores, newAprovador]
    }));
  };

  const removeAprovador = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aprovadores: prev.aprovadores.filter((_, i) => i !== index)
    }));
  };

  const updateAprovador = (index: number, field: keyof Aprovador, value: any) => {
    setFormData(prev => ({
      ...prev,
      aprovadores: prev.aprovadores.map((aprovador, i) => 
        i === index ? { ...aprovador, [field]: value } : aprovador
      )
    }));
  };

  const toggleCriteria = (criteria: keyof typeof criteriaEnabled) => {
    setCriteriaEnabled(prev => ({
      ...prev,
      [criteria]: !prev[criteria]
    }));
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

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {config ? 'Editar Configuração de Aprovação' : 'Nova Configuração de Aprovação'}
          </DialogTitle>
          <DialogDescription>
            Configure os critérios e aprovadores para o processo de aprovação
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Processo */}
          <div className="space-y-2">
            <Label htmlFor="processo_tipo">Tipo de Processo *</Label>
            <Select 
              value={formData.processo_tipo} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, processo_tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conta_pagar">Contas a Pagar</SelectItem>
                <SelectItem value="requisicao_compra">Requisições de Compra</SelectItem>
                <SelectItem value="cotacao_compra">Cotações de Compra</SelectItem>
                <SelectItem value="solicitacao_saida_material">Saídas de Materiais</SelectItem>
                <SelectItem value="solicitacao_transferencia_material">Transferências de Materiais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Critérios de Aplicação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Critérios de Aplicação</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione os critérios que devem ser atendidos para aplicar esta configuração
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Centro de Custo */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="centro_custo"
                  checked={criteriaEnabled.centro_custo}
                  onCheckedChange={() => toggleCriteria('centro_custo')}
                />
                <Label htmlFor="centro_custo" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Centro de Custo
                </Label>
              </div>
              {criteriaEnabled.centro_custo && (
                <Select 
                  value={formData.centro_custo_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, centro_custo_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.nome} ({cc.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Departamento */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="departamento"
                  checked={criteriaEnabled.departamento}
                  onCheckedChange={() => toggleCriteria('departamento')}
                />
                <Label htmlFor="departamento" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Departamento
                </Label>
              </div>
              {criteriaEnabled.departamento && (
                <Input
                  placeholder="Digite o departamento"
                  value={formData.departamento}
                  onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                />
              )}

              {/* Classe Financeira */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="classe_financeira"
                  checked={criteriaEnabled.classe_financeira}
                  onCheckedChange={() => toggleCriteria('classe_financeira')}
                />
                <Label htmlFor="classe_financeira" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Classe Financeira
                </Label>
              </div>
              {criteriaEnabled.classe_financeira && (
                <Input
                  placeholder="Digite a classe financeira"
                  value={formData.classe_financeira}
                  onChange={(e) => setFormData(prev => ({ ...prev, classe_financeira: e.target.value }))}
                />
              )}

              {/* Usuário Específico */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="usuario"
                  checked={criteriaEnabled.usuario}
                  onCheckedChange={() => toggleCriteria('usuario')}
                />
                <Label htmlFor="usuario" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Usuário Específico
                </Label>
              </div>
              {criteriaEnabled.usuario && (
                <Select 
                  value={formData.usuario_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, usuario_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Limites e Níveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_limite">Valor Limite (R$)</Label>
              <Input
                id="valor_limite"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.valor_limite}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_limite: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para sem limite de valor
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel_aprovacao">Nível de Aprovação</Label>
              <Input
                id="nivel_aprovacao"
                type="number"
                min="1"
                value={formData.nivel_aprovacao}
                onChange={(e) => setFormData(prev => ({ ...prev, nivel_aprovacao: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Aprovadores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Aprovadores</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addAprovador}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Aprovador
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.aprovadores.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum aprovador configurado</p>
                  <p className="text-sm">Adicione pelo menos um aprovador para esta configuração</p>
                </div>
              ) : (
                formData.aprovadores.map((aprovador, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Usuário *</Label>
                        <Select 
                          value={aprovador.user_id} 
                          onValueChange={(value) => updateAprovador(index, 'user_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.nome} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`primary_${index}`}
                          checked={aprovador.is_primary}
                          onCheckedChange={(checked) => updateAprovador(index, 'is_primary', checked)}
                        />
                        <Label htmlFor={`primary_${index}`} className="text-sm">
                          Principal
                        </Label>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Ordem</Label>
                        <Input
                          type="number"
                          min="1"
                          value={aprovador.ordem}
                          onChange={(e) => updateAprovador(index, 'ordem', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAprovador(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: !!checked }))}
            />
            <Label htmlFor="ativo">Configuração ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (config ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
