import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Fuel, 
  Car, 
  User, 
  DollarSign, 
  MapPin,
  Calendar,
  FileText
} from 'lucide-react';
import { Approval } from '@/services/approvals/approvalService';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRefuelRequest } from '@/hooks/combustivel/useCombustivel';

interface CombustivelApprovalCardProps {
  approval: Approval;
  onViewDetails: (approval: Approval) => void;
}

export function CombustivelApprovalCard({ approval, onViewDetails }: CombustivelApprovalCardProps) {
  const { data: request } = useRefuelRequest(approval.processo_id);

  if (!request) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#049940]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">{request.numero_solicitacao}</CardTitle>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {request.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Solicitação de Abastecimento de Combustível
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Veículo</p>
              <p className="font-medium">{request.veiculo_placa || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Condutor</p>
              <p className="font-medium">{request.condutor_nome || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Valor</p>
              <p className="font-bold text-green-600">
                {formatCurrency(request.valor_solicitado)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Data</p>
              <p className="font-medium">
                {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {request.rota && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Rota</p>
              <p className="font-medium text-sm">{request.rota}</p>
            </div>
          </div>
        )}

        {request.centro_custo_nome && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Centro de Custo</p>
              <p className="font-medium text-sm">
                {request.centro_custo_nome}
                {request.projeto_nome && ` • ${request.projeto_nome}`}
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onViewDetails(approval)}
          >
            Ver Detalhes e Aprovar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

