import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  DollarSign,
  FileText,
  Target,
  BookOpen,
  Settings,
  Save,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrainingFormProps {
  training?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  nome: string;
  descricao: string;
  tipo_treinamento: 'obrigatorio' | 'opcional' | 'compliance' | 'desenvolvimento';
  categoria: string;
  carga_horaria: number;
  data_inicio: string;
  data_fim: string;
  data_limite_inscricao: string;
  vagas_totais: number;
  vagas_disponiveis: number;
  local: string;
  modalidade: 'presencial' | 'online' | 'hibrido';
  instrutor: string;
  instrutor_email: string;
  instrutor_telefone: string;
  custo_por_participante: number;
  requisitos: string;
  objetivos: string;
  conteudo_programatico: string;
  metodologia: string;
  recursos_necessarios: string;
  status: 'planejado' | 'inscricoes_abertas' | 'em_andamento' | 'concluido' | 'cancelado';
  observacoes: string;
  anexos: string[];
}

interface FormErrors {
  [key: string]: string;
}

export const TrainingForm: React.FC<TrainingFormProps> = ({
  training,
  onSave,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    tipo_treinamento: 'opcional',
    categoria: '',
    carga_horaria: 8,
    data_inicio: '',
    data_fim: '',
    data_limite_inscricao: '',
    vagas_totais: 0,
    vagas_disponiveis: 0,
    local: '',
    modalidade: 'presencial',
    instrutor: '',
    instrutor_email: '',
    instrutor_telefone: '',
    custo_por_participante: 0,
    requisitos: '',
    objetivos: '',
    conteudo_programatico: '',
    metodologia: '',
    recursos_necessarios: '',
    status: 'planejado',
    observacoes: '',
    anexos: []
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [isDirty, setIsDirty] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  useEffect(() => {
    if (training) {
      setFormData({
        nome: training.nome || '',
        descricao: training.descricao || '',
        tipo_treinamento: training.tipo_treinamento || 'opcional',
        categoria: training.categoria || '',
        carga_horaria: training.carga_horaria || 8,
        data_inicio: training.data_inicio || '',
        data_fim: training.data_fim || '',
        data_limite_inscricao: training.data_limite_inscricao || '',
        vagas_totais: training.vagas_totais || 0,
        vagas_disponiveis: training.vagas_disponiveis || 0,
        local: training.local || '',
        modalidade: training.modalidade || 'presencial',
        instrutor: training.instrutor || '',
        instrutor_email: training.instrutor_email || '',
        instrutor_telefone: training.instrutor_telefone || '',
        custo_por_participante: training.custo_por_participante || 0,
        requisitos: training.requisitos || '',
        objetivos: training.objetivos || '',
        conteudo_programatico: training.conteudo_programatico || '',
        metodologia: training.metodologia || '',
        recursos_necessarios: training.recursos_necessarios || '',
        status: training.status || 'planejado',
        observacoes: training.observacoes || '',
        anexos: training.anexos || []
      });
    }
  }, [training]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome do treinamento é obrigatório';
    }

    if (!formData.tipo_treinamento) {
      newErrors.tipo_treinamento = 'Tipo de treinamento é obrigatório';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'Categoria é obrigatória';
    }

    if (!formData.carga_horaria || formData.carga_horaria <= 0) {
      newErrors.carga_horaria = 'Carga horária deve ser maior que zero';
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
    }

    if (!formData.data_fim) {
      newErrors.data_fim = 'Data de fim é obrigatória';
    }

    if (formData.data_inicio && formData.data_fim) {
      const startDate = new Date(formData.data_inicio);
      const endDate = new Date(formData.data_fim);
      
      if (startDate >= endDate) {
        newErrors.data_fim = 'Data de fim deve ser posterior à data de início';
      }
    }

    if (formData.data_limite_inscricao && formData.data_inicio) {
      const deadlineDate = new Date(formData.data_limite_inscricao);
      const startDate = new Date(formData.data_inicio);
      
      if (deadlineDate >= startDate) {
        newErrors.data_limite_inscricao = 'Data limite de inscrição deve ser anterior à data de início';
      }
    }

    if (formData.vagas_totais && formData.vagas_totais < 0) {
      newErrors.vagas_totais = 'Número de vagas não pode ser negativo';
    }

    if (formData.vagas_disponiveis && formData.vagas_disponiveis < 0) {
      newErrors.vagas_disponiveis = 'Vagas disponíveis não podem ser negativas';
    }

    if (formData.vagas_totais && formData.vagas_disponiveis && 
        formData.vagas_disponiveis > formData.vagas_totais) {
      newErrors.vagas_disponiveis = 'Vagas disponíveis não podem ser maiores que o total';
    }

    if (formData.instrutor_email && !/\S+@\S+\.\S+/.test(formData.instrutor_email)) {
      newErrors.instrutor_email = 'Email do instrutor deve ser válido';
    }

    if (formData.custo_por_participante && formData.custo_por_participante < 0) {
      newErrors.custo_por_participante = 'Custo não pode ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setActiveTab('basic'); // Go to first tab with errors
      return;
    }

    try {
      setSaveProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSaveProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onSave(formData);
      
      clearInterval(progressInterval);
      setSaveProgress(100);
      setIsDirty(false);
      
      setTimeout(() => setSaveProgress(0), 1000);
    } catch (error) {
      console.error('Erro ao salvar treinamento:', error);
    }
  };

  const calculateFormProgress = () => {
    const requiredFields = [
      'nome', 'tipo_treinamento', 'categoria', 'carga_horaria', 
      'data_inicio', 'data_fim', 'modalidade'
    ];
    
    const filledFields = requiredFields.filter(field => {
      const value = formData[field as keyof FormData];
      return value !== '' && value !== null && value !== undefined;
    });

    return Math.round((filledFields.length / requiredFields.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejado':
        return 'bg-blue-100 text-blue-800';
      case 'inscricoes_abertas':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluido':
        return 'bg-gray-100 text-gray-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formProgress = calculateFormProgress();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {training ? 'Editar Treinamento' : 'Novo Treinamento'}
          </h1>
          <p className="text-gray-600">
            {training ? 'Atualize as informações do treinamento' : 'Preencha as informações para criar um novo treinamento'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !isDirty}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso do Formulário</span>
              <span>{formProgress}%</span>
            </div>
            <Progress value={formProgress} className="h-2" />
            {saveProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Salvando...</span>
                  <span>{saveProgress}%</span>
                </div>
                <Progress value={saveProgress} className="h-1" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Básico
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cronograma
          </TabsTrigger>
          <TabsTrigger value="instructor" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Instrutor
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="additional" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Adicional
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Dados fundamentais do treinamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Treinamento *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Ex: Treinamento de Segurança do Trabalho"
                    className={errors.nome ? 'border-red-500' : ''}
                  />
                  {errors.nome && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.nome}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_treinamento">Tipo de Treinamento *</Label>
                  <Select
                    value={formData.tipo_treinamento}
                    onValueChange={(value) => handleInputChange('tipo_treinamento', value)}
                  >
                    <SelectTrigger className={errors.tipo_treinamento ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="obrigatorio">Obrigatório</SelectItem>
                      <SelectItem value="opcional">Opcional</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tipo_treinamento && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.tipo_treinamento}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Descreva o objetivo e conteúdo do treinamento"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => handleInputChange('categoria', value)}
                  >
                    <SelectTrigger className={errors.categoria ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seguranca">Segurança</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="comportamental">Comportamental</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.categoria && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.categoria}
                    </p>
                  )}
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
                  {errors.carga_horaria && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.carga_horaria}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="inscricoes_abertas">Inscrições Abertas</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(formData.status)}>
                    {formData.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cronograma e Vagas</CardTitle>
              <CardDescription>
                Defina as datas e disponibilidade do treinamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                    className={errors.data_inicio ? 'border-red-500' : ''}
                  />
                  {errors.data_inicio && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.data_inicio}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Fim *</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => handleInputChange('data_fim', e.target.value)}
                    className={errors.data_fim ? 'border-red-500' : ''}
                  />
                  {errors.data_fim && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.data_fim}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_limite_inscricao">Data Limite de Inscrição</Label>
                <Input
                  id="data_limite_inscricao"
                  type="date"
                  value={formData.data_limite_inscricao}
                  onChange={(e) => handleInputChange('data_limite_inscricao', e.target.value)}
                  className={errors.data_limite_inscricao ? 'border-red-500' : ''}
                />
                {errors.data_limite_inscricao && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.data_limite_inscricao}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Deixe em branco para permitir inscrições até o início do treinamento
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vagas_totais">Total de Vagas</Label>
                  <Input
                    id="vagas_totais"
                    type="number"
                    min="0"
                    value={formData.vagas_totais}
                    onChange={(e) => handleInputChange('vagas_totais', parseInt(e.target.value) || 0)}
                    className={errors.vagas_totais ? 'border-red-500' : ''}
                  />
                  {errors.vagas_totais && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.vagas_totais}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Deixe em 0 para vagas ilimitadas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vagas_disponiveis">Vagas Disponíveis</Label>
                  <Input
                    id="vagas_disponiveis"
                    type="number"
                    min="0"
                    value={formData.vagas_disponiveis}
                    onChange={(e) => handleInputChange('vagas_disponiveis', parseInt(e.target.value) || 0)}
                    className={errors.vagas_disponiveis ? 'border-red-500' : ''}
                  />
                  {errors.vagas_disponiveis && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.vagas_disponiveis}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="local">Local</Label>
                  <Input
                    id="local"
                    value={formData.local}
                    onChange={(e) => handleInputChange('local', e.target.value)}
                    placeholder="Ex: Sala de Treinamento A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modalidade">Modalidade *</Label>
                  <Select
                    value={formData.modalidade}
                    onValueChange={(value) => handleInputChange('modalidade', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructor Tab */}
        <TabsContent value="instructor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Instrutor</CardTitle>
              <CardDescription>
                Dados do responsável pelo treinamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instrutor">Nome do Instrutor</Label>
                <Input
                  id="instrutor"
                  value={formData.instrutor}
                  onChange={(e) => handleInputChange('instrutor', e.target.value)}
                  placeholder="Nome completo do instrutor"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instrutor_email">Email</Label>
                  <Input
                    id="instrutor_email"
                    type="email"
                    value={formData.instrutor_email}
                    onChange={(e) => handleInputChange('instrutor_email', e.target.value)}
                    placeholder="instrutor@empresa.com"
                    className={errors.instrutor_email ? 'border-red-500' : ''}
                  />
                  {errors.instrutor_email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.instrutor_email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instrutor_telefone">Telefone</Label>
                  <Input
                    id="instrutor_telefone"
                    value={formData.instrutor_telefone}
                    onChange={(e) => handleInputChange('instrutor_telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custo_por_participante">Custo por Participante (R$)</Label>
                <Input
                  id="custo_por_participante"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.custo_por_participante}
                  onChange={(e) => handleInputChange('custo_por_participante', parseFloat(e.target.value) || 0)}
                  className={errors.custo_por_participante ? 'border-red-500' : ''}
                />
                {errors.custo_por_participante && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.custo_por_participante}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Treinamento</CardTitle>
              <CardDescription>
                Defina os objetivos, conteúdo e metodologia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objetivos">Objetivos</Label>
                <Textarea
                  id="objetivos"
                  value={formData.objetivos}
                  onChange={(e) => handleInputChange('objetivos', e.target.value)}
                  placeholder="Descreva os objetivos de aprendizagem do treinamento"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conteudo_programatico">Conteúdo Programático</Label>
                <Textarea
                  id="conteudo_programatico"
                  value={formData.conteudo_programatico}
                  onChange={(e) => handleInputChange('conteudo_programatico', e.target.value)}
                  placeholder="Liste os tópicos que serão abordados no treinamento"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodologia">Metodologia</Label>
                <Textarea
                  id="metodologia"
                  value={formData.metodologia}
                  onChange={(e) => handleInputChange('metodologia', e.target.value)}
                  placeholder="Descreva como o treinamento será conduzido"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recursos_necessarios">Recursos Necessários</Label>
                <Textarea
                  id="recursos_necessarios"
                  value={formData.recursos_necessarios}
                  onChange={(e) => handleInputChange('recursos_necessarios', e.target.value)}
                  placeholder="Liste os materiais e recursos necessários"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requisitos">Pré-requisitos</Label>
                <Textarea
                  id="requisitos"
                  value={formData.requisitos}
                  onChange={(e) => handleInputChange('requisitos', e.target.value)}
                  placeholder="Descreva os pré-requisitos para participação"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional Tab */}
        <TabsContent value="additional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
              <CardDescription>
                Observações e anexos complementares
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Informações adicionais sobre o treinamento"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Anexos</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, XLS, PPT até 10MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Corrija os seguintes erros:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.values(errors).map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
