import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Settings, Clock, Users, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { timeRecordSignatureService, TimeRecordSignatureConfig } from '@/services/rh/timeRecordSignatureService';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';

// Removido interface duplicada - usando a do service

export default function TimeRecordSignatureConfigPage() {
  const [config, setConfig] = useState<TimeRecordSignatureConfig>({
    company_id: '',
    is_enabled: false,
    signature_period_days: 5,
    reminder_days: 3,
    require_manager_approval: true,
    auto_close_month: true,
  });

  // Log do estado inicial
  console.log('🏗️ [DEBUG] Estado inicial da configuração:', config);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiTenancy();

  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect executado');
    console.log('🔄 [DEBUG] currentCompany?.id:', currentCompany?.id);
    if (currentCompany?.id) {
      console.log('🔄 [DEBUG] Chamando loadConfig');
      loadConfig();
    } else {
      console.log('🔄 [DEBUG] currentCompany não disponível ainda');
    }
  }, [currentCompany?.id]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      console.log('🔍 [DEBUG] Iniciando loadConfig');
      console.log('🔍 [DEBUG] currentCompany:', currentCompany);
      
      if (!currentCompany?.id) {
        console.log('❌ [ERROR] Empresa não selecionada');
        toast({
          title: 'Erro',
          description: 'Empresa não selecionada.',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔍 [DEBUG] Buscando configuração para companyId:', currentCompany.id);
      const response = await timeRecordSignatureService.getConfig(currentCompany.id);
      console.log('✅ [SUCCESS] Configuração carregada:', response);
      setConfig(response);
    } catch (error) {
      console.error('❌ [ERROR] Erro ao carregar configuração:', error);
      
      // Se não existe configuração, criar uma padrão
      if (currentCompany?.id) {
        console.log('🔧 [FALLBACK] Criando configuração padrão para companyId:', currentCompany.id);
        const defaultConfig = {
          company_id: currentCompany.id,
          is_enabled: false,
          signature_period_days: 5,
          reminder_days: 3,
          require_manager_approval: true,
          auto_close_month: true,
        };
        console.log('🔧 [FALLBACK] Configuração padrão criada:', defaultConfig);
        setConfig(defaultConfig);
      }
    } finally {
      setLoading(false);
      console.log('🏁 [DEBUG] loadConfig finalizado');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 [DEBUG] Iniciando handleSave');
      console.log('💾 [DEBUG] Config atual:', config);
      console.log('💾 [DEBUG] currentCompany:', currentCompany);
      
      if (!currentCompany?.id) {
        console.log('❌ [ERROR] Empresa não selecionada no save');
        toast({
          title: 'Erro',
          description: 'Empresa não selecionada.',
          variant: 'destructive',
        });
        return;
      }

      const configToSave = {
        ...config,
        company_id: currentCompany.id,
      };
      console.log('💾 [DEBUG] Configuração a ser salva:', configToSave);

      const result = await timeRecordSignatureService.updateConfig(configToSave);
      console.log('✅ [SUCCESS] Configuração salva com sucesso:', result);
      
      toast({
        title: 'Sucesso',
        description: 'Configuração salva com sucesso!',
      });
    } catch (error) {
      console.error('❌ [ERROR] Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      console.log('🏁 [DEBUG] handleSave finalizado');
    }
  };

  const handleToggle = (field: keyof TimeRecordSignatureConfig) => {
    console.log('🔄 [DEBUG] handleToggle chamado para field:', field);
    console.log('🔄 [DEBUG] Valor atual:', config[field]);
    
    setConfig(prev => {
      const newValue = !prev[field];
      console.log('🔄 [DEBUG] Novo valor:', newValue);
      const newConfig = {
        ...prev,
        [field]: newValue
      };
      console.log('🔄 [DEBUG] Nova configuração:', newConfig);
      return newConfig;
    });
  };

  const handleInputChange = (field: keyof TimeRecordSignatureConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de Assinatura de Ponto</h1>
          <p className="text-muted-foreground">
            Configure as regras para assinatura de registros de ponto mensais
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Configuração Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Habilitar Assinatura de Ponto</Label>
                <p className="text-sm text-muted-foreground">
                  Ativa o sistema de assinatura de registros de ponto
                </p>
              </div>
              <Switch
                id="enabled"
                checked={config.is_enabled}
                onCheckedChange={() => handleToggle('is_enabled')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_close">Fechamento Automático do Mês</Label>
                <p className="text-sm text-muted-foreground">
                  Gera automaticamente as assinaturas no início do mês seguinte
                </p>
              </div>
              <Switch
                id="auto_close"
                checked={config.auto_close_month}
                onCheckedChange={() => handleToggle('auto_close_month')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Prazo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Configurações de Prazo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signature_period">Período para Assinatura (dias)</Label>
                <Input
                  id="signature_period"
                  type="number"
                  min="1"
                  max="30"
                  value={config.signature_period_days}
                  onChange={(e) => handleInputChange('signature_period_days', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Quantos dias após o fechamento do mês para assinar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_days">Dias para Lembrete</Label>
                <Input
                  id="reminder_days"
                  type="number"
                  min="1"
                  max="10"
                  value={config.reminder_days}
                  onChange={(e) => handleInputChange('reminder_days', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Quantos dias antes do vencimento enviar lembrete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Aprovação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Configurações de Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="manager_approval">Exigir Aprovação do Gestor</Label>
                <p className="text-sm text-muted-foreground">
                  Assinaturas precisam ser aprovadas pelo gestor imediato
                </p>
              </div>
              <Switch
                id="manager_approval"
                checked={config.require_manager_approval}
                onCheckedChange={() => handleToggle('require_manager_approval')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações Importantes */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Esta funcionalidade está em conformidade com a Portaria 671/2021, 
            que permite a assinatura eletrônica de registros de ponto. As assinaturas são criptografadas 
            e incluem timestamp, IP e user agent para auditoria.
          </AlertDescription>
        </Alert>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}