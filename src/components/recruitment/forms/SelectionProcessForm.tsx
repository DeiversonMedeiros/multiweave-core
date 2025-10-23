// =====================================================
// FORMULÁRIO: PROCESSO SELETIVO
// =====================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCreateSelectionProcess } from '@/hooks/rh/useRecruitment';
import { 
  selectionProcessCreateSchema, 
  SelectionProcessCreateData 
} from '@/lib/validations/recruitment-validations';
import { toast } from 'sonner';

interface SelectionProcessFormProps {
  onSuccess?: () => void;
  initialData?: Partial<SelectionProcessCreateData>;
}

export function SelectionProcessForm({ onSuccess, initialData }: SelectionProcessFormProps) {
  const createMutation = useCreateSelectionProcess();

  const form = useForm<SelectionProcessCreateData>({
    resolver: zodResolver(selectionProcessCreateSchema),
    defaultValues: {
      job_opening_id: initialData?.job_opening_id || '',
      candidate_id: initialData?.candidate_id || '',
      current_stage: initialData?.current_stage || 'triagem',
      notes: initialData?.notes || ''
    }
  });

  const onSubmit = async (data: SelectionProcessCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Processo seletivo iniciado com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao iniciar processo seletivo');
      console.error('Error creating selection process:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Vaga */}
          <FormField
            control={form.control}
            name="job_opening_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vaga *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ID da vaga" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  ID da vaga para a qual o candidato está se candidatando
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Candidato */}
          <FormField
            control={form.control}
            name="candidate_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Candidato *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ID do candidato" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  ID do candidato que está participando do processo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Etapa Atual */}
          <FormField
            control={form.control}
            name="current_stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etapa Atual *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa inicial" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="triagem">Triagem Inicial</SelectItem>
                    <SelectItem value="entrevista_telefonica">Entrevista Telefônica</SelectItem>
                    <SelectItem value="entrevista_presencial">Entrevista Presencial</SelectItem>
                    <SelectItem value="teste_tecnico">Teste Técnico</SelectItem>
                    <SelectItem value="entrevista_final">Entrevista Final</SelectItem>
                    <SelectItem value="aprovacao">Aprovação</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Etapa inicial do processo seletivo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre o processo seletivo..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Informações adicionais sobre o processo seletivo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Iniciando...' : 'Iniciar Processo'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
