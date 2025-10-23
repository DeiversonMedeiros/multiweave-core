import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Settings, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompany } from '@/lib/company-context';
import { usePayrollConfig } from '@/hooks/rh/usePayrollCalculation';
import { toast } from 'sonner';
import { RequireEntity } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';

interface PayrollConfigFormData {
  codigo: string;
  descricao: string;
  ativo: boolean;
  ano_vigencia: number;
  mes_vigencia: number;
  dias_uteis_mes: number;
  horas_dia_trabalho: number;
  percentual_hora_extra: number;
  percentual_hora_noturna: number;
  percentual_dsr: number;
  aplicar_inss: boolean;
  aplicar_irrf: boolean;
  aplicar_fgts: boolean;
  aplicar_vale_transporte: boolean;
  percentual_vale_transporte: number;
  aplicar_adicional_noturno: boolean;
  percentual_adicional_noturno: number;
  aplicar_periculosidade: boolean;
  percentual_periculosidade: number;
  aplicar_insalubridade: boolean;
  grau_insalubridade: 'minimo' | 'medio' | 'maximo';
  aplicar_ferias_proporcionais: boolean;
  aplicar_terco_ferias: boolean;
  aplicar_13_salario: boolean;
  desconto_faltas: boolean;
  desconto_atrasos: boolean;
  tolerancia_atraso_minutos: number;
  arredondar_centavos: boolean;
  tipo_arredondamento: 'matematico' | 'para_cima' | 'para_baixo';
  observacoes?: string;
}

