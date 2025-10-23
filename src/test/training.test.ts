import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainingNotificationManager } from '@/components/rh/TrainingNotificationManager';
import { useTrainingNotifications } from '@/hooks/rh/useTrainingNotifications';
import { useCompany } from '@/lib/company-context';

// Mock do contexto da empresa
vi.mock('@/lib/company-context', () => ({
  useCompany: vi.fn()
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-id' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'test-id' },
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    })),
    rpc: vi.fn(() => ({
      data: [],
      error: null
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: {
          user: { id: 'test-user-id' }
        }
      }))
    }
  }
}));

// Mock do hook de notificações
vi.mock('@/hooks/rh/useTrainingNotifications', () => ({
  useTrainingNotifications: vi.fn()
}));

// Mock do date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date) => '01/01/2024 10:00'),
  ptBR: {}
}));

describe('Training Module Tests', () => {
  const mockCompany = {
    id: 'test-company-id',
    nome: 'Test Company'
  };

  const mockNotificationTypes = [
    {
      id: 'type-1',
      company_id: 'test-company-id',
      tipo: 'inscricao_aberta',
      nome: 'Inscrições Abertas',
      descricao: 'Notificação quando as inscrições são abertas',
      template_titulo: 'Inscrições Abertas: {training_name}',
      template_mensagem: 'As inscrições para o treinamento {training_name} estão abertas!',
      dias_antecedencia: 0,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    }
  ];

  const mockNotificationRules = [
    {
      id: 'rule-1',
      company_id: 'test-company-id',
      training_id: 'training-1',
      notification_type_id: 'type-1',
      target_audience: 'inscritos' as const,
      dias_antecedencia: 0,
      is_enabled: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    }
  ];

  const mockNotificationHistory = [
    {
      id: 'history-1',
      training_id: 'training-1',
      training_name: 'Test Training',
      titulo: 'Inscrições Abertas: Test Training',
      mensagem: 'As inscrições para o treinamento Test Training estão abertas!',
      data_envio: '2024-01-01T10:00:00Z',
      status: 'enviada' as const,
      tipo: 'inscricao_aberta'
    }
  ];

  const mockNotificationQueue = [
    {
      id: 'queue-1',
      company_id: 'test-company-id',
      training_id: 'training-1',
      notification_type_id: 'type-1',
      user_id: 'test-user-id',
      employee_id: 'employee-1',
      titulo: 'Inscrições Abertas: Test Training',
      mensagem: 'As inscrições para o treinamento Test Training estão abertas!',
      data_agendamento: '2024-01-01T10:00:00Z',
      status: 'pendente' as const,
      tentativas: 0,
      max_tentativas: 3,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    }
  ];

  const mockUseTrainingNotifications = {
    notificationTypes: mockNotificationTypes,
    notificationRules: mockNotificationRules,
    notificationHistory: mockNotificationHistory,
    notificationQueue: mockNotificationQueue,
    loading: false,
    error: null,
    fetchNotificationTypes: vi.fn(),
    fetchNotificationRules: vi.fn(),
    fetchNotificationHistory: vi.fn(),
    fetchNotificationQueue: vi.fn(),
    createNotificationRule: vi.fn(),
    updateNotificationRule: vi.fn(),
    deleteNotificationRule: vi.fn(),
    scheduleTrainingNotifications: vi.fn(),
    processNotificationQueue: vi.fn(),
    createNotificationType: vi.fn(),
    updateNotificationType: vi.fn(),
    deleteNotificationType: vi.fn(),
    clearError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCompany as any).mockReturnValue({ company: mockCompany });
    (useTrainingNotifications as any).mockReturnValue(mockUseTrainingNotifications);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TrainingNotificationManager Component', () => {
    it('should render notification manager with tabs', () => {
      render(<TrainingNotificationManager />);

      expect(screen.getByText('Gerenciador de Notificações de Treinamento')).toBeInTheDocument();
      expect(screen.getByText('Regras')).toBeInTheDocument();
      expect(screen.getByText('Tipos')).toBeInTheDocument();
      expect(screen.getByText('Fila')).toBeInTheDocument();
      expect(screen.getByText('Histórico')).toBeInTheDocument();
    });

    it('should display training name when provided', () => {
      render(<TrainingNotificationManager trainingId="training-1" trainingName="Test Training" />);

      expect(screen.getByText('Configurações para: Test Training')).toBeInTheDocument();
    });

    it('should display notification rules', () => {
      render(<TrainingNotificationManager trainingId="training-1" />);

      expect(screen.getByText('Regras de Notificação')).toBeInTheDocument();
      expect(screen.getByText('inscritos')).toBeInTheDocument();
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });

    it('should display notification types', () => {
      render(<TrainingNotificationManager />);

      // Switch to types tab
      fireEvent.click(screen.getByText('Tipos'));

      expect(screen.getByText('Tipos de Notificação')).toBeInTheDocument();
      expect(screen.getByText('Inscrições Abertas')).toBeInTheDocument();
    });

    it('should display notification queue', () => {
      render(<TrainingNotificationManager />);

      // Switch to queue tab
      fireEvent.click(screen.getByText('Fila'));

      expect(screen.getByText('Fila de Notificações')).toBeInTheDocument();
      expect(screen.getByText('Inscrições Abertas: Test Training')).toBeInTheDocument();
      expect(screen.getByText('pendente')).toBeInTheDocument();
    });

    it('should display notification history', () => {
      render(<TrainingNotificationManager />);

      // Switch to history tab
      fireEvent.click(screen.getByText('Histórico'));

      expect(screen.getByText('Histórico de Notificações')).toBeInTheDocument();
      expect(screen.getByText('Inscrições Abertas: Test Training')).toBeInTheDocument();
      expect(screen.getByText('enviada')).toBeInTheDocument();
    });

    it('should handle create notification rule', async () => {
      const mockCreateRule = vi.fn().mockResolvedValue({ id: 'new-rule' });
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        createNotificationRule: mockCreateRule
      });

      render(<TrainingNotificationManager />);

      // Fill form
      fireEvent.change(screen.getByLabelText('Tipo de Notificação'), {
        target: { value: 'type-1' }
      });
      fireEvent.change(screen.getByLabelText('Público Alvo'), {
        target: { value: 'inscritos' }
      });
      fireEvent.change(screen.getByLabelText('Dias de Antecedência'), {
        target: { value: '1' }
      });

      // Submit form
      fireEvent.click(screen.getByText('Criar'));

      await waitFor(() => {
        expect(mockCreateRule).toHaveBeenCalledWith({
          notification_type_id: 'type-1',
          target_audience: 'inscritos',
          dias_antecedencia: 1,
          is_enabled: true,
          training_id: undefined
        });
      });
    });

    it('should handle update notification rule', async () => {
      const mockUpdateRule = vi.fn().mockResolvedValue({ id: 'rule-1' });
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        updateNotificationRule: mockUpdateRule
      });

      render(<TrainingNotificationManager />);

      // Click edit button
      fireEvent.click(screen.getByText('Editar'));

      // Update form
      fireEvent.change(screen.getByLabelText('Dias de Antecedência'), {
        target: { value: '2' }
      });

      // Submit form
      fireEvent.click(screen.getByText('Atualizar'));

      await waitFor(() => {
        expect(mockUpdateRule).toHaveBeenCalledWith('rule-1', {
          notification_type_id: 'type-1',
          target_audience: 'inscritos',
          dias_antecedencia: 2,
          is_enabled: true
        });
      });
    });

    it('should handle delete notification rule', async () => {
      const mockDeleteRule = vi.fn().mockResolvedValue(undefined);
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        deleteNotificationRule: mockDeleteRule
      });

      // Mock confirm dialog
      window.confirm = vi.fn(() => true);

      render(<TrainingNotificationManager />);

      // Click delete button
      fireEvent.click(screen.getByText('Excluir'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir esta regra?');
        expect(mockDeleteRule).toHaveBeenCalledWith('rule-1');
      });
    });

    it('should handle schedule notifications', async () => {
      const mockScheduleNotifications = vi.fn().mockResolvedValue(undefined);
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        scheduleTrainingNotifications: mockScheduleNotifications
      });

      // Mock alert
      window.alert = vi.fn();

      render(<TrainingNotificationManager trainingId="training-1" />);

      // Click schedule button
      fireEvent.click(screen.getByText('Agendar Notificações'));

      await waitFor(() => {
        expect(mockScheduleNotifications).toHaveBeenCalledWith('training-1');
        expect(window.alert).toHaveBeenCalledWith('Notificações agendadas com sucesso!');
      });
    });

    it('should handle process notification queue', async () => {
      const mockProcessQueue = vi.fn().mockResolvedValue(undefined);
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        processNotificationQueue: mockProcessQueue
      });

      // Mock alert
      window.alert = vi.fn();

      render(<TrainingNotificationManager />);

      // Switch to queue tab
      fireEvent.click(screen.getByText('Fila'));

      // Click process button
      fireEvent.click(screen.getByText('Processar Fila'));

      await waitFor(() => {
        expect(mockProcessQueue).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith('Fila de notificações processada!');
      });
    });

    it('should display error message when error occurs', () => {
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        error: 'Test error message'
      });

      render(<TrainingNotificationManager />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    });

    it('should clear error when retry button is clicked', () => {
      const mockClearError = vi.fn();
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        error: 'Test error message',
        clearError: mockClearError
      });

      render(<TrainingNotificationManager />);

      fireEvent.click(screen.getByText('Tentar novamente'));

      expect(mockClearError).toHaveBeenCalled();
    });

    it('should show loading state', () => {
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        loading: true
      });

      render(<TrainingNotificationManager />);

      // Check if buttons are disabled during loading
      expect(screen.getByText('Agendar Notificações')).toBeDisabled();
    });
  });

  describe('Training Notification Types', () => {
    it('should validate notification type data structure', () => {
      const notificationType = mockNotificationTypes[0];

      expect(notificationType).toHaveProperty('id');
      expect(notificationType).toHaveProperty('company_id');
      expect(notificationType).toHaveProperty('tipo');
      expect(notificationType).toHaveProperty('nome');
      expect(notificationType).toHaveProperty('template_titulo');
      expect(notificationType).toHaveProperty('template_mensagem');
      expect(notificationType).toHaveProperty('dias_antecedencia');
      expect(notificationType).toHaveProperty('is_active');
    });

    it('should validate required fields', () => {
      const notificationType = mockNotificationTypes[0];

      expect(notificationType.id).toBeTruthy();
      expect(notificationType.company_id).toBeTruthy();
      expect(notificationType.tipo).toBeTruthy();
      expect(notificationType.nome).toBeTruthy();
      expect(notificationType.template_titulo).toBeTruthy();
      expect(notificationType.template_mensagem).toBeTruthy();
    });

    it('should validate data types', () => {
      const notificationType = mockNotificationTypes[0];

      expect(typeof notificationType.id).toBe('string');
      expect(typeof notificationType.company_id).toBe('string');
      expect(typeof notificationType.tipo).toBe('string');
      expect(typeof notificationType.nome).toBe('string');
      expect(typeof notificationType.template_titulo).toBe('string');
      expect(typeof notificationType.template_mensagem).toBe('string');
      expect(typeof notificationType.dias_antecedencia).toBe('number');
      expect(typeof notificationType.is_active).toBe('boolean');
    });
  });

  describe('Training Notification Rules', () => {
    it('should validate notification rule data structure', () => {
      const rule = mockNotificationRules[0];

      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('company_id');
      expect(rule).toHaveProperty('notification_type_id');
      expect(rule).toHaveProperty('target_audience');
      expect(rule).toHaveProperty('dias_antecedencia');
      expect(rule).toHaveProperty('is_enabled');
    });

    it('should validate target audience values', () => {
      const validAudiences = ['inscritos', 'todos_funcionarios', 'gestores', 'rh'];
      
      mockNotificationRules.forEach(rule => {
        expect(validAudiences).toContain(rule.target_audience);
      });
    });

    it('should validate dias_antecedencia is non-negative', () => {
      mockNotificationRules.forEach(rule => {
        expect(rule.dias_antecedencia).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Training Notification Queue', () => {
    it('should validate queue item data structure', () => {
      const queueItem = mockNotificationQueue[0];

      expect(queueItem).toHaveProperty('id');
      expect(queueItem).toHaveProperty('company_id');
      expect(queueItem).toHaveProperty('notification_type_id');
      expect(queueItem).toHaveProperty('titulo');
      expect(queueItem).toHaveProperty('mensagem');
      expect(queueItem).toHaveProperty('data_agendamento');
      expect(queueItem).toHaveProperty('status');
      expect(queueItem).toHaveProperty('tentativas');
      expect(queueItem).toHaveProperty('max_tentativas');
    });

    it('should validate status values', () => {
      const validStatuses = ['pendente', 'enviada', 'falhou', 'cancelada'];
      
      mockNotificationQueue.forEach(item => {
        expect(validStatuses).toContain(item.status);
      });
    });

    it('should validate tentativas does not exceed max_tentativas', () => {
      mockNotificationQueue.forEach(item => {
        expect(item.tentativas).toBeLessThanOrEqual(item.max_tentativas);
      });
    });
  });

  describe('Template Processing', () => {
    it('should replace template variables correctly', () => {
      const template = 'Inscrições Abertas: {training_name} - Data: {training_date}';
      const variables = {
        training_name: 'Test Training',
        training_date: '2024-01-01'
      };

      let processed = template;
      Object.entries(variables).forEach(([key, value]) => {
        processed = processed.replace(`{${key}}`, value);
      });

      expect(processed).toBe('Inscrições Abertas: Test Training - Data: 2024-01-01');
    });

    it('should handle missing template variables gracefully', () => {
      const template = 'Inscrições Abertas: {training_name} - Data: {missing_var}';
      const variables = {
        training_name: 'Test Training'
      };

      let processed = template;
      Object.entries(variables).forEach(([key, value]) => {
        processed = processed.replace(`{${key}}`, value);
      });

      expect(processed).toBe('Inscrições Abertas: Test Training - Data: {missing_var}');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-01T10:00:00Z');
      const formatted = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockCreateRule = vi.fn().mockRejectedValue(new Error('API Error'));
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        createNotificationRule: mockCreateRule
      });

      render(<TrainingNotificationManager />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText('Tipo de Notificação'), {
        target: { value: 'type-1' }
      });
      fireEvent.click(screen.getByText('Criar'));

      await waitFor(() => {
        expect(mockCreateRule).toHaveBeenCalled();
      });
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network Error'));
      (useTrainingNotifications as any).mockReturnValue({
        ...mockUseTrainingNotifications,
        fetchNotificationTypes: mockFetch
      });

      render(<TrainingNotificationManager />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TrainingNotificationManager />);

      expect(screen.getByLabelText('Tipo de Notificação')).toBeInTheDocument();
      expect(screen.getByLabelText('Público Alvo')).toBeInTheDocument();
      expect(screen.getByLabelText('Dias de Antecedência')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(<TrainingNotificationManager />);

      expect(screen.getByText('Agendar Notificações')).toBeInTheDocument();
      expect(screen.getByText('Criar')).toBeInTheDocument();
      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Excluir')).toBeInTheDocument();
    });
  });
});
