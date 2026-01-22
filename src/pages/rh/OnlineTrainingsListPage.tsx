import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  Search, 
  Play, 
  Settings,
  Users,
  Clock,
  Calendar,
  Award,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { usePermissions } from '@/hooks/usePermissions';
import { RequirePage } from '@/components/RequireAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function OnlineTrainingsListPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { data: employeesData } = useEmployees();
  const { canEditPage, canCreatePage } = usePermissions();
  const { trainings, loading, error, createTraining } = useTraining();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  // Filtrar apenas treinamentos online
  const onlineTrainings = useMemo(() => {
    return trainings.filter(t => t.modalidade === 'online' && t.is_active);
  }, [trainings]);

  // Filtrar por termo de busca
  const filteredTrainings = useMemo(() => {
    if (!searchTerm) return onlineTrainings;
    
    const term = searchTerm.toLowerCase();
    return onlineTrainings.filter(t => 
      t.nome.toLowerCase().includes(term) ||
      t.descricao?.toLowerCase().includes(term) ||
      t.categoria?.toLowerCase().includes(term)
    );
  }, [onlineTrainings, searchTerm]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      planejado: { label: 'Planejado', variant: 'secondary' },
      inscricoes_abertas: { label: 'Inscrições Abertas', variant: 'default' },
      em_andamento: { label: 'Em Andamento', variant: 'default' },
      concluido: { label: 'Concluído', variant: 'outline' },
      cancelado: { label: 'Cancelado', variant: 'destructive' }
    };
    
    const config = statusConfig[status] || statusConfig.planejado;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAccessTraining = (trainingId: string) => {
    navigate(`/rh/treinamentos-online/${trainingId}`);
  };

  const handleManageTraining = (trainingId: string) => {
    navigate(`/rh/treinamentos-online/${trainingId}/gestao`);
  };

  const handleCreateTraining = async (data: any) => {
    if (!selectedCompany?.id) return;

    try {
      // Forçar modalidade online e adicionar campos obrigatórios
      const trainingData = {
        ...data,
        modalidade: 'online' as const,
        company_id: selectedCompany.id,
        is_active: true,
        status: 'planejado' as const,
        vagas_totais: 0,
        vagas_disponiveis: 0
      };

      const result = await createTraining(trainingData);
      
      toast({
        title: 'Sucesso',
        description: 'Treinamento online criado com sucesso! Redirecionando para gestão...',
      });

      setShowCreateForm(false);
      
      // Redirecionar para a página de gestão do treinamento criado
      if (result && 'id' in result) {
        navigate(`/rh/treinamentos-online/${result.id}/gestao`);
      } else {
        // Se não retornou o id, recarregar a página de listagem
        window.location.reload();
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao criar treinamento',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando treinamentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/rh/treinamentos*" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Treinamentos Online
            </h1>
            <p className="text-muted-foreground mt-1">
              Acesse e gerencie seus treinamentos online
            </p>
          </div>
          {canCreatePage('/rh/treinamentos*') && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Treinamento Online
            </Button>
          )}
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Treinamentos */}
        {filteredTrainings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum treinamento encontrado com o termo buscado.' : 'Nenhum treinamento online disponível no momento.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainings.map((training) => (
              <Card key={training.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{training.nome}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {training.descricao || 'Sem descrição'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(training.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {training.categoria && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{training.categoria}</Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {training.carga_horaria && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{training.carga_horaria}h</span>
                        </div>
                      )}
                      {training.data_inicio && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(training.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => handleAccessTraining(training.id)}
                        className="flex-1"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Acessar
                      </Button>
                      {canEditPage('/rh/treinamentos*') && (
                        <Button
                          onClick={() => handleManageTraining(training.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal/Formulário de Criação */}
        {showCreateForm && (
          <CreateOnlineTrainingForm
            onSave={handleCreateTraining}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </div>
    </RequirePage>
  );
}

// Componente de formulário para criar treinamento online
interface CreateOnlineTrainingFormProps {
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

const CreateOnlineTrainingForm: React.FC<CreateOnlineTrainingFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_treinamento: 'opcional' as 'obrigatorio' | 'opcional' | 'compliance' | 'desenvolvimento',
    categoria: '',
    carga_horaria: 8,
    data_inicio: '',
    data_fim: '',
    permite_avaliacao_reacao: true,
    permite_avaliacao_aplicacao: false,
    tempo_limite_dias: undefined as number | undefined,
    permite_pausar: true,
    exige_prova_final: false,
    nota_minima_certificado: 70
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Treinamento Online</CardTitle>
        <CardDescription>
          Preencha as informações básicas do treinamento. Você poderá adicionar conteúdo, provas e avaliações depois.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Treinamento *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Segurança do Trabalho"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_treinamento">Tipo de Treinamento *</Label>
              <Select
                value={formData.tipo_treinamento}
                onValueChange={(value: any) => setFormData({ ...formData, tipo_treinamento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="obrigatorio">Obrigatório</SelectItem>
                  <SelectItem value="opcional">Opcional</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o objetivo e conteúdo do treinamento..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Ex: Segurança, Qualidade..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carga_horaria">Carga Horária (horas) *</Label>
              <Input
                id="carga_horaria"
                type="number"
                value={formData.carga_horaria}
                onChange={(e) => setFormData({ ...formData, carga_horaria: parseInt(e.target.value) || 0 })}
                min={1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempo_limite_dias">Prazo Limite (dias)</Label>
              <Input
                id="tempo_limite_dias"
                type="number"
                value={formData.tempo_limite_dias || ''}
                onChange={(e) => setFormData({ ...formData, tempo_limite_dias: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Opcional"
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Término *</Label>
              <Input
                id="data_fim"
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">Configurações do Treinamento</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="permite_avaliacao_reacao">Permitir Avaliação de Reação</Label>
                <p className="text-sm text-muted-foreground">
                  Os participantes poderão avaliar o treinamento após concluí-lo
                </p>
              </div>
              <Switch
                id="permite_avaliacao_reacao"
                checked={formData.permite_avaliacao_reacao}
                onCheckedChange={(checked) => setFormData({ ...formData, permite_avaliacao_reacao: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="permite_avaliacao_aplicacao">Permitir Avaliação de Aplicação</Label>
                <p className="text-sm text-muted-foreground">
                  Gestores poderão avaliar se o funcionário aplica o conhecimento
                </p>
              </div>
              <Switch
                id="permite_avaliacao_aplicacao"
                checked={formData.permite_avaliacao_aplicacao}
                onCheckedChange={(checked) => setFormData({ ...formData, permite_avaliacao_aplicacao: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="permite_pausar">Permitir Pausar</Label>
                <p className="text-sm text-muted-foreground">
                  Usuários podem pausar e retomar o treinamento
                </p>
              </div>
              <Switch
                id="permite_pausar"
                checked={formData.permite_pausar}
                onCheckedChange={(checked) => setFormData({ ...formData, permite_pausar: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exige_prova_final">Exigir Prova Final</Label>
                <p className="text-sm text-muted-foreground">
                  O treinamento requer uma prova final para conclusão
                </p>
              </div>
              <Switch
                id="exige_prova_final"
                checked={formData.exige_prova_final}
                onCheckedChange={(checked) => setFormData({ ...formData, exige_prova_final: checked })}
              />
            </div>

            {formData.exige_prova_final && (
              <div className="space-y-2">
                <Label htmlFor="nota_minima_certificado">Nota Mínima para Certificado (%)</Label>
                <Input
                  id="nota_minima_certificado"
                  type="number"
                  value={formData.nota_minima_certificado}
                  onChange={(e) => setFormData({ ...formData, nota_minima_certificado: parseFloat(e.target.value) || 70 })}
                  min={0}
                  max={100}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Treinamento'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

