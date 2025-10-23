// =====================================================
// FORMULÁRIO: VAGA ABERTA
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
import { useCreateJobOpening } from '@/hooks/rh/useRecruitment';
import { 
  jobOpeningCreateSchema, 
  JobOpeningCreateData 
} from '@/lib/validations/recruitment-validations';
import { toast } from 'sonner';

interface JobOpeningFormProps {
  onSuccess?: () => void;
  initialData?: Partial<JobOpeningCreateData>;
}

export function JobOpeningForm({ onSuccess, initialData }: JobOpeningFormProps) {
  const createMutation = useCreateJobOpening();

  const form = useForm<JobOpeningCreateData>({
    resolver: zodResolver(jobOpeningCreateSchema),
    defaultValues: {
      job_request_id: initialData?.job_request_id || '',
      position_name: initialData?.position_name || '',
      department_name: initialData?.department_name || '',
      job_description: initialData?.job_description || '',
      requirements: initialData?.requirements || '',
      benefits: initialData?.benefits || '',
      salary_range: initialData?.salary_range || ''
    }
  });

  const onSubmit = async (data: JobOpeningCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Vaga aberta com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao abrir vaga');
      console.error('Error creating job opening:', error);
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
            {createMutation.isPending ? 'Criando...' : 'Abrir Vaga'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
