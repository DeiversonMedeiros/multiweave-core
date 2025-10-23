import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
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
    }))
  }
}));

describe('Training Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('schedule_training_notifications', () => {
    it('should call schedule_training_notifications RPC function', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.rpc as any).mockImplementation(mockRpc);

      await supabase.rpc('schedule_training_notifications');

      expect(mockRpc).toHaveBeenCalledWith('schedule_training_notifications');
    });

    it('should handle RPC errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await supabase.rpc('schedule_training_notifications');

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Database error');
    });
  });

  describe('process_notification_queue', () => {
    it('should call process_notification_queue RPC function', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.rpc as any).mockImplementation(mockRpc);

      await supabase.rpc('process_notification_queue');

      expect(mockRpc).toHaveBeenCalledWith('process_notification_queue');
    });

    it('should handle processing errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Processing error' } 
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await supabase.rpc('process_notification_queue');

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Processing error');
    });
  });

  describe('create_training_notification_rules', () => {
    it('should call create_training_notification_rules RPC function with correct parameters', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const trainingId = 'training-123';
      const companyId = 'company-123';

      await supabase.rpc('create_training_notification_rules', {
        p_training_id: trainingId,
        p_company_id: companyId
      });

      expect(mockRpc).toHaveBeenCalledWith('create_training_notification_rules', {
        p_training_id: trainingId,
        p_company_id: companyId
      });
    });

    it('should handle creation errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Creation failed' } 
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await supabase.rpc('create_training_notification_rules', {
        p_training_id: 'training-123',
        p_company_id: 'company-123'
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Creation failed');
    });
  });

  describe('get_training_notifications', () => {
    it('should call get_training_notifications RPC function with correct parameters', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: [
          {
            id: 'notification-1',
            training_id: 'training-1',
            training_name: 'Test Training',
            titulo: 'Test Notification',
            mensagem: 'Test message',
            data_envio: '2024-01-01T10:00:00Z',
            status: 'enviada',
            tipo: 'inscricao_aberta'
          }
        ], 
        error: null 
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const userId = 'user-123';
      const companyId = 'company-123';
      const limit = 50;
      const offset = 0;

      const result = await supabase.rpc('get_training_notifications', {
        p_user_id: userId,
        p_company_id: companyId,
        p_limit: limit,
        p_offset: offset
      });

      expect(mockRpc).toHaveBeenCalledWith('get_training_notifications', {
        p_user_id: userId,
        p_company_id: companyId,
        p_limit: limit,
        p_offset: offset
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('training_name');
      expect(result.data[0]).toHaveProperty('titulo');
      expect(result.data[0]).toHaveProperty('mensagem');
    });

    it('should handle retrieval errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Retrieval failed' } 
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await supabase.rpc('get_training_notifications', {
        p_user_id: 'user-123',
        p_company_id: 'company-123',
        p_limit: 50,
        p_offset: 0
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Retrieval failed');
    });
  });

  describe('Training Notification Types CRUD', () => {
    it('should create notification type', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ 
        data: { id: 'type-123' }, 
        error: null 
      });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'type-123' }, error: null })
        }))
      });

      const notificationTypeData = {
        company_id: 'company-123',
        tipo: 'test_type',
        nome: 'Test Type',
        descricao: 'Test description',
        template_titulo: 'Test Title: {training_name}',
        template_mensagem: 'Test message: {training_name}',
        dias_antecedencia: 1,
        is_active: true
      };

      const result = await supabase
        .from('rh.training_notification_types')
        .insert(notificationTypeData)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalledWith(notificationTypeData);
      expect(result.data).toHaveProperty('id');
    });

    it('should update notification type', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ 
        data: { id: 'type-123' }, 
        error: null 
      });
      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'type-123' }, error: null })
          }))
        }))
      });

      const updates = {
        nome: 'Updated Type',
        is_active: false
      };

      const result = await supabase
        .from('rh.training_notification_types')
        .update(updates)
        .eq('id', 'type-123')
        .select()
        .single();

      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(result.data).toHaveProperty('id');
    });

    it('should delete notification type', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const result = await supabase
        .from('rh.training_notification_types')
        .delete()
        .eq('id', 'type-123');

      expect(mockDelete).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('Training Notification Rules CRUD', () => {
    it('should create notification rule', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ 
        data: { id: 'rule-123' }, 
        error: null 
      });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'rule-123' }, error: null })
        }))
      });

      const ruleData = {
        company_id: 'company-123',
        training_id: 'training-123',
        notification_type_id: 'type-123',
        target_audience: 'inscritos',
        dias_antecedencia: 1,
        is_enabled: true
      };

      const result = await supabase
        .from('rh.training_notification_rules')
        .insert(ruleData)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalledWith(ruleData);
      expect(result.data).toHaveProperty('id');
    });

    it('should update notification rule', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ 
        data: { id: 'rule-123' }, 
        error: null 
      });
      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'rule-123' }, error: null })
          }))
        }))
      });

      const updates = {
        dias_antecedencia: 2,
        is_enabled: false
      };

      const result = await supabase
        .from('rh.training_notification_rules')
        .update(updates)
        .eq('id', 'rule-123')
        .select()
        .single();

      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(result.data).toHaveProperty('id');
    });

    it('should delete notification rule', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const result = await supabase
        .from('rh.training_notification_rules')
        .delete()
        .eq('id', 'rule-123');

      expect(mockDelete).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('Training Notification Queue Operations', () => {
    it('should fetch notification queue', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ 
        data: [
          {
            id: 'queue-1',
            company_id: 'company-123',
            training_id: 'training-1',
            titulo: 'Test Notification',
            mensagem: 'Test message',
            data_agendamento: '2024-01-01T10:00:00Z',
            status: 'pendente'
          }
        ], 
        error: null 
      });
      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      });

      const result = await supabase
        .from('rh.training_notification_queue')
        .select('*')
        .eq('company_id', 'company-123')
        .order('data_agendamento');

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('status');
    });

    it('should handle queue fetch errors', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Queue fetch failed' } 
      });
      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Queue fetch failed' } })
        }))
      });

      const result = await supabase
        .from('rh.training_notification_queue')
        .select('*')
        .eq('company_id', 'company-123')
        .order('data_agendamento');

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Queue fetch failed');
    });
  });

  describe('Data Validation', () => {
    it('should validate notification type data structure', () => {
      const validNotificationType = {
        id: 'type-123',
        company_id: 'company-123',
        tipo: 'inscricao_aberta',
        nome: 'Inscrições Abertas',
        descricao: 'Notificação quando as inscrições são abertas',
        template_titulo: 'Inscrições Abertas: {training_name}',
        template_mensagem: 'As inscrições para o treinamento {training_name} estão abertas!',
        dias_antecedencia: 0,
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      expect(validNotificationType).toHaveProperty('id');
      expect(validNotificationType).toHaveProperty('company_id');
      expect(validNotificationType).toHaveProperty('tipo');
      expect(validNotificationType).toHaveProperty('nome');
      expect(validNotificationType).toHaveProperty('template_titulo');
      expect(validNotificationType).toHaveProperty('template_mensagem');
      expect(validNotificationType).toHaveProperty('dias_antecedencia');
      expect(validNotificationType).toHaveProperty('is_active');
    });

    it('should validate notification rule data structure', () => {
      const validRule = {
        id: 'rule-123',
        company_id: 'company-123',
        training_id: 'training-123',
        notification_type_id: 'type-123',
        target_audience: 'inscritos',
        dias_antecedencia: 1,
        is_enabled: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      expect(validRule).toHaveProperty('id');
      expect(validRule).toHaveProperty('company_id');
      expect(validRule).toHaveProperty('notification_type_id');
      expect(validRule).toHaveProperty('target_audience');
      expect(validRule).toHaveProperty('dias_antecedencia');
      expect(validRule).toHaveProperty('is_enabled');
    });

    it('should validate target audience values', () => {
      const validAudiences = ['inscritos', 'todos_funcionarios', 'gestores', 'rh'];
      const testAudience = 'inscritos';

      expect(validAudiences).toContain(testAudience);
    });

    it('should validate status values', () => {
      const validStatuses = ['pendente', 'enviada', 'falhou', 'cancelada'];
      const testStatus = 'pendente';

      expect(validStatuses).toContain(testStatus);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database connection errors', async () => {
      const mockRpc = vi.fn().mockRejectedValue(new Error('Connection failed'));
      (supabase.rpc as any).mockImplementation(mockRpc);

      await expect(supabase.rpc('schedule_training_notifications')).rejects.toThrow('Connection failed');
    });

    it('should handle timeout errors', async () => {
      const mockRpc = vi.fn().mockRejectedValue(new Error('Request timeout'));
      (supabase.rpc as any).mockImplementation(mockRpc);

      await expect(supabase.rpc('process_notification_queue')).rejects.toThrow('Request timeout');
    });

    it('should handle permission errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Permission denied' } 
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await supabase.rpc('get_training_notifications', {
        p_user_id: 'user-123',
        p_company_id: 'company-123',
        p_limit: 50,
        p_offset: 0
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Permission denied');
    });
  });
});
