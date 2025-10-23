import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Filter,
  Search,
  Menu,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompensationRequests } from '@/hooks/rh/useCompensationRequests';
import { useCompany } from '@/lib/company-context';
import { CompensationRequest } from '@/integrations/supabase/rh-types';
import { NotificationCenter } from '@/components/NotificationCenter';

// =====================================================
// COMPONENTE MOBILE PARA COMPENSAÇÕES
// =====================================================

interface MobileCompensationCardProps {
  compensation: CompensationRequest;
  onViewDetails: (compensation: CompensationRequest) => void;
}

const MobileCompensationCard: React.FC<MobileCompensationCardProps> = ({ 
  compensation, 
  onViewDetails 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejeitado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'realizado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4" />;
      case 'pendente':
        return <Clock className="h-4 w-4" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4" />;
      case 'realizado':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'pendente': return 'Pendente';
      case 'rejeitado': return 'Rejeitado';
      case 'realizado': return 'Realizado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <Card 
      className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onViewDetails(compensation)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(compensation.status)}
              <span className="font-medium text-lg">
                {compensation.quantidade_horas}h
              </span>
              <Badge className={getStatusColor(compensation.status)}>
                {getStatusLabel(compensation.status)}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {compensation.descricao}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {format(new Date(compensation.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
              <span className="capitalize">
                {compensation.tipo?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileCompensationDetailsProps {
  compensation: CompensationRequest;
  onClose: () => void;
  onEdit?: (compensation: CompensationRequest) => void;
  onApprove?: (compensation: CompensationRequest) => void;
  onReject?: (compensation: CompensationRequest) => void;
}

const MobileCompensationDetails: React.FC<MobileCompensationDetailsProps> = ({
  compensation,
  onClose,
  onEdit,
  onApprove,
  onReject
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'text-green-600';
      case 'pendente': return 'text-yellow-600';
      case 'rejeitado': return 'text-red-600';
      case 'realizado': return 'text-blue-600';
      case 'cancelado': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'pendente': return 'Pendente';
      case 'rejeitado': return 'Rejeitado';
      case 'realizado': return 'Realizado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full max-h-[80vh] rounded-t-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detalhes da Compensação</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Horas</label>
              <p className="text-lg font-semibold">{compensation.quantidade_horas}h</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p className={`text-lg font-semibold ${getStatusColor(compensation.status)}`}>
                {getStatusLabel(compensation.status)}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Tipo</label>
            <p className="capitalize">{compensation.tipo?.replace('_', ' ')}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Data de Início</label>
            <p>{format(new Date(compensation.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</p>
          </div>

          {compensation.data_fim && (
            <div>
              <label className="text-sm font-medium text-gray-600">Data de Fim</label>
              <p>{format(new Date(compensation.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600">Descrição</label>
            <p className="text-gray-800">{compensation.descricao}</p>
          </div>

          {compensation.observacoes && (
            <div>
              <label className="text-sm font-medium text-gray-600">Observações</label>
              <p className="text-gray-800">{compensation.observacoes}</p>
            </div>
          )}

          {compensation.motivo_rejeicao && (
            <div>
              <label className="text-sm font-medium text-gray-600">Motivo da Rejeição</label>
              <p className="text-red-600">{compensation.motivo_rejeicao}</p>
            </div>
          )}

          {compensation.data_aprovacao && (
            <div>
              <label className="text-sm font-medium text-gray-600">Data de Aprovação</label>
              <p>{format(new Date(compensation.data_aprovacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex space-x-2">
            {compensation.status === 'pendente' && (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onApprove?.(compensation)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onReject?.(compensation)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </>
            )}
            {compensation.status === 'aprovado' && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {/* Marcar como realizada */}}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Realizada
              </Button>
            )}
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onEdit?.(compensation)}
            >
              Editar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function MobileCompensationView() {
  const [selectedCompensation, setSelectedCompensation] = useState<CompensationRequest | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const { selectedCompany } = useCompany();
  const { data: compensations = [], isLoading } = useCompensationRequests();

  // Filtrar compensações por tab
  const filteredCompensations = compensations.filter(comp => {
    switch (activeTab) {
      case 'pending':
        return comp.status === 'pendente';
      case 'approved':
        return comp.status === 'aprovado';
      case 'rejected':
        return comp.status === 'rejeitado';
      case 'realized':
        return comp.status === 'realizado';
      default:
        return true;
    }
  });

  const stats = {
    total: compensations.length,
    pending: compensations.filter(c => c.status === 'pendente').length,
    approved: compensations.filter(c => c.status === 'aprovado').length,
    rejected: compensations.filter(c => c.status === 'rejeitado').length,
    realized: compensations.filter(c => c.status === 'realizado').length,
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center">Carregando compensações...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Compensações</h1>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationCenter />
            <Button size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-600">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pendentes</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">Rejeitadas</TabsTrigger>
            <TabsTrigger value="realized" className="text-xs">Realizadas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de Compensações */}
      <div className="px-4 pb-20">
        {filteredCompensations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma compensação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredCompensations.map((compensation) => (
            <MobileCompensationCard
              key={compensation.id}
              compensation={compensation}
              onViewDetails={setSelectedCompensation}
            />
          ))
        )}
      </div>

      {/* Detalhes Modal */}
      {selectedCompensation && (
        <MobileCompensationDetails
          compensation={selectedCompensation}
          onClose={() => setSelectedCompensation(null)}
          onEdit={(comp) => {
            setSelectedCompensation(null);
            // Implementar edição
          }}
          onApprove={(comp) => {
            setSelectedCompensation(null);
            // Implementar aprovação
          }}
          onReject={(comp) => {
            setSelectedCompensation(null);
            // Implementar rejeição
          }}
        />
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          className="rounded-full shadow-lg"
          onClick={() => {/* Implementar criação */}}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
