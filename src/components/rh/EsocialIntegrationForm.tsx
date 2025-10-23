import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FormModal } from './FormModal';
import { EsocialIntegration } from '@/integrations/supabase/rh-types';
import { 
  Upload, 
  Download, 
  Key, 
  Shield, 
  Settings, 
  TestTube, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================

interface EsocialIntegrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  data: Partial<EsocialIntegration>;
  onChange: (field: string, value: any) => void;
  loading?: boolean;
  editingItem?: EsocialIntegration | null;
}

interface EsocialConfig {
  // Configurações básicas
  nome: string;
  descricao: string;
  ambiente: 'homologacao' | 'producao';
  ativo: boolean;
  
  // Certificado digital
  certificado_digital: string;
  senha_certificado: string;
  tipo_certificado: 'A1' | 'A3';
  arquivo_certificado?: File;
  
  // Configurações de conexão
  url_esocial: string;
  timeout: number;
  retry_attempts: number;
  retry_delay: number;
  
  // Configurações de empresa
  cnpj_empresa: string;
  inscricao_estadual: string;
  codigo_empresa: string;
  
  // Configurações de eventos
  eventos_habilitados: string[];
  processamento_automatico: boolean;
  intervalo_processamento: number;
  
  // Configurações de notificação
  email_notificacao: string;
  notificar_sucesso: boolean;
  notificar_erro: boolean;
  notificar_retorno: boolean;
  
