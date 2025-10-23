import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Upload, FileText, AlertCircle } from 'lucide-react';
import { useMedicalCertificatesSimple } from '@/hooks/rh/useMedicalCertificatesSimple';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const medicalCertificateSchema = z.object({
  employee_id: z.string().min(1, 'Funcionário é obrigatório'),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de fim é obrigatória'),
  tipo_atestado: z.enum(['medico', 'odontologico', 'psicologico'], {
    required_error: 'Tipo do atestado é obrigatório'
  }),
  medico_nome: z.string().min(1, 'Nome do médico é obrigatório'),
  crm_crmo: z.string().min(1, 'CRM/CRMO é obrigatório'),
  especialidade: z.string().optional(),
  cid_codigo: z.string().optional(),
  valor_beneficio: z.number().min(0, 'Valor deve ser maior ou igual a 0'),
  observacoes: z.string().optional(),
});

type MedicalCertificateFormData = z.infer<typeof medicalCertificateSchema>;

// =====================================================
// INTERFACE DO COMPONENTE
// =====================================================

interface MedicalCertificateFormProps {
  employeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isEdit?: boolean;
  initialData?: Partial<MedicalCertificateFormData>;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const MedicalCertificateForm: React.FC<MedicalCertificateFormProps> = ({
  employeeId,
  onSuccess,
  onCancel,
  isEdit = false,
  initialData
}) => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    createMedicalCertificate,
    calculateAbsenceDays
  } = useMedicalCertificatesSimple(selectedCompany?.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<MedicalCertificateFormData>({
    resolver: zodResolver(medicalCertificateSchema),
    defaultValues: {
      employee_id: employeeId || '',
      data_emissao: new Date().toISOString().split('T')[0],
      valor_beneficio: 0,
      tipo_atestado: 'medico',
      ...initialData
    }
  });

  const watchedData = watch(['data_inicio', 'data_fim', 'tipo_atestado']);

  // Calcular dias de afastamento automaticamente
  React.useEffect(() => {
    if (watchedData[0] && watchedData[1]) {
      const days = calculateAbsenceDays(watchedData[0], watchedData[1]);
      // Atualizar o campo dias_afastamento se necessário
    }
  }, [watchedData, calculateAbsenceDays]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Apenas arquivos PDF, JPG e PNG são permitidos.",
          variant: "destructive",
        });
        return;
      }
      
      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const onSubmit = async (data: MedicalCertificateFormData) => {
    try {
      setIsUploading(true);

      // Criar atestado
      const certificate = await createMedicalCertificate.mutateAsync({
        ...data,
        company_id: selectedCompany?.id || '',
        dias_afastamento: calculateAbsenceDays(data.data_inicio, data.data_fim),
        status: 'pendente'
      });

      toast({
        title: "Atestado enviado!",
        description: "Seu atestado foi enviado para análise.",
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar atestado:', error);
      toast({
        title: "Erro ao salvar atestado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isEdit ? 'Editar Atestado Médico' : 'Novo Atestado Médico'}
        </CardTitle>
        <CardDescription>
          {isEdit 
            ? 'Atualize as informações do atestado médico'
            : 'Preencha os dados do atestado médico para envio'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_emissao">Data de Emissão *</Label>
              <Input
                id="data_emissao"
                type="date"
                {...register('data_emissao')}
                className={errors.data_emissao ? 'border-red-500' : ''}
              />
              {errors.data_emissao && (
                <p className="text-sm text-red-500">{errors.data_emissao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_atestado">Tipo do Atestado *</Label>
              <Select
                value={watch('tipo_atestado')}
                onValueChange={(value) => setValue('tipo_atestado', value as any)}
              >
                <SelectTrigger className={errors.tipo_atestado ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="odontologico">Odontológico</SelectItem>
                  <SelectItem value="psicologico">Psicológico</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_atestado && (
                <p className="text-sm text-red-500">{errors.tipo_atestado.message}</p>
              )}
            </div>
          </div>

          {/* Período de Afastamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                {...register('data_inicio')}
                className={errors.data_inicio ? 'border-red-500' : ''}
              />
              {errors.data_inicio && (
                <p className="text-sm text-red-500">{errors.data_inicio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Fim *</Label>
              <Input
                id="data_fim"
                type="date"
                {...register('data_fim')}
                className={errors.data_fim ? 'border-red-500' : ''}
              />
              {errors.data_fim && (
                <p className="text-sm text-red-500">{errors.data_fim.message}</p>
              )}
            </div>
          </div>

          {/* Cálculo automático de dias */}
          {watchedData[0] && watchedData[1] && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Período de afastamento: {calculateAbsenceDays(watchedData[0], watchedData[1])} dias
              </AlertDescription>
            </Alert>
          )}

          {/* Dados do Médico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medico_nome">Nome do Médico *</Label>
              <Input
                id="medico_nome"
                {...register('medico_nome')}
                className={errors.medico_nome ? 'border-red-500' : ''}
                placeholder="Nome completo do médico"
              />
              {errors.medico_nome && (
                <p className="text-sm text-red-500">{errors.medico_nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm_crmo">CRM/CRMO *</Label>
              <Input
                id="crm_crmo"
                {...register('crm_crmo')}
                className={errors.crm_crmo ? 'border-red-500' : ''}
                placeholder="Número do CRM/CRMO"
              />
              {errors.crm_crmo && (
                <p className="text-sm text-red-500">{errors.crm_crmo.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="especialidade">Especialidade</Label>
            <Input
              id="especialidade"
              {...register('especialidade')}
              placeholder="Especialidade médica"
            />
          </div>

          {/* Código CID */}
          <div className="space-y-2">
            <Label htmlFor="cid_codigo">Código CID</Label>
            <Input
              id="cid_codigo"
              {...register('cid_codigo')}
              placeholder="Ex: F32.1"
            />
          </div>

          {/* Valor do Benefício */}
          <div className="space-y-2">
            <Label htmlFor="valor_beneficio">Valor do Benefício (R$)</Label>
            <Input
              id="valor_beneficio"
              type="number"
              step="0.01"
              min="0"
              {...register('valor_beneficio', { valueAsNumber: true })}
              className={errors.valor_beneficio ? 'border-red-500' : ''}
            />
            {errors.valor_beneficio && (
              <p className="text-sm text-red-500">{errors.valor_beneficio.message}</p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              placeholder="Observações adicionais sobre o atestado"
              rows={3}
            />
          </div>

          {/* Upload de Anexo */}
          <div className="space-y-2">
            <Label htmlFor="anexo">Anexar Atestado</Label>
            <div className="flex items-center gap-4">
              <Input
                id="anexo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {selectedFile && (
              <p className="text-sm text-green-600">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: PDF, JPG, PNG (máximo 5MB)
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting || isUploading}
              className="min-w-[120px]"
            >
              {isSubmitting || isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {isUploading ? 'Enviando...' : 'Salvando...'}
                </>
              ) : (
                isEdit ? 'Atualizar' : 'Enviar'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MedicalCertificateForm;
