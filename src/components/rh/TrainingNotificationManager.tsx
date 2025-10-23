import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTrainingNotifications } from '@/hooks/rh/useTrainingNotifications';
import { Bell, Clock, CheckCircle, XCircle, Settings, History, List } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrainingNotificationManagerProps {
  trainingId?: string;
  trainingName?: string;
}

export const TrainingNotificationManager: React.FC<TrainingNotificationManagerProps> = ({
  trainingId,
  trainingName
}) => {
  const {
    notificationTypes,
    notificationRules,
    notificationHistory,
    notificationQueue,
    loading,
    error,
    fetchNotificationRules,
    fetchNotificationHistory,
    fetchNotificationQueue,
    createNotificationRule,
    updateNotificationRule,
    deleteNotificationRule,
    scheduleTrainingNotifications,
    processNotificationQueue,
    createNotificationType,
    updateNotificationType,
    deleteNotificationType,
    clearError
  } = useTrainingNotifications();

  const [activeTab, setActiveTab] = useState('rules');
  const [showCreateType, setShowCreateType] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);

  // Form states
  const [ruleForm, setRuleForm] = useState({
    notification_type_id: '',
    target_audience: 'inscritos' as const,
    dias_antecedencia: 0,
    is_enabled: true
  });

  const [typeForm, setTypeForm] = useState({
    tipo: '',
    nome: '',
    descricao: '',
    template_titulo: '',
    template_mensagem: '',
    dias_antecedencia: 0,
    is_active: true
  });

  useEffect(() => {
    if (trainingId) {
      fetchNotificationRules(trainingId);
    } else {
      fetchNotificationRules();
    }
    fetchNotificationHistory();
    fetchNotificationQueue();
  }, [trainingId, fetchNotificationRules, fetchNotificationHistory, fetchNotificationQueue]);

  const handleCreateRule = async () => {
    try {
      await createNotificationRule({
        ...ruleForm,
        training_id: trainingId
      });
      setRuleForm({
        notification_type_id: '',
        target_audience: 'inscritos',
        dias_antecedencia: 0,
        is_enabled: true
      });
    } catch (error) {
      console.error('Erro ao criar regra:', error);
    }
  };

  const handleUpdateRule = async (ruleId: string) => {
    try {
      await updateNotificationRule(ruleId, ruleForm);
      setEditingRule(null);
      setRuleForm({
        notification_type_id: '',
        target_audience: 'inscritos',
        dias_antecedencia: 0,
        is_enabled: true
      });
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra?')) {
      try {
        await deleteNotificationRule(ruleId);
      } catch (error) {
        console.error('Erro ao excluir regra:', error);
      }
    }
  };

  const handleCreateType = async () => {
    try {
      await createNotificationType(typeForm);
      setTypeForm({
        tipo: '',
        nome: '',
        descricao: '',
        template_titulo: '',
        template_mensagem: '',
        dias_antecedencia: 0,
        is_active: true
      });
      setShowCreateType(false);
    } catch (error) {
      console.error('Erro ao criar tipo:', error);
    }
  };

  const handleUpdateType = async (typeId: string) => {
    try {
      await updateNotificationType(typeId, typeForm);
      setEditingType(null);
      setTypeForm({
        tipo: '',
        nome: '',
        descricao: '',
        template_titulo: '',
        template_mensagem: '',
        dias_antecedencia: 0,
        is_active: true
      });
    } catch (error) {
      console.error('Erro ao atualizar tipo:', error);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo de notificação?')) {
      try {
        await deleteNotificationType(typeId);
      } catch (error) {
        console.error('Erro ao excluir tipo:', error);
      }
    }
  };

  const handleScheduleNotifications = async () => {
    if (trainingId) {
      try {
        await scheduleTrainingNotifications(trainingId);
        alert('Notificações agendadas com sucesso!');
      } catch (error) {
        console.error('Erro ao agendar notificações:', error);
      }
    }
  };

  const handleProcessQueue = async () => {
    try {
      await processNotificationQueue();
      alert('Fila de notificações processada!');
    } catch (error) {
      console.error('Erro ao processar fila:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enviada':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'falhou':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enviada':
        return 'bg-green-100 text-green-800';
      case 'falhou':
        return 'bg-red-100 text-red-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={clearError} className="ml-2">
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Gerenciador de Notificações de Treinamento
          </CardTitle>
          <CardDescription>
            {trainingName ? `Configurações para: ${trainingName}` : 'Configurações gerais de notificações'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Regras
              </TabsTrigger>
              <TabsTrigger value="types" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Tipos
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Fila
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Regras de Notificação</h3>
                <Button onClick={handleScheduleNotifications} disabled={!trainingId || loading}>
                  Agendar Notificações
                </Button>
              </div>

              <div className="grid gap-4">
                {notificationRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{rule.target_audience}</Badge>
                          <Badge variant={rule.is_enabled ? 'default' : 'secondary'}>
                            {rule.is_enabled ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Dias de antecedência: {rule.dias_antecedencia}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRule(rule.id);
                            setRuleForm({
                              notification_type_id: rule.notification_type_id,
                              target_audience: rule.target_audience,
                              dias_antecedencia: rule.dias_antecedencia,
                              is_enabled: rule.is_enabled
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Create/Edit Rule Form */}
              {(editingRule || !trainingId) && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-4">
                    {editingRule ? 'Editar Regra' : 'Criar Nova Regra'}
                  </h4>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="notification_type">Tipo de Notificação</Label>
                      <Select
                        value={ruleForm.notification_type_id}
                        onValueChange={(value) => setRuleForm({ ...ruleForm, notification_type_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {notificationTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="target_audience">Público Alvo</Label>
                      <Select
                        value={ruleForm.target_audience}
                        onValueChange={(value: any) => setRuleForm({ ...ruleForm, target_audience: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inscritos">Inscritos</SelectItem>
                          <SelectItem value="todos_funcionarios">Todos os Funcionários</SelectItem>
                          <SelectItem value="gestores">Gestores</SelectItem>
                          <SelectItem value="rh">RH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dias_antecedencia">Dias de Antecedência</Label>
                      <Input
                        type="number"
                        value={ruleForm.dias_antecedencia}
                        onChange={(e) => setRuleForm({ ...ruleForm, dias_antecedencia: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_enabled"
                        checked={ruleForm.is_enabled}
                        onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_enabled: checked })}
                      />
                      <Label htmlFor="is_enabled">Ativo</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={editingRule ? () => handleUpdateRule(editingRule) : handleCreateRule}>
                        {editingRule ? 'Atualizar' : 'Criar'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingRule(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Types Tab */}
            <TabsContent value="types" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Tipos de Notificação</h3>
                <Button onClick={() => setShowCreateType(true)}>
                  Criar Tipo
                </Button>
              </div>

              <div className="grid gap-4">
                {notificationTypes.map((type) => (
                  <Card key={type.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{type.nome}</h4>
                          <Badge variant={type.is_active ? 'default' : 'secondary'}>
                            {type.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{type.descricao}</p>
                        <p className="text-xs text-gray-500">
                          Dias de antecedência: {type.dias_antecedencia}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingType(type.id);
                            setTypeForm({
                              tipo: type.tipo,
                              nome: type.nome,
                              descricao: type.descricao || '',
                              template_titulo: type.template_titulo,
                              template_mensagem: type.template_mensagem,
                              dias_antecedencia: type.dias_antecedencia,
                              is_active: type.is_active
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteType(type.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Create/Edit Type Form */}
              {(showCreateType || editingType) && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-4">
                    {editingType ? 'Editar Tipo' : 'Criar Novo Tipo'}
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tipo">Tipo</Label>
                        <Input
                          value={typeForm.tipo}
                          onChange={(e) => setTypeForm({ ...typeForm, tipo: e.target.value })}
                          placeholder="inscricao_aberta"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                          value={typeForm.nome}
                          onChange={(e) => setTypeForm({ ...typeForm, nome: e.target.value })}
                          placeholder="Inscrições Abertas"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        value={typeForm.descricao}
                        onChange={(e) => setTypeForm({ ...typeForm, descricao: e.target.value })}
                        placeholder="Notificação quando as inscrições são abertas"
                      />
                    </div>

                    <div>
                      <Label htmlFor="template_titulo">Template do Título</Label>
                      <Input
                        value={typeForm.template_titulo}
                        onChange={(e) => setTypeForm({ ...typeForm, template_titulo: e.target.value })}
                        placeholder="Inscrições Abertas: {training_name}"
                      />
                    </div>

                    <div>
                      <Label htmlFor="template_mensagem">Template da Mensagem</Label>
                      <Textarea
                        value={typeForm.template_mensagem}
                        onChange={(e) => setTypeForm({ ...typeForm, template_mensagem: e.target.value })}
                        placeholder="As inscrições para o treinamento {training_name} estão abertas!"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="dias_antecedencia">Dias de Antecedência</Label>
                      <Input
                        type="number"
                        value={typeForm.dias_antecedencia}
                        onChange={(e) => setTypeForm({ ...typeForm, dias_antecedencia: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={typeForm.is_active}
                        onCheckedChange={(checked) => setTypeForm({ ...typeForm, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Ativo</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={editingType ? () => handleUpdateType(editingType) : handleCreateType}>
                        {editingType ? 'Atualizar' : 'Criar'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowCreateType(false);
                        setEditingType(null);
                      }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Queue Tab */}
            <TabsContent value="queue" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Fila de Notificações</h3>
                <Button onClick={handleProcessQueue} disabled={loading}>
                  Processar Fila
                </Button>
              </div>

              <div className="grid gap-4">
                {notificationQueue.map((notification) => (
                  <Card key={notification.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(notification.status)}
                          <h4 className="font-semibold">{notification.titulo}</h4>
                          <Badge className={getStatusColor(notification.status)}>
                            {notification.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{notification.mensagem}</p>
                        <p className="text-xs text-gray-500">
                          Agendado para: {format(new Date(notification.data_agendamento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                        {notification.tentativas > 0 && (
                          <p className="text-xs text-orange-600">
                            Tentativas: {notification.tentativas}/{notification.max_tentativas}
                          </p>
                        )}
                        {notification.erro_mensagem && (
                          <p className="text-xs text-red-600">
                            Erro: {notification.erro_mensagem}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Histórico de Notificações</h3>
              </div>

              <div className="grid gap-4">
                {notificationHistory.map((notification) => (
                  <Card key={notification.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(notification.status)}
                          <h4 className="font-semibold">{notification.titulo}</h4>
                          <Badge className={getStatusColor(notification.status)}>
                            {notification.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{notification.mensagem}</p>
                        <p className="text-xs text-gray-500">
                          Enviado em: {format(new Date(notification.data_envio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                        {notification.training_name && (
                          <p className="text-xs text-blue-600">
                            Treinamento: {notification.training_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
