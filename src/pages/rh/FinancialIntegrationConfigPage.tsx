import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCompany } from '@/lib/company-context';
import { useIntegrationConfig, useSaveIntegrationConfig } from '@/hooks/rh/useFinancialIntegration';
import { IntegrationConfig } from '@/services/rh/financialIntegrationService';
import { toast } from 'sonner';
import { Loader2, Save, Settings, DollarSign, Calendar, Tag } from 'lucide-react';
import { RequirePage } from '@/components/RequireAuth';

// =====================================================
// PÁGINA DE CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA
// =====================================================

export default function FinancialIntegrationConfigPage() {
  const { selectedCompany } = useCompany();
  const { data: config, isLoading } = useIntegrationConfig(selectedCompany?.id || '');
  const saveConfig = useSaveIntegrationConfig();

  const [formData, setFormData] = useState<IntegrationConfig>({
    autoCreateAP: true,
    defaultDueDate: 5,
    defaultCategory: 'Folha de Pagamento',
    defaultFinancialClass: 'Salários e Ordenados',
    includeBenefits: true,
    includeTaxes: true,
    costCenterMapping: {},
    departmentMapping: {}
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (field: keyof IntegrationConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    try {
      await saveConfig.mutateAsync(formData);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <RequirePage pagePath="/rh/financial-integration-config*" action="edit">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuração de Integração Financeira
          </h1>
          <p className="text-muted-foreground">
            Configure como as folhas de pagamento se integram com o módulo financeiro
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Criação Automática de Contas a Pagar
              </CardTitle>
              <CardDescription>
                Configure se as contas a pagar devem ser criadas automaticamente ao processar folhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Create AP */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCreateAP" className="text-base">
                    Criar contas a pagar automaticamente
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quando habilitado, o sistema criará automaticamente uma conta a pagar para cada folha processada
                  </p>
                </div>
                <Switch
                  id="autoCreateAP"
                  checked={formData.autoCreateAP}
                  onCheckedChange={(checked) => handleChange('autoCreateAP', checked)}
                />
              </div>

              {/* Default Due Date */}
              <div className="space-y-2">
                <Label htmlFor="defaultDueDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dias para vencimento padrão
                </Label>
                <Input
                  id="defaultDueDate"
                  type="number"
                  min="1"
                  value={formData.defaultDueDate}
                  onChange={(e) => handleChange('defaultDueDate', parseInt(e.target.value) || 5)}
                  disabled={!formData.autoCreateAP}
                />
                <p className="text-sm text-muted-foreground">
                  Número de dias após o processamento que a conta a pagar vencerá
                </p>
              </div>

              {/* Default Category */}
              <div className="space-y-2">
                <Label htmlFor="defaultCategory" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categoria padrão
                </Label>
                <Input
                  id="defaultCategory"
                  value={formData.defaultCategory}
                  onChange={(e) => handleChange('defaultCategory', e.target.value)}
                  disabled={!formData.autoCreateAP}
                />
                <p className="text-sm text-muted-foreground">
                  Categoria que será atribuída às contas a pagar criadas automaticamente
                </p>
              </div>

              {/* Default Financial Class */}
              <div className="space-y-2">
                <Label htmlFor="defaultFinancialClass" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Classe Financeira padrão
                </Label>
                <Input
                  id="defaultFinancialClass"
                  value={formData.defaultFinancialClass || 'Salários e Ordenados'}
                  onChange={(e) => handleChange('defaultFinancialClass', e.target.value)}
                  disabled={!formData.autoCreateAP}
                />
                <p className="text-sm text-muted-foreground">
                  Classe financeira que será atribuída às contas a pagar (usada no fluxo de aprovações)
                </p>
              </div>

              {/* Include Benefits */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeBenefits" className="text-base">
                    Incluir benefícios no cálculo
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Incluir valores de benefícios no cálculo da conta a pagar
                  </p>
                </div>
                <Switch
                  id="includeBenefits"
                  checked={formData.includeBenefits}
                  onCheckedChange={(checked) => handleChange('includeBenefits', checked)}
                  disabled={!formData.autoCreateAP}
                />
              </div>

              {/* Include Taxes */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeTaxes" className="text-base">
                    Incluir impostos no cálculo
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Incluir valores de impostos (INSS, IRRF) no cálculo da conta a pagar
                  </p>
                </div>
                <Switch
                  id="includeTaxes"
                  checked={formData.includeTaxes}
                  onCheckedChange={(checked) => handleChange('includeTaxes', checked)}
                  disabled={!formData.autoCreateAP}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="submit"
              disabled={saveConfig.isPending}
              className="flex items-center gap-2"
            >
              {saveConfig.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </RequirePage>
  );
}