  // Configurações avançadas
  log_detalhado: boolean;
  backup_automatico: boolean;
  validacao_estrita: boolean;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function EsocialIntegrationForm({
  isOpen,
  onClose,
  onSubmit,
  onCancel,
  data,
  onChange,
  loading = false,
  editingItem
}: EsocialIntegrationFormProps) {
  const [config, setConfig] = useState<EsocialConfig>({
    nome: data.descricao || '',
    descricao: data.descricao || '',
    ambiente: 'homologacao',
    ativo: true,
    certificado_digital: '',
    senha_certificado: '',
    tipo_certificado: 'A1',
    url_esocial: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
    timeout: 30000,
    retry_attempts: 3,
    retry_delay: 1000,
    cnpj_empresa: '',
    inscricao_estadual: '',
    codigo_empresa: '',
    eventos_habilitados: ['S-1000', 'S-1200', 'S-2200', 'S-2299'],
    processamento_automatico: false,
    intervalo_processamento: 60,
    email_notificacao: '',
    notificar_sucesso: true,
    notificar_erro: true,
    notificar_retorno: true,
    log_detalhado: true,
    backup_automatico: true,
    validacao_estrita: true
  });

  const handleConfigChange = (field: keyof EsocialConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleConfigChange('arquivo_certificado', file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submetendo configuração eSocial:', config);
    onSubmit();
  };

  const testConnection = () => {
    console.log('Testando conexão com eSocial...');
    // Implementar teste de conexão
  };

  const validateCertificate = () => {
    console.log('Validando certificado digital...');
    // Implementar validação de certificado
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Configurar Integração eSocial' : 'Nova Integração eSocial'}
      description={editingItem ? 'Configure a integração com o eSocial' : 'Configure uma nova integração com o eSocial'}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      loading={loading}
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basico" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="certificado">Certificado</TabsTrigger>
            <TabsTrigger value="eventos">Eventos</TabsTrigger>
            <TabsTrigger value="avancado">Avançado</TabsTrigger>
          </TabsList>

          {/* ABA BÁSICO */}
          <TabsContent value="basico" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Básicas
                </CardTitle>
                <CardDescription>
                  Configure as informações básicas da integração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Integração *</Label>
                    <Input
                      id="nome"
                      value={config.nome}
                      onChange={(e) => handleConfigChange('nome', e.target.value)}
                      placeholder="Ex: Integração eSocial Principal"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ambiente">Ambiente *</Label>
                    <Select
                      value={config.ambiente}
                      onValueChange={(value) => handleConfigChange('ambiente', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">
                          <div className="flex items-center gap-2">
                            <TestTube className="h-4 w-4" />
                            Homologação
                          </div>
                        </SelectItem>
                        <SelectItem value="producao">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Produção
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={config.descricao}
                    onChange={(e) => handleConfigChange('descricao', e.target.value)}
                    placeholder="Descrição da integração eSocial"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj_empresa">CNPJ da Empresa *</Label>
                    <Input
                      id="cnpj_empresa"
                      value={config.cnpj_empresa}
                      onChange={(e) => handleConfigChange('cnpj_empresa', e.target.value)}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                    <Input
                      id="inscricao_estadual"
                      value={config.inscricao_estadual}
                      onChange={(e) => handleConfigChange('inscricao_estadual', e.target.value)}
                      placeholder="000.000.000.000"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={config.ativo}
                    onCheckedChange={(checked) => handleConfigChange('ativo', checked)}
                  />
                  <Label htmlFor="ativo">Integração Ativa</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA CERTIFICADO */}
          <TabsContent value="certificado" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Certificado Digital
                </CardTitle>
                <CardDescription>
                  Configure o certificado digital para autenticação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_certificado">Tipo de Certificado *</Label>
                    <Select
                      value={config.tipo_certificado}
                      onValueChange={(value) => handleConfigChange('tipo_certificado', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1 - Arquivo</SelectItem>
                        <SelectItem value="A3">A3 - Token/Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha_certificado">Senha do Certificado *</Label>
                    <Input
                      id="senha_certificado"
                      type="password"
                      value={config.senha_certificado}
                      onChange={(e) => handleConfigChange('senha_certificado', e.target.value)}
                      placeholder="Senha do certificado"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificado_digital">Certificado Digital *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="certificado_digital"
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={validateCertificate}>
                      <Key className="h-4 w-4 mr-2" />
                      Validar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: .pfx, .p12
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Informações sobre o Certificado:</p>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>O certificado deve estar válido e não expirado</li>
                        <li>Para A1: arquivo .pfx ou .p12</li>
                        <li>Para A3: token ou cartão conectado</li>
                        <li>O certificado deve ter permissão para eSocial</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA EVENTOS */}
          <TabsContent value="eventos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuração de Eventos
                </CardTitle>
                <CardDescription>
                  Configure quais eventos serão processados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Eventos Habilitados</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {[
                      { value: 'S-1000', label: 'S-1000 - Informações do Empregador' },
                      { value: 'S-1005', label: 'S-1005 - Tabela de Estabelecimentos' },
                      { value: 'S-1010', label: 'S-1010 - Tabela de Rubricas' },
                      { value: 'S-1020', label: 'S-1020 - Tabela de Lotações' },
                      { value: 'S-1200', label: 'S-1200 - Remuneração RGPS' },
                      { value: 'S-1202', label: 'S-1202 - Remuneração Servidor' },
                      { value: 'S-2200', label: 'S-2200 - Cadastramento Inicial' },
                      { value: 'S-2205', label: 'S-2205 - Alteração Dados' },
                      { value: 'S-2210', label: 'S-2210 - Acidente de Trabalho' },
                      { value: 'S-2220', label: 'S-2220 - Afastamento Temporário' },
                      { value: 'S-2230', label: 'S-2230 - Aposentadoria' },
                      { value: 'S-2240', label: 'S-2240 - Agentes Nocivos' },
                      { value: 'S-2250', label: 'S-2250 - Aviso Prévio' },
                      { value: 'S-2299', label: 'S-2299 - Desligamento' },
                      { value: 'S-2300', label: 'S-2300 - Trabalhador Sem Vínculo' },
                      { value: 'S-5001', label: 'S-5001 - Contribuições Sociais' },
                      { value: 'S-5002', label: 'S-5002 - IRRF' },
                      { value: 'S-5003', label: 'S-5003 - FGTS' }
                    ].map((evento) => (
                      <div key={evento.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={evento.value}
                          checked={config.eventos_habilitados.includes(evento.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleConfigChange('eventos_habilitados', [...config.eventos_habilitados, evento.value]);
                            } else {
                              handleConfigChange('eventos_habilitados', config.eventos_habilitados.filter(e => e !== evento.value));
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={evento.value} className="text-sm">
                          {evento.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="processamento_automatico"
                      checked={config.processamento_automatico}
                      onCheckedChange={(checked) => handleConfigChange('processamento_automatico', checked)}
                    />
                    <Label htmlFor="processamento_automatico">Processamento Automático</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intervalo_processamento">Intervalo (minutos)</Label>
                    <Input
                      id="intervalo_processamento"
                      type="number"
                      value={config.intervalo_processamento}
                      onChange={(e) => handleConfigChange('intervalo_processamento', parseInt(e.target.value))}
                      min="1"
                      max="1440"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA AVANÇADO */}
          <TabsContent value="avancado" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Avançadas
                </CardTitle>
                <CardDescription>
                  Configure parâmetros avançados da integração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="url_esocial">URL do eSocial</Label>
                    <Input
                      id="url_esocial"
                      value={config.url_esocial}
                      onChange={(e) => handleConfigChange('url_esocial', e.target.value)}
                      placeholder="URL do webservice eSocial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={config.timeout}
                      onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                      min="1000"
                      max="300000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retry_attempts">Tentativas de Retry</Label>
                    <Input
                      id="retry_attempts"
                      type="number"
                      value={config.retry_attempts}
                      onChange={(e) => handleConfigChange('retry_attempts', parseInt(e.target.value))}
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retry_delay">Delay entre Tentativas (ms)</Label>
                    <Input
                      id="retry_delay"
                      type="number"
                      value={config.retry_delay}
                      onChange={(e) => handleConfigChange('retry_delay', parseInt(e.target.value))}
                      min="100"
                      max="10000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_notificacao">Email para Notificações</Label>
                  <Input
                    id="email_notificacao"
                    type="email"
                    value={config.email_notificacao}
                    onChange={(e) => handleConfigChange('email_notificacao', e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>

                <div className="space-y-4">
                  <Label>Notificações</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notificar_sucesso"
                        checked={config.notificar_sucesso}
                        onCheckedChange={(checked) => handleConfigChange('notificar_sucesso', checked)}
                      />
                      <Label htmlFor="notificar_sucesso">Sucesso</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notificar_erro"
                        checked={config.notificar_erro}
                        onCheckedChange={(checked) => handleConfigChange('notificar_erro', checked)}
                      />
                      <Label htmlFor="notificar_erro">Erro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notificar_retorno"
                        checked={config.notificar_retorno}
                        onCheckedChange={(checked) => handleConfigChange('notificar_retorno', checked)}
                      />
                      <Label htmlFor="notificar_retorno">Retorno</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Configurações de Sistema</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="log_detalhado"
                        checked={config.log_detalhado}
                        onCheckedChange={(checked) => handleConfigChange('log_detalhado', checked)}
                      />
                      <Label htmlFor="log_detalhado">Log Detalhado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="backup_automatico"
                        checked={config.backup_automatico}
                        onCheckedChange={(checked) => handleConfigChange('backup_automatico', checked)}
                      />
                      <Label htmlFor="backup_automatico">Backup Automático</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="validacao_estrita"
                        checked={config.validacao_estrita}
                        onCheckedChange={(checked) => handleConfigChange('validacao_estrita', checked)}
                      />
                      <Label htmlFor="validacao_estrita">Validação Estrita</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={testConnection}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </Button>
                  <Button type="button" variant="outline" onClick={validateCertificate}>
                    <Shield className="h-4 w-4 mr-2" />
                    Validar Certificado
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </FormModal>
  );
}

export default EsocialIntegrationForm;
