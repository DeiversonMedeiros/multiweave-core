// =====================================================
// COMPONENTE: PÁGINA DO MÓDULO FISCAL
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar módulo fiscal
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Receipt, 
  FileText, 
  Upload, 
  Download, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  XCircle,
  Settings,
  Monitor,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { useFiscal } from '@/hooks/financial/useFiscal';
import { NFe, NFSe, SefazStatus, EventoFiscal } from '@/integrations/supabase/financial-types';
import { NFeForm } from './NFeForm';
import { NFSeForm } from './NFSeForm';
import { SefazMonitor } from './SefazMonitor';
import { EventosFiscais } from './EventosFiscais';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FiscalPageProps {
  className?: string;
}

export function FiscalPage({ className }: FiscalPageProps) {
  const {
    nfes,
    nfses,
    sefazStatus,
    eventos,
    loading,
    error,
    createNFe,
    updateNFe,
    deleteNFe,
    createNFSe,
    updateNFSe,
    deleteNFSe,
    emitirNFe,
    emitirNFSe,
    consultarStatusSefaz,
    cancelarNFe,
    cancelarNFSe,
    inutilizarNFe,
    downloadXML,
    downloadDANFE,
    uploadXML,
    processarRetorno,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canEmit,
  } = useFiscal();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNFeForm, setShowNFeForm] = useState(false);
  const [showNFSeForm, setShowNFSeForm] = useState(false);
  const [showSefazMonitor, setShowSefazMonitor] = useState(false);
  const [showEventos, setShowEventos] = useState(false);
  const [selectedNFe, setSelectedNFe] = useState<NFe | null>(null);
  const [selectedNFSe, setSelectedNFSe] = useState<NFSe | null>(null);
  const [editingNFe, setEditingNFe] = useState<NFe | null>(null);
  const [editingNFSe, setEditingNFSe] = useState<NFSe | null>(null);

  // Calcular estatísticas
  const stats = {
    totalNfes: nfes.length,
    totalNfses: nfses.length,
    nfesAutorizadas: nfes.filter(n => n.status_sefaz === 'autorizada').length,
    nfesCanceladas: nfes.filter(n => n.status_sefaz === 'cancelada').length,
    nfesRejeitadas: nfes.filter(n => n.status_sefaz === 'rejeitada').length,
    nfsesAutorizadas: nfses.filter(n => n.status_sefaz === 'autorizada').length,
    nfsesCanceladas: nfses.filter(n => n.status_sefaz === 'cancelada').length,
    nfsesRejeitadas: nfses.filter(n => n.status_sefaz === 'rejeitada').length,
    valorTotalNfes: nfes.reduce((sum, n) => sum + n.valor_total, 0),
    valorTotalNfses: nfses.reduce((sum, n) => sum + n.valor_servico, 0),
    valorTotalImpostos: nfes.reduce((sum, n) => sum + n.valor_icms + n.valor_ipi + n.valor_pis + n.valor_cofins, 0) +
                       nfses.reduce((sum, n) => sum + n.valor_pis + n.valor_cofins + n.valor_inss + n.valor_ir + n.valor_csll + n.valor_iss, 0),
    sefazOnline: sefazStatus.filter(s => s.status === 'online').length,
    sefazOffline: sefazStatus.filter(s => s.status === 'offline').length,
    sefazContingencia: sefazStatus.filter(s => s.status === 'contingencia').length,
  };

  // Handlers
  const handleCreateNFe = () => {
    setEditingNFe(null);
    setShowNFeForm(true);
  };

  const handleEditNFe = (nfe: NFe) => {
    setEditingNFe(nfe);
    setShowNFeForm(true);
  };

  const handleDeleteNFe = async (nfe: NFe) => {
    if (window.confirm(`Tem certeza que deseja excluir a NFe "${nfe.numero_nfe}"?`)) {
      try {
        await deleteNFe(nfe.id);
      } catch (error) {
        console.error('Erro ao deletar NFe:', error);
      }
    }
  };

  const handleEmitirNFe = async (nfe: NFe) => {
    try {
      await emitirNFe(nfe.id);
    } catch (error) {
      console.error('Erro ao emitir NFe:', error);
    }
  };

  const handleCancelarNFe = async (nfe: NFe) => {
    const motivo = prompt('Motivo do cancelamento:');
    if (motivo) {
      try {
        await cancelarNFe(nfe.id, motivo);
      } catch (error) {
        console.error('Erro ao cancelar NFe:', error);
      }
    }
  };

  const handleInutilizarNFe = async (nfe: NFe) => {
    const motivo = prompt('Motivo da inutilização:');
    if (motivo) {
      try {
        await inutilizarNFe(nfe.id, motivo);
      } catch (error) {
        console.error('Erro ao inutilizar NFe:', error);
      }
    }
  };

  const handleCreateNFSe = () => {
    setEditingNFSe(null);
    setShowNFSeForm(true);
  };

  const handleEditNFSe = (nfse: NFSe) => {
    setEditingNFSe(nfse);
    setShowNFSeForm(true);
  };

  const handleDeleteNFSe = async (nfse: NFSe) => {
    if (window.confirm(`Tem certeza que deseja excluir a NFS-e "${nfse.numero_nfse}"?`)) {
      try {
        await deleteNFSe(nfse.id);
      } catch (error) {
        console.error('Erro ao deletar NFS-e:', error);
      }
    }
  };

  const handleEmitirNFSe = async (nfse: NFSe) => {
    try {
      await emitirNFSe(nfse.id);
    } catch (error) {
      console.error('Erro ao emitir NFS-e:', error);
    }
  };

  const handleCancelarNFSe = async (nfse: NFSe) => {
    const motivo = prompt('Motivo do cancelamento:');
    if (motivo) {
      try {
        await cancelarNFSe(nfse.id, motivo);
      } catch (error) {
        console.error('Erro ao cancelar NFS-e:', error);
      }
    }
  };

  const handleSaveNFe = async (data: any) => {
    try {
      if (editingNFe) {
        await updateNFe(editingNFe.id, data);
      } else {
        await createNFe(data);
      }
      setShowNFeForm(false);
      setEditingNFe(null);
    } catch (error) {
      console.error('Erro ao salvar NFe:', error);
    }
  };

  const handleSaveNFSe = async (data: any) => {
    try {
      if (editingNFSe) {
        await updateNFSe(editingNFSe.id, data);
      } else {
        await createNFSe(data);
      }
      setShowNFSeForm(false);
      setEditingNFSe(null);
    } catch (error) {
      console.error('Erro ao salvar NFS-e:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      autorizada: { label: 'Autorizada', variant: 'success' as const, icon: CheckCircle },
      rejeitada: { label: 'Rejeitada', variant: 'destructive' as const, icon: XCircle },
      cancelada: { label: 'Cancelada', variant: 'outline' as const, icon: XCircle },
      inutilizada: { label: 'Inutilizada', variant: 'outline' as const, icon: XCircle },
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

  const getSefazStatusBadge = (status: string) => {
    const statusConfig = {
      online: { label: 'Online', variant: 'success' as const, icon: CheckCircle },
      offline: { label: 'Offline', variant: 'destructive' as const, icon: XCircle },
      indisponivel: { label: 'Indisponível', variant: 'secondary' as const, icon: Clock },
      contingencia: { label: 'Contingência', variant: 'default' as const, icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando módulo fiscal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar módulo fiscal: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo Fiscal</h1>
          <p className="text-muted-foreground">
            Gestão de NF-e, NFS-e e integração SEFAZ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSefazMonitor(true)}>
            <Monitor className="h-4 w-4 mr-2" />
            Monitor SEFAZ
          </Button>
          <Button variant="outline" onClick={() => setShowEventos(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Eventos
          </Button>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total NF-e</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNfes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.nfesAutorizadas} autorizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total NFS-e</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNfses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.nfsesAutorizadas} autorizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.valorTotalNfes + stats.valorTotalNfses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorTotalImpostos)} em impostos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SEFAZ Status</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sefazOnline}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sefazOffline} offline, {stats.sefazContingencia} contingência
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="nfe" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            NF-e
          </TabsTrigger>
          <TabsTrigger value="nfse" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            NFS-e
          </TabsTrigger>
          <TabsTrigger value="sefaz" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            SEFAZ
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status SEFAZ por UF</CardTitle>
                <CardDescription>
                  Monitoramento dos serviços SEFAZ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sefazStatus.map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{status.uf} - {status.servico}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(status.ultima_verificacao)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSefazStatusBadge(status.status)}
                        {status.tempo_resposta && (
                          <span className="text-sm text-muted-foreground">
                            {status.tempo_resposta}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos Recentes</CardTitle>
                <CardDescription>
                  Últimos eventos fiscais processados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventos.slice(0, 5).map((evento) => (
                    <div key={evento.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{evento.tipo_evento}</p>
                        <p className="text-sm text-muted-foreground">
                          {evento.documento_tipo.toUpperCase()} - {formatDate(evento.data_evento)}
                        </p>
                      </div>
                      <Badge variant={evento.status === 'processado' ? 'success' : 'secondary'}>
                        {evento.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NF-e */}
        <TabsContent value="nfe" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notas Fiscais Eletrônicas (NF-e)</CardTitle>
                  <CardDescription>
                    Gerencie as NF-e da empresa
                  </CardDescription>
                </div>
                {canCreate && (
                  <Button onClick={handleCreateNFe}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova NF-e
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nfes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma NF-e encontrada.
                  </div>
                ) : (
                  nfes.map((nfe) => (
                    <div
                      key={nfe.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{nfe.numero_nfe}</span>
                          {getStatusBadge(nfe.status_sefaz)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Série: {nfe.serie} | {formatDate(nfe.data_emissao)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Valor: {formatCurrency(nfe.valor_total)}</span>
                          <span>ICMS: {formatCurrency(nfe.valor_icms)}</span>
                          <span>IPI: {formatCurrency(nfe.valor_ipi)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadXML(nfe.id, 'nfe')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDANFE(nfe.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {canEmit && nfe.status_sefaz === 'pendente' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmitirNFe(nfe)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNFe(nfe)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canEmit && nfe.status_sefaz === 'autorizada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelarNFe(nfe)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNFe(nfe)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NFS-e */}
        <TabsContent value="nfse" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notas Fiscais de Serviços Eletrônicas (NFS-e)</CardTitle>
                  <CardDescription>
                    Gerencie as NFS-e da empresa
                  </CardDescription>
                </div>
                {canCreate && (
                  <Button onClick={handleCreateNFSe}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova NFS-e
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nfses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma NFS-e encontrada.
                  </div>
                ) : (
                  nfses.map((nfse) => (
                    <div
                      key={nfse.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{nfse.numero_nfse}</span>
                          {getStatusBadge(nfse.status_sefaz)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Código: {nfse.codigo_verificacao} | {formatDate(nfse.data_emissao)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Serviço: {formatCurrency(nfse.valor_servico)}</span>
                          <span>ISS: {formatCurrency(nfse.valor_iss)}</span>
                          <span>Líquido: {formatCurrency(nfse.valor_liquido)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadXML(nfse.id, 'nfse')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canEmit && nfse.status_sefaz === 'pendente' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmitirNFSe(nfse)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNFSe(nfse)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canEmit && nfse.status_sefaz === 'autorizada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelarNFSe(nfse)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNFSe(nfse)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEFAZ */}
        <TabsContent value="sefaz" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitor SEFAZ</CardTitle>
              <CardDescription>
                Status dos serviços SEFAZ por UF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sefazStatus.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{status.uf}</span>
                        <span className="text-sm text-muted-foreground">-</span>
                        <span className="text-sm text-muted-foreground">{status.servico}</span>
                        {getSefazStatusBadge(status.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Última verificação: {formatDate(status.ultima_verificacao)}
                        {status.tempo_resposta && (
                          <span className="ml-2">
                            • Tempo de resposta: {status.tempo_resposta}ms
                          </span>
                        )}
                      </div>
                      {status.observacoes && (
                        <div className="text-sm text-muted-foreground">
                          {status.observacoes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => consultarStatusSefaz(status.uf)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {showNFeForm && (
        <NFeForm
          nfe={editingNFe}
          onSave={handleSaveNFe}
          onCancel={() => {
            setShowNFeForm(false);
            setEditingNFe(null);
          }}
        />
      )}

      {showNFSeForm && (
        <NFSeForm
          nfse={editingNFSe}
          onSave={handleSaveNFSe}
          onCancel={() => {
            setShowNFSeForm(false);
            setEditingNFSe(null);
          }}
        />
      )}

      {showSefazMonitor && (
        <SefazMonitor
          onClose={() => setShowSefazMonitor(false)}
        />
      )}

      {showEventos && (
        <EventosFiscais
          onClose={() => setShowEventos(false)}
        />
      )}
    </div>
  );
}
