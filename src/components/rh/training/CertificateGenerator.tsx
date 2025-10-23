import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar,
  Award,
  User,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { useCertificate, useEligibleEnrollments } from '@/hooks/rh/useCertificate';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';

interface CertificateGeneratorProps {
  trainingId?: string;
  certificate?: any;
  onSave: (certificate: any) => void;
  onCancel: () => void;
}

interface CertificateFormData {
  enrollment_id: string;
  nota_final: number;
  observacoes: string;
  data_validade: string;
  is_valid: boolean;
}

const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({ 
  trainingId, 
  certificate, 
  onSave, 
  onCancel 
}) => {
  const { selectedCompany } = useCompany();
  const { trainings } = useTraining(selectedCompany?.id || '');
  const { enrollments, isLoading: isLoadingEnrollments } = useEligibleEnrollments(trainingId || '');
  const { generateCertificate, updateCertificate } = useCertificate(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState<CertificateFormData>({
    enrollment_id: '',
    nota_final: 0,
    observacoes: '',
    data_validade: '',
    is_valid: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

  // Buscar treinamento
  const training = trainings?.find(t => t.id === trainingId);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (certificate) {
      setFormData({
        enrollment_id: certificate.enrollment_id,
        nota_final: certificate.nota_final || 0,
        observacoes: certificate.observacoes || '',
        data_validade: certificate.data_validade || '',
        is_valid: certificate.is_valid !== false
      });
      setSelectedEnrollment(certificate.enrollment);
    } else {
      // Para novo certificado, definir data de validade padrão (2 anos)
      const defaultValidity = new Date();
      defaultValidity.setFullYear(defaultValidity.getFullYear() + 2);
      setFormData(prev => ({
        ...prev,
        data_validade: defaultValidity.toISOString().split('T')[0]
      }));
    }
  }, [certificate]);

  // Atualizar funcionário selecionado
  useEffect(() => {
    if (formData.enrollment_id) {
      const enrollment = enrollments?.find(e => e.id === formData.enrollment_id);
      setSelectedEnrollment(enrollment);
    }
  }, [formData.enrollment_id, enrollments]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.enrollment_id) {
      newErrors.enrollment_id = 'Selecione um funcionário';
    }

    if (formData.nota_final < 0 || formData.nota_final > 10) {
      newErrors.nota_final = 'Nota deve estar entre 0 e 10';
    }

    if (!formData.data_validade) {
      newErrors.data_validade = 'Data de validade é obrigatória';
    }

    if (formData.data_validade && new Date(formData.data_validade) < new Date()) {
      newErrors.data_validade = 'Data de validade deve ser futura';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (certificate) {
        // Editar certificado existente
        updateCertificate({
          id: certificate.id,
          updates: {
            nota_final: formData.nota_final || undefined,
            observacoes: formData.observacoes || undefined,
            data_validade: formData.data_validade,
            is_valid: formData.is_valid
          }
        });
      } else {
        // Gerar novo certificado
        generateCertificate(
          formData.enrollment_id,
          formData.nota_final || undefined,
          formData.observacoes || undefined
        );
      }

      onSave(formData);
    } catch (error) {
      console.error('Erro ao salvar certificado:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CertificateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getEligibilityStatus = (enrollment: any) => {
    if (enrollment.is_eligible) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Elegível ({enrollment.attendance_percentage}%)</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Não elegível ({enrollment.attendance_percentage}%)</span>
        </div>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {certificate ? 'Editar Certificado' : 'Emitir Certificado'}
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Treinamento */}
          {training && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-lg mb-2">Treinamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Nome:</span> {training.nome}
                </div>
                <div>
                  <span className="font-medium">Carga Horária:</span> {training.carga_horaria}h
                </div>
                <div>
                  <span className="font-medium">Data Início:</span> {formatDate(training.data_inicio)}
                </div>
                <div>
                  <span className="font-medium">Instrutor:</span> {training.instrutor || 'Não informado'}
                </div>
              </div>
            </div>
          )}

          {/* Seleção de Funcionário */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Funcionário</h3>
            
            <div className="space-y-2">
              <Label htmlFor="enrollment_id">Funcionário *</Label>
              <Select 
                value={formData.enrollment_id} 
                onValueChange={(value) => handleInputChange('enrollment_id', value)}
                disabled={!!certificate}
              >
                <SelectTrigger className={errors.enrollment_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingEnrollments ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : enrollments?.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum funcionário elegível</SelectItem>
                  ) : (
                    enrollments?.map((enrollment) => (
                      <SelectItem key={enrollment.id} value={enrollment.id}>
                        <div className="flex flex-col">
                          <span>{enrollment.employee?.nome}</span>
                          <span className="text-xs text-gray-500">
                            {enrollment.employee?.email} - {enrollment.attendance_percentage}% presença
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.enrollment_id && <p className="text-sm text-red-500">{errors.enrollment_id}</p>}
            </div>

            {/* Status de Elegibilidade */}
            {selectedEnrollment && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Status de Elegibilidade</h4>
                <div className="text-sm text-blue-800">
                  <div className="font-medium">{selectedEnrollment.employee?.nome}</div>
                  <div>{selectedEnrollment.employee?.email}</div>
                  {selectedEnrollment.employee?.cargo && (
                    <div>{selectedEnrollment.employee.cargo}</div>
                  )}
                  <div className="mt-2">
                    {getEligibilityStatus(selectedEnrollment)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nota Final */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Avaliação</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nota_final">Nota Final (0-10)</Label>
                <Input
                  id="nota_final"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.nota_final}
                  onChange={(e) => handleInputChange('nota_final', parseFloat(e.target.value) || 0)}
                  className={errors.nota_final ? 'border-red-500' : ''}
                  placeholder="0.0"
                />
                {errors.nota_final && <p className="text-sm text-red-500">{errors.nota_final}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_validade">Data de Validade *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="data_validade"
                    type="date"
                    value={formData.data_validade}
                    onChange={(e) => handleInputChange('data_validade', e.target.value)}
                    className={`pl-10 ${errors.data_validade ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.data_validade && <p className="text-sm text-red-500">{errors.data_validade}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Observações sobre o certificado (opcional)"
                rows={3}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Status</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_valid"
                checked={formData.is_valid}
                onCheckedChange={(checked) => handleInputChange('is_valid', checked)}
              />
              <Label htmlFor="is_valid">Certificado válido</Label>
            </div>
          </div>

          {/* Preview do Certificado */}
          {selectedEnrollment && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preview do Certificado</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                  <Award className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">CERTIFICADO</h2>
                  <p className="text-gray-600 mb-4">Certificamos que</p>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {selectedEnrollment.employee?.nome}
                    </h3>
                    <p className="text-gray-600">
                      {selectedEnrollment.employee?.cargo}
                    </p>
                  </div>
                  
                  <p className="text-gray-600 mb-2">
                    concluiu com sucesso o treinamento
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-800">
                      {training?.nome}
                    </h4>
                    <p className="text-gray-600">
                      {training?.carga_horaria}h • {formatDate(training?.data_inicio || '')}
                    </p>
                  </div>
                  
                  {formData.nota_final > 0 && (
                    <p className="text-gray-600 mb-2">
                      com nota final: <span className="font-semibold">{formData.nota_final}</span>
                    </p>
                  )}
                  
                  <p className="text-gray-600 text-sm">
                    Válido até: {formData.data_validade && formatDate(formData.data_validade)}
                  </p>
                  
                  <div className="mt-4 text-xs text-gray-500 font-mono">
                    Hash: CERT-{Date.now().toString(36).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedEnrollment?.is_eligible}
            >
              {isSubmitting ? 'Processando...' : certificate ? 'Atualizar' : 'Emitir Certificado'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CertificateGenerator;
