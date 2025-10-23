import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from './useNotifications';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { supabase } from '@/integrations/supabase/client';

interface TimeReminder {
  id: string;
  employee_id: string;
  tipo: 'entrada' | 'saida' | 'almoco_inicio' | 'almoco_fim';
  horario: string;
  ativo: boolean;
  dias_semana: number[];
}

export function useTimeReminders() {
  const { user } = useAuth();
  const { permission, requestPermission, sendTimeReminder } = useNotifications();
  const [reminders, setReminders] = useState<TimeReminder[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar lembretes configurados
  const { data: savedReminders } = useQuery({
    queryKey: ['time-reminders', employee?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh.time_reminders')
        .select('*')
        .eq('employee_id', employee?.id)
        .eq('ativo', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.id
  });

  // Atualizar lembretes quando os dados mudarem
  useEffect(() => {
    if (savedReminders) {
      setReminders(savedReminders);
    }
  }, [savedReminders]);

  // Verificar se deve enviar lembrete
  const checkReminders = useCallback(() => {
    if (!permission.granted || !isEnabled || reminders.length === 0) return;

    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.

    reminders.forEach(reminder => {
      if (!reminder.ativo) return;
      
      // Verificar se é um dia da semana válido
      if (!reminder.dias_semana.includes(currentDay)) return;

      // Verificar se é hora do lembrete (com tolerância de 5 minutos)
      const reminderTime = reminder.horario;
      const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
      const reminderMinutes = reminderHour * 60 + reminderMinute;
      
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const currentMinutes = currentHour * 60 + currentMinute;
      
      // Enviar lembrete se estiver no horário (tolerância de 5 minutos)
      if (Math.abs(currentMinutes - reminderMinutes) <= 5) {
        sendTimeReminder(reminder.tipo);
      }
    });
  }, [permission.granted, isEnabled, reminders, sendTimeReminder]);

  // Verificar lembretes a cada minuto
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(checkReminders, 60000); // 1 minuto
    return () => clearInterval(interval);
  }, [checkReminders, isEnabled]);

  // Ativar lembretes
  const enableReminders = async () => {
    if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }
    
    setIsEnabled(true);
    return true;
  };

  // Desativar lembretes
  const disableReminders = () => {
    setIsEnabled(false);
  };

  // Criar lembrete padrão se não existir
  const createDefaultReminders = async () => {
    if (!employee?.id || reminders.length > 0) return;

    const defaultReminders = [
      {
        employee_id: employee.id,
        tipo: 'entrada' as const,
        horario: '08:00',
        ativo: true,
        dias_semana: [1, 2, 3, 4, 5] // Segunda a sexta
      },
      {
        employee_id: employee.id,
        tipo: 'saida' as const,
        horario: '17:00',
        ativo: true,
        dias_semana: [1, 2, 3, 4, 5] // Segunda a sexta
      }
    ];

    try {
      const { error } = await supabase
        .from('rh.time_reminders')
        .insert(defaultReminders);
      
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar lembretes padrão:', error);
    }
  };

  return {
    reminders,
    isEnabled,
    enableReminders,
    disableReminders,
    createDefaultReminders,
    permission
  };
}
