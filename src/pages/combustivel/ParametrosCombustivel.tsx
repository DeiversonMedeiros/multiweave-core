// =====================================================
// CADASTRO DE PARÂMETROS DE COMBUSTÍVEL
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  MapPin, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { 
  useFuelTypes, 
  useCreateFuelType, 
  useUpdateFuelType, 
  useDeleteFuelType,
  useGasStations,
  useCreateGasStation,
  useUpdateGasStation,
  useDeleteGasStation,
  useRefuelLimits,
  useCreateRefuelLimit,
  useUpdateRefuelLimit,
  useDeleteRefuelLimit
} from '@/hooks/combustivel/useCombustivel';
import { FuelTypeForm } from '@/components/combustivel/FuelTypeForm';
import { GasStationForm } from '@/components/combustivel/GasStationForm';
import { RefuelLimitForm } from '@/components/combustivel/RefuelLimitForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FuelTypeConfig, ApprovedGasStation, RefuelLimit } from '@/types/combustivel';

export default function ParametrosCombustivel() {
  const [activeTab, setActiveTab] = useState('tipos');
  const [fuelTypeDialogOpen, setFuelTypeDialogOpen] = useState(false);
  const [gasStationDialogOpen, setGasStationDialogOpen] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [editingFuelType, setEditingFuelType] = useState<FuelTypeConfig | null>(null);
  const [editingGasStation, setEditingGasStation] = useState<ApprovedGasStation | null>(null);
  const [editingLimit, setEditingLimit] = useState<RefuelLimit | null>(null);

  const { data: fuelTypes } = useFuelTypes();
  const { data: gasStations } = useGasStations();
  const { data: refuelLimits } = useRefuelLimits();

  const createFuelType = useCreateFuelType();
  const updateFuelType = useUpdateFuelType();
  const deleteFuelType = useDeleteFuelType();

  const createGasStation = useCreateGasStation();
  const updateGasStation = useUpdateGasStation();
  const deleteGasStation = useDeleteGasStation();

  const createLimit = useCreateRefuelLimit();
  const updateLimit = useUpdateRefuelLimit();
  const deleteLimit = useDeleteRefuelLimit();

  const handleFuelTypeSubmit = (data: Partial<FuelTypeConfig>) => {
    if (editingFuelType) {
      updateFuelType.mutate({ id: editingFuelType.id, data });
    } else {
      createFuelType.mutate(data);
    }
    setFuelTypeDialogOpen(false);
    setEditingFuelType(null);
  };

  const handleGasStationSubmit = (data: Partial<ApprovedGasStation>) => {
    if (editingGasStation) {
      updateGasStation.mutate({ id: editingGasStation.id, data });
    } else {
      createGasStation.mutate(data);
    }
    setGasStationDialogOpen(false);
    setEditingGasStation(null);
  };

  const handleLimitSubmit = (data: Partial<RefuelLimit>) => {
    if (editingLimit) {
      updateLimit.mutate({ id: editingLimit.id, data });
    } else {
      createLimit.mutate(data);
    }
    setLimitDialogOpen(false);
    setEditingLimit(null);
  };

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parâmetros de Combustível</h1>
            <p className="text-gray-600">Configure tipos, postos e limites de abastecimento</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="tipos">
              <Fuel className="w-4 h-4 mr-2" />
              Tipos de Combustível
            </TabsTrigger>
            <TabsTrigger value="postos">
              <MapPin className="w-4 h-4 mr-2" />
              Postos Homologados
            </TabsTrigger>
            <TabsTrigger value="limites">
              <Settings className="w-4 h-4 mr-2" />
              Limites de Abastecimento
            </TabsTrigger>
          </TabsList>

          {/* Tipos de Combustível */}
          <TabsContent value="tipos" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tipos de Combustível</CardTitle>
                    <CardDescription>
                      Configure os tipos de combustível e consumo médio esperado
                    </CardDescription>
                  </div>
                  <PermissionButton
                    page="/combustivel/parametros*"
                    action="create"
                    onClick={() => {
                      setEditingFuelType(null);
                      setFuelTypeDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Tipo
                  </PermissionButton>
                </div>
              </CardHeader>
              <CardContent>
                {fuelTypes?.data && fuelTypes.data.length > 0 ? (
                  <div className="space-y-2">
                    {fuelTypes.data.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{type.nome}</p>
                            <p className="text-sm text-gray-500">
                              Tipo: {type.tipo} • Consumo médio: {type.consumo_medio_km_l || 'N/A'} km/L
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={type.ativo ? 'default' : 'secondary'}>
                            {type.ativo ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Ativo</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Inativo</>
                            )}
                          </Badge>
                          <PermissionButton
                            page="/combustivel/parametros*"
                            action="edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingFuelType(type);
                              setFuelTypeDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </PermissionButton>
                          <PermissionButton
                            page="/combustivel/parametros*"
                            action="delete"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir este tipo de combustível?')) {
                                deleteFuelType.mutate(type.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </PermissionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum tipo de combustível cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Postos Homologados */}
          <TabsContent value="postos" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Postos Homologados</CardTitle>
                    <CardDescription>
                      Cadastre os postos de combustível autorizados para abastecimento
                    </CardDescription>
                  </div>
                  <PermissionButton
                    entityName="approved_gas_stations"
                    action="create"
                    onClick={() => {
                      setEditingGasStation(null);
                      setGasStationDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Posto
                  </PermissionButton>
                </div>
              </CardHeader>
              <CardContent>
                {gasStations?.data && gasStations.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gasStations.data.map((station) => (
                      <div
                        key={station.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{station.nome}</p>
                            {station.cnpj && (
                              <p className="text-sm text-gray-500">CNPJ: {station.cnpj}</p>
                            )}
                            {station.endereco && (
                              <p className="text-sm text-gray-500">{station.endereco}</p>
                            )}
                            {station.cidade && station.estado && (
                              <p className="text-sm text-gray-500">
                                {station.cidade} - {station.estado}
                              </p>
                            )}
                            {station.telefone && (
                              <p className="text-sm text-gray-500">Tel: {station.telefone}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={station.ativo ? 'default' : 'secondary'}>
                              {station.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <PermissionButton
                              entityName="approved_gas_stations"
                              action="edit"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGasStation(station);
                                setGasStationDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </PermissionButton>
                            <PermissionButton
                              entityName="approved_gas_stations"
                              action="delete"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Deseja realmente excluir este posto?')) {
                                  deleteGasStation.mutate(station.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </PermissionButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum posto homologado cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Limites de Abastecimento */}
          <TabsContent value="limites" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Limites de Abastecimento</CardTitle>
                    <CardDescription>
                      Configure limites mensais por veículo, colaborador, centro de custo ou projeto
                    </CardDescription>
                  </div>
                  <PermissionButton
                    entityName="refuel_limits"
                    action="create"
                    onClick={() => {
                      setEditingLimit(null);
                      setLimitDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Limite
                  </PermissionButton>
                </div>
              </CardHeader>
              <CardContent>
                {refuelLimits?.data && refuelLimits.data.length > 0 ? (
                  <div className="space-y-2">
                    {refuelLimits.data.map((limit) => (
                      <div
                        key={limit.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {limit.tipo_limite === 'veiculo' && `Veículo: ${limit.veiculo_placa || 'N/A'}`}
                            {limit.tipo_limite === 'colaborador' && `Colaborador: ${limit.colaborador_nome || 'N/A'}`}
                            {limit.tipo_limite === 'centro_custo' && `Centro de Custo: ${limit.centro_custo_nome || 'N/A'}`}
                            {limit.tipo_limite === 'projeto' && `Projeto: ${limit.projeto_nome || 'N/A'}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {limit.limite_mensal_litros && `Litros: ${limit.limite_mensal_litros} L/mês • `}
                            {limit.limite_mensal_valor && `Valor: R$ ${limit.limite_mensal_valor.toFixed(2)}/mês`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={limit.ativo ? 'default' : 'secondary'}>
                            {limit.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <PermissionButton
                            entityName="refuel_limits"
                            action="edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingLimit(limit);
                              setLimitDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </PermissionButton>
                          <PermissionButton
                            entityName="refuel_limits"
                            action="delete"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir este limite?')) {
                                deleteLimit.mutate(limit.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </PermissionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum limite de abastecimento cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={fuelTypeDialogOpen} onOpenChange={setFuelTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFuelType ? 'Editar Tipo de Combustível' : 'Novo Tipo de Combustível'}
              </DialogTitle>
              <DialogDescription>
                Configure o tipo de combustível e consumo médio esperado
              </DialogDescription>
            </DialogHeader>
            <FuelTypeForm
              fuelType={editingFuelType}
              onSubmit={handleFuelTypeSubmit}
              onCancel={() => {
                setFuelTypeDialogOpen(false);
                setEditingFuelType(null);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={gasStationDialogOpen} onOpenChange={setGasStationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGasStation ? 'Editar Posto' : 'Novo Posto Homologado'}
              </DialogTitle>
              <DialogDescription>
                Cadastre um posto de combustível autorizado
              </DialogDescription>
            </DialogHeader>
            <GasStationForm
              gasStation={editingGasStation}
              onSubmit={handleGasStationSubmit}
              onCancel={() => {
                setGasStationDialogOpen(false);
                setEditingGasStation(null);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLimit ? 'Editar Limite' : 'Novo Limite de Abastecimento'}
              </DialogTitle>
              <DialogDescription>
                Configure limites mensais de abastecimento
              </DialogDescription>
            </DialogHeader>
            <RefuelLimitForm
              limit={editingLimit}
              onSubmit={handleLimitSubmit}
              onCancel={() => {
                setLimitDialogOpen(false);
                setEditingLimit(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </RequireModule>
  );
}

