// =====================================================
// REGISTRO DE ABASTECIMENTO - PORTAL DO COLABORADOR
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  Upload,
  CheckCircle,
  Clock,
  Car,
  MapPin
} from 'lucide-react';
import { useRefuelRequests, useCreateRefuelRecord } from '@/hooks/combustivel/useCombustivel';
import { useAuth } from '@/lib/auth-context';
import { RefuelRecordForm } from '@/components/combustivel/RefuelRecordForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RefuelRequest } from '@/types/combustivel';

export default function RegistroAbastecimento() {
  const { user } = useAuth();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RefuelRequest | null>(null);

  // Buscar solicitações aprovadas e recarregadas que ainda não foram registradas
  const { data: requests } = useRefuelRequests({ 
    status: 'recarregada',
    solicitado_por: user?.id 
  });

  const createRecord = useCreateRefuelRecord();

  const handleSubmit = (data: any) => {
    if (selectedRequest) {
      createRecord.mutate(
        {
          requestId: selectedRequest.id,
          data,
        },
        {
          onSuccess: () => {
            setRecordDialogOpen(false);
            setSelectedRequest(null);
          },
        }
      );
    }
  };

  // Filtrar apenas solicitações que ainda não têm registro
  // Por enquanto, todas as solicitações recarregadas podem ser registradas
  // O sistema verificará se já existe registro ao tentar criar
  const availableRequests = requests?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Registro de Abastecimento</h1>
        <p className="text-gray-600">Registre os abastecimentos realizados</p>
      </div>

      {/* Solicitações Disponíveis para Registro */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações Pendentes de Registro</CardTitle>
          <CardDescription>
            Solicitações aprovadas e recarregadas aguardando registro do abastecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableRequests.length > 0 ? (
            <div className="space-y-4">
              {availableRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-lg">{request.numero_solicitacao}</p>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Recarregada
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Veículo</p>
                          <p className="font-medium">{request.veiculo_placa || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Valor Recarregado</p>
                          <p className="font-bold text-green-600">
                            {formatCurrency(request.valor_recarregado || request.valor_solicitado)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Data da Solicitação</p>
                          <p className="font-medium">
                            {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">KM do Veículo</p>
                          <p className="font-medium">{request.km_veiculo.toLocaleString('pt-BR')} km</p>
                        </div>
                      </div>
                      {request.rota && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span>Rota: {request.rota}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setRecordDialogOpen(true);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Registrar Abastecimento
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhuma solicitação pendente de registro</p>
              <p className="text-sm mt-2">
                As solicitações aprovadas e recarregadas aparecerão aqui
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Registro */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Abastecimento</DialogTitle>
            <DialogDescription>
              {selectedRequest?.numero_solicitacao}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <RefuelRecordForm
              request={selectedRequest}
              onSubmit={handleSubmit}
              onCancel={() => {
                setRecordDialogOpen(false);
                setSelectedRequest(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