export default function PayrollConfigPage() {
  const { selectedCompany } = useCompany();
  const { canEditEntity } = usePermissions();
  const [formData, setFormData] = useState<PayrollConfigFormData>({
    codigo: '',
    descricao: '',
    ativo: true,
    ano_vigencia: new Date().getFullYear(),
    mes_vigencia: new Date().getMonth() + 1,
    dias_uteis_mes: 22,
    horas_dia_trabalho: 8.0,
    percentual_hora_extra: 0.5,
    percentual_hora_noturna: 0.2,
    percentual_dsr: 0.0455,
    aplicar_inss: true,
    aplicar_irrf: true,
    aplicar_fgts: true,
    aplicar_vale_transporte: true,
    percentual_vale_transporte: 0.06,
    aplicar_adicional_noturno: true,
    percentual_adicional_noturno: 0.2,
    aplicar_periculosidade: false,
    percentual_periculosidade: 0.3,
    aplicar_insalubridade: false,
    grau_insalubridade: 'medio',
    aplicar_ferias_proporcionais: true,
    aplicar_terco_ferias: true,
    aplicar_13_salario: true,
    desconto_faltas: true,
    desconto_atrasos: true,
    tolerancia_atraso_minutos: 5,
    arredondar_centavos: true,
    tipo_arredondamento: 'matematico',
    observacoes: ''
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Carregar configuração existente
  const { data: existingConfig, isLoading } = usePayrollConfig(
    formData.mes_vigencia,
    formData.ano_vigencia
  );

  useEffect(() => {
    if (existingConfig) {
      setFormData(existingConfig);
    }
  }, [existingConfig]);

  const handleInputChange = (field: keyof PayrollConfigFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // TODO: Implementar chamada para salvar configuração
      // await savePayrollConfig(selectedCompany.id, formData);
      
      // Simular salvamento por enquanto
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (existingConfig) {
      setFormData(existingConfig);
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        ativo: true,
        ano_vigencia: new Date().getFullYear(),
        mes_vigencia: new Date().getMonth() + 1,
        dias_uteis_mes: 22,
        horas_dia_trabalho: 8.0,
        percentual_hora_extra: 0.5,
        percentual_hora_noturna: 0.2,
        percentual_dsr: 0.0455,
        aplicar_inss: true,
        aplicar_irrf: true,
        aplicar_fgts: true,
        aplicar_vale_transporte: true,
        percentual_vale_transporte: 0.06,
        aplicar_adicional_noturno: true,
        percentual_adicional_noturno: 0.2,
        aplicar_periculosidade: false,
        percentual_periculosidade: 0.3,
        aplicar_insalubridade: false,
        grau_insalubridade: 'medio',
        aplicar_ferias_proporcionais: true,
        aplicar_terco_ferias: true,
        aplicar_13_salario: true,
        desconto_faltas: true,
        desconto_atrasos: true,
        tolerancia_atraso_minutos: 5,
        arredondar_centavos: true,
        tipo_arredondamento: 'matematico',
        observacoes: ''
      });
    }
    setMessage(null);
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para acessar as configurações</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <RequireEntity entityName="payroll_config" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações de Folha de Pagamento</h1>
            <p className="text-muted-foreground">
              Configure os parâmetros para cálculo de folha de pagamento
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
            <Button onClick={handleSave} disabled={saving || !canEditEntity}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
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

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="impostos">Impostos</TabsTrigger>
            <TabsTrigger value="adicionais">Adicionais</TabsTrigger>
            <TabsTrigger value="avancado">Avançado</TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Informações básicas e período de vigência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => handleInputChange('codigo', e.target.value)}
                      placeholder="Ex: CONFIG_2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => handleInputChange('descricao', e.target.value)}
                      placeholder="Ex: Configuração 2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ano_vigencia">Ano de Vigência</Label>
                    <Select
                      value={formData.ano_vigencia.toString()}
                      onValueChange={(value) => handleInputChange('ano_vigencia', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mes_vigencia">Mês de Vigência</Label>
                    <Select
                      value={formData.mes_vigencia.toString()}
                      onValueChange={(value) => handleInputChange('mes_vigencia', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ativo">Ativo</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        checked={formData.ativo}
                        onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                      />
                      <Label htmlFor="ativo">{formData.ativo ? 'Sim' : 'Não'}</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parâmetros de Cálculo</CardTitle>
                <CardDescription>
                  Configurações básicas para cálculo de horas e dias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dias_uteis_mes">Dias Úteis no Mês</Label>
                    <Input
                      id="dias_uteis_mes"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dias_uteis_mes}
                      onChange={(e) => handleInputChange('dias_uteis_mes', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas_dia_trabalho">Horas por Dia de Trabalho</Label>
                    <Input
                      id="horas_dia_trabalho"
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      value={formData.horas_dia_trabalho}
                      onChange={(e) => handleInputChange('horas_dia_trabalho', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentual_hora_extra">% Hora Extra</Label>
                    <Input
                      id="percentual_hora_extra"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.percentual_hora_extra}
                      onChange={(e) => handleInputChange('percentual_hora_extra', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentual_hora_noturna">% Hora Noturna</Label>
                    <Input
                      id="percentual_hora_noturna"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.percentual_hora_noturna}
                      onChange={(e) => handleInputChange('percentual_hora_noturna', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentual_dsr">% DSR</Label>
                    <Input
                      id="percentual_dsr"
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={formData.percentual_dsr}
                      onChange={(e) => handleInputChange('percentual_dsr', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Impostos */}
          <TabsContent value="impostos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Impostos</CardTitle>
                <CardDescription>
                  Configure quais impostos devem ser aplicados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_inss">Aplicar INSS</Label>
                        <p className="text-sm text-muted-foreground">Contribuição previdenciária</p>
                      </div>
                      <Switch
                        id="aplicar_inss"
                        checked={formData.aplicar_inss}
                        onCheckedChange={(checked) => handleInputChange('aplicar_inss', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_irrf">Aplicar IRRF</Label>
                        <p className="text-sm text-muted-foreground">Imposto de renda retido na fonte</p>
                      </div>
                      <Switch
                        id="aplicar_irrf"
                        checked={formData.aplicar_irrf}
                        onCheckedChange={(checked) => handleInputChange('aplicar_irrf', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_fgts">Aplicar FGTS</Label>
                        <p className="text-sm text-muted-foreground">Fundo de garantia do tempo de serviço</p>
                      </div>
                      <Switch
                        id="aplicar_fgts"
                        checked={formData.aplicar_fgts}
                        onCheckedChange={(checked) => handleInputChange('aplicar_fgts', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_vale_transporte">Aplicar Vale Transporte</Label>
                        <p className="text-sm text-muted-foreground">Desconto de vale transporte</p>
                      </div>
                      <Switch
                        id="aplicar_vale_transporte"
                        checked={formData.aplicar_vale_transporte}
                        onCheckedChange={(checked) => handleInputChange('aplicar_vale_transporte', checked)}
                      />
                    </div>

                    {formData.aplicar_vale_transporte && (
                      <div className="space-y-2">
                        <Label htmlFor="percentual_vale_transporte">% Vale Transporte</Label>
                        <Input
                          id="percentual_vale_transporte"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={formData.percentual_vale_transporte}
                          onChange={(e) => handleInputChange('percentual_vale_transporte', parseFloat(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Adicionais */}
          <TabsContent value="adicionais" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adicionais e Benefícios</CardTitle>
                <CardDescription>
                  Configure adicionais e benefícios trabalhistas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_adicional_noturno">Adicional Noturno</Label>
                        <p className="text-sm text-muted-foreground">Adicional para trabalho noturno</p>
                      </div>
                      <Switch
                        id="aplicar_adicional_noturno"
                        checked={formData.aplicar_adicional_noturno}
                        onCheckedChange={(checked) => handleInputChange('aplicar_adicional_noturno', checked)}
                      />
                    </div>

                    {formData.aplicar_adicional_noturno && (
                      <div className="space-y-2">
                        <Label htmlFor="percentual_adicional_noturno">% Adicional Noturno</Label>
                        <Input
                          id="percentual_adicional_noturno"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={formData.percentual_adicional_noturno}
                          onChange={(e) => handleInputChange('percentual_adicional_noturno', parseFloat(e.target.value))}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_periculosidade">Periculosidade</Label>
                        <p className="text-sm text-muted-foreground">Adicional de periculosidade</p>
                      </div>
                      <Switch
                        id="aplicar_periculosidade"
                        checked={formData.aplicar_periculosidade}
                        onCheckedChange={(checked) => handleInputChange('aplicar_periculosidade', checked)}
                      />
                    </div>

                    {formData.aplicar_periculosidade && (
                      <div className="space-y-2">
                        <Label htmlFor="percentual_periculosidade">% Periculosidade</Label>
                        <Input
                          id="percentual_periculosidade"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={formData.percentual_periculosidade}
                          onChange={(e) => handleInputChange('percentual_periculosidade', parseFloat(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_insalubridade">Insalubridade</Label>
                        <p className="text-sm text-muted-foreground">Adicional de insalubridade</p>
                      </div>
                      <Switch
                        id="aplicar_insalubridade"
                        checked={formData.aplicar_insalubridade}
                        onCheckedChange={(checked) => handleInputChange('aplicar_insalubridade', checked)}
                      />
                    </div>

                    {formData.aplicar_insalubridade && (
                      <div className="space-y-2">
                        <Label htmlFor="grau_insalubridade">Grau de Insalubridade</Label>
                        <Select
                          value={formData.grau_insalubridade}
                          onValueChange={(value) => handleInputChange('grau_insalubridade', value as 'minimo' | 'medio' | 'maximo')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimo">Mínimo</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="maximo">Máximo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_ferias_proporcionais">Férias Proporcionais</Label>
                        <p className="text-sm text-muted-foreground">Calcular férias proporcionais</p>
                      </div>
                      <Switch
                        id="aplicar_ferias_proporcionais"
                        checked={formData.aplicar_ferias_proporcionais}
                        onCheckedChange={(checked) => handleInputChange('aplicar_ferias_proporcionais', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_terco_ferias">1/3 de Férias</Label>
                        <p className="text-sm text-muted-foreground">Calcular terço de férias</p>
                      </div>
                      <Switch
                        id="aplicar_terco_ferias"
                        checked={formData.aplicar_terco_ferias}
                        onCheckedChange={(checked) => handleInputChange('aplicar_terco_ferias', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="aplicar_13_salario">13º Salário</Label>
                        <p className="text-sm text-muted-foreground">Calcular décimo terceiro salário</p>
                      </div>
                      <Switch
                        id="aplicar_13_salario"
                        checked={formData.aplicar_13_salario}
                        onCheckedChange={(checked) => handleInputChange('aplicar_13_salario', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Avançado */}
          <TabsContent value="avancado" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
                <CardDescription>
                  Configurações de descontos e arredondamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="desconto_faltas">Desconto por Faltas</Label>
                        <p className="text-sm text-muted-foreground">Descontar faltas não justificadas</p>
                      </div>
                      <Switch
                        id="desconto_faltas"
                        checked={formData.desconto_faltas}
                        onCheckedChange={(checked) => handleInputChange('desconto_faltas', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="desconto_atrasos">Desconto por Atrasos</Label>
                        <p className="text-sm text-muted-foreground">Descontar atrasos</p>
                      </div>
                      <Switch
                        id="desconto_atrasos"
                        checked={formData.desconto_atrasos}
                        onCheckedChange={(checked) => handleInputChange('desconto_atrasos', checked)}
                      />
                    </div>

                    {formData.desconto_atrasos && (
                      <div className="space-y-2">
                        <Label htmlFor="tolerancia_atraso_minutos">Tolerância para Atraso (min)</Label>
                        <Input
                          id="tolerancia_atraso_minutos"
                          type="number"
                          min="0"
                          max="60"
                          value={formData.tolerancia_atraso_minutos}
                          onChange={(e) => handleInputChange('tolerancia_atraso_minutos', parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="arredondar_centavos">Arredondar Centavos</Label>
                        <p className="text-sm text-muted-foreground">Arredondar valores para centavos</p>
                      </div>
                      <Switch
                        id="arredondar_centavos"
                        checked={formData.arredondar_centavos}
                        onCheckedChange={(checked) => handleInputChange('arredondar_centavos', checked)}
                      />
                    </div>

                    {formData.arredondar_centavos && (
                      <div className="space-y-2">
                        <Label htmlFor="tipo_arredondamento">Tipo de Arredondamento</Label>
                        <Select
                          value={formData.tipo_arredondamento}
                          onValueChange={(value) => handleInputChange('tipo_arredondamento', value as 'matematico' | 'para_cima' | 'para_baixo')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="matematico">Matemático</SelectItem>
                            <SelectItem value="para_cima">Para Cima</SelectItem>
                            <SelectItem value="para_baixo">Para Baixo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes || ''}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Observações adicionais sobre a configuração..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequireEntity>
  );
}
