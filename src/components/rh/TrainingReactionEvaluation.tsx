import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, CheckCircle } from 'lucide-react';
import { OnlineTrainingService } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';

interface TrainingReactionEvaluationProps {
  trainingId: string;
  employeeId: string;
  enrollmentId: string;
  onComplete?: () => void;
}

export const TrainingReactionEvaluation: React.FC<TrainingReactionEvaluationProps> = ({
  trainingId,
  employeeId,
  enrollmentId,
  onComplete
}) => {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    nota_conteudo: 0,
    nota_instrutor: 0,
    nota_metodologia: 0,
    nota_recursos: 0,
    nota_geral: 0,
    pontos_positivos: '',
    pontos_melhorar: '',
    sugestoes: '',
    recomendaria: undefined as boolean | undefined,
    comentarios_gerais: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany?.id) return;

    setLoading(true);
    try {
      await OnlineTrainingService.createReactionEvaluation(selectedCompany.id, {
        training_id: trainingId,
        employee_id: employeeId,
        enrollment_id: enrollmentId,
        ...formData
      });

      setSubmitted(true);
      toast({
        title: 'Avaliação enviada!',
        description: 'Obrigado pelo seu feedback.',
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
              Obrigado pelo seu feedback. Sua avaliação foi registrada com sucesso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliação de Reação</CardTitle>
        <CardDescription>
          Sua opinião é muito importante para melhorarmos nossos treinamentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avaliações com estrelas */}
          <div className="space-y-4">
            <StarRating
              value={formData.nota_conteudo}
              onChange={(value) => setFormData({ ...formData, nota_conteudo: value })}
              label="Avalie o conteúdo do treinamento"
            />
            <StarRating
              value={formData.nota_instrutor}
              onChange={(value) => setFormData({ ...formData, nota_instrutor: value })}
              label="Avalie o instrutor/palestrante"
            />
            <StarRating
              value={formData.nota_metodologia}
              onChange={(value) => setFormData({ ...formData, nota_metodologia: value })}
              label="Avalie a metodologia utilizada"
            />
            <StarRating
              value={formData.nota_recursos}
              onChange={(value) => setFormData({ ...formData, nota_recursos: value })}
              label="Avalie os recursos e materiais"
            />
            <StarRating
              value={formData.nota_geral}
              onChange={(value) => setFormData({ ...formData, nota_geral: value })}
              label="Avaliação geral do treinamento"
            />
          </div>

          {/* Perguntas abertas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pontos Positivos</Label>
              <Textarea
                value={formData.pontos_positivos}
                onChange={(e) => setFormData({ ...formData, pontos_positivos: e.target.value })}
                placeholder="O que você mais gostou no treinamento?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Pontos a Melhorar</Label>
              <Textarea
                value={formData.pontos_melhorar}
                onChange={(e) => setFormData({ ...formData, pontos_melhorar: e.target.value })}
                placeholder="O que poderia ser melhorado?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Sugestões</Label>
              <Textarea
                value={formData.sugestoes}
                onChange={(e) => setFormData({ ...formData, sugestoes: e.target.value })}
                placeholder="Tem alguma sugestão para futuros treinamentos?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Comentários Gerais</Label>
              <Textarea
                value={formData.comentarios_gerais}
                onChange={(e) => setFormData({ ...formData, comentarios_gerais: e.target.value })}
                placeholder="Outros comentários ou observações..."
                rows={3}
              />
            </div>
          </div>

          {/* Recomendaria */}
          <div className="space-y-2">
            <Label>Você recomendaria este treinamento para outros colegas?</Label>
            <RadioGroup
              value={formData.recomendaria === undefined ? '' : formData.recomendaria ? 'sim' : 'nao'}
              onValueChange={(value) => 
                setFormData({ ...formData, recomendaria: value === 'sim' })
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="recomendaria-sim" />
                <Label htmlFor="recomendaria-sim" className="cursor-pointer">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="recomendaria-nao" />
                <Label htmlFor="recomendaria-nao" className="cursor-pointer">
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



