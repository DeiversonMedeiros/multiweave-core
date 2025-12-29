import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useGasStations } from '@/hooks/combustivel/useCombustivel';
import { useFuelTypes } from '@/hooks/combustivel/useCombustivel';
import type { RefuelRequest, RefuelRecordFormData } from '@/types/combustivel';

const refuelRecordSchema = z.object({
  data_abastecimento: z.string().min(1, 'Data é obrigatória'),
  hora_abastecimento: z.string().optional(),
  posto_id: z.string().optional().nullable(),
  posto_nome: z.string().optional(),
  tipo_combustivel_id: z.string().optional().nullable(),
  litros: z.number().min(0.01, 'Litros devem ser maiores que zero'),
  valor_total: z.number().min(0.01, 'Valor deve ser maior que zero'),
  km_anterior: z.number().min(0).optional().nullable(),
  km_atual: z.number().min(0, 'KM atual é obrigatório'),
  tipo_pagamento: z.enum(['cartao_combustivel', 'reembolso', 'fatura', 'outros']).optional(),
  comprovante_url: z.string().optional(),
  observacoes: z.string().optional(),
});

type RefuelRecordFormData = z.infer<typeof refuelRecordSchema>;

interface RefuelRecordFormProps {
  request: RefuelRequest;
  onSubmit: (data: RefuelRecordFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RefuelRecordForm({ request, onSubmit, onCancel, isLoading }: RefuelRecordFormProps) {
  const { data: gasStations } = useGasStations({ ativo: true });
  const { data: fuelTypes } = useFuelTypes({ ativo: true });
  const [uploading, setUploading] = useState(false);

  const form = useForm<RefuelRecordFormData>({
    resolver: zodResolver(refuelRecordSchema),
    defaultValues: {
      data_abastecimento: new Date().toISOString().split('T')[0],
      hora_abastecimento: new Date().toTimeString().slice(0, 5),
      posto_id: undefined,
      posto_nome: '',
      tipo_combustivel_id: request.tipo_combustivel_id || undefined,
      litros: request.litros_estimados || undefined,
      valor_total: request.valor_recarregado || request.valor_solicitado || 0,
      km_anterior: request.km_veiculo || undefined,
      km_atual: request.km_veiculo || 0,
      tipo_pagamento: 'cartao_combustivel',
      comprovante_url: '',
      observacoes: '',
    },
  });

  const litros = form.watch('litros');
  const valorTotal = form.watch('valor_total');
  const kmAnterior = form.watch('km_anterior');
  const kmAtual = form.watch('km_atual');

  // Calcular preço por litro
  useEffect(() => {
    if (litros && litros > 0 && valorTotal && valorTotal > 0) {
      const precoLitro = valorTotal / litros;
      // Não atualizar o campo, apenas mostrar no UI
    }
  }, [litros, valorTotal]);

  // Calcular consumo se houver KM anterior
  useEffect(() => {
    if (kmAnterior && kmAtual && kmAnterior < kmAtual && litros && litros > 0) {
      const kmRodado = kmAtual - kmAnterior;
      const consumo = kmRodado / litros;
      // Não atualizar o campo, apenas mostrar no UI
    }
  }, [kmAnterior, kmAtual, litros]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // Aqui você implementaria o upload do arquivo
      // Por enquanto, apenas simula
      await new Promise(resolve => setTimeout(resolve, 1000));
      const fileUrl = URL.createObjectURL(file);
      form.setValue('comprovante_url', fileUrl);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const precoLitro = litros && litros > 0 && valorTotal ? (valorTotal / litros).toFixed(3) : '0.000';
  const kmRodado = kmAnterior && kmAtual && kmAnterior < kmAtual ? (kmAtual - kmAnterior) : 0;
  const consumo = kmRodado > 0 && litros && litros > 0 ? (kmRodado / litros).toFixed(2) : '0.00';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            Solicitação: {request.numero_solicitacao}
          </p>
          <p className="text-sm text-blue-700">
            Veículo: {request.veiculo_placa} • Valor recarregado: {formatCurrency(request.valor_recarregado || request.valor_solicitado)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_abastecimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do Abastecimento *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hora_abastecimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora do Abastecimento</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="posto_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posto Homologado</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                  value={field.value || '__none__'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o posto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Não cadastrado</SelectItem>
                    {gasStations?.data?.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.nome}
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
            name="posto_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Posto (se não cadastrado)</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do posto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tipo_combustivel_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Combustível</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Não especificado</SelectItem>
                  {fuelTypes?.data?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="litros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Litros *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total (R$) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-8">
            <p className="text-xs text-gray-500">Preço por Litro</p>
            <p className="font-bold text-lg">R$ {precoLitro}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="km_anterior"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KM Anterior</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="km_atual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KM Atual *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-8">
            <p className="text-xs text-gray-500">KM Rodado / Consumo</p>
            <p className="font-bold text-lg">
              {kmRodado.toLocaleString('pt-BR')} km / {consumo} km/L
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="tipo_pagamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Pagamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cartao_combustivel">Cartão Combustível</SelectItem>
                  <SelectItem value="reembolso">Reembolso</SelectItem>
                  <SelectItem value="fatura">Fatura</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comprovante_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comprovante de Abastecimento</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    disabled={uploading}
                  />
                  {field.value && (
                    <p className="text-xs text-green-600">Comprovante anexado com sucesso</p>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Informações adicionais sobre o abastecimento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || uploading}>
            {isLoading || uploading ? 'Salvando...' : 'Registrar Abastecimento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

