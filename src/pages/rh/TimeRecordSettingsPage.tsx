import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Clock, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompany } from '@/lib/company-context';
import { useTimeRecordSettings } from '@/hooks/rh/useTimeRecordSettings';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';
import { RequireEntity } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';

export default function TimeRecordSettingsPage() {
  const { selectedCompany } = useCompany();
  const { canEditEntity } = usePermissions();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useTimeRecordSettings();
  
  const [janelaTempo, setJanelaTempo] = useState<number>(settings?.janela_tempo_marcacoes || 24);

  // Atualizar estado quando settings mudar
  React.useEffect(() => {
    if (settings) {
      setJanelaTempo(settings.janela_tempo_marcacoes);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (janela: number) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      if (settings?.id) {
        // Atualizar
        await EntityService.update({
          schema: 'rh',
          table: 'time_record_settings',
          companyId: selectedCompany.id,
          id: settings.id,
          data: { janela_tempo_marcacoes: janela }
        });
      } else {
        // Criar
        await EntityService.create({
          schema: 'rh',
          table: 'time_record_settings',
          companyId: selectedCompany.id,
          data: {
            company_id: selectedCompany.id,
            janela_tempo_marcacoes: janela
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-record-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const handleSave = () => {
    if (!canEditEntity('time_record_settings')) {
      toast.error('Você não tem permissão para atualizar essas configurações');
      return;
    }
    saveMutation.mutate(janelaTempo);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RequireEntity entityName="time_record_settings" action="read">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações de Ponto Eletrônico</h1>
          <p className="text-gray-600 mt-2">
            Configure as regras de registro de ponto para sua empresa
          </p>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Como funciona a janela de tempo:</strong>
            <br />
            A janela de tempo define por quanto tempo as marcações podem ser registradas após a primeira marcação do dia.
            Após esse período, a próxima marcação será considerada como a primeira marcação do dia seguinte.
            <br />
            <br />
            <strong>Exemplo:</strong> Se a janela for de 24 horas e o funcionário registrou entrada às 08:00 do dia 17/11,
            ele pode registrar todas as marcações (almoço, saída, etc.) até às 08:00 do dia 18/11.
            Após esse horário, a próxima marcação será considerada como entrada do dia 18/11.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Janela de Tempo para Marcações
            </CardTitle>
            <CardDescription>
              Configure o período máximo (em horas) para registrar marcações após a primeira marcação do dia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="janela-tempo">Janela de Tempo (horas)</Label>
              <Select
                value={janelaTempo.toString()}
                onValueChange={(value) => setJanelaTempo(parseInt(value))}
              >
                <SelectTrigger id="janela-tempo" className="w-full">
                  <SelectValue placeholder="Selecione a janela de tempo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 horas</SelectItem>
                  <SelectItem value="22">22 horas</SelectItem>
                  <SelectItem value="24">24 horas (padrão)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Valor atual: <strong>{janelaTempo} horas</strong>
              </p>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Atenção:</strong> Alterar essa configuração afetará apenas os novos registros de ponto.
                Registros já existentes não serão alterados.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !canEditEntity('time_record_settings')}
                className="min-w-[120px]"
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireEntity>
  );
}

