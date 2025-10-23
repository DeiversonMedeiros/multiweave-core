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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';

interface TrainingFormProps {
  training?: any;
  onSave: (training: any) => void;
  onCancel: () => void;
}

interface TrainingFormData {
  nome: string;
  descricao: string;
  tipo: string;
  categoria: string;
  data_inicio: Date | null;
  data_fim: Date | null;
  data_limite_inscricao: Date | null;
  local: string;
  vagas_totais: number;
  modalidade: string;
  instrutor: string;
  custo: number;
  carga_horaria: number;
  metodologia: string;
  conteudo_programatico: string;
  criterios_aprovacao: string;
  is_active: boolean;
}

const TrainingForm: React.FC<TrainingFormProps> = ({ training, onSave, onCancel }) => {
  const { selectedCompany } = useCompany();
  const { createTraining, updateTraining } = useTraining(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState<TrainingFormData>({
    nome: '',
    descricao: '',
    tipo: '',
    categoria: '',
    data_inicio: null,
    data_fim: null,
    data_limite_inscricao: null,
    local: '',
    vagas_totais: 0,
    modalidade: 'presencial',
    instrutor: '',
    custo: 0,
    carga_horaria: 0,
    metodologia: '',
    conteudo_programatico: '',
    criterios_aprovacao: '',
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (training) {
      setFormData({
        nome: training.nome || '',
        descricao: training.descricao || '',
        tipo: training.tipo || '',
        categoria: training.categoria || '',
        data_inicio: training.data_inicio ? new Date(training.data_inicio) : null,
        data_fim: training.data_fim ? new Date(training.data_fim) : null,
        data_limite_inscricao: training.data_limite_inscricao ? new Date(training.data_limite_inscricao) : null,
        local: training.local || '',
        vagas_totais: training.vagas_totais || 0,
        modalidade: training.modalidade || 'presencial',
        instrutor: training.instrutor || '',
        custo: training.custo || 0,
        carga_horaria: training.carga_horaria || 0,
        metodologia: training.metodologia || '',
        conteudo_programatico: training.conteudo_programatico || '',
        criterios_aprovacao: training.criterios_aprovacao || '',
        is_active: training.is_active !== false
      });
    }
  }, [training]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'Categoria é obrigatória';
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
    }

    if (formData.data_fim && formData.data_inicio && formData.data_fim < formData.data_inicio) {
      newErrors.data_fim = 'Data de fim deve ser posterior à data de início';
    }

    if (formData.data_limite_inscricao && formData.data_inicio && formData.data_limite_inscricao > formData.data_inicio) {
      newErrors.data_limite_inscricao = 'Data limite de inscrição deve ser anterior à data de início';
    }

    if (formData.vagas_totais <= 0) {
      newErrors.vagas_totais = 'Número de vagas deve ser maior que zero';
    }

    if (formData.carga_horaria <= 0) {
      newErrors.carga_horaria = 'Carga horária deve ser maior que zero';
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
      const trainingData = {
        company_id: selectedCompany?.id || '',
        nome: formData.nome,
        descricao: formData.descricao,
        tipo: formData.tipo,
        categoria: formData.categoria,
        data_inicio: formData.data_inicio?.toISOString().split('T')[0] || '',
        data_fim: formData.data_fim?.toISOString().split('T')[0] || null,
        data_limite_inscricao: formData.data_limite_inscricao?.toISOString().split('T')[0] || null,
        local: formData.local,
        vagas_totais: formData.vagas_totais,
        modalidade: formData.modalidade,
        instrutor: formData.instrutor,
        custo: formData.custo,
        carga_horaria: formData.carga_horaria,
        metodologia: formData.metodologia,
        conteudo_programatico: formData.conteudo_programatico,
        criterios_aprovacao: formData.criterios_aprovacao,
        is_active: formData.is_active
      };

      if (training) {
        updateTraining({ id: training.id, updates: trainingData });
      } else {
        createTraining(trainingData);
      }

      onSave(trainingData);
    } catch (error) {
      console.error('Erro ao salvar treinamento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof TrainingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {training ? 'Editar Treinamento' : 'Novo Treinamento'}
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Nome do treinamento"
                  className={errors.nome ? 'border-red-500' : ''}
                />
                {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value) => handleInputChange('tipo', value)}>
                  <SelectTrigger className={errors.tipo ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="comportamental">Comportamental</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="lideranca">Liderança</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-sm text-red-500">{errors.tipo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
                  <SelectTrigger className={errors.categoria ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obrigatorio">Obrigatório</SelectItem>
                    <SelectItem value="opcional">Opcional</SelectItem>
                    <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                    <SelectItem value="capacitacao">Capacitação</SelectItem>
                  </SelectContent>
                </Select>
                {errors.categoria && <p className="text-sm text-red-500">{errors.categoria}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modalidade">Modalidade</Label>
                <Select value={formData.modalidade} onValueChange={(value) => handleInputChange('modalidade', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descrição do treinamento"
                rows={3}
              />
            </div>
          </div>

          {/* Datas e Horários */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Datas e Horários</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${errors.data_inicio ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_inicio ? format(formData.data_inicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_inicio || undefined}
                      onSelect={(date) => handleInputChange('data_inicio', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_inicio && <p className="text-sm text-red-500">{errors.data_inicio}</p>}
              </div>

              <div className="space-y-2">
                <Label>Data de Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${errors.data_fim ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_fim ? format(formData.data_fim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_fim || undefined}
                      onSelect={(date) => handleInputChange('data_fim', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_fim && <p className="text-sm text-red-500">{errors.data_fim}</p>}
              </div>

              <div className="space-y-2">
                <Label>Data Limite de Inscrição</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${errors.data_limite_inscricao ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_limite_inscricao ? format(formData.data_limite_inscricao, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_limite_inscricao || undefined}
                      onSelect={(date) => handleInputChange('data_limite_inscricao', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_limite_inscricao && <p className="text-sm text-red-500">{errors.data_limite_inscricao}</p>}
              </div>
            </div>
          </div>

          {/* Local e Vagas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Local e Vagas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  value={formData.local}
                  onChange={(e) => handleInputChange('local', e.target.value)}
                  placeholder="Local do treinamento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vagas_totais">Número de Vagas *</Label>
                <Input
                  id="vagas_totais"
                  type="number"
                  min="1"
                  value={formData.vagas_totais}
                  onChange={(e) => handleInputChange('vagas_totais', parseInt(e.target.value) || 0)}
                  className={errors.vagas_totais ? 'border-red-500' : ''}
                />
                {errors.vagas_totais && <p className="text-sm text-red-500">{errors.vagas_totais}</p>}
              </div>
            </div>
          </div>

          {/* Instrutor e Custos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Instrutor e Custos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instrutor">Instrutor</Label>
                <Input
                  id="instrutor"
                  value={formData.instrutor}
                  onChange={(e) => handleInputChange('instrutor', e.target.value)}
                  placeholder="Nome do instrutor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custo">Custo (R$)</Label>
                <Input
                  id="custo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.custo}
                  onChange={(e) => handleInputChange('custo', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carga_horaria">Carga Horária (horas) *</Label>
                <Input
                  id="carga_horaria"
                  type="number"
                  min="1"
                  value={formData.carga_horaria}
                  onChange={(e) => handleInputChange('carga_horaria', parseInt(e.target.value) || 0)}
                  className={errors.carga_horaria ? 'border-red-500' : ''}
                />
                {errors.carga_horaria && <p className="text-sm text-red-500">{errors.carga_horaria}</p>}
              </div>
            </div>
          </div>

          {/* Conteúdo Programático */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Conteúdo Programático</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metodologia">Metodologia</Label>
                <Textarea
                  id="metodologia"
                  value={formData.metodologia}
                  onChange={(e) => handleInputChange('metodologia', e.target.value)}
                  placeholder="Descreva a metodologia utilizada"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conteudo_programatico">Conteúdo Programático</Label>
                <Textarea
                  id="conteudo_programatico"
                  value={formData.conteudo_programatico}
                  onChange={(e) => handleInputChange('conteudo_programatico', e.target.value)}
                  placeholder="Descreva o conteúdo programático"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="criterios_aprovacao">Critérios de Aprovação</Label>
                <Textarea
                  id="criterios_aprovacao"
                  value={formData.criterios_aprovacao}
                  onChange={(e) => handleInputChange('criterios_aprovacao', e.target.value)}
                  placeholder="Descreva os critérios de aprovação"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Status</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Treinamento ativo</Label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : training ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TrainingForm;
