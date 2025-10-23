import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  Shield, 
  Clock, 
  Users, 
  Award, 
  Save, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';

interface TrainingSettings {
  id?: string;
  company_id: string;
  
  // Notificações
  notification_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  reminder_days_before: number;
  reminder_days_after: number;
  
  // Políticas de Treinamento
  auto_enrollment: boolean;
  require_approval: boolean;
  max_participants: number;
  min_attendance_percentage: number;
  certificate_auto_generate: boolean;
  certificate_validity_days: number;
  
  // Configurações do Sistema
  training_duration_default: number; // em horas
  evaluation_required: boolean;
  feedback_required: boolean;
  auto_archive_days: number;
  
  // Configurações de Acesso
  allow_self_enrollment: boolean;
  allow_cancellation: boolean;
  cancellation_deadline_hours: number;
  
  created_at?: string;
  updated_at?: string;
}

export const TrainingSettings: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [settings, setSettings] = useState<TrainingSettings>({
    company_id: selectedCompany?.id || '',
    notification_enabled: true,
    email_notifications: true,
    push_notifications: false,
    reminder_days_before: 3,
    reminder_days_after: 1,
    auto_enrollment: false,
    require_approval: true,
    max_participants: 50,
    min_attendance_percentage: 80,
    certificate_auto_generate: true,
    certificate_validity_days: 365,
    training_duration_default: 8,
    evaluation_required: true,
    feedback_required: true,
    auto_archive_days: 90,
    allow_self_enrollment: true,
    allow_cancellation: true,
    cancellation_deadline_hours: 24
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Carregar configurações existentes
  useEffect(() => {
    if (selectedCompany?.id) {
      loadSettings();
    }
  }, [selectedCompany?.id]);

  const loadSettings = async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      const result = await EntityService.list<TrainingSettings>({
        schema: 'rh',
        table: 'training_settings',
        companyId: selectedCompany.id,
        filters: { is_active: true }
      });

      if (result.data && result.data.length > 0) {
        setSettings(result.data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedCompany?.id) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const settingsData = {
        ...settings,
        company_id: selectedCompany.id,
        updated_at: new Date().toISOString()
      };

      let result;
      if (settings.id) {
        // Atualizar configurações existentes
        result = await EntityService.update({
          schema: 'rh',
          table: 'training_settings',
          companyId: selectedCompany.id,
          id: settings.id,
          data: settingsData
        });
      } else {
        // Criar novas configurações
        result = await EntityService.create({
          schema: 'rh',
          table: 'training_settings',
          companyId: selectedCompany.id,
          data: {
            ...settingsData,
            created_at: new Date().toISOString()
          }
        });
      }

      if (result.success) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        if (result.data) {
          setSettings(result.data);
        }
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      company_id: selectedCompany?.id || '',
      notification_enabled: true,
      email_notifications: true,
      push_notifications: false,
      reminder_days_before: 3,
      reminder_days_after: 1,
      auto_enrollment: false,
      require_approval: true,
      max_participants: 50,
      min_attendance_percentage: 80,
      certificate_auto_generate: true,
      certificate_validity_days: 365,
      training_duration_default: 8,
      evaluation_required: true,
      feedback_required: true,
      auto_archive_days: 90,
      allow_self_enrollment: true,
      allow_cancellation: true,
      cancellation_deadline_hours: 24
    });
    setMessage({ type: 'info', text: 'Configurações resetadas para os valores padrão' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configurações de Treinamento</h2>
          <p className="text-muted-foreground">
            Gerencie as configurações avançadas do sistema de treinamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 
                          message.type === 'success' ? 'border-green-200 bg-green-50' : 
                          'border-blue-200 bg-blue-50'}>
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {message.type === 'info' && <Info className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Shield className="h-4 w-4 mr-2" />
            Políticas
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings className="h-4 w-4 mr-2" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="access">
            <Users className="h-4 w-4 mr-2" />
            Acesso
          </TabsTrigger>
        </TabsList>

        {/* Aba de Notificações */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Configurações de Notificações
              </CardTitle>
              <CardDescription>
                Configure como e quando os usuários receberão notificações sobre treinamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notification_enabled">Notificações Ativadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilita o sistema de notificações para treinamentos
                  </p>
                </div>
                <Switch
                  id="notification_enabled"
                  checked={settings.notification_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, notification_enabled: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tipos de Notificação</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_notifications">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações por email
                    </p>
                  </div>
                  <Switch
                    id="email_notifications"
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, email_notifications: checked }))
                    }
                    disabled={!settings.notification_enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push_notifications">Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações push no navegador
                    </p>
                  </div>
                  <Switch
                    id="push_notifications"
                    checked={settings.push_notifications}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, push_notifications: checked }))
                    }
                    disabled={!settings.notification_enabled}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configurações de Lembrete</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder_days_before">Dias Antes do Treinamento</Label>
                    <Input
                      id="reminder_days_before"
                      type="number"
                      min="0"
                      max="30"
                      value={settings.reminder_days_before}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          reminder_days_before: parseInt(e.target.value) || 0 
                        }))
                      }
                      disabled={!settings.notification_enabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantos dias antes do treinamento enviar lembrete
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder_days_after">Dias Após o Treinamento</Label>
                    <Input
                      id="reminder_days_after"
                      type="number"
                      min="0"
                      max="30"
                      value={settings.reminder_days_after}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          reminder_days_after: parseInt(e.target.value) || 0 
                        }))
                      }
                      disabled={!settings.notification_enabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantos dias após o treinamento enviar lembrete
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Políticas */}
        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Políticas de Treinamento
              </CardTitle>
              <CardDescription>
                Configure as regras e políticas para treinamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_enrollment">Inscrição Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir inscrição automática em treinamentos
                    </p>
                  </div>
                  <Switch
                    id="auto_enrollment"
                    checked={settings.auto_enrollment}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, auto_enrollment: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="require_approval">Aprovação Obrigatória</Label>
                    <p className="text-sm text-muted-foreground">
                      Requer aprovação para inscrições em treinamentos
                    </p>
                  </div>
                  <Switch
                    id="require_approval"
                    checked={settings.require_approval}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, require_approval: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="certificate_auto_generate">Geração Automática de Certificados</Label>
                    <p className="text-sm text-muted-foreground">
                      Gerar certificados automaticamente após conclusão
                    </p>
                  </div>
                  <Switch
                    id="certificate_auto_generate"
                    checked={settings.certificate_auto_generate}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, certificate_auto_generate: checked }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Limites e Requisitos</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Máximo de Participantes</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.max_participants}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          max_participants: parseInt(e.target.value) || 1 
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_attendance_percentage">Presença Mínima (%)</Label>
                    <Input
                      id="min_attendance_percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.min_attendance_percentage}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          min_attendance_percentage: parseInt(e.target.value) || 0 
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="certificate_validity_days">Validade do Certificado (dias)</Label>
                    <Input
                      id="certificate_validity_days"
                      type="number"
                      min="1"
                      max="3650"
                      value={settings.certificate_validity_days}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          certificate_validity_days: parseInt(e.target.value) || 365 
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Sistema */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Configure parâmetros gerais do sistema de treinamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="evaluation_required">Avaliação Obrigatória</Label>
                    <p className="text-sm text-muted-foreground">
                      Requer avaliação após conclusão do treinamento
                    </p>
                  </div>
                  <Switch
                    id="evaluation_required"
                    checked={settings.evaluation_required}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, evaluation_required: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="feedback_required">Feedback Obrigatório</Label>
                    <p className="text-sm text-muted-foreground">
                      Requer feedback após conclusão do treinamento
                    </p>
                  </div>
                  <Switch
                    id="feedback_required"
                    checked={settings.feedback_required}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, feedback_required: checked }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configurações Padrão</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="training_duration_default">Duração Padrão (horas)</Label>
                    <Input
                      id="training_duration_default"
                      type="number"
                      min="0.5"
                      max="40"
                      step="0.5"
                      value={settings.training_duration_default}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          training_duration_default: parseFloat(e.target.value) || 8 
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto_archive_days">Arquivar Automaticamente (dias)</Label>
                    <Input
                      id="auto_archive_days"
                      type="number"
                      min="0"
                      max="365"
                      value={settings.auto_archive_days}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          auto_archive_days: parseInt(e.target.value) || 90 
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Treinamentos concluídos serão arquivados após X dias
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Acesso */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Configurações de Acesso
              </CardTitle>
              <CardDescription>
                Configure permissões e acesso aos treinamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_self_enrollment">Auto-Inscrição</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que usuários se inscrevam em treinamentos
                    </p>
                  </div>
                  <Switch
                    id="allow_self_enrollment"
                    checked={settings.allow_self_enrollment}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, allow_self_enrollment: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_cancellation">Cancelamento Permitido</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir cancelamento de inscrições
                    </p>
                  </div>
                  <Switch
                    id="allow_cancellation"
                    checked={settings.allow_cancellation}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, allow_cancellation: checked }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Prazos e Limitações</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="cancellation_deadline_hours">Prazo para Cancelamento (horas)</Label>
                  <Input
                    id="cancellation_deadline_hours"
                    type="number"
                    min="0"
                    max="168"
                    value={settings.cancellation_deadline_hours}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        cancellation_deadline_hours: parseInt(e.target.value) || 24 
                      }))
                    }
                    disabled={!settings.allow_cancellation}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usuários podem cancelar até X horas antes do treinamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
