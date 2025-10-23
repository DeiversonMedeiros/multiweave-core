import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Trash2,
  Eye,
  User,
  Calendar,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuditLogs, useAuditConfig, useAuditStats, useCleanupAuditLogs, AuditFilters } from '@/hooks/useAudit';
import { useCompany } from '@/lib/company-context';

// =====================================================
// COMPONENTE DE AUDITORIA
// =====================================================

interface AuditLogItemProps {
  log: {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values?: any;
    new_values?: any;
    user_name?: string;
    created_at: string;
    ip_address?: string;
  };
  onViewDetails: (log: any) => void;
}

const AuditLogItem: React.FC<AuditLogItemProps> = ({ log, onViewDetails }) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'approve':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create': return 'Criar';
      case 'update': return 'Atualizar';
      case 'delete': return 'Excluir';
      case 'approve': return 'Aprovar';
      case 'reject': return 'Rejeitar';
      default: return action;
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'compensation_requests': return 'Solicitação de Compensação';
      case 'compensation_approvals': return 'Aprovação de Compensação';
      case 'approval_levels': return 'Nível de Aprovação';
      case 'employees': return 'Funcionário';
      default: return entityType;
    }
  };

  return (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Badge className={getActionColor(log.action)}>
              {getActionLabel(log.action)}
            </Badge>
            <span className="text-sm font-medium">
              {getEntityLabel(log.entity_type)}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onViewDetails(log)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{log.user_name || 'Sistema'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          </div>
          {log.ip_address && (
            <div className="text-xs text-gray-500">
              IP: {log.ip_address}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface AuditDetailsModalProps {
  log: any;
  onClose: () => void;
}

const AuditDetailsModal: React.FC<AuditDetailsModalProps> = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Detalhes da Auditoria</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Ação</label>
                <p className="font-medium">{log.action}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Entidade</label>
                <p className="font-medium">{log.entity_type}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Usuário</label>
              <p>{log.user_name || 'Sistema'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Data/Hora</label>
              <p>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
            </div>

            {log.ip_address && (
              <div>
                <label className="text-sm font-medium text-gray-600">Endereço IP</label>
                <p>{log.ip_address}</p>
              </div>
            )}

            {log.user_agent && (
              <div>
                <label className="text-sm font-medium text-gray-600">User Agent</label>
                <p className="text-xs break-all">{log.user_agent}</p>
              </div>
            )}

            {log.old_values && (
              <div>
                <label className="text-sm font-medium text-gray-600">Valores Anteriores</label>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}

            {log.new_values && (
              <div>
                <label className="text-sm font-medium text-gray-600">Novos Valores</label>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export function AuditDashboard() {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { selectedCompany } = useCompany();
  const { data: logs = [], isLoading } = useAuditLogs(filters);
  const { data: config = [] } = useAuditConfig();
  const { data: stats } = useAuditStats();
  const cleanupMutation = useCleanupAuditLogs();

  const filteredLogs = logs.filter(log => 
    !searchTerm || 
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    // Clean up special values
    const cleanedValue = value === 'all' ? undefined : value;
    setFilters(prev => ({ ...prev, [key]: cleanedValue }));
  };

  const handleCleanup = () => {
    if (confirm('Tem certeza que deseja limpar logs antigos? Esta ação não pode ser desfeita.')) {
      cleanupMutation.mutate();
    }
  };

  const exportLogs = () => {
    // Implementar exportação
    console.log('Exportando logs...', filteredLogs);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando auditoria...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Ações</p>
                  <p className="text-2xl font-bold">{stats.total_actions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.users_by_action).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Dias Ativos</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.daily_activity).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Ações Críticas</p>
                  <p className="text-2xl font-bold">
                    {(stats.actions_by_type.delete || 0) + (stats.actions_by_type.reject || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros de Auditoria</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button 
                onClick={handleCleanup} 
                variant="outline" 
                size="sm"
                disabled={cleanupMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Logs Antigos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Entidade</label>
              <Select value={filters.entity_type || ''} onValueChange={(value) => handleFilterChange('entity_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  <SelectItem value="compensation_requests">Solicitações de Compensação</SelectItem>
                  <SelectItem value="compensation_approvals">Aprovações</SelectItem>
                  <SelectItem value="approval_levels">Níveis de Aprovação</SelectItem>
                  <SelectItem value="employees">Funcionários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ação</label>
              <Select value={filters.action || ''} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="create">Criar</SelectItem>
                  <SelectItem value="update">Atualizar</SelectItem>
                  <SelectItem value="delete">Excluir</SelectItem>
                  <SelectItem value="approve">Aprovar</SelectItem>
                  <SelectItem value="reject">Rejeitar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por usuário, ação ou entidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum log de auditoria encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <AuditLogItem
                  key={log.id}
                  log={log}
                  onViewDetails={setSelectedLog}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
