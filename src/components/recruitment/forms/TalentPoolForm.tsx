// =====================================================
// FORMULÁRIO: BANCO DE TALENTOS
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
import { useCreateTalentPoolItem } from '@/hooks/rh/useRecruitment';
import { 
  talentPoolCreateSchema, 
  TalentPoolCreateData 
} from '@/lib/validations/recruitment-validations';
import { toast } from 'sonner';

interface TalentPoolFormProps {
  onSuccess?: () => void;
  initialData?: Partial<TalentPoolCreateData>;
}

export function TalentPoolForm({ onSuccess, initialData }: TalentPoolFormProps) {
  const createMutation = useCreateTalentPoolItem();

  const form = useForm<TalentPoolCreateData>({
    resolver: zodResolver(talentPoolCreateSchema),
    defaultValues: {
      candidate_id: initialData?.candidate_id || '',
      category: initialData?.category || '',
      skills: initialData?.skills || [],
      experience_level: initialData?.experience_level || 'junior',
      availability: initialData?.availability || 'disponivel',
      notes: initialData?.notes || ''
    }
  });

  const onSubmit = async (data: TalentPoolCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Talento adicionado ao banco com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao adicionar talento');
      console.error('Error creating talent pool item:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
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
                  ID do candidato que será adicionado ao banco de talentos
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoria */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: Tecnologia, Vendas, Administrativo" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Categoria profissional do talento
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nível de Experiência */}
          <FormField
            control={form.control}
            name="experience_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível de Experiência</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="junior">Júnior</SelectItem>
                    <SelectItem value="pleno">Pleno</SelectItem>
                    <SelectItem value="senior">Sênior</SelectItem>
                    <SelectItem value="especialista">Especialista</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Nível de experiência profissional
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Disponibilidade */}
          <FormField
            control={form.control}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disponibilidade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a disponibilidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="interessado">Interessado</SelectItem>
                    <SelectItem value="indisponivel">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Status de disponibilidade do talento
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Habilidades */}
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Habilidades</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: React, Node.js, Python (separadas por vírgula)" 
                  {...field}
                  onChange={(e) => {
                    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
                    field.onChange(skills);
                  }}
                />
              </FormControl>
              <FormDescription>
                Lista de habilidades técnicas e profissionais (separadas por vírgula)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Observações */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre o talento..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Informações adicionais sobre o talento
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
            {createMutation.isPending ? 'Adicionando...' : 'Adicionar Talento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
