// =====================================================
// MODAL DE SOLICITAÇÃO DE LOGÍSTICA
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useCreateLogisticsRequest, useCheckTripConflict } from '@/hooks/logistica/useLogisticaData';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { useProjects } from '@/hooks/useProjects';
import { useCostCenters } from '@/hooks/useCostCenters';
import { TransportType, RequestingSector, LogisticsRequestFormData } from '@/types/logistica';
import { format } from 'date-fns';

// Schema de validação baseado no formulário Google Forms
const solicitarLogisticaSchema = z.object({
  // Informações básicas
  numero_solicitacao: z.string().optional(), // Será gerado automaticamente se não fornecido
  tipo_transporte: z.enum(['terrestre', 'fluvial', 'aereo', 'logistica_reversa_claro']),
  
  // Datas
  previsao_envio: z.string().min(1, 'Previsão de envio é obrigatória'),
  prazo_destino: z.string().min(1, 'Prazo destino é obrigatório'),
  km_estimado: z.number().optional(),
  
  // Endereços
  endereco_retirada: z.string().min(1, 'Endereço de retirada é obrigatório'),
  endereco_entrega: z.string().min(1, 'Endereço de entrega é obrigatório'),
  cep_retirada: z.string().optional(),
  cep_entrega: z.string().optional(),
  
  // Responsáveis
  nome_responsavel_remetente: z.string().min(1, 'Nome do responsável remetente é obrigatório'),
  cpf_responsavel_remetente: z.string().optional(),
  telefone_responsavel_remetente: z.string().min(1, 'Telefone do responsável remetente é obrigatório'),
  nome_responsavel_destinatario: z.string().min(1, 'Nome do responsável destinatário é obrigatório'),
  cpf_responsavel_destinatario: z.string().optional(),
  telefone_responsavel_destinatario: z.string().optional(),
  
  // Dimensões e peso
  peso: z.number().optional(),
  largura: z.number().optional(),
  altura: z.number().optional(),
  comprimento: z.number().optional(),
  quantidade_volumes: z.number().int().optional(),
  
  // Vínculos
  project_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  
  // Informações adicionais
  servico: z.string().optional(), // Alterado de segmento para servico
  cliente: z.string().optional(),
  observacoes: z.string().optional(),
  
  // Campos para viagem (dia e horário)
  vehicle_id: z.string().min(1, 'Veículo é obrigatório'),
  data_saida: z.string().min(1, 'Data de saída é obrigatória'),
  hora_saida: z.string().optional(),
});

type SolicitarLogisticaFormData = z.infer<typeof solicitarLogisticaSchema>;

interface SolicitarLogisticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedVehicleId?: string;
}

