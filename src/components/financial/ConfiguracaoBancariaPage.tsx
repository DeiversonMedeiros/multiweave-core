// =====================================================
// COMPONENTE: PÁGINA DE CONFIGURAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-01-20
// Descrição: Página para configurar integrações bancárias
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Building,
  Key,
  Link,
  Settings
} from 'lucide-react';
import { ConfiguracaoBancariaService, ConfiguracaoBancariaFormData } from '@/services/financial/configuracaoBancariaService';
import { ConfiguracaoBancaria, LogValidacaoIntegracao } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConfiguracaoBancariaPageProps {
  className?: string;
}

export function ConfiguracaoBancariaPage({ className }: ConfiguracaoBancariaPageProps) {
  const { selectedCompany } = useCompany();
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoBancaria[]>([]);
  const [logs, setLogs] = useState<LogValidacaoIntegracao[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfiguracaoBancaria | null>(null);
  const [formData, setFormData] = useState<ConfiguracaoBancariaFormData>({
    nome_configuracao: '',
    banco_codigo: '',
    banco_nome: '',
    ambiente: 'sandbox',
    base_url: '',
    api_version: 'v1',
    grant_type: 'client_credentials',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [testandoConectividade, setTestandoConectividade] = useState<string | null>(null);

  const service = ConfiguracaoBancariaService.getInstance();

  useEffect(() => {
    if (selectedCompany?.id) {
      loadConfiguracoes();
      loadLogs();
    }
  }, [selectedCompany?.id]);

  const loadConfiguracoes = async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      const data = await service.getConfiguracoes(selectedCompany.id);
      setConfiguracoes(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!selectedCompany?.id) return;
    
    try {
      const data = await service.getLogsValidacao(selectedCompany.id, 'bancaria');
      setLogs(data);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleInputChange = (field: keyof ConfiguracaoBancariaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany?.id) return;

    setSubmitting(true);
    try {
      if (editingConfig) {
        await service.updateConfiguracao(editingConfig.id, selectedCompany.id, formData);
        toast.success('Configuração atualizada com sucesso!');
      } else {
        await service.createConfiguracao(selectedCompany.id, formData);
        toast.success('Configuração criada com sucesso!');
      }
      
      setShowForm(false);
      setEditingConfig(null);
      setFormData({
        nome_configuracao: '',
        banco_codigo: '',
        banco_nome: '',
        ambiente: 'sandbox',
        base_url: '',
        api_version: 'v1',
        grant_type: 'client_credentials',
        is_active: true,
      });
      loadConfiguracoes();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (config: ConfiguracaoBancaria) => {
    setEditingConfig(config);
    setFormData({
      nome_configuracao: config.nome_configuracao,
      banco_codigo: config.banco_codigo,
      banco_nome: config.banco_nome,
      ambiente: config.ambiente,
      client_id: config.client_id,
      client_secret: config.client_secret,
      api_key: config.api_key,
      base_url: config.base_url,
      auth_url: config.auth_url,
      api_version: config.api_version,
      grant_type: config.grant_type,
      scope: config.scope,
      observacoes: config.observacoes,
      is_active: config.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!selectedCompany?.id) return;
    if (!window.confirm('Tem certeza que deseja deletar esta configuração?')) return;

    try {
      await service.deleteConfiguracao(id, selectedCompany.id);
      toast.success('Configuração deletada com sucesso!');
      loadConfiguracoes();
    } catch (error) {
      console.error('Erro ao deletar configuração:', error);
      toast.error('Erro ao deletar configuração');
    }
  };

  const handleTestConectividade = async (config: ConfiguracaoBancaria) => {
    if (!selectedCompany?.id) return;

    setTestandoConectividade(config.id);
    try {
      const { conectado, tempoRespostaMs, mensagem } = await service.testarConectividadeBancaria(config.base_url);
      
      // Atualizar status da configuração
      await service.updateConfiguracao(config.id, selectedCompany.id, {
        conectividade_ok: conectado,
        ultima_validacao: new Date().toISOString(),
        erro_validacao: conectado ? undefined : mensagem
      });

      // Registrar log
      await service.createLogValidacao({
        company_id: selectedCompany.id,
        tipo_integracao: 'bancaria',
        configuracao_id: config.id,
        status: conectado ? 'sucesso' : 'erro',
        mensagem,
        tempo_resposta_ms: tempoRespostaMs,
        created_by: 'system'
      });

      toast.success(conectado ? 'Conectividade OK!' : 'Falha na conectividade');
      loadConfiguracoes();
      loadLogs();
    } catch (error) {
      console.error('Erro ao testar conectividade:', error);
      toast.error('Erro ao testar conectividade');
    } finally {
      setTestandoConectividade(null);
    }
  };

  const getStatusBadge = (isValid: boolean | undefined) => {
    if (isValid === true) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>;
    }
    if (isValid === false) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falha</Badge>;
    }
    return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações bancárias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações Bancárias</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações de integração com APIs bancárias.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingConfig ? 'Editar Configuração' : 'Nova Configuração Bancária'}</CardTitle>
            <CardDescription>
              Configure os parâmetros para integração com APIs bancárias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome_configuracao">Nome da Configuração</Label>
                  <Input
                    id="nome_configuracao"
                    value={formData.nome_configuracao}
                    onChange={(e) => handleInputChange('nome_configuracao', e.target.value)}
                    placeholder="Ex: Bradesco API Produção"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="banco_nome">Nome do Banco</Label>
                  <Input
                    id="banco_nome"
                    value={formData.banco_nome}
                    onChange={(e) => handleInputChange('banco_nome', e.target.value)}
                    placeholder="Ex: Bradesco"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="banco_codigo">Código do Banco</Label>
                  <Input
                    id="banco_codigo"
                    value={formData.banco_codigo}
                    onChange={(e) => handleInputChange('banco_codigo', e.target.value)}
                    placeholder="Ex: 237"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ambiente">Ambiente</Label>
                  <Select value={formData.ambiente} onValueChange={(value) => handleInputChange('ambiente', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="base_url">URL Base da API</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => handleInputChange('base_url', e.target.value)}
                  placeholder="Ex: https://api.bradesco.com.br"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    value={formData.client_id || ''}
                    onChange={(e) => handleInputChange('client_id', e.target.value)}
                    placeholder="Client ID fornecido pelo banco"
                  />
                </div>
                <div>
                  <Label htmlFor="client_secret">Client Secret</Label>
                  <Input
                    id="client_secret"
                    type="password"
                    value={formData.client_secret || ''}
                    onChange={(e) => handleInputChange('client_secret', e.target.value)}
                    placeholder="Client Secret fornecido pelo banco"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="api_key">API Key (Opcional)</Label>
                  <Input
                    id="api_key"
                    value={formData.api_key || ''}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                    placeholder="API Key, se aplicável"
                  />
                </div>
                <div>
                  <Label htmlFor="auth_url">URL de Autenticação (Opcional)</Label>
                  <Input
                    id="auth_url"
                    value={formData.auth_url || ''}
                    onChange={(e) => handleInputChange('auth_url', e.target.value)}
                    placeholder="URL para obter tokens (OAuth)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="api_version">Versão da API</Label>
                  <Input
                    id="api_version"
                    value={formData.api_version}
                    onChange={(e) => handleInputChange('api_version', e.target.value)}
                    placeholder="Ex: v1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="grant_type">Grant Type</Label>
                  <Input
                    id="grant_type"
                    value={formData.grant_type}
                    onChange={(e) => handleInputChange('grant_type', e.target.value)}
                    placeholder="Ex: client_credentials"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="scope">Scope (Opcional)</Label>
                <Input
                  id="scope"
                  value={formData.scope || ''}
                  onChange={(e) => handleInputChange('scope', e.target.value)}
                  placeholder="Escopos de permissão (Ex: extrato.read)"
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ''}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Informações adicionais sobre a configuração"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                />
                <Label htmlFor="is_active">Configuração ativa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvando...' : editingConfig ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="configuracoes" className="w-full">
        <TabsList>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="logs">Logs de Validação</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Ativas</CardTitle>
              <CardDescription>
                Lista de todas as configurações bancárias cadastradas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configuracoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma configuração bancária encontrada.
                </div>
              ) : (
                <div className="space-y-4">
                  {configuracoes.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.nome_configuracao}</span>
                          {config.is_active ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {config.banco_nome} ({config.banco_codigo}) | {config.ambiente} | v{config.api_version}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Credenciais: {getStatusBadge(config.credenciais_validas)}</span>
                          <span>Conectividade: {getStatusBadge(config.conectividade_ok)}</span>
                          {config.ultima_validacao && (
                            <span className="text-muted-foreground">
                              Última validação: {format(new Date(config.ultima_validacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        {config.erro_validacao && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">{config.erro_validacao}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConectividade(config)}
                          disabled={testandoConectividade === config.id}
                        >
                          <RefreshCw className={`h-4 w-4 ${testandoConectividade === config.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Validação</CardTitle>
              <CardDescription>
                Histórico de validações e testes de conectividade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log de validação encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.mensagem}</span>
                          <Badge variant={log.status === 'sucesso' ? 'default' : log.status === 'erro' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          {log.tempo_resposta_ms && ` • ${log.tempo_resposta_ms}ms`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}