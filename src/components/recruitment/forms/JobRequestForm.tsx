// =====================================================
// FORMULÁRIO: SOLICITAÇÃO DE VAGA
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
import { useCreateJobRequest } from '@/hooks/rh/useRecruitment';
import { 
  jobRequestCreateSchema, 
  JobRequestCreateData 
} from '@/lib/validations/recruitment-validations';
import { toast } from 'sonner';

interface JobRequestFormProps {
  onSuccess?: () => void;
  initialData?: Partial<JobRequestCreateData>;
}

export function JobRequestForm({ onSuccess, initialData }: JobRequestFormProps) {
  const createMutation = useCreateJobRequest();

  const form = useForm<JobRequestCreateData>({
    resolver: zodResolver(jobRequestCreateSchema),
    defaultValues: {
      position_name: initialData?.position_name || '',
      department_name: initialData?.department_name || '',
      job_description: initialData?.job_description || '',
      requirements: initialData?.requirements || '',
      benefits: initialData?.benefits || '',
      salary_range: initialData?.salary_range || '',
      urgency_level: initialData?.urgency_level || 'media',
      expected_start_date: initialData?.expected_start_date || ''
    }
  });

  const onSubmit = async (data: JobRequestCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Solicitação de vaga criada com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao criar solicitação de vaga');
      console.error('Error creating job request:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Nome do Cargo */}
          <FormField
            control={form.control}
            name="position_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Cargo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Desenvolvedor Frontend" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Departamento */}
          <FormField
            control={form.control}
            name="department_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Tecnologia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nível de Urgência */}
          <FormField
            control={form.control}
            name="urgency_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível de Urgência</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a urgência" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Início Esperada */}
          <FormField
            control={form.control}
            name="expected_start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início Esperada</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Faixa Salarial */}
          <FormField
            control={form.control}
            name="salary_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Faixa Salarial</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: R$ 5.000 - R$ 8.000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descrição do Cargo */}
        <FormField
          control={form.control}
          name="job_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Cargo *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva as principais responsabilidades e atividades do cargo..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Descreva as principais responsabilidades e atividades do cargo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Requisitos */}
        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requisitos</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Liste os requisitos necessários para o cargo..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Lista de requisitos técnicos, educacionais e de experiência
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Benefícios */}
        <FormField
          control={form.control}
          name="benefits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Benefícios</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Liste os benefícios oferecidos..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Benefícios oferecidos para o cargo
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
            {createMutation.isPending ? 'Criando...' : 'Criar Solicitação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