export function SolicitarLogisticaModal({
  isOpen,
  onClose,
  selectedDate,
  selectedVehicleId,
}: SolicitarLogisticaModalProps) {
  const createRequest = useCreateLogisticsRequest();
  const checkConflict = useCheckTripConflict();
  const { data: vehicles } = useVehicles();
  const { data: projectsData } = useProjects();
  const { data: costCentersData } = useCostCenters();
  
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Definir projetos e centros de custo antes de usar no useMemo
  const projects = projectsData?.data || [];
  const costCenters = costCentersData?.data || [];

  const form = useForm<SolicitarLogisticaFormData>({
    resolver: zodResolver(solicitarLogisticaSchema),
    defaultValues: {
      numero_solicitacao: '',
      tipo_transporte: 'terrestre',
      previsao_envio: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      prazo_destino: '',
      km_estimado: undefined as any, // Permitir undefined mas garantir que seja controlado
      endereco_retirada: '',
      endereco_entrega: '',
      cep_retirada: '',
      cep_entrega: '',
      nome_responsavel_remetente: '',
      cpf_responsavel_remetente: '',
      telefone_responsavel_remetente: '',
      nome_responsavel_destinatario: '',
      cpf_responsavel_destinatario: '',
      telefone_responsavel_destinatario: '',
      peso: undefined as any,
      largura: undefined as any,
      altura: undefined as any,
      comprimento: undefined as any,
      quantidade_volumes: undefined as any,
      project_id: '',
      cost_center_id: '',
      servico: '',
      cliente: '',
      observacoes: '',
      vehicle_id: selectedVehicleId || '',
      data_saida: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      hora_saida: '',
    },
  });

  // Observar mudanças no centro de custo para filtrar projetos e limpar projeto selecionado
  const selectedCostCenterId = form.watch('cost_center_id');
  
  useEffect(() => {
    // Limpar projeto quando centro de custo mudar
    if (!selectedCostCenterId) {
      form.setValue('project_id', '');
    }
  }, [selectedCostCenterId, form]);

  // Filtrar projetos baseado no centro de custo selecionado
  const availableProjects = useMemo(() => {
    if (!selectedCostCenterId) return [];
    return projects.filter((project) => project.cost_center_id === selectedCostCenterId);
  }, [projects, selectedCostCenterId]);

  // Atualizar valores quando selectedDate ou selectedVehicleId mudarem
  useEffect(() => {
    if (selectedDate) {
      form.setValue('previsao_envio', format(selectedDate, 'yyyy-MM-dd'));
      form.setValue('data_saida', format(selectedDate, 'yyyy-MM-dd'));
    }
    if (selectedVehicleId) {
      form.setValue('vehicle_id', selectedVehicleId);
    }
  }, [selectedDate, selectedVehicleId, form]);

  // Validar conflito quando veículo, data ou horário mudarem
  // Usar watch com subscribe para evitar re-renders desnecessários
  const vehicleId = form.watch('vehicle_id');
  const dataSaida = form.watch('data_saida');
  const horaSaida = form.watch('hora_saida');

  useEffect(() => {
    // Só verificar se temos os campos obrigatórios e o modal está aberto
    if (!vehicleId || !dataSaida || !isOpen) {
      return;
    }

    // Debounce de 500ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(async () => {
      setIsCheckingConflict(true);
      setConflictError(null);
      
      try {
        const result = await checkConflict.mutateAsync({
          vehicle_id: vehicleId,
          data_saida: dataSaida,
          hora_saida: horaSaida || undefined,
        });

        if (result.has_conflict) {
          setConflictError(
            `⚠️ Conflito detectado! O veículo já possui uma viagem agendada para ${dataSaida}${horaSaida ? ` às ${horaSaida}` : ''}. Solicitação: ${result.conflicting_trip_numero || 'N/A'}`
          );
        }
      } catch (error) {
        // Ignorar erros de validação silenciosamente
      } finally {
        setIsCheckingConflict(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // Remover checkConflict das dependências para evitar loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, dataSaida, horaSaida, isOpen]);

  const onSubmit = async (data: SolicitarLogisticaFormData) => {
    // Verificar conflito novamente antes de submeter
    if (data.vehicle_id && data.data_saida) {
      try {
        const conflictResult = await checkConflict.mutateAsync({
          vehicle_id: data.vehicle_id,
          data_saida: data.data_saida,
          hora_saida: data.hora_saida || undefined,
        });

        if (conflictResult.has_conflict) {
          setConflictError(
            `⚠️ Conflito detectado! O veículo já possui uma viagem agendada para ${data.data_saida}${data.hora_saida ? ` às ${data.hora_saida}` : ''}. Solicitação: ${conflictResult.conflicting_trip_numero || 'N/A'}`
          );
          return;
        }
      } catch (error: any) {
        setConflictError('Erro ao verificar conflitos: ' + error.message);
        return;
      }
    }

    // Preparar dados para criação da solicitação
    // Nota: numero_solicitacao será gerado automaticamente pelo trigger se não fornecido
    // setor_solicitante será 'na' por padrão (removido do formulário)
    const requestData: LogisticsRequestFormData = {
      tipo_transporte: data.tipo_transporte as TransportType,
      setor_solicitante: 'na' as RequestingSector, // Valor padrão já que foi removido do formulário
      previsao_envio: data.previsao_envio,
      prazo_destino: data.prazo_destino,
      km_estimado: data.km_estimado,
      endereco_retirada: data.endereco_retirada,
      endereco_entrega: data.endereco_entrega,
      cep_retirada: data.cep_retirada || undefined,
      cep_entrega: data.cep_entrega || undefined,
      nome_responsavel_remetente: data.nome_responsavel_remetente,
      cpf_responsavel_remetente: data.cpf_responsavel_remetente || undefined,
      telefone_responsavel_remetente: data.telefone_responsavel_remetente,
      nome_responsavel_destinatario: data.nome_responsavel_destinatario,
      cpf_responsavel_destinatario: data.cpf_responsavel_destinatario || undefined,
      telefone_responsavel_destinatario: data.telefone_responsavel_destinatario || undefined,
      peso: data.peso,
      largura: data.largura,
      altura: data.altura,
      comprimento: data.comprimento,
      quantidade_volumes: data.quantidade_volumes,
      project_id: data.project_id || undefined,
      cost_center_id: data.cost_center_id || undefined,
      segmento: data.servico || undefined, // Mapear servico para segmento no backend
      cliente: data.cliente || undefined,
      observacoes: data.observacoes || undefined,
    };

    try {
      await createRequest.mutateAsync(requestData);
      form.reset();
      setConflictError(null);
      onClose();
    } catch (error) {
      // Erro já é tratado pelo hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Logística</DialogTitle>
          <DialogDescription>
            Preencha todos os campos obrigatórios. Em caso de não haver necessidade da informação, escreva "NA".
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {conflictError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{conflictError}</AlertDescription>
              </Alert>
            )}

            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_solicitacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Solicitação</FormLabel>
                      <FormControl>
                        <Input 
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="Será gerado automaticamente" 
                          disabled 
                          readOnly
                        />
                      </FormControl>
                      <FormDescription>
                        Gerado automaticamente pelo sistema
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_transporte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Transporte *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="terrestre">Terrestre</SelectItem>
                          <SelectItem value="fluvial">Fluvial</SelectItem>
                          <SelectItem value="aereo">Aéreo</SelectItem>
                          <SelectItem value="logistica_reversa_claro">Logística Reversa Claro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Datas e Veículo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Datas e Veículo</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="previsao_envio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previsão de Envio *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prazo_destino"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo Destino *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_saida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Saída *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hora_saida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Saída</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        {isCheckingConflict && 'Verificando conflitos...'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veículo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o veículo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.placa} {vehicle.modelo && `- ${vehicle.modelo}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="km_estimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM Estimado</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereços */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Endereços</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="endereco_retirada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Retirada com CEP *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Endereço completo com CEP" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco_entrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Entrega com CEP *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Endereço completo com CEP" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cep_retirada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP Retirada</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00000-000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep_entrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP Entrega</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00000-000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Responsáveis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Responsáveis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="nome_responsavel_remetente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Responsável Remetente *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf_responsavel_remetente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF Responsável Remetente</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000.000.000-00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone_responsavel_remetente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone Responsável Remetente *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(00) 00000-0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="nome_responsavel_destinatario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Responsável Destinatário *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf_responsavel_destinatario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF Responsável Destinatário</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000.000.000-00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone_responsavel_destinatario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone Responsável Destinatário</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(00) 00000-0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dimensões e Peso */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dimensões e Peso</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <FormField
                  control={form.control}
                  name="peso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="largura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Largura (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="altura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comprimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comprimento (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidade_volumes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade de Volumes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Adicionais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual é o Serviço?</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Serviço" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual Cliente?</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cliente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cost_center_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Custo</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === '' ? undefined : value)} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o centro de custo (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {costCenters.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {cc.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecione o centro de custo para habilitar a seleção de projeto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === '' ? undefined : value)} 
                        value={field.value || ''}
                        disabled={!selectedCostCenterId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue 
                              placeholder={
                                selectedCostCenterId 
                                  ? "Selecione o projeto (opcional)" 
                                  : "Selecione primeiro o centro de custo"
                              } 
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {selectedCostCenterId 
                          ? "Projetos disponíveis para o centro de custo selecionado"
                          : "Selecione um centro de custo primeiro para habilitar projetos"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Observações adicionais..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={createRequest.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRequest.isPending || !!conflictError}>
                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

