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
  Settings,
  BookOpen,
  ExternalLink,
  Info
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
          <TabsTrigger value="instrucoes">
            <BookOpen className="h-4 w-4 mr-2" />
            Instruções
          </TabsTrigger>
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

        <TabsContent value="instrucoes" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Guia de Integração Bancária
                </CardTitle>
                <CardDescription>
                  Instruções detalhadas para configurar integrações com Bradesco e Banco Inter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Bradesco */}
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="h-6 w-6 text-blue-600" />
                      <h3 className="text-xl font-semibold">Banco Bradesco</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          1. Obter Credenciais (Client ID e Client Secret)
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                          <li>Acesse o <a href="https://developers.bradesco.com.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Portal de Desenvolvedores do Bradesco <ExternalLink className="h-3 w-3" /></a> e realize o cadastro</li>
                          <li>Envie um e-mail para <a href="mailto:developers@bradesco.com.br" className="text-primary hover:underline">developers@bradesco.com.br</a> com:
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li><strong>Assunto:</strong> Cadastro de Client ID</li>
                              <li><strong>Informações necessárias:</strong>
                                <ul className="list-circle list-inside ml-4 mt-1">
                                  <li>Nome da Empresa</li>
                                  <li>CNPJ</li>
                                  <li>Dados para contato (e-mail e telefone)</li>
                                  <li>Certificado Digital A1 (ICP-BRASIL, mínimo 2048 bits, validade entre 4 meses e 3 anos)</li>
                                </ul>
                              </li>
                            </ul>
                          </li>
                          <li>Após análise e aprovação, o Bradesco enviará as credenciais por e-mail</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          2. Preencher Campos da Configuração
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                          <div>
                            <strong>Nome da Configuração:</strong> Ex: "Bradesco API Produção" ou "Bradesco API Sandbox"
                          </div>
                          <div>
                            <strong>Nome do Banco:</strong> "Banco Bradesco S.A." ou "Bradesco"
                          </div>
                          <div>
                            <strong>Código do Banco:</strong> <code className="bg-background px-2 py-1 rounded">237</code>
                          </div>
                          <div>
                            <strong>Ambiente:</strong> Selecione "Sandbox" para testes ou "Produção" para ambiente real
                          </div>
                          <div>
                            <strong>URL Base da API:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>Sandbox: <code className="bg-background px-2 py-1 rounded">https://sandbox.api.bradesco.com.br</code></li>
                              <li>Produção: <code className="bg-background px-2 py-1 rounded">https://api.bradesco.com.br</code></li>
                            </ul>
                          </div>
                          <div>
                            <strong>Client ID:</strong> Fornecido pelo Bradesco após aprovação
                          </div>
                          <div>
                            <strong>Client Secret:</strong> Fornecido pelo Bradesco após aprovação
                          </div>
                          <div>
                            <strong>Versão da API:</strong> Geralmente <code className="bg-background px-2 py-1 rounded">v1</code>
                          </div>
                          <div>
                            <strong>Grant Type:</strong> <code className="bg-background px-2 py-1 rounded">client_credentials</code>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Importante:</strong> O certificado digital é obrigatório para comunicação com as APIs do Bradesco. Certifique-se de que o certificado atende aos requisitos antes de solicitar as credenciais.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  {/* Banco Inter */}
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="h-6 w-6 text-orange-600" />
                      <h3 className="text-xl font-semibold">Banco Inter</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          1. Obter Credenciais (Client ID e Client Secret)
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                          <li>Acesse o <a href="https://www.bancointer.com.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Internet Banking PJ do Banco Inter <ExternalLink className="h-3 w-3" /></a> e faça login na sua conta empresarial</li>
                          <li>No menu superior, clique em <strong>"Soluções para sua empresa"</strong> e selecione <strong>"Nova Integração"</strong></li>
                          <li>Preencha as informações solicitadas:
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>Nome e descrição da aplicação</li>
                              <li>Selecione os serviços que serão disponibilizados (ex: "API Banking", "Consultar extrato e saldo")</li>
                            </ul>
                          </li>
                          <li>Confirme a criação da integração utilizando o código enviado via SMS</li>
                          <li>Acesse <strong>"Soluções para sua empresa"</strong> → <strong>"Minhas Integrações"</strong></li>
                          <li>Localize a aplicação criada, clique nos três pontos e selecione <strong>"Baixar chave e certificado"</strong></li>
                          <li>As credenciais <strong>Client ID</strong> e <strong>Client Secret</strong> serão exibidas na página</li>
                          <li>Baixe os arquivos de certificado e chave para seu computador</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          2. Preencher Campos da Configuração
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                          <div>
                            <strong>Nome da Configuração:</strong> Ex: "Banco Inter API Produção" ou "Banco Inter API Sandbox"
                          </div>
                          <div>
                            <strong>Nome do Banco:</strong> "Banco Inter S.A." ou "Banco Inter"
                          </div>
                          <div>
                            <strong>Código do Banco:</strong> <code className="bg-background px-2 py-1 rounded">077</code>
                          </div>
                          <div>
                            <strong>Ambiente:</strong> Selecione "Sandbox" para testes ou "Produção" para ambiente real
                          </div>
                          <div>
                            <strong>URL Base da API:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>Sandbox: <code className="bg-background px-2 py-1 rounded">https://cdpj-sandbox.partners.uatinter.co</code></li>
                              <li>Produção: <code className="bg-background px-2 py-1 rounded">https://cdpj.partners.bancointer.com.br</code></li>
                            </ul>
                          </div>
                          <div>
                            <strong>URL de Autenticação:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>Sandbox: <code className="bg-background px-2 py-1 rounded">https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token</code></li>
                              <li>Produção: <code className="bg-background px-2 py-1 rounded">https://cdpj.partners.bancointer.com.br/oauth/v2/token</code></li>
                            </ul>
                          </div>
                          <div>
                            <strong>Client ID:</strong> Obtido na página "Minhas Integrações" do Internet Banking
                          </div>
                          <div>
                            <strong>Client Secret:</strong> Obtido na página "Minhas Integrações" do Internet Banking
                          </div>
                          <div>
                            <strong>Versão da API:</strong> Geralmente <code className="bg-background px-2 py-1 rounded">v3</code>
                          </div>
                          <div>
                            <strong>Grant Type:</strong> <code className="bg-background px-2 py-1 rounded">client_credentials</code>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Importante:</strong> Armazene as credenciais e certificados de forma segura. Não compartilhe com terceiros. Os certificados baixados podem ser necessários para autenticação adicional em algumas operações.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  {/* Dicas Gerais */}
                  <div className="border rounded-lg p-6 space-y-4 bg-blue-50 dark:bg-blue-950/20">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      Dicas Gerais
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Sempre teste primeiro no ambiente <strong>Sandbox</strong> antes de usar em produção</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Use o botão de <strong>Testar Conectividade</strong> após configurar para verificar se a conexão está funcionando</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Mantenha as credenciais atualizadas e revise periodicamente a validade dos certificados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Em caso de dúvidas, consulte a documentação oficial de cada banco ou entre em contato com o suporte</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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