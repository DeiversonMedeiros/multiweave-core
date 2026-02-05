import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Stethoscope, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMedicalCertificates } from '@/hooks/rh/useGestorPortal';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';

const AprovacaoAtestados: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { selectedCompany } = useCompany();
  const { certificates, loading, error, refetch: fetchCertificates } = useMedicalCertificates(selectedCompany?.id || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Stethoscope className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Stethoscope className="h-4 w-4" />;
    }
  };

  const filteredCertificates = certificates.filter(certificate => {
    const matchesSearch = certificate.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         certificate.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || certificate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  const getAtestadosPendentes = () => {
    return certificates.filter(c => c.status === 'pendente').length;
  };

  if (loading) {
    return (

    <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando atestados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar atestados: {error}</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Atestados</h1>
          <p className="text-muted-foreground">
            Gerencie atestados médicos da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-600">
            {getAtestadosPendentes()} Pendentes
          </Badge>
          <Button onClick={() => navigate('/portal-gestor/aprovacoes')}>
            Voltar para Central
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filteredCertificates.length} atestado(s) encontrado(s)
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredCertificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Stethoscope className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{certificate.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {certificate.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Atestado #{certificate.numero_atestado} • {certificate.dias_afastamento} dias
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(certificate.data_inicio).toLocaleDateString('pt-BR')} - {new Date(certificate.data_fim).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        {certificate.cid_codigo && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>CID:</strong> {certificate.cid_codigo} - {certificate.cid_descricao}
                          </p>
                        )}
                        {certificate.observacoes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Observações:</strong> {certificate.observacoes}
                          </p>
                        )}
                        {certificate.dias_afastamento > 15 && (
                          <div className="flex items-center space-x-1 mt-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600">
                              Atestado longo ({certificate.dias_afastamento} dias)
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Solicitado em: {new Date(certificate.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(certificate.status)}
                      <Badge className={getStatusColor(certificate.status)}>
                        {certificate.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCertificate(certificate);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCertificates.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum atestado encontrado com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Atestado</DialogTitle>
            <DialogDescription>
              Informações completas do atestado médico
            </DialogDescription>
          </DialogHeader>
          {selectedCertificate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Funcionário</p>
                  <p className="text-base">{selectedCertificate.funcionario_nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Matrícula</p>
                  <p className="text-base">{selectedCertificate.funcionario_matricula}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Número do Atestado</p>
                  <p className="text-base">{selectedCertificate.numero_atestado || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-base">{selectedCertificate.tipo_atestado || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Início</p>
                  <p className="text-base">
                    {new Date(selectedCertificate.data_inicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Fim</p>
                  <p className="text-base">
                    {new Date(selectedCertificate.data_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dias de Afastamento</p>
                  <p className="text-base">{selectedCertificate.dias_afastamento} dias</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedCertificate.status)}>
                    {selectedCertificate.status}
                  </Badge>
                </div>
              </div>
              
              {selectedCertificate.medico_nome && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Médico</p>
                  <p className="text-base">
                    {selectedCertificate.medico_nome}
                    {selectedCertificate.crm_crmo && ` - CRM/CRMO: ${selectedCertificate.crm_crmo}`}
                  </p>
                </div>
              )}
              
              {selectedCertificate.cid_codigo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CID</p>
                  <p className="text-base">
                    {selectedCertificate.cid_codigo} - {selectedCertificate.cid_descricao}
                  </p>
                </div>
              )}
              
              {selectedCertificate.observacoes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Observações</p>
                  <p className="text-base whitespace-pre-wrap">{selectedCertificate.observacoes}</p>
                </div>
              )}
              
              {selectedCertificate.anexo_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Anexo</p>
                  <a 
                    href={selectedCertificate.anexo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Ver anexo
                  </a>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Solicitado em</p>
                  <p className="text-base">
                    {new Date(selectedCertificate.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {selectedCertificate.aprovado_em && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aprovado em</p>
                    <p className="text-base">
                      {new Date(selectedCertificate.aprovado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    );
};

export default AprovacaoAtestados;
