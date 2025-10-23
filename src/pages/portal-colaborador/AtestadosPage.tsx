import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { useMedicalCertificates } from '@/hooks/rh/useMedicalCertificates';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Stethoscope, 
  Plus, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

export default function AtestadosPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');
  const [cidCode, setCidCode] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar atestados usando o hook específico
  const { 
    useMedicalCertificatesByEmployee,
    createMedicalCertificate,
    uploadAttachment
  } = useMedicalCertificates(selectedCompany?.id);
  
  const { data: medicalCertificates, isLoading } = useMedicalCertificatesByEmployee(employee?.id || '');

  // Mutação para enviar atestado usando o hook
  const certificateMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !selectedCompany?.id) {
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }
      
      // Criar atestado
      const certificate = await createMedicalCertificate.mutateAsync({
        employee_id: employee.id,
        company_id: selectedCompany.id,
        data_emissao: new Date().toISOString().split('T')[0],
        data_inicio: startDate,
        data_fim: endDate,
        tipo_atestado: type as 'medico' | 'odontologico' | 'psicologico',
        medico_nome: '', // TODO: Adicionar campo no formulário
        crm_crmo: '', // TODO: Adicionar campo no formulário
        cid_codigo: cidCode,
        valor_beneficio: 0,
        status: 'pendente'
      });
      
      // Upload do anexo se houver
      if (file && certificate) {
        await uploadAttachment.mutateAsync({
          certificateId: certificate.id,
          file: file,
          uploadedBy: user?.id || ''
        });
      }
      
      return certificate;
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setStartDate('');
      setEndDate('');
      setType('');
      setCidCode('');
      setFile(null);
      
      toast({
        title: "Atestado enviado!",
        description: "Seu atestado foi enviado para análise.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar atestado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!startDate || !endDate || !type || !file) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    certificateMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  // Mostrar loading apenas se não houver dados básicos (user, company)
  if (!user || !selectedCompany) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Atestados</h1>
          <p className="text-gray-600">
            Envie atestados médicos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!employee?.id}>
              <Plus className="h-4 w-4 mr-2" />
              {!employee?.id ? 'Carregando...' : 'Enviar Atestado'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Enviar Atestado</DialogTitle>
              <DialogDescription>
                Envie seu atestado médico para análise
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Atestado</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="doenca">Doença</option>
                  <option value="acidente">Acidente</option>
                  <option value="licenca_medica">Licença Médica</option>
                  <option value="preventivo">Preventivo</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start">Data de Início</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Data de Fim</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cid">Código CID (opcional)</Label>
                <Input
                  id="cid"
                  value={cidCode}
                  onChange={(e) => setCidCode(e.target.value)}
                  placeholder="Ex: A00.0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">Arquivo do Atestado (PDF, JPG, PNG)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={certificateMutation.isPending}
              >
                {certificateMutation.isPending ? 'Enviando...' : 'Enviar Atestado'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Atestados</CardTitle>
          <CardDescription>
            Histórico de atestados enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {medicalCertificates && medicalCertificates.length > 0 ? (
            <div className="space-y-4">
              {medicalCertificates.map((certificate) => (
                <div
                  key={certificate.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {certificate.tipo} - {certificate.cid_codigo || 'Sem CID'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(certificate.data_inicio).toLocaleDateString('pt-BR')} - {new Date(certificate.data_fim).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-500">
                        Enviado em {new Date(certificate.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(certificate.status)}
                    <Badge variant="outline">
                      {getStatusLabel(certificate.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum atestado encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    );
}
