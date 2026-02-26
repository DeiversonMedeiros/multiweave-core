import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Building2, AlertTriangle, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { ItemSelectionModal, SelectedItem } from './ItemSelectionModal';

export interface TransferenciaFormData {
  almoxarifado_origem_id: string;
  almoxarifado_destino_id: string;
  centro_custo_saida_id: string;
  centro_custo_entrada_id: string;
  projeto_id: string;
  observacoes: string;
}

interface TransferenciaMaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TransferenciaFormData, items: SelectedItem[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TransferenciaMaterialForm({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  isLoading = false,
}: TransferenciaMaterialFormProps) {
  const [formData, setFormData] = useState<TransferenciaFormData>({
    almoxarifado_origem_id: '',
    almoxarifado_destino_id: '',
    centro_custo_saida_id: '',
    centro_custo_entrada_id: '',
    projeto_id: '',
    observacoes: '',
  });
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useProjects();
  const { data: almoxarifadosRaw } = useAlmoxarifados();
  const costCenters = costCentersData?.data ?? [];
  const projects = projectsData?.data ?? [];
  const almoxarifados = Array.isArray(almoxarifadosRaw) ? almoxarifadosRaw : [];

  const almoxarifadosSaida = formData.centro_custo_saida_id
    ? almoxarifados.filter((a: { cost_center_id?: string }) => a.cost_center_id === formData.centro_custo_saida_id)
    : [];
  const almoxarifadosEntrada = formData.centro_custo_entrada_id
    ? almoxarifados.filter((a: { cost_center_id?: string }) => a.cost_center_id === formData.centro_custo_entrada_id)
    : [];
  const projectsEntrada = formData.centro_custo_entrada_id
    ? projects.filter((p: { cost_center_id?: string }) => p.cost_center_id === formData.centro_custo_entrada_id)
    : [];

  // Ao trocar almoxarifado de origem, limpar itens (itens devem ser do almoxarifado de saída)
  useEffect(() => {
    if (!formData.almoxarifado_origem_id && selectedItems.length > 0) {
      setSelectedItems([]);
    }
  }, [formData.almoxarifado_origem_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.centro_custo_saida_id || !formData.almoxarifado_origem_id) return;
    if (!formData.centro_custo_entrada_id || !formData.almoxarifado_destino_id) return;
    if (formData.almoxarifado_origem_id === formData.almoxarifado_destino_id) return;
    if (selectedItems.length === 0) return;
    onSubmit(formData, selectedItems);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Nova Transferência de Materiais
          </DialogTitle>
          <DialogDescription>
            Materiais sairão do almoxarifado de saída e entrarão no almoxarifado de entrada. Preencha os dados e selecione os itens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção Saída */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5" />
                Saída
              </CardTitle>
              <CardDescription>
                Centro de custo e almoxarifado de onde os materiais sairão. Selecione o centro de custo para liberar o almoxarifado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Centro de custo de saída *</Label>
                <Select
                  value={formData.centro_custo_saida_id}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      centro_custo_saida_id: v,
                      almoxarifado_origem_id: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o centro de custo de saída" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc: { id: string; nome: string; codigo?: string }) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{cc.nome}</span>
                          {cc.codigo && <span className="text-muted-foreground">({cc.codigo})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Almoxarifado de saída *</Label>
                <Select
                  value={formData.almoxarifado_origem_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, almoxarifado_origem_id: v }))}
                  disabled={!formData.centro_custo_saida_id}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formData.centro_custo_saida_id
                          ? 'Selecione o almoxarifado de saída'
                          : 'Selecione primeiro o centro de custo de saída'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {almoxarifadosSaida.map((a: { id: string; nome: string; codigo?: string }) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{a.nome}</span>
                          {a.codigo && <span className="text-muted-foreground">({a.codigo})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Almoxarifados vinculados ao centro de custo de saída
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Seção Entrada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5" />
                Entrada
              </CardTitle>
              <CardDescription>
                Centro de custo e almoxarifado para onde os materiais entrarão. Projeto é opcional e vinculado ao centro de custo de entrada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Centro de custo de entrada *</Label>
                <Select
                  value={formData.centro_custo_entrada_id}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      centro_custo_entrada_id: v,
                      almoxarifado_destino_id: '',
                      projeto_id: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o centro de custo de entrada" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc: { id: string; nome: string; codigo?: string }) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{cc.nome}</span>
                          {cc.codigo && <span className="text-muted-foreground">({cc.codigo})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Almoxarifado de entrada *</Label>
                <Select
                  value={formData.almoxarifado_destino_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, almoxarifado_destino_id: v }))}
                  disabled={!formData.centro_custo_entrada_id}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formData.centro_custo_entrada_id
                          ? 'Selecione o almoxarifado de entrada'
                          : 'Selecione primeiro o centro de custo de entrada'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {almoxarifadosEntrada
                      .filter((a: { id: string }) => a.id !== formData.almoxarifado_origem_id)
                      .map((a: { id: string; nome: string; codigo?: string }) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{a.nome}</span>
                            {a.codigo && <span className="text-muted-foreground">({a.codigo})</span>}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Almoxarifados vinculados ao centro de custo de entrada
                </p>
              </div>
              <div className="space-y-2">
                <Label>Projeto (opcional)</Label>
                <Select
                  value={formData.projeto_id || 'none'}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, projeto_id: v === 'none' ? '' : v }))}
                  disabled={!formData.centro_custo_entrada_id}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formData.centro_custo_entrada_id
                          ? 'Selecione o projeto (opcional)'
                          : 'Selecione primeiro o centro de custo de entrada'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projectsEntrada.map((p: { id: string; nome?: string }) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span>{p.nome}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Projetos vinculados ao centro de custo de entrada
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itens a transferir</CardTitle>
              <CardDescription>
                Selecione os materiais e quantidades do almoxarifado de saída
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedItems.length} item(ns) selecionado(s)
                  </p>
                  {selectedItems.length > 0 && (
                    <p className="text-sm font-medium">
                      Valor total: R${' '}
                      {selectedItems
                        .reduce((t, i) => t + i.quantidade_solicitada * i.valor_unitario, 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsItemModalOpen(true)}
                  disabled={!formData.almoxarifado_origem_id}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {selectedItems.length > 0 ? 'Alterar itens' : 'Selecionar itens'}
                </Button>
              </div>

              {!formData.almoxarifado_origem_id && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Selecione o almoxarifado de saída para escolher os itens
                </div>
              )}

              {selectedItems.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedItems.map((item) => (
                    <div
                      key={`${item.material_id}-${item.almoxarifado_id}`}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">{item.material_nome}</span>
                          <Badge variant="outline">{item.material_codigo}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.quantidade_solicitada} {item.material_unidade} · R${' '}
                          {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} un.
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        R${' '}
                        {(item.quantidade_solicitada * item.valor_unitario).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Observações sobre a transferência"
              value={formData.observacoes}
              onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.centro_custo_saida_id ||
                !formData.almoxarifado_origem_id ||
                !formData.centro_custo_entrada_id ||
                !formData.almoxarifado_destino_id ||
                formData.almoxarifado_origem_id === formData.almoxarifado_destino_id ||
                selectedItems.length === 0
              }
            >
              {isLoading ? 'Criando...' : 'Criar transferência'}
            </Button>
          </DialogFooter>
        </form>

        <ItemSelectionModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          onConfirm={(items) => {
            setSelectedItems(items);
            setIsItemModalOpen(false);
          }}
          selectedItems={selectedItems}
          almoxarifadoId={formData.almoxarifado_origem_id || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
