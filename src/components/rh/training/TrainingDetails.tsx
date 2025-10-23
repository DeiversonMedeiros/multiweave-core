import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  User, 
  DollarSign,
  FileText,
  Award,
  TrendingUp,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';

interface TrainingDetailsProps {
  trainingId: string;
  onEdit: (training: any) => void;
  onBack: () => void;
}

interface Training {
  id: string;
  nome: string;
  descricao?: string;
  tipo: string;
  categoria: string;
  data_inicio: string;
  data_fim?: string;
  data_limite_inscricao?: string;
  local?: string;
  vagas_totais: number;
  vagas_disponiveis: number;
  modalidade: string;
  instrutor?: string;
  custo: number;
  carga_horaria: number;
  metodologia?: string;
  conteudo_programatico?: string;
  criterios_aprovacao?: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TrainingDetails: React.FC<TrainingDetailsProps> = ({ trainingId, onEdit, onBack }) => {
  const { selectedCompany } = useCompany();
  const { trainings, isLoading } = useTraining(selectedCompany?.id || '');
  
  const [training, setTraining] = useState<Training | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (trainings && trainingId) {
      const foundTraining = trainings.find(t => t.id === trainingId);
      setTraining(foundTraining || null);
    }
  }, [trainings, trainingId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planejado: { label: 'Planejado', variant: 'secondary' as const },
      inscricoes_abertas: { label: 'Inscrições Abertas', variant: 'default' as const },
      em_andamento: { label: 'Em Andamento', variant: 'destructive' as const },
      concluido: { label: 'Concluído', variant: 'outline' as const },
      cancelado: { label: 'Cancelado', variant: 'secondary' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planejado;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVagasInfo = (total: number, disponiveis: number) => {
    const ocupadas = total - disponiveis;
    const percentual = total > 0 ? Math.round((ocupadas / total) * 100) : 0;
    return { ocupadas, total, percentual };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!training) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>Treinamento não encontrado</p>
            <Button variant="outline" onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const vagasInfo = getVagasInfo(training.vagas_totais, training.vagas_disponiveis);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{training.nome}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge(training.status)}
              <Badge variant="outline">{training.tipo}</Badge>
              <Badge variant="outline">{training.categoria}</Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => onEdit(training)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="enrollments">Inscrições</TabsTrigger>
          <TabsTrigger value="attendance">Presença</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Data de Início</p>
                    <p className="font-medium">{formatDate(training.data_inicio)}</p>
                  </div>
                </div>
                
                {training.data_fim && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Data de Fim</p>
                      <p className="font-medium">{formatDate(training.data_fim)}</p>
                    </div>
                  </div>
                )}

                {training.data_limite_inscricao && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Limite de Inscrição</p>
                      <p className="font-medium">{formatDate(training.data_limite_inscricao)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Carga Horária</p>
                    <p className="font-medium">{training.carga_horaria} horas</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Local</p>
                    <p className="font-medium">{training.local || 'Não informado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vagas e Participantes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vagas e Participantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Vagas Ocupadas</p>
                    <p className="font-medium">{vagasInfo.ocupadas}/{vagasInfo.total}</p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${vagasInfo.percentual}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{vagasInfo.percentual}% ocupado</p>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Modalidade</p>
                    <p className="font-medium capitalize">{training.modalidade}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instrutor e Custos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instrutor e Custos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Instrutor</p>
                    <p className="font-medium">{training.instrutor || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Custo</p>
                    <p className="font-medium">{formatCurrency(training.custo)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">{training.is_active ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Descrição */}
          {training.descricao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{training.descricao}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conteúdo */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metodologia */}
            {training.metodologia && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metodologia</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{training.metodologia}</p>
                </CardContent>
              </Card>
            )}

            {/* Conteúdo Programático */}
            {training.conteudo_programatico && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conteúdo Programático</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{training.conteudo_programatico}</p>
                </CardContent>
              </Card>
            )}

            {/* Critérios de Aprovação */}
            {training.criterios_aprovacao && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Critérios de Aprovação</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{training.criterios_aprovacao}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Inscrições */}
        <TabsContent value="enrollments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inscrições</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Funcionalidade em desenvolvimento</p>
                <p className="text-sm">Lista de inscrições será implementada em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presença */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controle de Presença</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Funcionalidade em desenvolvimento</p>
                <p className="text-sm">Controle de presença será implementado em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificados */}
        <TabsContent value="certificates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certificados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Funcionalidade em desenvolvimento</p>
                <p className="text-sm">Sistema de certificados será implementado em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingDetails;
