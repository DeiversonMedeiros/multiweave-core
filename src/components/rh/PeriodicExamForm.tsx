import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodicExam, PeriodicExamCreateData, PeriodicExamUpdateData } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { FileUpload } from './FileUpload';
import { X } from 'lucide-react';
import { 
  periodicExamSchema, 
  safeValidatePeriodicExam,
  type PeriodicExamFormData 
} from '@/lib/validations/periodic-exam-validations';

interface PeriodicExamFormProps {
  exam?: PeriodicExam | null;
  mode: 'create' | 'edit' | 'view';
  employees: Employee[];
  onSave: (data: PeriodicExamCreateData | PeriodicExamUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PeriodicExamForm({ exam, mode, employees, onSave, onCancel, isLoading }: PeriodicExamFormProps) {
  const { selectedCompany } = useCompany();
  
  const [formData, setFormData] = useState({
    employee_id: '',
    tipo_exame: '',
    data_agendamento: '',
    data_realizacao: '',
    data_vencimento: '',
    status: 'agendado',
    medico_responsavel: '',
    clinica_local: '',
    observacoes: '',
    resultado: '',
    restricoes: '',
    custo: '',
    pago: false,
    data_pagamento: '',
    anexos: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (exam) {
      setFormData({
        employee_id: exam.employee_id,
        tipo_exame: exam.tipo_exame,
        data_agendamento: exam.data_agendamento.split('T')[0],
        data_realizacao: exam.data_realizacao ? exam.data_realizacao.split('T')[0] : '',
        data_vencimento: exam.data_vencimento.split('T')[0],
        status: exam.status,
        medico_responsavel: exam.medico_responsavel || '',
        clinica_local: exam.clinica_local || '',
        observacoes: exam.observacoes || '',
        resultado: exam.resultado || '',
        restricoes: exam.restricoes || '',
        custo: exam.custo ? exam.custo.toString() : '',
        pago: exam.pago,
        data_pagamento: exam.data_pagamento ? exam.data_pagamento.split('T')[0] : '',
        anexos: exam.anexos || [],
      });
    }
  }, [exam]);

  const validateForm = () => {
    try {
      // Preparar dados para validação
      const dataToValidate: PeriodicExamFormData = {
        ...formData,
        custo: formData.custo ? parseFloat(formData.custo) : undefined,
        data_agendamento: formData.data_agendamento,
        data_realizacao: formData.data_realizacao || undefined,
        data_vencimento: formData.data_vencimento,
        data_pagamento: formData.data_pagamento || undefined,
      };

      // Validar com Zod
      const result = safeValidatePeriodicExam(dataToValidate);
      
      if (!result.success) {
        const newErrors: Record<string, string> = {};
        
        result.error.errors.forEach((error) => {
          const field = error.path[0] as string;
          newErrors[field] = error.message;
        });
        
        setErrors(newErrors);
        return false;
      }

      setErrors({});
      return true;
    } catch (error) {
      console.error('Erro na validação:', error);
      setErrors({ general: 'Erro na validação do formulário' });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const data = {
        ...formData,
        company_id: selectedCompany?.id || '',
        data_realizacao: formData.data_realizacao || undefined,
        custo: formData.custo ? parseFloat(formData.custo) : undefined,
        data_pagamento: formData.data_pagamento || undefined,
        ...(exam && { id: exam.id }),
      };

      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Exame</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Funcionário *</Label>
              {mode === 'view' && exam?.employee_name ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {exam.employee_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">{exam.employee_name}</span>
                    <p className="text-sm text-gray-500">ID: {exam.employee_id}</p>
                  </div>
                </div>
              ) : (
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => handleInputChange('employee_id', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
             <SelectContent>
               {employees.map((employee) => (
                 <SelectItem key={employee.id} value={employee.id}>
                   {employee.nome} - {employee.matricula || 'Sem matrícula'}
                 </SelectItem>
               ))}
             </SelectContent>
                </Select>
              )}
              {errors.employee_id && (
                <p className="text-sm text-red-500">{errors.employee_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_exame">Tipo de Exame *</Label>
              <Select
                value={formData.tipo_exame}
                onValueChange={(value) => handleInputChange('tipo_exame', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admissional">Admissional</SelectItem>
                  <SelectItem value="periodico">Periódico</SelectItem>
                  <SelectItem value="demissional">Demissional</SelectItem>
                  <SelectItem value="retorno_trabalho">Retorno ao Trabalho</SelectItem>
                  <SelectItem value="mudanca_funcao">Mudança de Função</SelectItem>
                  <SelectItem value="ambiental">Ambiental</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_exame && (
                <p className="text-sm text-red-500">{errors.tipo_exame}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_agendamento">Data de Agendamento *</Label>
              <Input
                id="data_agendamento"
                type="date"
                value={formData.data_agendamento}
                onChange={(e) => handleInputChange('data_agendamento', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_agendamento && (
                <p className="text-sm text-red-500">{errors.data_agendamento}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_realizacao">Data de Realização</Label>
              <Input
                id="data_realizacao"
                type="date"
                value={formData.data_realizacao}
                onChange={(e) => handleInputChange('data_realizacao', e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_vencimento && (
                <p className="text-sm text-red-500">{errors.data_vencimento}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="reagendado">Reagendado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medico_responsavel">Médico Responsável</Label>
              <Input
                id="medico_responsavel"
                value={formData.medico_responsavel}
                onChange={(e) => handleInputChange('medico_responsavel', e.target.value)}
                placeholder="Nome do médico"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinica_local">Clínica/Local</Label>
              <Input
                id="clinica_local"
                value={formData.clinica_local}
                onChange={(e) => handleInputChange('clinica_local', e.target.value)}
                placeholder="Nome da clínica ou local"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado</Label>
              <Select
                value={formData.resultado}
                onValueChange={(value) => handleInputChange('resultado', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apto">Apto</SelectItem>
                  <SelectItem value="inapto">Inapto</SelectItem>
                  <SelectItem value="apto_com_restricoes">Apto com Restrições</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo">Custo (R$)</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                min="0"
                value={formData.custo}
                onChange={(e) => handleInputChange('custo', e.target.value)}
                placeholder="0.00"
                disabled={isReadOnly}
              />
              {errors.custo && (
                <p className="text-sm text-red-500">{errors.custo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pago">Pago</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pago"
                  checked={formData.pago}
                  onCheckedChange={(checked) => handleInputChange('pago', checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="pago">
                  {formData.pago ? 'Sim' : 'Não'}
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data de Pagamento</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => handleInputChange('data_pagamento', e.target.value)}
                disabled={isReadOnly || !formData.pago}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restricoes">Restrições</Label>
            <Textarea
              id="restricoes"
              value={formData.restricoes}
              onChange={(e) => handleInputChange('restricoes', e.target.value)}
              placeholder="Descreva as restrições médicas..."
              disabled={isReadOnly}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
              disabled={isReadOnly}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload de Arquivos */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Anexos</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUpload={(url) => {
                setFormData(prev => ({
                  ...prev,
                  anexos: [...prev.anexos, url]
                }));
              }}
              onRemove={() => {
                setFormData(prev => ({
                  ...prev,
                  anexos: prev.anexos.slice(0, -1)
                }));
              }}
              currentFile={formData.anexos[formData.anexos.length - 1] || null}
              maxSize={10}
              acceptedTypes={['.pdf']}
              bucket="exam-results"
              folder="periodic-exams"
            />
            
            {formData.anexos.length > 0 && (
              <div className="mt-4">
                <Label>Anexos Atuais</Label>
                <div className="space-y-2 mt-2">
                  {formData.anexos.map((anexo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">
                        {anexo.split('/').pop()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            anexos: prev.anexos.filter((_, i) => i !== index)
                          }));
                        }}
                        disabled={isReadOnly}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isReadOnly && (
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </div>
      )}

      {isReadOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={onCancel}>
            Fechar
          </Button>
        </div>
      )}
    </form>
  );
}
