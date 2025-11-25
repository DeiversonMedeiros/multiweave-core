import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { TimeRecordSettingsService, TimeRecordSettings } from '@/services/rh/timeRecordSettingsService';

export type { TimeRecordSettings };

export function useTimeRecordSettings() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['time-record-settings', selectedCompany?.id],
    queryFn: async (): Promise<TimeRecordSettings | null> => {
      if (!selectedCompany?.id) return null;
      return await TimeRecordSettingsService.getSettings(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

/**
 * Calcula o tempo restante na janela de marcações
 * @param firstMarkTime Timestamp da primeira marcação
 * @param windowHours Horas da janela configurada
 * @returns Objeto com horas restantes e se está próximo do limite
 */
export function calculateTimeRemaining(
  firstMarkTime: Date | string | null,
  windowHours: number
): {
  hoursRemaining: number;
  isNearLimit: boolean;
  percentageUsed: number;
} {
  if (!firstMarkTime) {
    return {
      hoursRemaining: windowHours,
      isNearLimit: false,
      percentageUsed: 0
    };
  }

  const firstMark = typeof firstMarkTime === 'string' 
    ? new Date(firstMarkTime) 
    : firstMarkTime;
  
  const now = new Date();
  const hoursElapsed = (now.getTime() - firstMark.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, windowHours - hoursElapsed);
  const percentageUsed = (hoursElapsed / windowHours) * 100;
  
  // Considerar próximo do limite quando restam menos de 2 horas ou 80% usado
  const isNearLimit = hoursRemaining < 2 || percentageUsed >= 80;

  return {
    hoursRemaining,
    isNearLimit,
    percentageUsed: Math.min(100, percentageUsed)
  };
}

