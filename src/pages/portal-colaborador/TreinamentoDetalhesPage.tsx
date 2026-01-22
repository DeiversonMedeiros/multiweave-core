import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { RequireModule } from '@/components/RequireAuth';
import { useTraining } from '@/hooks/rh/useTraining';

export default function TreinamentoDetalhesPage() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(true);
  const [canAdvanceToNextContent, setCanAdvanceToNextContent] = useState(false);
  
  // Debounce para atualizações de progresso - deve estar no topo antes de qualquer return
  const updateProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<{
    contentId: string;
    data: { tempo_assistido_segundos: number; ultima_posicao_segundos: number; percentual_concluido: number };
  } | null>(null);
  // Ref para evitar múltiplas restaurações do índice
  const hasRestoredIndexRef = useRef(false);
  
  // Buscar employee_id do usuário
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  const { content, progress, progressStats, loading, error, loadContent, exams, loadExams } = useOnlineTraining(trainingId);
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
  
  // Carregar provas do treinamento
  useEffect(() => {
    if (trainingId && selectedCompany?.id) {
      loadExams();
    }
  }, [trainingId, selectedCompany?.id, loadExams]);
  
  // Encontrar prova final
  const finalExam = exams.find(exam => exam.tipo_avaliacao === 'final' && exam.is_active);
  
  // Verificar se todas as aulas estão concluídas
  const allContentCompleted = content.length > 0 && content.every(contentItem => {
    const progressItem = userProgress.find(p => p.content_id === contentItem.id);
    return progressItem?.concluido || (progressItem && progressItem.percentual_concluido >= 100);
  });
  
  // Verificar se está na última aula
  const isLastContent = currentContentIndex >= content.length - 1;
  
  // Ref para evitar múltiplas verificações de conclusão
  const hasCheckedCompletionRef = useRef(false);
  
  // Verificar se a prova final foi aprovada
  useEffect(() => {
    // Evitar múltiplas verificações
    if (hasCheckedCompletionRef.current) {
      return;
    }
    
    const checkFinalExamStatus = async () => {
      if (!finalExam || !selectedCompany?.id || !employeeId) return;
      
      // Verificar se já está na página de conclusão
      if (window.location.pathname.includes('/conclusao')) {
        return;
      }
      
      try {
        // Buscar tentativas da prova final
        const attempts = await OnlineTrainingService.listExamAttempts(
          selectedCompany.id,
          finalExam.id,
          employeeId
        );
        
        // Verificar se há tentativa aprovada e finalizada
        const approvedAttempt = attempts.find(
          a => a.status === 'finalizado' && a.aprovado === true
        );
        
        if (approvedAttempt && allContentCompleted) {
          // Se a prova foi aprovada e todas as aulas estão concluídas, redirecionar para conclusão
          console.log('[TreinamentoDetalhesPage] Treinamento concluído, redirecionando para página de conclusão');
          hasCheckedCompletionRef.current = true;
          navigate(`/portal-colaborador/treinamentos/${trainingId}/conclusao`);
        }
      } catch (err) {
        console.error('[TreinamentoDetalhesPage] Erro ao verificar status da prova final:', err);
      }
    };
    
    if (allContentCompleted && finalExam && !hasCheckedCompletionRef.current) {
      checkFinalExamStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContentCompleted, finalExam?.id, selectedCompany?.id, employeeId, trainingId]);
  
  // Log para debug
  useEffect(() => {
    console.log('[TreinamentoDetalhesPage] Estado da navegação', {
      currentContentIndex,
      contentLength: content.length,
      isLastContent,
      allContentCompleted,
      hasFinalExam: !!finalExam,
      finalExamTitle: finalExam?.titulo,
      examsCount: exams.length,
      exams: exams.map(e => ({ id: e.id, tipo: e.tipo_avaliacao, titulo: e.titulo, is_active: e.is_active }))
    });
  }, [currentContentIndex, content.length, isLastContent, allContentCompleted, finalExam, exams]);
  
  // Verificar se treinamento está completo
  const isTrainingComplete = stats && stats.progress_percent >= 100;

  useEffect(() => {
    if (trainingId && selectedCompany?.id) {
      loadContent();
    }
  }, [trainingId, selectedCompany?.id, loadContent]);

  // Carregar progresso apenas quando as dependências primitivas mudarem
  // Não incluir refreshProgress nas dependências para evitar loop
  useEffect(() => {
    if (employeeId && trainingId && selectedCompany?.id) {
      refreshProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, trainingId, selectedCompany?.id]);

  // Restaurar índice da aula atual baseado no progresso salvo
  useEffect(() => {
    // Só restaurar uma vez quando o conteúdo e progresso estiverem carregados
    if (content.length === 0) {
      hasRestoredIndexRef.current = false;
      return;
    }

    // Se já restaurou, não restaurar novamente a menos que o conteúdo mude
    if (hasRestoredIndexRef.current) {
      return;
    }

    console.log('[TreinamentoDetalhesPage] Restaurando índice da aula atual', {
      contentLength: content.length,
      progressLength: userProgress.length,
      currentIndex: currentContentIndex,
      hasRestored: hasRestoredIndexRef.current
    });

    // Encontrar a última aula concluída
    let lastCompletedIndex = -1;
    for (let i = 0; i < content.length; i++) {
      const contentItem = content[i];
      const progressItem = userProgress.find(p => p.content_id === contentItem.id);
      
      if (progressItem?.concluido || (progressItem && progressItem.percentual_concluido >= 100)) {
        lastCompletedIndex = i;
        console.log('[TreinamentoDetalhesPage] Aula concluída encontrada', {
          index: i,
          contentId: contentItem.id,
          titulo: contentItem.titulo,
          concluido: progressItem.concluido,
          percentual: progressItem.percentual_concluido
        });
      }
    }

    // Se encontrou aulas concluídas, ir para a próxima não concluída
    // Se não encontrou nenhuma concluída, começar da primeira
    const targetIndex = lastCompletedIndex + 1;
    
    if (targetIndex < content.length && targetIndex !== currentContentIndex) {
      console.log('[TreinamentoDetalhesPage] Restaurando para aula', {
        from: currentContentIndex,
        to: targetIndex,
        lastCompletedIndex
      });
      setCurrentContentIndex(targetIndex);
      hasRestoredIndexRef.current = true;
    } else if (lastCompletedIndex === -1 && currentContentIndex !== 0) {
      // Se não há aulas concluídas, começar da primeira
      console.log('[TreinamentoDetalhesPage] Nenhuma aula concluída, começando da primeira');
      setCurrentContentIndex(0);
      hasRestoredIndexRef.current = true;
    } else if (lastCompletedIndex >= 0) {
      // Se já está na posição correta, apenas marcar como restaurado
      hasRestoredIndexRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, userProgress]); // Não incluir currentContentIndex para evitar loop

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

      const currentContentItem = content[currentContentIndex];
      if (!currentContentItem) {
        setCanAdvanceToNextContent(false);
        return;
      }

      const currentProgressItem = userProgress.find(p => p.content_id === currentContentItem.id);

      // Se o conteúdo atual já está concluído, pode avançar
      if (currentProgressItem?.concluido) {
        setCanAdvanceToNextContent(true);
        return;
      }

      // Verificar requisitos baseado no tipo de conteúdo
      if (currentContentItem.tipo_conteudo === 'video' || currentContentItem.tipo_conteudo === 'audio') {
        // Para vídeo/áudio: precisa de pelo menos 90% assistido OU 100%
        const percentualConcluido = currentProgressItem?.percentual_concluido || 0;
        setCanAdvanceToNextContent(percentualConcluido >= 90 || percentualConcluido >= 100);
      } else if (['texto', 'pdf', 'link_externo'].includes(currentContentItem.tipo_conteudo)) {
        // Para texto, PDF e link: precisa de pelo menos 2 minutos (120 segundos) OU 100% de progresso
        const tempoAssistido = currentProgressItem?.tempo_assistido_segundos || 0;
        const percentualConcluido = currentProgressItem?.percentual_concluido || 0;
        const tempoMinimoSegundos = 120; // 2 minutos
        setCanAdvanceToNextContent(tempoAssistido >= tempoMinimoSegundos || percentualConcluido >= 100);
      } else {
        // Para outros tipos, verificar se está concluído ou se tem 100%
        const percentualConcluido = currentProgressItem?.percentual_concluido || 0;
        setCanAdvanceToNextContent(currentProgressItem?.concluido || percentualConcluido >= 100);
      }
    };

    checkCanAdvanceToNext();
  }, [content, currentContentIndex, userProgress]);

  // Todos os callbacks devem estar antes dos returns condicionais
  const handleProgressUpdate = useCallback((data: {
    tempo_assistido_segundos: number;
    ultima_posicao_segundos: number;
    percentual_concluido: number;
  }) => {
    console.log('[TreinamentoDetalhesPage.handleProgressUpdate] INÍCIO', {
      data,
      contentLength: content.length,
      currentContentIndex,
      timestamp: new Date().toISOString()
    });

    if (content.length === 0 || currentContentIndex >= content.length) {
      console.log('[TreinamentoDetalhesPage.handleProgressUpdate] ABORTADO: sem conteúdo');
      return;
    }
    const currentContentItem = content[currentContentIndex];
    if (!currentContentItem) {
      console.log('[TreinamentoDetalhesPage.handleProgressUpdate] ABORTADO: conteúdo não encontrado');
      return;
    }

    // Armazenar última atualização
    lastUpdateRef.current = { contentId: currentContentItem.id, data };

    // Verificar se atingiu o tempo mínimo para texto/PDF/link - atualizar imediatamente
    const tempoMinimoSegundos = 120; // 2 minutos
    const shouldUpdateImmediately = 
      (['texto', 'pdf', 'link_externo'].includes(currentContentItem.tipo_conteudo) && 
       data.tempo_assistido_segundos >= tempoMinimoSegundos) ||
      (['video', 'audio'].includes(currentContentItem.tipo_conteudo) && 
       data.percentual_concluido >= 90);

    console.log('[TreinamentoDetalhesPage.handleProgressUpdate] Decisão', {
      shouldUpdateImmediately,
      tipo_conteudo: currentContentItem.tipo_conteudo,
      tempo_assistido: data.tempo_assistido_segundos,
      percentual: data.percentual_concluido
    });

    // Limpar timeout anterior
    if (updateProgressTimeoutRef.current) {
      console.log('[TreinamentoDetalhesPage.handleProgressUpdate] Limpando timeout anterior');
      clearTimeout(updateProgressTimeoutRef.current);
      updateProgressTimeoutRef.current = null;
    }

    // Se atingiu o requisito mínimo, atualizar imediatamente (mas sem await para não bloquear)
    // Mas adicionar debounce mesmo para atualizações imediatas para evitar loops
    if (shouldUpdateImmediately) {
      console.log('[TreinamentoDetalhesPage.handleProgressUpdate] Atualizando IMEDIATAMENTE (com debounce)');
      // Limpar timeout anterior se existir
      if (updateProgressTimeoutRef.current) {
        clearTimeout(updateProgressTimeoutRef.current);
        updateProgressTimeoutRef.current = null;
      }
      // Usar um pequeno debounce mesmo para atualizações imediatas
      updateProgressTimeoutRef.current = setTimeout(() => {
        updateProgress(currentContentItem.id, data).catch(err => {
          console.error('[TreinamentoDetalhesPage.handleProgressUpdate] Erro ao atualizar progresso:', err);
        });
      }, 500); // 500ms de debounce mesmo para atualizações "imediatas"
    } else {
      // Caso contrário, usar debounce de 5 segundos (aumentado para reduzir frequência)
      console.log('[TreinamentoDetalhesPage.handleProgressUpdate] Agendando atualização com debounce');
      updateProgressTimeoutRef.current = setTimeout(() => {
        console.log('[TreinamentoDetalhesPage.handleProgressUpdate] Executando atualização agendada');
        if (lastUpdateRef.current) {
          updateProgress(lastUpdateRef.current.contentId, lastUpdateRef.current.data).catch(err => {
            console.error('[TreinamentoDetalhesPage.handleProgressUpdate] Erro ao atualizar progresso:', err);
          });
        }
      }, 5000);
    }
    console.log('[TreinamentoDetalhesPage.handleProgressUpdate] FIM');
  }, [content, currentContentIndex, updateProgress]);

  const handleComplete = useCallback(async () => {
    console.log('[TreinamentoDetalhesPage.handleComplete] INÍCIO', {
      contentLength: content.length,
      currentContentIndex,
      timestamp: new Date().toISOString()
    });

    if (content.length === 0 || currentContentIndex >= content.length) {
      console.log('[TreinamentoDetalhesPage.handleComplete] ABORTADO: sem conteúdo ou índice inválido');
      return;
    }
    const currentContentItem = content[currentContentIndex];
    if (!currentContentItem) {
      console.log('[TreinamentoDetalhesPage.handleComplete] ABORTADO: conteúdo não encontrado');
      return;
    }
    
    const currentProgressItem = userProgress.find(p => p.content_id === currentContentItem.id);
    
    // Verificar se já está concluído para evitar chamadas duplicadas
    if (currentProgressItem?.concluido) {
      console.log('[TreinamentoDetalhesPage.handleComplete] Já está concluído, pulando');
      return;
    }
    
    try {
      console.log('[TreinamentoDetalhesPage.handleComplete] Marcando como concluído', {
        contentId: currentContentItem.id,
        tempoAssistido: currentProgressItem?.tempo_assistido_segundos || 0
      });

      // Limpar timeout pendente de atualização
      if (updateProgressTimeoutRef.current) {
        clearTimeout(updateProgressTimeoutRef.current);
        updateProgressTimeoutRef.current = null;
      }

      // Garantir que a última atualização seja enviada antes de marcar como concluído
      if (lastUpdateRef.current && lastUpdateRef.current.contentId === currentContentItem.id) {
        try {
          console.log('[TreinamentoDetalhesPage.handleComplete] Enviando última atualização pendente');
          await updateProgress(lastUpdateRef.current.contentId, lastUpdateRef.current.data);
        } catch (err) {
          console.error('[TreinamentoDetalhesPage.handleComplete] Erro ao atualizar progresso final:', err);
        }
      }

      // Marcar como concluído com 100% de progresso
      const tempoAssistido = currentProgressItem?.tempo_assistido_segundos || 0;
      
      // Primeiro atualizar para 100% e depois marcar como concluído
      await updateProgress(currentContentItem.id, {
        percentual_concluido: 100,
        tempo_assistido_segundos: tempoAssistido,
        ultima_posicao_segundos: 0
      });
      
      // Aguardar um pouco para garantir que a atualização foi processada
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Agora marcar como concluído
      await markAsCompleted(currentContentItem.id, tempoAssistido);
      
      console.log('[TreinamentoDetalhesPage.handleComplete] Conteúdo marcado como concluído com sucesso');
      
      // Aguardar um pouco mais para garantir que o banco processou
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recarregar progresso para garantir que está sincronizado
      await refreshProgress();
      
      toast({
        title: 'Conteúdo concluído!',
        description: 'Você pode avançar para a próxima aula.',
      });

      // Avançar automaticamente para o próximo conteúdo se disponível
      if (currentContentIndex < content.length - 1) {
        setTimeout(() => {
          console.log('[TreinamentoDetalhesPage.handleComplete] Avançando para próxima aula', {
            from: currentContentIndex,
            to: currentContentIndex + 1
          });
          setCurrentContentIndex(currentContentIndex + 1);
        }, 1000);
      }
    } catch (err) {
      console.error('[TreinamentoDetalhesPage.handleComplete] ERRO', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar o conteúdo como concluído.',
        variant: 'destructive'
      });
    }
    console.log('[TreinamentoDetalhesPage.handleComplete] FIM');
  }, [content, currentContentIndex, userProgress, updateProgress, markAsCompleted, refreshProgress, toast]);

  const handlePrevious = useCallback(() => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    }
  }, [currentContentIndex]);

  const validateCanAdvanceToNext = useCallback(async (): Promise<boolean> => {
    if (content.length === 0 || currentContentIndex >= content.length - 1) {
      return false;
    }

    const currentContentItem = content[currentContentIndex];
    if (!currentContentItem) return false;
    
    const currentProgressItem = userProgress.find(p => p.content_id === currentContentItem.id);

    // Se o conteúdo atual já está concluído, pode avançar
    if (currentProgressItem?.concluido) {
      return true;
    }

    // Verificar requisitos baseado no tipo de conteúdo
    const percentualConcluido = currentProgressItem?.percentual_concluido || 0;
    
    // Se chegou a 100%, sempre permite avançar
    if (percentualConcluido >= 100) {
      return true;
    }
    
    if (currentContentItem.tipo_conteudo === 'video' || currentContentItem.tipo_conteudo === 'audio') {
      // Para vídeo/áudio: precisa de pelo menos 90% assistido
      if (percentualConcluido < 90) {
        toast({
          title: 'Aula não concluída',
          description: 'Você precisa assistir pelo menos 90% do vídeo/áudio para avançar para a próxima aula.',
          variant: 'destructive'
        });
        return false;
      }
    } else if (['texto', 'pdf', 'link_externo'].includes(currentContentItem.tipo_conteudo)) {
      // Para texto, PDF e link: precisa de pelo menos 2 minutos (120 segundos)
      const tempoAssistido = currentProgressItem?.tempo_assistido_segundos || 0;
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
      if (nextContent && selectedCompany?.id && trainingId && employeeId) {
        const result = await OnlineTrainingService.canAdvanceToNextContent(
          selectedCompany.id,
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
  }, [content, currentContentIndex, userProgress, selectedCompany?.id, trainingId, employeeId, toast]);

  const handleNext = useCallback(async () => {
    console.log('[TreinamentoDetalhesPage.handleNext] INÍCIO', {
      currentContentIndex,
      contentLength: content.length,
      allContentCompleted,
      hasFinalExam: !!finalExam,
      timestamp: new Date().toISOString()
    });

    // Se está na última aula e todas as aulas estão concluídas e há prova final
    if (isLastContent && allContentCompleted && finalExam) {
      console.log('[TreinamentoDetalhesPage.handleNext] Navegando para prova final', {
        examId: finalExam.id,
        examTitle: finalExam.titulo
      });
      
      // Navegar para a página da prova final
      navigate(`/portal-colaborador/treinamentos/${trainingId}/prova/${finalExam.id}`);
      return;
    }

    // Verificar primeiro se o progresso atual está em 100%
    if (content.length > 0 && currentContentIndex < content.length) {
      const currentContentItem = content[currentContentIndex];
      const currentProgressItem = userProgress.find(p => p.content_id === currentContentItem?.id);
      const percentualConcluido = currentProgressItem?.percentual_concluido || 0;
      
      // Se chegou a 100%, permitir avançar diretamente
      if (percentualConcluido >= 100 && currentContentIndex < content.length - 1) {
        console.log('[TreinamentoDetalhesPage.handleNext] Avançando para próxima aula');
        setCurrentContentIndex(currentContentIndex + 1);
        return;
      }
    }
    
    // Caso contrário, usar validação normal
    const canAdvance = await validateCanAdvanceToNext();
    if (canAdvance && currentContentIndex < content.length - 1) {
      console.log('[TreinamentoDetalhesPage.handleNext] Validação passou, avançando');
      setCurrentContentIndex(currentContentIndex + 1);
    } else {
      console.log('[TreinamentoDetalhesPage.handleNext] Não pode avançar');
    }
  }, [validateCanAdvanceToNext, currentContentIndex, content, userProgress, isLastContent, allContentCompleted, finalExam, trainingId, navigate]);

  const handleContentClick = useCallback(async (index: number) => {
    if (index === currentContentIndex || content.length === 0) return;

    // Se estiver clicando em uma aula anterior ou na mesma, permitir sempre
    if (index <= currentContentIndex) {
      setCurrentContentIndex(index);
      return;
    }

    // Verificar se pode acessar este conteúdo (só para aulas futuras)
    const targetContent = content[index];
    const previousContent = content[index - 1];
    
    // Verificar se a aula anterior está completa ou tem 100%
    if (previousContent && selectedCompany?.id && trainingId && employeeId) {
      const previousProgress = userProgress.find(p => p.content_id === previousContent.id);
      const previousPercentual = previousProgress?.percentual_concluido || 0;
      const previousCompleted = previousProgress?.concluido || false;
      
      // Se a aula anterior chegou a 100% ou está concluída, permitir avançar
      if (previousPercentual >= 100 || previousCompleted) {
        setCurrentContentIndex(index);
        return;
      }
      
      // Se não permitir pular e não está completa, verificar no backend
      if (!targetContent.permite_pular) {
        try {
          const result = await OnlineTrainingService.canAdvanceToNextContent(
            selectedCompany.id,
            trainingId,
            targetContent.id,
            employeeId
          );

          if (result && !result.error && !result.can_advance) {
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
    }

    setCurrentContentIndex(index);
  }, [currentContentIndex, content, userProgress, selectedCompany?.id, trainingId, employeeId, toast]);

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
    <RequireModule module="portal_colaborador" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/portal-colaborador/treinamentos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                {currentTraining?.nome || 'Treinamento Online'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Aula {currentContentIndex + 1} de {content.length}
              </p>
            </div>
          </div>

          {/* Progresso geral */}
          {stats && (
            <div className="text-right">
              <div className="text-2xl font-bold">
                {isNaN(stats.progress_percent) ? 0 : Math.round(stats.progress_percent)}%
              </div>
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
                    {stats.completed_content || 0} de {stats.total_content || 0} aulas concluídas
                  </span>
                </div>
                <Progress 
                  value={isNaN(stats.progress_percent) ? 0 : Math.max(0, Math.min(100, stats.progress_percent))} 
                  className="h-3" 
                />
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
                disabled={
                  // Se está na última aula, só habilitar se todas as aulas estão concluídas E há prova final
                  (isLastContent && (!allContentCompleted || !finalExam)) ||
                  // Se não está na última aula, usar validação normal
                  (!isLastContent && (
                    currentContentIndex >= content.length - 1 || 
                    (!canAdvanceToNextContent && 
                     (currentProgress?.percentual_concluido || 0) < 100 &&
                     !currentProgress?.concluido)
                  ))
                }
              >
                {isLastContent && allContentCompleted && finalExam ? (
                  <>
                    Ir para Prova Final
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
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
    </RequireModule>
  );
}
