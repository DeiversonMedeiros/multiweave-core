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
  Clock,
  User,
  X,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  XCircle
} from 'lucide-react';
import { useAttendance } from '@/hooks/rh/useAttendance';
import { useCompany } from '@/lib/company-context';

interface AttendanceFormProps {
  attendance?: any;
  onSave: (attendance: any) => void;
  onCancel: () => void;
}

interface AttendanceFormData {
  presente: boolean;
  tipo_presenca: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
  hora_entrada: string;
  hora_saida: string;
  observacoes: string;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ attendance, onSave, onCancel }) => {
  const { selectedCompany } = useCompany();
  const { updateAttendance, createAttendance } = useAttendance(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState<AttendanceFormData>({
    presente: true,
    tipo_presenca: 'presente',
    hora_entrada: '',
    hora_saida: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (attendance) {
      setFormData({
        presente: attendance.presente,
        tipo_presenca: attendance.tipo_presenca || 'presente',
        hora_entrada: attendance.hora_entrada || '',
        hora_saida: attendance.hora_saida || '',
        observacoes: attendance.observacoes || ''
      });
    }
  }, [attendance]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.presente) {
      if (!formData.hora_entrada) {
        newErrors.hora_entrada = 'Hora de entrada é obrigatória quando presente';
      }
    }

    if (formData.tipo_presenca === 'saida_antecipada' && !formData.hora_saida) {
      newErrors.hora_saida = 'Hora de saída é obrigatória para saída antecipada';
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
      const attendanceData = {
        presente: formData.presente,
        tipo_presenca: formData.presente ? formData.tipo_presenca : 'ausente',
        hora_entrada: formData.presente ? formData.hora_entrada : undefined,
        hora_saida: formData.hora_saida || undefined,
        observacoes: formData.observacoes || undefined,
        responsavel_registro: 'current_user' // TODO: pegar do contexto de usuário
      };

      if (attendance) {
        updateAttendance({ id: attendance.id, updates: attendanceData });
      } else {
        // Para criação, seria necessário enrollment_id e data_presenca
        console.log('Criar presença:', attendanceData);
      }

      onSave(attendanceData);
    } catch (error) {
      console.error('Erro ao salvar presença:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AttendanceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStatusIcon = (tipo: string) => {
    const icons = {
      presente: CheckCircle,
      atrasado: AlertCircle,
      saida_antecipada: MinusCircle,
      ausente: XCircle
    };
    const Icon = icons[tipo as keyof typeof icons] || CheckCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = (tipo: string) => {
    const colors = {
      presente: 'text-green-600',
      atrasado: 'text-yellow-600',
      saida_antecipada: 'text-orange-600',
      ausente: 'text-red-600'
    };
    return colors[tipo as keyof typeof colors] || 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon(formData.tipo_presenca)}
            {attendance ? 'Editar Presença' : 'Registrar Presença'}
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Funcionário e Treinamento */}
          {attendance?.enrollment && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-lg mb-2">Informações</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span><strong>Funcionário:</strong> {attendance.enrollment.employee?.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span><strong>Data:</strong> {new Date(attendance.data_presenca).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span><strong>Treinamento:</strong> {attendance.enrollment.training?.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span><strong>Email:</strong> {attendance.enrollment.employee?.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status de Presença */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Status de Presença</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="presente"
                checked={formData.presente}
                onCheckedChange={(checked) => {
                  handleInputChange('presente', checked);
                  if (!checked) {
                    handleInputChange('tipo_presenca', 'ausente');
                  }
                }}
              />
              <Label htmlFor="presente" className="text-lg">
                {formData.presente ? 'Presente' : 'Ausente'}
              </Label>
            </div>

            {formData.presente && (
              <div className="space-y-2">
                <Label htmlFor="tipo_presenca">Tipo de Presença</Label>
                <Select 
                  value={formData.tipo_presenca} 
                  onValueChange={(value) => handleInputChange('tipo_presenca', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presente">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Presente
                      </div>
                    </SelectItem>
                    <SelectItem value="atrasado">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Atrasado
                      </div>
                    </SelectItem>
                    <SelectItem value="saida_antecipada">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-4 w-4 text-orange-600" />
                        Saída Antecipada
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Horários */}
          {formData.presente && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Horários</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_entrada">Hora de Entrada *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="hora_entrada"
                      type="time"
                      value={formData.hora_entrada}
                      onChange={(e) => handleInputChange('hora_entrada', e.target.value)}
                      className={`pl-10 ${errors.hora_entrada ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.hora_entrada && <p className="text-sm text-red-500">{errors.hora_entrada}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hora_saida">Hora de Saída</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="hora_saida"
                      type="time"
                      value={formData.hora_saida}
                      onChange={(e) => handleInputChange('hora_saida', e.target.value)}
                      className={`pl-10 ${errors.hora_saida ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.hora_saida && <p className="text-sm text-red-500">{errors.hora_saida}</p>}
                </div>
              </div>

              {/* Cálculo de Horas */}
              {formData.hora_entrada && formData.hora_saida && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Tempo de permanência:</strong>{' '}
                    {(() => {
                      const entrada = new Date(`2000-01-01T${formData.hora_entrada}`);
                      const saida = new Date(`2000-01-01T${formData.hora_saida}`);
                      const diff = saida.getTime() - entrada.getTime();
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      return `${hours}h ${minutes}min`;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações sobre a presença (opcional)"
              rows={3}
            />
          </div>

          {/* Resumo */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Resumo do Registro</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span className={`flex items-center gap-1 ${getStatusColor(formData.tipo_presenca)}`}>
                  {getStatusIcon(formData.tipo_presenca)}
                  {formData.presente ? 
                    (formData.tipo_presenca === 'presente' ? 'Presente' : 
                     formData.tipo_presenca === 'atrasado' ? 'Atrasado' : 'Saída Antecipada') : 
                    'Ausente'
                  }
                </span>
              </div>
              {formData.presente && formData.hora_entrada && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Horário:</span>
                  <span>
                    {formData.hora_entrada}
                    {formData.hora_saida && ` - ${formData.hora_saida}`}
                  </span>
                </div>
              )}
              {formData.observacoes && (
                <div className="flex items-start gap-2">
                  <span className="font-medium">Observações:</span>
                  <span>{formData.observacoes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : attendance ? 'Atualizar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AttendanceForm;
