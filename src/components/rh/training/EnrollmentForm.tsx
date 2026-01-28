import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Search,
  User,
  Calendar,
  MapPin,
  Users,
  Clock,
  X
} from 'lucide-react';
import { useEnrollment, useAvailableEmployees } from '@/hooks/rh/useEnrollment';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';

interface EnrollmentFormProps {
  trainingId: string;
  onEnroll: (enrollment: any) => void;
  onCancel: () => void;
}

interface Training {
  id: string;
  nome: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  local?: string;
  vagas_totais: number;
  vagas_disponiveis: number;
  modalidade: string;
  instrutor?: string;
  carga_horaria: number;
}

interface Employee {
  id: string;
  nome: string;
  email: string;
  cargo?: string;
  departamento?: string;
  company_id?: string;
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ trainingId, onEnroll, onCancel }) => {
  const { selectedCompany } = useCompany();
  const { trainings } = useTraining(selectedCompany?.id || '');
  const { employees, isLoading: isLoadingEmployees } = useAvailableEmployees(selectedCompany?.id || '', trainingId);
  const { createEnrollment } = useEnrollment(selectedCompany?.id || '');
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar dados do treinamento
  const training = trainings?.find(t => t.id === trainingId);

  // Filtrar funcionários baseado na busca
  const filteredEmployees = employees?.filter(employee =>
    employee.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedEmployee) {
      newErrors.employee = 'Selecione um funcionário';
    }

    if (!training) {
      newErrors.training = 'Treinamento não encontrado';
    }

    if (training && training.vagas_disponiveis <= 0) {
      newErrors.vagas = 'Não há vagas disponíveis para este treinamento';
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
      const enrollmentData = {
        training_id: trainingId,
        employee_id: selectedEmployee!.id,
        observacoes: observacoes || undefined,
        company_id: selectedEmployee!.company_id
      };

      createEnrollment(enrollmentData);
      onEnroll(enrollmentData);
    } catch (error) {
      console.error('Erro ao realizar inscrição:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!training) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Treinamento não encontrado</p>
            <Button variant="outline" onClick={onCancel} className="mt-4">
              <X className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nova Inscrição</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Informações do Treinamento */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-lg mb-2">{training.nome}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Início: {formatDate(training.data_inicio)}</span>
            </div>
            {training.data_fim && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Fim: {formatDate(training.data_fim)}</span>
              </div>
            )}
            {training.local && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{training.local}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Vagas: {training.vagas_disponiveis}/{training.vagas_totais}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Carga: {training.carga_horaria}h</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Funcionário */}
          <div className="space-y-4">
            <Label htmlFor="employee">Funcionário *</Label>
            
            {/* Busca de Funcionário */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Lista de Funcionários */}
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {isLoadingEmployees ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2">Carregando funcionários...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum funcionário encontrado</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedEmployee?.id === employee.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{employee.nome}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                          {employee.cargo && (
                            <div className="text-sm text-gray-500">{employee.cargo}</div>
                          )}
                        </div>
                        {selectedEmployee?.id === employee.id && (
                          <div className="text-blue-600">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {errors.employee && <p className="text-sm text-red-500">{errors.employee}</p>}
            {errors.vagas && <p className="text-sm text-red-500">{errors.vagas}</p>}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a inscrição (opcional)"
              rows={3}
            />
          </div>

          {/* Funcionário Selecionado */}
          {selectedEmployee && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Funcionário Selecionado</h4>
              <div className="text-sm text-blue-800">
                <div className="font-medium">{selectedEmployee.nome}</div>
                <div>{selectedEmployee.email}</div>
                {selectedEmployee.cargo && <div>{selectedEmployee.cargo}</div>}
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
              disabled={isSubmitting || !selectedEmployee || training.vagas_disponiveis <= 0}
            >
              {isSubmitting ? 'Realizando Inscrição...' : 'Realizar Inscrição'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnrollmentForm;
