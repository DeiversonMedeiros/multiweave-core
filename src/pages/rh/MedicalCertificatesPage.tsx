import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download,
  BarChart3,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useMedicalCertificatesSimple } from '@/hooks/rh/useMedicalCertificatesSimple';
import { useCompany } from '@/lib/company-context';
import MedicalCertificateForm from '@/components/rh/MedicalCertificateForm';
import MedicalCertificateCard from '@/components/rh/MedicalCertificateCard';
import { useToast } from '@/hooks/use-toast';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function MedicalCertificatesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

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
    const matchesSearch = 
      certificate.medico_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.employee?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.cid_codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
                showActions={false}
              />
            )) || []}
          </div>
        </TabsContent>
      </Tabs>

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