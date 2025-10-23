// =====================================================
// COMPONENTE: PÁGINA DE CONFIGURAÇÃO SEFAZ
// =====================================================
// Data: 2025-01-20
// Descrição: Página para configurar integrações SEFAZ
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
  Download,
  Upload,
  Shield,
  Globe,
  Settings,
  FileText,
  Clock
} from 'lucide-react';
import { ConfiguracaoFiscalService, ConfiguracaoFiscalFormData } from '@/services/financial/configuracaoFiscalService';
import { ConfiguracaoFiscal, LogValidacaoIntegracao } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConfiguracaoSefazPageProps {
  className?: string;
}

export function ConfiguracaoSefazPage({ className }: ConfiguracaoSefazPageProps) {
  const { selectedCompany } = useCompany();
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoFiscal[]>([]);
  const [logs, setLogs] = useState<LogValidacaoIntegracao[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfiguracaoFiscal | null>(null);
  const [formData, setFormData] = useState<ConfiguracaoFiscalFormData>({
    nome_configuracao: '',
    uf: '',
    tipo_documento: 'nfe',
    ambiente: 'homologacao',
    webservice_url: '',
    versao_layout: '4.00',
    serie_numeracao: 1,
    numero_inicial: 1,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [testandoConectividade, setTestandoConectividade] = useState<string | null>(null);

  const service = ConfiguracaoFiscalService.getInstance();

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
      const data = await service.getLogsValidacao(selectedCompany.id, 'sefaz');
      setLogs(data);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleInputChange = (field: keyof ConfiguracaoFiscalFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      handleInputChange('certificado_digital', file);
    }
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
        uf: '',
        tipo_documento: 'nfe',
        ambiente: 'homologacao',
        webservice_url: '',
        versao_layout: '4.00',
        serie_numeracao: 1,
        numero_inicial: 1,
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

  const handleEdit = (config: ConfiguracaoFiscal) => {
    setEditingConfig(config);
    setFormData({
      nome_configuracao: config.nome_configuracao,
      uf: config.uf,
      tipo_documento: config.tipo_documento,
      ambiente: config.ambiente,
      certificado_digital: config.certificado_digital,
      senha_certificado: config.senha_certificado,
      data_validade_certificado: config.data_validade_certificado ? new Date(config.data_validade_certificado) : undefined,
      webservice_url: config.webservice_url,
      versao_layout: config.versao_layout,
      serie_numeracao: config.serie_numeracao,
      numero_inicial: config.numero_inicial,
      numero_final: config.numero_final,
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

  const handleTestConectividade = async (config: ConfiguracaoFiscal) => {
    if (!selectedCompany?.id) return;

    setTestandoConectividade(config.id);
    try {
      const { conectado, tempoRespostaMs, mensagem } = await service.testarConectividadeSefaz(config.webservice_url);
      
      // Atualizar status da configuração
      await service.updateConfiguracao(config.id, selectedCompany.id, {
        conectividade_ok: conectado,
        ultima_validacao: new Date().toISOString(),
        erro_validacao: conectado ? undefined : mensagem
      });

      // Registrar log
      await service.createLogValidacao({
        company_id: selectedCompany.id,
        tipo_integracao: 'sefaz',
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
          <p className="text-muted-foreground">Carregando configurações SEFAZ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações SEFAZ</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações de integração com os serviços da Secretaria da Fazenda.
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
            <CardTitle>{editingConfig ? 'Editar Configuração' : 'Nova Configuração SEFAZ'}</CardTitle>
            <CardDescription>
              Configure os parâmetros para integração com a SEFAZ.
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
                    placeholder="Ex: NF-e SP Produção"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Select value={formData.uf} onValueChange={(value) => handleInputChange('uf', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                  <Select value={formData.tipo_documento} onValueChange={(value) => handleInputChange('tipo_documento', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nfe">NF-e</SelectItem>
                      <SelectItem value="nfse">NFS-e</SelectItem>
                      <SelectItem value="mdfe">MDF-e</SelectItem>
                      <SelectItem value="cte">CT-e</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ambiente">Ambiente</Label>
                  <Select value={formData.ambiente} onValueChange={(value) => handleInputChange('ambiente', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="webservice_url">URL do Webservice</Label>
                <Input
                  id="webservice_url"
                  value={formData.webservice_url}
                  onChange={(e) => handleInputChange('webservice_url', e.target.value)}
                  placeholder="Ex: https://nfe.sefaz.sp.gov.br/ws/NFeAutorizacao4.asmx"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="versao_layout">Versão do Layout</Label>
                  <Input
                    id="versao_layout"
                    value={formData.versao_layout}
                    onChange={(e) => handleInputChange('versao_layout', e.target.value)}
                    placeholder="Ex: 4.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="serie_numeracao">Série Numeração</Label>
                  <Input
                    id="serie_numeracao"
                    type="number"
                    value={formData.serie_numeracao}
                    onChange={(e) => handleInputChange('serie_numeracao', parseInt(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numero_inicial">Número Inicial</Label>
                  <Input
                    id="numero_inicial"
                    type="number"
                    value={formData.numero_inicial}
                    onChange={(e) => handleInputChange('numero_inicial', parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certificado_digital">Certificado Digital (.pfx)</Label>
                  <Input
                    id="certificado_digital"
                    type="file"
                    accept=".pfx"
                    onChange={handleFileChange}
                  />
                </div>
                <div>
                  <Label htmlFor="senha_certificado">Senha do Certificado</Label>
                  <Input
                    id="senha_certificado"
                    type="password"
                    value={formData.senha_certificado || ''}
                    onChange={(e) => handleInputChange('senha_certificado', e.target.value)}
                    placeholder="********"
                  />
                </div>
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
                Lista de todas as configurações SEFAZ cadastradas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configuracoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma configuração SEFAZ encontrada.
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
                          {config.uf} - {config.tipo_documento.toUpperCase()} | {config.ambiente} | v{config.versao_layout}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Certificado: {getStatusBadge(config.certificado_valido)}</span>
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