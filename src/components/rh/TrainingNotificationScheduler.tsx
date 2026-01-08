import React, { useEffect, useRef } from 'react';
import { useCompany } from '@/lib/company-context';
import { useTrainingNotificationService } from '@/hooks/rh/useTrainingNotificationService';

// Flag global para mostrar mensagem apenas uma vez
let migrationWarningShown = false;
// Cache de empresas já verificadas
const checkedCompanies = new Set<string>();

/**
 * Componente que executa a criação automática de notificações
 * Deve ser incluído no Layout principal para rodar em background
 */
export const TrainingNotificationScheduler: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { createNotifications, checkOverdue } = useTrainingNotificationService();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedCompany?.id) {
      // Limpar intervalo se não há empresa selecionada
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const companyId = selectedCompany.id;

    // Se já verificamos esta empresa, não fazer nada
    if (checkedCompanies.has(companyId)) {
      return;
    }

    // Executar verificação imediatamente
    const runChecks = async () => {
      let functionsUnavailable = false;

      try {
        // Criar notificações para todos os treinamentos obrigatórios
        const result = await createNotifications();
        // Se a função não está disponível, marcar e não tentar novamente
        if (result.message?.includes('não disponível')) {
          functionsUnavailable = true;
          checkedCompanies.add(companyId);
          return; // Não continuar se a função não está disponível
        }
      } catch (err: any) {
        // Se a função não existir, marcar como indisponível e retornar
        if (err?.message?.includes('does not exist')) {
          functionsUnavailable = true;
          checkedCompanies.add(companyId);
          return;
        }
        // Outros erros podem ser temporários, então não retornar
      }
      
      try {
        // Verificar treinamentos vencidos (pode não existir se a migração não foi aplicada)
        const result = await checkOverdue();
        // Se a função não está disponível, marcar
        if (result.message?.includes('não disponível')) {
          functionsUnavailable = true;
        }
      } catch (err: any) {
        // Se a função não existir, marcar como indisponível
        if (err?.message?.includes('does not exist')) {
          functionsUnavailable = true;
        }
      }

      // Marcar empresa como verificada
      checkedCompanies.add(companyId);

      // Mostrar aviso apenas uma vez se as funções não estiverem disponíveis
      if (functionsUnavailable && !migrationWarningShown) {
        migrationWarningShown = true;
        console.warn(
          '⚠️ Migração de notificações não aplicada.\n' +
          'Para habilitar notificações de treinamentos, aplique a migração:\n' +
          '20260106000012_create_training_notification_functions.sql'
        );
      }
    };

    runChecks();

    // Executar a cada 1 hora apenas se as funções estiverem disponíveis
    // O cache no serviço evitará chamadas desnecessárias
    intervalRef.current = setInterval(runChecks, 60 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedCompany?.id, createNotifications, checkOverdue]);

  // Este componente não renderiza nada
  return null;
};



