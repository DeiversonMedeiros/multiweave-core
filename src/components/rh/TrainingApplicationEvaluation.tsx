import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, CheckCircle } from 'lucide-react';
import { OnlineTrainingService } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { useEmployees } from '@/hooks/rh/useEmployees';

interface TrainingApplicationEvaluationProps {
  trainingId: string;
  employeeId: string;
  enrollmentId: string;
  gestorId: string;
  onComplete?: () => void;
}

export const TrainingApplicationEvaluation: React.FC<TrainingApplicationEvaluationProps> = ({
  trainingId,
  employeeId,
  enrollmentId,
  gestorId,
  onComplete
}) => {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { data: employeesData } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e.id === employeeId);
  
  const [formData, setFormData] = useState({
    aplica_conhecimento: undefined as boolean | undefined,
    qualidade_aplicacao: 0,
    frequencia_aplicacao: '' as 'sempre' | 'frequentemente' | 'as_vezes' | 'raramente' | 'nunca' | '',
    impacto_trabalho: 0,
    exemplos_aplicacao: '',
    dificuldades_observadas: '',
    sugestoes_melhoria: '',
    recomendaria_retreinamento: undefined as boolean | undefined,
    periodo_avaliacao_inicio: '',
    periodo_avaliacao_fim: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany?.id) return;

    setLoading(true);
    try {
      await OnlineTrainingService.createApplicationEvaluation(selectedCompany.id, {
        training_id: trainingId,
        employee_id: employeeId,
        gestor_id: gestorId,
        enrollment_id: enrollmentId,
        ...formData
      });

      setSubmitted(true);
      toast({
        title: 'Avaliação enviada!',
        description: 'Avaliação de aplicação registrada com sucesso.',
      });

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao enviar avaliação',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating: React.FC<{
    value: number;
    onChange: (value: number) => void;
    label: string;
  }> = ({ value, onChange, label }) => {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= value
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {value > 0 ? `${value}/5` : 'Não avaliado'}
          </span>
        </div>
      </div>
    );
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Avaliação Enviada!</h3>
            <p className="text-muted-foreground">
              A avaliação de aplicação foi registrada com sucesso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliação de Aplicação Prática</CardTitle>
        <CardDescription>
          Avalie se {employee?.nome || 'o funcionário'} está aplicando corretamente o conhecimento adquirido no treinamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Período de observação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período de Observação - Início</Label>
              <Input
                type="date"
                value={formData.periodo_avaliacao_inicio}
                onChange={(e) => setFormData({ ...formData, periodo_avaliacao_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Período de Observação - Fim</Label>
              <Input
                type="date"
                value={formData.periodo_avaliacao_fim}
                onChange={(e) => setFormData({ ...formData, periodo_avaliacao_fim: e.target.value })}
              />
            </div>
          </div>

          {/* Aplica conhecimento */}
          <div className="space-y-2">
            <Label>O funcionário está aplicando o conhecimento adquirido?</Label>
            <RadioGroup
              value={formData.aplica_conhecimento === undefined ? '' : formData.aplica_conhecimento ? 'sim' : 'nao'}
              onValueChange={(value) => 
                setFormData({ ...formData, aplica_conhecimento: value === 'sim' })
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="aplica-sim" />
                <Label htmlFor="aplica-sim" className="cursor-pointer">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="aplica-nao" />
                <Label htmlFor="aplica-nao" className="cursor-pointer">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Qualidade de aplicação */}
          {formData.aplica_conhecimento && (
            <>
              <StarRating
                value={formData.qualidade_aplicacao}
                onChange={(value) => setFormData({ ...formData, qualidade_aplicacao: value })}
                label="Qualidade da aplicação do conhecimento"
              />

              {/* Frequência */}
              <div className="space-y-2">
                <Label>Frequência de aplicação</Label>
                <Select
                  value={formData.frequencia_aplicacao}
                  onValueChange={(value) => 
                    setFormData({ ...formData, frequencia_aplicacao: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sempre">Sempre</SelectItem>
                    <SelectItem value="frequentemente">Frequentemente</SelectItem>
                    <SelectItem value="as_vezes">Às vezes</SelectItem>
                    <SelectItem value="raramente">Raramente</SelectItem>
                    <SelectItem value="nunca">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impacto no trabalho */}
              <StarRating
                value={formData.impacto_trabalho}
                onChange={(value) => setFormData({ ...formData, impacto_trabalho: value })}
                label="Impacto positivo no trabalho"
              />

              {/* Exemplos */}
              <div className="space-y-2">
                <Label>Exemplos de Aplicação</Label>
                <Textarea
                  value={formData.exemplos_aplicacao}
                  onChange={(e) => setFormData({ ...formData, exemplos_aplicacao: e.target.value })}
                  placeholder="Descreva exemplos concretos de como o funcionário aplicou o conhecimento..."
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Dificuldades */}
          <div className="space-y-2">
            <Label>Dificuldades Observadas</Label>
            <Textarea
              value={formData.dificuldades_observadas}
              onChange={(e) => setFormData({ ...formData, dificuldades_observadas: e.target.value })}
              placeholder="Quais dificuldades você observou na aplicação do conhecimento?"
              rows={3}
            />
          </div>

          {/* Sugestões */}
          <div className="space-y-2">
            <Label>Sugestões de Melhoria</Label>
            <Textarea
              value={formData.sugestoes_melhoria}
              onChange={(e) => setFormData({ ...formData, sugestoes_melhoria: e.target.value })}
              placeholder="Tem alguma sugestão para melhorar a aplicação do conhecimento?"
              rows={3}
            />
          </div>

          {/* Recomendaria retreinamento */}
          <div className="space-y-2">
            <Label>Você recomendaria um retreinamento?</Label>
            <RadioGroup
              value={formData.recomendaria_retreinamento === undefined ? '' : formData.recomendaria_retreinamento ? 'sim' : 'nao'}
              onValueChange={(value) => 
                setFormData({ ...formData, recomendaria_retreinamento: value === 'sim' })
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="retreinamento-sim" />
                <Label htmlFor="retreinamento-sim" className="cursor-pointer">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="retreinamento-nao" />
                <Label htmlFor="retreinamento-nao" className="cursor-pointer">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};



