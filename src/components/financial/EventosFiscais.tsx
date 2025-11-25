// =====================================================
// COMPONENTE: EVENTOS FISCAIS
// =====================================================
// Data: 2025-01-15
// Descrição: Lista de eventos fiscais processados
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, 
  RefreshCw, 
  Search, 
  Filter,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  Calendar,
  Hash
} from 'lucide-react';
import { EventoFiscal } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFiscal } from '@/hooks/financial/useFiscal';

interface EventosFiscaisProps {
  onClose: () => void;
}

export function EventosFiscais({ onClose }: EventosFiscaisProps) {
  const [filteredEventos, setFilteredEventos] = useState<EventoFiscal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');

  // Carregar dados reais usando hook useFiscal
  const { eventos, loading } = useFiscal();

  // Filtrar eventos
  useEffect(() => {
    let filtered = eventos || [];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(evento =>
        evento.documento_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.chave_acesso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.numero_protocolo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(evento => evento.status === statusFilter);
    }

    // Filtro por tipo
    if (tipoFilter !== 'all') {
      filtered = filtered.filter(evento => evento.tipo_evento === tipoFilter);
    }

    setFilteredEventos(filtered);
  }, [eventos, searchTerm, statusFilter, tipoFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    // Simular atualização
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processado: { label: 'Processado', variant: 'success' as const, icon: CheckCircle },
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      erro: { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'emissao':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'cancelamento':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'inutilizacao':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'manifestacao':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'correcao':
        return <RefreshCw className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos = {
      emissao: 'Emissão',
      cancelamento: 'Cancelamento',
      inutilizacao: 'Inutilização',
      manifestacao: 'Manifestação',
      correcao: 'Correção',
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  const formatChaveAcesso = (chave: string) => {
    if (!chave) return '-';
    return `${chave.substring(0, 4)} ${chave.substring(4, 8)} ${chave.substring(8, 12)} ${chave.substring(12, 16)} ${chave.substring(16, 20)} ${chave.substring(20, 24)} ${chave.substring(24, 28)} ${chave.substring(28, 32)} ${chave.substring(32, 36)} ${chave.substring(36, 40)} ${chave.substring(40, 44)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Eventos Fiscais
              </CardTitle>
              <CardDescription>
                Histórico de eventos processados no SEFAZ
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por documento, chave de acesso ou protocolo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="emissao">Emissão</SelectItem>
                <SelectItem value="cancelamento">Cancelamento</SelectItem>
                <SelectItem value="inutilizacao">Inutilização</SelectItem>
                <SelectItem value="manifestacao">Manifestação</SelectItem>
                <SelectItem value="correcao">Correção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Eventos */}
          <div className="space-y-4">
            {filteredEventos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento encontrado.
              </div>
            ) : (
              filteredEventos.map((evento) => (
                <Card key={evento.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0">
                          {getTipoIcon(evento.tipo_evento)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {getTipoLabel(evento.tipo_evento)} - {evento.documento_tipo.toUpperCase()}
                            </h3>
                            <Badge variant="outline">
                              #{evento.documento_id}
                            </Badge>
                            {getStatusBadge(evento.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p><strong>Data do Evento:</strong> {formatDate(evento.data_evento)}</p>
                              {evento.chave_acesso && (
                                <p><strong>Chave de Acesso:</strong> {formatChaveAcesso(evento.chave_acesso)}</p>
                              )}
                              {evento.numero_protocolo && (
                                <p><strong>Protocolo:</strong> {evento.numero_protocolo}</p>
                              )}
                            </div>
                            <div>
                              <p><strong>Usuário:</strong> {evento.created_by}</p>
                              <p><strong>Criado em:</strong> {formatDate(evento.created_at)}</p>
                            </div>
                          </div>

                          {evento.observacoes && (
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm"><strong>Observações:</strong> {evento.observacoes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {evento.xml_evento && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {eventos.filter(e => e.status === 'processado').length}
              </p>
              <p className="text-sm text-muted-foreground">Processados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {eventos.filter(e => e.status === 'pendente').length}
              </p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {eventos.filter(e => e.status === 'erro').length}
              </p>
              <p className="text-sm text-muted-foreground">Com Erro</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {eventos.length}
              </p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
