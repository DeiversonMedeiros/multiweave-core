// =====================================================
// FORMULÁRIO DE VISTORIA
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateInspection } from '@/hooks/frota/useFrotaData';
import { InspectionItemData } from '@/types/frota';

const inspectionSchema = z.object({
  vehicle_id: z.string().min(1, 'Selecione um veículo'),
  driver_id: z.string().min(1, 'Selecione um condutor'),
  base: z.string().optional(),
  km_inicial: z.number().min(0, 'KM inicial não pode ser negativo').optional(),
  km_final: z.number().min(0, 'KM final não pode ser negativo').optional(),
  avarias: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(z.object({
    categoria: z.string(),
    item: z.string(),
    conforme: z.boolean(),
    observacao: z.string().optional(),
  })).optional(),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

interface InspectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Itens padrão de vistoria
const inspectionItems = [
  {
    categoria: 'Iluminação e Sinalização',
    items: [
      'Faróis dianteiros',
      'Faróis traseiros',
      'Luzes de freio',
      'Pisca-pisca dianteiro',
      'Pisca-pisca traseiro',
      'Luz de ré',
      'Buzina',
      'Pisca-alerta',
    ]
  },
  {
    categoria: 'Segurança',
    items: [
      'Cinto de segurança',
      'Extintor de incêndio',
      'Macaco',
      'Chave de roda',
      'Estepe',
      'Triângulo de sinalização',
    ]
  },
  {
    categoria: 'Interior',
    items: [
      'Bancos dianteiros',
      'Bancos traseiros',
      'Tapetes',
      'Limpeza interna',
      'Limpeza externa',
      'Ar condicionado',
    ]
  },
  {
    categoria: 'Mecânica',
    items: [
      'Motor',
      'Freios',
      'Amortecedores',
      'Câmbio',
      'Óleo do motor',
      'Água do radiador',
      'Bateria',
    ]
  },
  {
    categoria: 'Vidros',
    items: [
      'Vidros dianteiros',
      'Vidros traseiros',
      'Limpador de para-brisa',
      'Retrovisor interno',
      'Retrovisores externos',
    ]
  },
  {
    categoria: 'Outros',
    items: [
      'Pneus',
      'Calotas/Rodas',
      'Antena',
      'Quebra-sol',
      'Borrachas das portas',
      'Pedais',
      'Placa',
      'Documentos',
      'Pintura',
      'Chaparia',
    ]
  }
];

export default function InspectionForm({ isOpen, onClose, onSuccess }: InspectionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<InspectionItemData[]>([]);
  const createInspection = useCreateInspection();

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      vehicle_id: '',
      driver_id: '',
      base: '',
      km_inicial: undefined,
      km_final: undefined,
      avarias: '',
      observacoes: '',
      itens: [],
    },
  });

  const onSubmit = async (data: InspectionFormData) => {
    try {
      setIsSubmitting(true);
      
      await createInspection.mutateAsync({
        ...data,
        itens: selectedItems,
      });
      
      form.reset();
      setSelectedItems([]);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar vistoria:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedItems([]);
    onClose();
  };

  const handleItemChange = (categoria: string, item: string, conforme: boolean, observacao?: string) => {
    const existingItemIndex = selectedItems.findIndex(
      i => i.categoria === categoria && i.item === item
    );

    if (existingItemIndex >= 0) {
      const newItems = [...selectedItems];
      newItems[existingItemIndex] = { categoria, item, conforme, observacao };
      setSelectedItems(newItems);
    } else {
      setSelectedItems([...selectedItems, { categoria, item, conforme, observacao }]);
    }
  };

  const getItemValue = (categoria: string, item: string) => {
    const foundItem = selectedItems.find(
      i => i.categoria === categoria && i.item === item
    );
    return foundItem || { categoria, item, conforme: false, observacao: '' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Vistoria</DialogTitle>
          <DialogDescription>
            Preencha as informações da vistoria do veículo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                            {/* Aqui você pode carregar a lista de veículos */}
                            <SelectItem value="1">ABC-1234 - Toyota Corolla</SelectItem>
                            <SelectItem value="2">DEF-5678 - Honda Civic</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="driver_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condutor *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o condutor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* Aqui você pode carregar a lista de condutores */}
                            <SelectItem value="1">João da Silva</SelectItem>
                            <SelectItem value="2">Maria Santos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="base"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base</FormLabel>
                        <FormControl>
                          <Input placeholder="Base de operação" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="km_inicial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM Inicial</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="km_final"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM Final</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Checklist de Vistoria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Checklist de Vistoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {inspectionItems.map((category) => (
                  <div key={category.categoria} className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">{category.categoria}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.items.map((item) => {
                        const itemValue = getItemValue(category.categoria, item);
                        return (
                          <div key={item} className="flex items-center space-x-3 p-2 border rounded-lg">
                            <Checkbox
                              checked={itemValue.conforme}
                              onCheckedChange={(checked) => 
                                handleItemChange(category.categoria, item, !!checked, itemValue.observacao)
                              }
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium">{item}</label>
                              {!itemValue.conforme && (
                                <Input
                                  placeholder="Descreva o problema"
                                  value={itemValue.observacao}
                                  onChange={(e) => 
                                    handleItemChange(category.categoria, item, itemValue.conforme, e.target.value)
                                  }
                                  className="mt-1"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="avarias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avarias Encontradas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva as avarias encontradas..."
                          {...field}
                          rows={3}
                        />
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
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações adicionais..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#049940] hover:bg-[#038830]">
                {isSubmitting ? 'Salvando...' : 'Criar Vistoria'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
