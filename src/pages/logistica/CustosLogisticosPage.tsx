// =====================================================
// CUSTOS LOGÍSTICOS
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Filter,
  Truck,
  Receipt,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useTripCosts, useCreateTripCost } from '@/hooks/logistica/useLogisticaData';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { useTrips } from '@/hooks/logistica/useLogisticaData';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CustosLogisticosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const { data: costs, isLoading: costsLoading, refetch } = useTripCosts({
    data_inicio: format(monthStart, 'yyyy-MM-dd'),
    data_fim: format(monthEnd, 'yyyy-MM-dd'),
    limit: 100
  });

  const filteredCosts = (costs || []).filter(cost => {
    const matchesSearch = 
      cost.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.trip_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.vehicle_placa?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'all' || cost.tipo_custo === tipoFilter;

    return matchesSearch && matchesTipo;
  });

  const totalCosts = filteredCosts.reduce((sum, cost) => sum + (cost.valor || 0), 0);

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'combustivel': 'Combustível',
      'pedagio': 'Pedágio',
      'diarias': 'Diárias',
      'servicos_externos': 'Serviços Externos',
      'outros': 'Outros'
    };
    return labels[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'combustivel': 'bg-blue-50 text-blue-700 border-blue-200',
      'pedagio': 'bg-green-50 text-green-700 border-green-200',
      'diarias': 'bg-purple-50 text-purple-700 border-purple-200',
      'servicos_externos': 'bg-orange-50 text-orange-700 border-orange-200',
      'outros': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[tipo] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (costsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custos Logísticos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie custos de combustível, pedágio, diárias e outros
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#049940] hover:bg-[#038830]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Custo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Custo Logístico</DialogTitle>
              <DialogDescription>
                Registre um novo custo relacionado a logística
              </DialogDescription>
            </DialogHeader>
            <CreateCostForm 
              onSuccess={() => {
                setIsCreateModalOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCosts)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredCosts.length} registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Registro</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCosts.length > 0 
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCosts / filteredCosts.length)
                : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Tipo</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {['combustivel', 'pedagio', 'diarias', 'servicos_externos', 'outros'].map(tipo => {
                const tipoTotal = filteredCosts
                  .filter(c => c.tipo_custo === tipo)
                  .reduce((sum, c) => sum + (c.valor || 0), 0);
                if (tipoTotal === 0) return null;
                return (
                  <div key={tipo} className="flex justify-between">
                    <span className="text-muted-foreground">{getTipoLabel(tipo)}:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tipoTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, viagem, veículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Custo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="combustivel">Combustível</SelectItem>
                  <SelectItem value="pedagio">Pedágio</SelectItem>
                  <SelectItem value="diarias">Diárias</SelectItem>
                  <SelectItem value="servicos_externos">Serviços Externos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setTipoFilter('all');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Custos */}
      <Card>
        <CardHeader>
          <CardTitle>Custos ({filteredCosts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCosts.length > 0 ? (
            <div className="space-y-4">
              {filteredCosts.map((cost) => (
                <Card key={cost.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{cost.descricao}</h3>
                              <Badge variant="outline" className={getTipoColor(cost.tipo_custo)}>
                                {getTipoLabel(cost.tipo_custo)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Registrado em {format(new Date(cost.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Valor</p>
                              <p className="text-sm font-medium">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost.valor)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="text-sm font-medium">
                                {format(new Date(cost.data_custo), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          {cost.vehicle_placa && (
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Veículo</p>
                                <p className="text-sm font-medium">{cost.vehicle_placa}</p>
                              </div>
                            </div>
                          )}
                          {cost.trip_numero && (
                            <div className="flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Viagem</p>
                                <p className="text-sm font-medium">{cost.trip_numero}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {cost.cost_center_nome && (
                          <div className="text-sm text-muted-foreground">
                            Centro de Custo: <strong>{cost.cost_center_nome}</strong>
                            {cost.project_nome && ` | Projeto: ${cost.project_nome}`}
                          </div>
                        )}

                        {cost.observacoes && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Observações:</strong> {cost.observacoes}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum custo encontrado</p>
              <p className="text-sm">Registre um novo custo para começar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de formulário para criar custo
function CreateCostForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    tipo_custo: 'combustivel' as const,
    descricao: '',
    valor: '',
    data_custo: format(new Date(), 'yyyy-MM-dd'),
    vehicle_id: '',
    trip_id: '',
    cost_center_id: '',
    project_id: '',
    os_number: '',
    comprovante_url: '',
    observacoes: ''
  });

  const createCost = useCreateTripCost();
  const { data: vehicles } = useVehicles();
  const { data: trips } = useTrips({ limit: 100 });
  const { data: costCenters } = useCostCenters();
  const { data: projects } = useActiveProjects();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCost.mutate({
      tipo_custo: formData.tipo_custo,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      data_custo: formData.data_custo,
      vehicle_id: formData.vehicle_id || undefined,
      trip_id: formData.trip_id || undefined,
      cost_center_id: formData.cost_center_id,
      project_id: formData.project_id || undefined,
      os_number: formData.os_number || undefined,
      comprovante_url: formData.comprovante_url || undefined,
      observacoes: formData.observacoes || undefined,
    }, {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo_custo">Tipo de Custo *</Label>
          <Select value={formData.tipo_custo} onValueChange={(v: any) => setFormData(prev => ({ ...prev, tipo_custo: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="combustivel">Combustível</SelectItem>
              <SelectItem value="pedagio">Pedágio</SelectItem>
              <SelectItem value="diarias">Diárias</SelectItem>
              <SelectItem value="servicos_externos">Serviços Externos</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_custo">Data *</Label>
          <Input
            id="data_custo"
            type="date"
            value={formData.data_custo}
            onChange={(e) => setFormData(prev => ({ ...prev, data_custo: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
          placeholder="Ex: Abastecimento de combustível"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor">Valor *</Label>
        <Input
          id="valor"
          type="number"
          step="0.01"
          value={formData.valor}
          onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
          placeholder="0.00"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost_center_id">Centro de Custo *</Label>
          <Select value={formData.cost_center_id} onValueChange={(v) => setFormData(prev => ({ ...prev, cost_center_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um centro de custo" />
            </SelectTrigger>
            <SelectContent>
              {(costCenters?.data || []).map(cc => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicle_id">Veículo</Label>
          <Select value={formData.vehicle_id || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, vehicle_id: v === "none" ? "" : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {(vehicles || []).map(vehicle => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa} {vehicle.modelo && `- ${vehicle.modelo}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trip_id">Viagem</Label>
          <Select value={formData.trip_id || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, trip_id: v === "none" ? "" : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {(trips || []).map(trip => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.request_numero || trip.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project_id">Projeto</Label>
          <Select value={formData.project_id || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v === "none" ? "" : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {(projects?.data || []).map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="os_number">Número da OS</Label>
        <Input
          id="os_number"
          value={formData.os_number}
          onChange={(e) => setFormData(prev => ({ ...prev, os_number: e.target.value }))}
          placeholder="Opcional"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          rows={3}
          placeholder="Observações adicionais sobre o custo"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createCost.isPending || !formData.descricao || !formData.valor || !formData.cost_center_id}>
          {createCost.isPending ? 'Registrando...' : 'Registrar Custo'}
        </Button>
      </div>
    </form>
  );
}
