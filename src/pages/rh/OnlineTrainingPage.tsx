import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Play, 
  Lock,
  FileText,
  Video,
  Award,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { OnlineTrainingContentPlayer } from '@/components/rh/OnlineTrainingContentPlayer';
import { CertificateGenerator } from '@/components/rh/CertificateGenerator';
import { TrainingReactionEvaluation } from '@/components/rh/TrainingReactionEvaluation';
import { useOnlineTraining, useTrainingProgress } from '@/hooks/rh/useOnlineTraining';
import { OnlineTrainingService, TrainingContent } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { RequirePage } from '@/components/RequireAuth';
import { useTraining } from '@/hooks/rh/useTraining';

export default function OnlineTrainingPage() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(true);
  const [canAdvanceToNextContent, setCanAdvanceToNextContent] = useState(false);
  
  // Buscar employee_id do usuário
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  const { content, progress, progressStats, loading, error, loadContent } = useOnlineTraining(trainingId);
  const { 
    progress: userProgress, 
    stats, 
    updateProgress, 
    markAsCompleted,
    refresh: refreshProgress 
  } = useTrainingProgress(trainingId || '', employeeId || '');
  
  const { trainings, enrollments } = useTraining();
  const currentTraining = trainings.find(t => t.id === trainingId);
  const enrollment = enrollments.find(e => e.training_id === trainingId && e.employee_id === employeeId);
  
  // Verificar se treinamento está completo
  const isTrainingComplete = stats && stats.progress_percent >= 100;

  useEffect(() => {
    if (trainingId && selectedCompany?.id) {
      loadContent();
    }
  }, [trainingId, selectedCompany?.id, loadContent]);

  useEffect(() => {
    if (employeeId && trainingId && selectedCompany?.id) {
      refreshProgress();
    }
  }, [employeeId, trainingId, selectedCompany?.id, refreshProgress]);

  // Verificar se pode avançar para o conteúdo atual
  useEffect(() => {
    const checkCanAdvance = async () => {
      if (!trainingId || !employeeId || !selectedCompany?.id || content.length === 0) return;

      const currentContent = content[currentContentIndex];
      if (!currentContent) return;

      try {
        const result = await OnlineTrainingService.canAdvanceToNextContent(
          selectedCompany.id,
          trainingId,
          currentContent.id,
          employeeId
        );

        if (result && !result.error) {
          setCanAdvance(result.can_advance || currentContentIndex === 0);
        }
      } catch (err) {
        console.error('Erro ao verificar se pode avançar:', err);
      }
    };

    checkCanAdvance();
  }, [trainingId, employeeId, selectedCompany?.id, content, currentContentIndex]);

  // Verificar se pode avançar para o próximo conteúdo baseado no progresso atual
  useEffect(() => {
    const checkCanAdvanceToNext = () => {
      if (content.length === 0 || currentContentIndex >= content.length - 1) {
        setCanAdvanceToNextContent(false);
        return;
      }

      const currentContent = content[currentContentIndex];
      const currentProgress = userProgress.find(p => p.content_id === currentContent.id);

      // Se o conteúdo atual já está concluído, pode avançar
      if (currentProgress?.concluido) {
        setCanAdvanceToNextContent(true);
        return;
      }

      // Verificar requisitos baseado no tipo de conteúdo
      if (currentContent.tipo_conteudo === 'video' || currentContent.tipo_conteudo === 'audio') {
        // Para vídeo/áudio: precisa de pelo menos 90% assistido
        const percentualConcluido = currentProgress?.percentual_concluido || 0;
        setCanAdvanceToNextContent(percentualConcluido >= 90);
      } else if (['texto', 'pdf', 'link_externo'].includes(currentContent.tipo_conteudo)) {
        // Para texto, PDF e link: precisa de pelo menos 2 minutos (120 segundos)
        const tempoAssistido = currentProgress?.tempo_assistido_segundos || 0;
        const tempoMinimoSegundos = 120; // 2 minutos
        setCanAdvanceToNextContent(tempoAssistido >= tempoMinimoSegundos);
      } else {
        // Para outros tipos, verificar se está concluído
        setCanAdvanceToNextContent(currentProgress?.concluido || false);
      }
    };

    checkCanAdvanceToNext();
  }, [content, currentContentIndex, userProgress]);

  // Mostrar loading enquanto carrega funcionários
  if (isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do funcionário...</p>
        </div>
      </div>
    );
  }

  if (!trainingId || !employeeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>
            Treinamento ou funcionário não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && content.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando treinamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>
            Este treinamento ainda não possui conteúdo disponível.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentContent = content[currentContentIndex];
  const currentProgress = userProgress.find(p => p.content_id === currentContent.id);

  const handleProgressUpdate = async (data: {
    tempo_assistido_segundos: number;
    ultima_posicao_segundos: number;
    percentual_concluido: number;
  }) => {
    try {
      await updateProgress(currentContent.id, data);
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
    }
  };

  const handleComplete = async () => {
    try {
      const tempoAssistido = currentProgress?.tempo_assistido_segundos || 0;
      await markAsCompleted(currentContent.id, tempoAssistido);
      
      toast({
        title: 'Conteúdo concluído!',
        description: 'Você pode avançar para a próxima aula.',
      });

      // Avançar automaticamente para o próximo conteúdo se disponível
      if (currentContentIndex < content.length - 1) {
        setTimeout(() => {
          setCurrentContentIndex(currentContentIndex + 1);
        }, 1000);
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar o conteúdo como concluído.',
        variant: 'destructive'
      });
    }
  };

  const handlePrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    }
  };

  const validateCanAdvanceToNext = async (): Promise<boolean> => {
    if (currentContentIndex >= content.length - 1) {
      return false;
    }

    const currentContent = content[currentContentIndex];
    const currentProgress = userProgress.find(p => p.content_id === currentContent.id);

    // Se o conteúdo atual já está concluído, pode avançar
    if (currentProgress?.concluido) {
      return true;
    }

    // Verificar requisitos baseado no tipo de conteúdo
    if (currentContent.tipo_conteudo === 'video' || currentContent.tipo_conteudo === 'audio') {
      // Para vídeo/áudio: precisa de pelo menos 90% assistido
      const percentualConcluido = currentProgress?.percentual_concluido || 0;
      if (percentualConcluido < 90) {
        toast({
          title: 'Aula não concluída',
          description: 'Você precisa assistir pelo menos 90% do vídeo/áudio para avançar para a próxima aula.',
          variant: 'destructive'
        });
        return false;
      }
    } else if (['texto', 'pdf', 'link_externo'].includes(currentContent.tipo_conteudo)) {
      // Para texto, PDF e link: precisa de pelo menos 2 minutos (120 segundos)
      const tempoAssistido = currentProgress?.tempo_assistido_segundos || 0;
      const tempoMinimoSegundos = 120; // 2 minutos
      
      if (tempoAssistido < tempoMinimoSegundos) {
        const minutosRestantes = Math.ceil((tempoMinimoSegundos - tempoAssistido) / 60);
        toast({
          title: 'Tempo mínimo não atingido',
          description: `Você precisa visualizar este conteúdo por pelo menos 2 minutos para avançar. Faltam aproximadamente ${minutosRestantes} minuto(s).`,
          variant: 'destructive'
        });
        return false;
      }
    }

    // Se passou nas validações, verificar se pode avançar usando a função do backend
    try {
      const nextContent = content[currentContentIndex + 1];
      if (nextContent) {
        const result = await OnlineTrainingService.canAdvanceToNextContent(
          selectedCompany?.id || '',
          trainingId,
          nextContent.id,
          employeeId
        );

        if (result && !result.error && !result.can_advance && !nextContent.permite_pular) {
          toast({
            title: 'Conteúdo bloqueado',
            description: 'Complete o conteúdo anterior antes de avançar para esta aula.',
            variant: 'destructive'
          });
          return false;
        }
      }
    } catch (err) {
      console.error('Erro ao verificar acesso:', err);
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    const canAdvance = await validateCanAdvanceToNext();
    if (canAdvance && currentContentIndex < content.length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
    }
  };

  const handleContentClick = async (index: number) => {
    if (index === currentContentIndex) return;

    // Verificar se pode acessar este conteúdo
    const targetContent = content[index];
    if (index > 0) {
      try {
        const result = await OnlineTrainingService.canAdvanceToNextContent(
          selectedCompany?.id || '',
          trainingId,
          targetContent.id,
          employeeId
        );

        if (result && !result.error && !result.can_advance && !targetContent.permite_pular) {
          toast({
            title: 'Conteúdo bloqueado',
            description: 'Complete o conteúdo anterior antes de acessar esta aula.',
            variant: 'destructive'
          });
          return;
        }
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
      }
    }

    setCurrentContentIndex(index);
  };

  const getContentIcon = (tipo: string) => {
    switch (tipo) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getContentStatus = (contentItem: TrainingContent) => {
    const progressItem = userProgress.find(p => p.content_id === contentItem.id);
    if (progressItem?.concluido) {
      return { status: 'completed', icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
    }
    if (progressItem) {
      return { status: 'in_progress', icon: <Play className="h-4 w-4 text-blue-500" /> };
    }
    return { status: 'not_started', icon: <Clock className="h-4 w-4 text-gray-400" /> };
  };

  return (
    <RequirePage pagePath="/rh/treinamentos*" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/rh/treinamentos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                Treinamento Online
              </h1>
              <p className="text-muted-foreground mt-1">
                Aula {currentContentIndex + 1} de {content.length}
              </p>
            </div>
          </div>

          {/* Progresso geral */}
          {stats && (
            <div className="text-right">
              <div className="text-2xl font-bold">{Math.round(stats.progress_percent)}%</div>
              <div className="text-sm text-muted-foreground">Concluído</div>
            </div>
          )}
        </div>

        {/* Barra de progresso geral */}
        {stats && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progresso do Treinamento</span>
                  <span>
                    {stats.completed_content} de {stats.total_content} aulas concluídas
                  </span>
                </div>
                <Progress value={stats.progress_percent} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar com lista de conteúdos */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Conteúdo do Treinamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {content.map((contentItem, index) => {
                  const contentStatus = getContentStatus(contentItem);
                  const isCurrent = index === currentContentIndex;
                  const isLocked = index > 0 && !canAdvance && !contentItem.permite_pular;

                  return (
                    <button
                      key={contentItem.id}
                      onClick={() => handleContentClick(index)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5'
                          : isLocked
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                      }`}
                      disabled={isLocked}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-gray-400" />
                          ) : (
                            contentStatus.icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Aula {index + 1}
                            </span>
                            {getContentIcon(contentItem.tipo_conteudo)}
                          </div>
                          <div className="text-sm font-medium truncate">
                            {contentItem.titulo}
                          </div>
                          {contentItem.duracao_minutos && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {contentItem.duracao_minutos} min
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Área principal do player */}
          <div className="lg:col-span-3">
            <OnlineTrainingContentPlayer
              content={currentContent}
              progress={currentProgress ? {
                tempo_assistido_segundos: currentProgress.tempo_assistido_segundos,
                ultima_posicao_segundos: currentProgress.ultima_posicao_segundos,
                percentual_concluido: currentProgress.percentual_concluido,
                concluido: currentProgress.concluido
              } : undefined}
              onProgressUpdate={handleProgressUpdate}
              onComplete={handleComplete}
              canAdvance={canAdvance || currentContentIndex === 0}
            />

            {/* Navegação */}
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentContentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="text-sm text-muted-foreground">
                {currentContentIndex + 1} de {content.length}
              </div>

              <Button
                onClick={handleNext}
                disabled={currentContentIndex >= content.length - 1 || !canAdvanceToNextContent}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Seção de Conclusão - Certificado e Avaliação */}
        {isTrainingComplete && employeeId && enrollment && (
          <div className="space-y-6 mt-8">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Award className="h-6 w-6" />
                  Treinamento Concluído!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="certificate" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="certificate">
                      <Award className="h-4 w-4 mr-2" />
                      Certificado
                    </TabsTrigger>
                    <TabsTrigger value="evaluation">
                      <FileText className="h-4 w-4 mr-2" />
                      Avaliação
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="certificate" className="mt-4">
                    <CertificateGenerator
                      trainingId={trainingId}
                      employeeId={employeeId}
                      onCertificateGenerated={() => {
                        toast({
                          title: 'Sucesso',
                          description: 'Certificado gerado com sucesso!',
                        });
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="evaluation" className="mt-4">
                    {currentTraining?.permite_avaliacao_reacao && (
                      <TrainingReactionEvaluation
                        trainingId={trainingId}
                        employeeId={employeeId}
                        enrollmentId={enrollment.id}
                        onComplete={() => {
                          toast({
                            title: 'Obrigado!',
                            description: 'Sua avaliação foi registrada.',
                          });
                        }}
                      />
                    )}
                    {!currentTraining?.permite_avaliacao_reacao && (
                      <Alert>
                        <AlertDescription>
                          A avaliação de reação não está habilitada para este treinamento.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RequirePage>
  );
}

