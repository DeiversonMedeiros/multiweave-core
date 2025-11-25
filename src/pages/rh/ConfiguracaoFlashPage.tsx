// =====================================================
// COMPONENTE: PÁGINA DE CONFIGURAÇÃO FLASH API
// =====================================================
// Data: 2025-11-04
// Descrição: Página para configurar integração com Flash API

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Save,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  FlashIntegrationConfigService, 
  FlashIntegrationConfigFormData,
  FlashIntegrationConfig 
} from '@/services/integrations/flashIntegrationConfigService';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RequireModule } from '@/components/RequireAuth';

export function ConfiguracaoFlashPage() {
  const { selectedCompany } = useCompany();
  const [configuracao, setConfiguracao] = useState<FlashIntegrationConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<FlashIntegrationConfigFormData>({
    nome_configuracao: 'Configuração Flash',
    ambiente: 'producao',
    api_key: '',
    flash_company_id: '',
    base_url: 'https://api.flashapp.services',
    api_version: 'v2',
    empresa_nome: '',
    empresa_cnpj: '',
    empresa_email: '',
    empresa_telefone: '',
    observacoes: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [testando, setTestando] = useState(false);

  const service = FlashIntegrationConfigService.getInstance();

  useEffect(() => {
    if (selectedCompany?.id) {
      loadConfiguracao();
    }
  }, [selectedCompany?.id]);

  const loadConfiguracao = async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      const data = await service.getConfiguracaoAtiva(selectedCompany.id);
      setConfiguracao(data);
      
      if (data) {
        setFormData({
          nome_configuracao: data.nome_configuracao,
          ambiente: data.ambiente,
          api_key: data.api_key ? '••••••••••••••••' : '',
          flash_company_id: data.flash_company_id || '',
          base_url: data.base_url,
          api_version: data.api_version,
          empresa_nome: data.empresa_nome || '',
          empresa_cnpj: data.empresa_cnpj || '',
          empresa_email: data.empresa_email || '',
          empresa_telefone: data.empresa_telefone || '',
          observacoes: data.observacoes || '',
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FlashIntegrationConfigFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany?.id) return;

    setSubmitting(true);
    try {
      if (configuracao) {
        // Se tem configuração, atualizar
        // Se a API key não foi alterada (está mascarada), não enviar
        const updateData = { ...formData };
        if (formData.api_key === '••••••••••••••••') {
          delete (updateData as any).api_key;
        }
        
        await service.updateConfiguracao(configuracao.id, selectedCompany.id, updateData);
        toast.success('Configuração atualizada com sucesso!');
      } else {
        // Criar nova configuração
        if (!formData.api_key || formData.api_key === '••••••••••••••••') {
          toast.error('Por favor, informe a chave de API');
          return;
        }
        
        await service.createConfiguracao(selectedCompany.id, formData);
        toast.success('Configuração criada com sucesso!');
      }
      
      setShowForm(false);
      loadConfiguracao();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!configuracao?.id || !selectedCompany?.id) {
      toast.error('Salve a configuração antes de testar');
      return;
    }

    setTestando(true);
    try {
      const result = await service.testConnection(configuracao.id, selectedCompany.id);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      
      loadConfiguracao();
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setTestando(false);
    }
  };

  const handleDelete = async () => {
    if (!configuracao?.id || !selectedCompany?.id) return;
    
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) {
      return;
    }

    try {
      await service.deleteConfiguracao(configuracao.id, selectedCompany.id);
      toast.success('Configuração excluída com sucesso!');
      setConfiguracao(null);
      setShowForm(false);
      loadConfiguracao();
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
      toast.error('Erro ao excluir configuração');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando configuração...</p>
      </div>
    );
  }

  return (
    <RequireModule moduleName="rh">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuração Flash API</h1>
            <p className="text-muted-foreground">
              Configure a integração com a Flash API para pagamentos de aluguéis
            </p>
          </div>
          {configuracao && !showForm && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testando}
              >
                {testando ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          )}
        </div>

        {/* Status da Configuração */}
        {configuracao && !showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{configuracao.nome_configuracao}</span>
                <div className="flex items-center space-x-2">
                  <Badge variant={configuracao.is_active ? 'default' : 'secondary'}>
                    {configuracao.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant={configuracao.credenciais_validas ? 'default' : 'destructive'}>
                    {configuracao.credenciais_validas ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Válido
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inválido
                      </>
                    )}
                  </Badge>
                  <Badge variant={configuracao.conectividade_ok ? 'default' : 'destructive'}>
                    {configuracao.conectividade_ok ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Desconectado
                      </>
                    )}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Ambiente</Label>
                  <p className="font-medium">{configuracao.ambiente}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Base URL</Label>
                  <p className="font-medium">{configuracao.base_url}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Versão da API</Label>
                  <p className="font-medium">{configuracao.api_version}</p>
                </div>
                {configuracao.flash_company_id && (
                  <div>
                    <Label className="text-muted-foreground">ID Empresa Flash</Label>
                    <p className="font-medium">{configuracao.flash_company_id}</p>
                  </div>
                )}
                {configuracao.empresa_nome && (
                  <div>
                    <Label className="text-muted-foreground">Empresa</Label>
                    <p className="font-medium">{configuracao.empresa_nome}</p>
                  </div>
                )}
                {configuracao.empresa_cnpj && (
                  <div>
                    <Label className="text-muted-foreground">CNPJ</Label>
                    <p className="font-medium">{configuracao.empresa_cnpj}</p>
                  </div>
                )}
                {configuracao.ultima_validacao && (
                  <div>
                    <Label className="text-muted-foreground">Última Validação</Label>
                    <p className="font-medium">
                      {format(new Date(configuracao.ultima_validacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                )}
                {configuracao.erro_validacao && (
                  <div className="md:col-span-2">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{configuracao.erro_validacao}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário */}
        {(!configuracao || showForm) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {configuracao ? 'Editar Configuração' : 'Nova Configuração'}
              </CardTitle>
              <CardDescription>
                Configure a integração com a Flash API. 
                <a 
                  href="https://hros.flashapp.com.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  Obter chave de API
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_configuracao">Nome da Configuração *</Label>
                    <Input
                      id="nome_configuracao"
                      value={formData.nome_configuracao}
                      onChange={(e) => handleInputChange('nome_configuracao', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ambiente">Ambiente *</Label>
                    <Select
                      value={formData.ambiente}
                      onValueChange={(value) => handleInputChange('ambiente', value as any)}
                    >
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

                  <div className="space-y-2">
                    <Label htmlFor="api_key">Chave de API Flash *</Label>
                    <div className="relative">
                      <Input
                        id="api_key"
                        type={showApiKey ? 'text' : 'password'}
                        value={formData.api_key}
                        onChange={(e) => handleInputChange('api_key', e.target.value)}
                        placeholder="Insira sua chave de API Flash"
                        required={!configuracao}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Obtenha sua chave em: Configurações &gt; Plataforma &gt; Chaves de acesso programático
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="flash_company_id">ID Empresa Flash (opcional)</Label>
                    <Input
                      id="flash_company_id"
                      value={formData.flash_company_id}
                      onChange={(e) => handleInputChange('flash_company_id', e.target.value)}
                      placeholder="ID da empresa na Flash"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_url">Base URL *</Label>
                    <Input
                      id="base_url"
                      value={formData.base_url}
                      onChange={(e) => handleInputChange('base_url', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_version">Versão da API *</Label>
                    <Input
                      id="api_version"
                      value={formData.api_version}
                      onChange={(e) => handleInputChange('api_version', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empresa_nome">Nome da Empresa</Label>
                      <Input
                        id="empresa_nome"
                        value={formData.empresa_nome}
                        onChange={(e) => handleInputChange('empresa_nome', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_cnpj">CNPJ</Label>
                      <Input
                        id="empresa_cnpj"
                        value={formData.empresa_cnpj}
                        onChange={(e) => handleInputChange('empresa_cnpj', e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_email">E-mail</Label>
                      <Input
                        id="empresa_email"
                        type="email"
                        value={formData.empresa_email}
                        onChange={(e) => handleInputChange('empresa_email', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_telefone">Telefone</Label>
                      <Input
                        id="empresa_telefone"
                        value={formData.empresa_telefone}
                        onChange={(e) => handleInputChange('empresa_telefone', e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Configuração ativa
                  </Label>
                </div>

                <div className="flex justify-end space-x-2">
                  {configuracao && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      loadConfiguracao();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Informações */}
        {!configuracao && !showForm && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Como obter sua chave de API Flash:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Acesse <a href="https://hros.flashapp.com.br/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">hros.flashapp.com.br</a></li>
                <li>Vá em <strong>Configurações &gt; Plataforma &gt; Chaves de acesso programático</strong></li>
                <li>Gere uma nova chave de API</li>
                <li>Copie a chave e cole no formulário acima</li>
              </ol>
              <p className="mt-2 text-sm">
                Para mais informações, consulte a{' '}
                <a 
                  href="https://docs.api.flashapp.services/Geral/Introducao" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  documentação oficial da Flash API
                </a>
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </RequireModule>
  );
}

export default ConfiguracaoFlashPage;
