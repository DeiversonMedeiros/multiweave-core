import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  User,
  Stethoscope,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMedicalCertificatesSimple } from '@/hooks/rh/useMedicalCertificatesSimple';
import { useCompany } from '@/lib/company-context';
import MedicalCertificateForm from '@/components/rh/MedicalCertificateForm';
import MedicalCertificateCard from '@/components/rh/MedicalCertificateCard';
import { useToast } from '@/hooks/use-toast';
import { MedicalCertificate } from '@/integrations/supabase/rh-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function MedicalCertificatesPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [viewingCertificate, setViewingCertificate] = useState<MedicalCertificate | null>(null);

  const {
    medicalCertificates,
    isLoading,
    error,
    useMedicalCertificatesByEmployee,
    createMedicalCertificate,
    calculateAbsenceDays
  } = useMedicalCertificatesSimple(selectedCompany?.id);

  // Filtrar atestados por status
  const pendingCertificates = medicalCertificates?.filter(cert => cert.status === 'pendente') || [];
  const approvedCertificates = medicalCertificates?.filter(cert => cert.status === 'aprovado') || [];
  const rejectedCertificates = medicalCertificates?.filter(cert => cert.status === 'rejeitado') || [];

  // Filtrar atestados
  const filteredCertificates = medicalCertificates?.filter(certificate => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (certificate.medico_nome?.toLowerCase() || '').includes(searchLower) ||
      (certificate.employee?.nome?.toLowerCase() || '').includes(searchLower) ||
      (certificate.cid_codigo?.toLowerCase() || '').includes(searchLower);
    
    const matchesStatus = statusFilter === 'todos' || certificate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Estatísticas
  const totalCertificates = medicalCertificates?.length || 0;
  const pendingCount = pendingCertificates?.length || 0;
  const approvedCount = approvedCertificates?.length || 0;
  const rejectedCount = rejectedCertificates?.length || 0;
  const totalDays = medicalCertificates?.reduce((sum, cert) => sum + (cert.dias_afastamento || 0), 0) || 0;
  const totalValue = medicalCertificates?.reduce((sum, cert) => sum + (cert.valor_beneficio || 0), 0) || 0;

  const handleApprove = async (certificate: any) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Aprovação de atestados será implementada em breve.",
    });
  };

  const handleReject = async (certificate: any) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Rejeição de atestados será implementada em breve.",
    });
  };

  const handleDelete = async (certificate: any) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Exclusão de atestados será implementada em breve.",
    });
  };

  const handleView = (certificate: MedicalCertificate) => {
    setViewingCertificate(certificate);
  };

  const handleViewAttachment = async (attachment: any) => {
    try {
      if (!attachment.file_url) {
        toast({
          title: "Erro",
          description: "URL do arquivo não encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Gerar signed URL para visualização (válida por 1 hora)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('medical-certificates')
        .createSignedUrl(attachment.file_url, 3600);

      if (signedUrlError || !signedUrlData) {
        throw new Error('Não foi possível gerar URL de visualização');
      }

      // Abrir em nova aba
      window.open(signedUrlData.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error('Erro ao visualizar anexo:', error);
      toast({
        title: "Erro ao visualizar anexo",
        description: error.message || "Não foi possível abrir o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      if (!attachment.file_url) {
        toast({
          title: "Erro",
          description: "URL do arquivo não encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Gerar signed URL para download (válida por 1 hora)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('medical-certificates')
        .createSignedUrl(attachment.file_url, 3600);

      if (signedUrlError || !signedUrlData) {
        throw new Error('Não foi possível gerar URL de download');
      }

      // Fazer download
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Erro ao baixar anexo:', error);
      toast({
        title: "Erro ao baixar anexo",
        description: error.message || "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejeitado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluido':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  const getTipoText = (tipo: string) => {
    switch (tipo) {
      case 'medico':
        return 'Médico';
      case 'odontologico':
        return 'Odontológico';
      case 'psicologico':
        return 'Psicológico';
      default:
        return tipo;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2 text-red-600">Erro ao carregar atestados</h3>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atestados Médicos</h1>
          <p className="text-muted-foreground">
            Controle de atestados médicos e licenças de saúde
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Atestado
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalCertificates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Dias Totais</p>
                <p className="text-2xl font-bold">{totalDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por médico, funcionário ou CID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="rejeitado">Rejeitados</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atestados */}
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos">Todos ({totalCertificates})</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes ({pendingCount})</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados ({rejectedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          {filteredCertificates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum atestado encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'todos' 
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Comece criando um novo atestado médico.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCertificates.map((certificate) => (
                <MedicalCertificateCard
                  key={certificate.id}
                  certificate={certificate}
                  onView={handleView}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDownload={(cert) => {
                    // TODO: Implementar download
                    console.log('Download:', cert);
                  }}
                  showActions={true}
                  isManager={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendentes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingCertificates?.map((certificate) => (
              <MedicalCertificateCard
                key={certificate.id}
                certificate={certificate}
                onView={handleView}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions={true}
                isManager={true}
              />
            )) || []}
          </div>
        </TabsContent>

        <TabsContent value="aprovados" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {approvedCertificates?.map((certificate) => (
              <MedicalCertificateCard
                key={certificate.id}
                certificate={certificate}
                onView={handleView}
                showActions={false}
              />
            )) || []}
          </div>
        </TabsContent>

        <TabsContent value="rejeitados" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rejectedCertificates?.map((certificate) => (
              <MedicalCertificateCard
                key={certificate.id}
                certificate={certificate}
                onView={handleView}
                showActions={false}
              />
            )) || []}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Visualização de Detalhes */}
      <Dialog open={!!viewingCertificate} onOpenChange={() => setViewingCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingCertificate && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-6 w-6 text-blue-600" />
                    <div>
                      <DialogTitle className="text-2xl font-bold">
                        Detalhes do Atestado {getTipoText(viewingCertificate.tipo_atestado)}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        {viewingCertificate.numero_atestado && `Nº ${viewingCertificate.numero_atestado}`}
                        {viewingCertificate.numero_atestado && viewingCertificate.employee?.nome && ' • '}
                        {viewingCertificate.employee?.nome}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(viewingCertificate.status)}>
                    {getStatusText(viewingCertificate.status)}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Informações Básicas do Atestado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {viewingCertificate.numero_atestado && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Número do Atestado</label>
                          <p className="font-semibold">{viewingCertificate.numero_atestado}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tipo de Atestado</label>
                        <p className="font-semibold">{getTipoText(viewingCertificate.tipo_atestado)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Emissão</label>
                        <p className="font-semibold">{viewingCertificate.data_emissao ? formatDateOnly(viewingCertificate.data_emissao) : 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <Badge className={getStatusColor(viewingCertificate.status)}>
                          {getStatusText(viewingCertificate.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informações do Colaborador */}
                {viewingCertificate.employee && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Informações do Colaborador
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Nome</label>
                          <p className="font-semibold">{viewingCertificate.employee.nome}</p>
                        </div>
                        {viewingCertificate.employee.matricula && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Matrícula</label>
                            <p className="font-semibold">{viewingCertificate.employee.matricula}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Informações do Médico */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                      Informações do Médico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nome do Médico</label>
                        <p className="font-semibold">{viewingCertificate.medico_nome || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CRM/CRMO</label>
                        <p className="font-semibold">{viewingCertificate.crm_crmo || 'Não informado'}</p>
                      </div>
                      {viewingCertificate.especialidade && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Especialidade</label>
                          <p className="font-semibold">{viewingCertificate.especialidade}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Período de Afastamento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Período de Afastamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Início</label>
                        <p className="font-semibold">{formatDateOnly(viewingCertificate.data_inicio)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Fim</label>
                        <p className="font-semibold">{formatDateOnly(viewingCertificate.data_fim)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Duração</label>
                        <p className="font-semibold text-blue-600">{viewingCertificate.dias_afastamento} dias</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Atestado de Comparecimento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Atestado de Comparecimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">É atestado de comparecimento?</label>
                        <p className="font-semibold">{viewingCertificate.atestado_comparecimento ? 'Sim' : 'Não'}</p>
                      </div>
                      {viewingCertificate.atestado_comparecimento && viewingCertificate.horas_comparecimento != null && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Quantidade de horas</label>
                          <p className="font-semibold text-amber-600">
                            {Number(viewingCertificate.horas_comparecimento).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Utilizado no cálculo do banco de horas</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Código CID */}
                {viewingCertificate.cid_codigo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Código CID</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Código</label>
                        <p className="font-semibold">{viewingCertificate.cid_codigo}</p>
                      </div>
                      {viewingCertificate.cid_descricao && (
                        <div className="mt-3">
                          <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                          <p className="text-sm">{viewingCertificate.cid_descricao}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Valor do Benefício */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Valor do Benefício
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {viewingCertificate.valor_beneficio > 0 
                        ? formatCurrency(viewingCertificate.valor_beneficio)
                        : 'R$ 0,00'}
                    </p>
                  </CardContent>
                </Card>

                {/* Observações */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {viewingCertificate.observacoes || 'Nenhuma observação registrada.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Informações de Aprovação */}
                {viewingCertificate.aprovado_por && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informações de Aprovação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Aprovado por</label>
                        <p className="font-semibold">{viewingCertificate.aprovador?.nome || 'Usuário'}</p>
                      </div>
                      {viewingCertificate.aprovado_em && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Data de Aprovação</label>
                          <p className="font-semibold">{formatDate(viewingCertificate.aprovado_em)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Anexos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Anexos do Atestado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewingCertificate.attachments && viewingCertificate.attachments.length > 0 ? (
                      <div className="space-y-3">
                        {viewingCertificate.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-5 w-5 text-blue-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{attachment.file_name}</p>
                                {attachment.file_size && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatFileSize(attachment.file_size)}
                                    {attachment.file_type && ` • ${attachment.file_type}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewAttachment(attachment)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Visualizar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadAttachment(attachment)}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : viewingCertificate.anexo_url ? (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Anexo do atestado</p>
                            <p className="text-xs text-muted-foreground mt-1">Arquivo anexado (formato antigo)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Tentar gerar signed URL se for um path do storage
                                if (viewingCertificate.anexo_url && !viewingCertificate.anexo_url.startsWith('http')) {
                                  const { data: signedUrlData, error } = await supabase.storage
                                    .from('medical-certificates')
                                    .createSignedUrl(viewingCertificate.anexo_url, 3600);
                                  
                                  if (!error && signedUrlData) {
                                    window.open(signedUrlData.signedUrl, '_blank', 'noopener,noreferrer');
                                  } else {
                                    window.open(viewingCertificate.anexo_url, '_blank', 'noopener,noreferrer');
                                  }
                                } else {
                                  window.open(viewingCertificate.anexo_url, '_blank', 'noopener,noreferrer');
                                }
                              } catch (error) {
                                console.error('Erro ao abrir anexo:', error);
                                window.open(viewingCertificate.anexo_url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum anexo disponível
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Informações do Sistema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                        <p className="text-sm">{formatDate(viewingCertificate.created_at)}</p>
                      </div>
                      {viewingCertificate.updated_at && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                          <p className="text-sm">{formatDate(viewingCertificate.updated_at)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <MedicalCertificateForm
              onSuccess={() => {
                setIsFormOpen(false);
                setSelectedCertificate(null);
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedCertificate(null);
              }}
              isEdit={!!selectedCertificate}
              initialData={selectedCertificate}
            />
          </div>
        </div>
      )}
    </div>
  );
}