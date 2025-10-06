import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Unit } from '@/integrations/supabase/rh-types';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const unitFormSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
  codigo: z.string().optional(),
  is_active: z.boolean().default(true),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

// =====================================================
// INTERFACE DE PROPS
// =====================================================

interface UnitFormProps {
  unit?: Unit | null;
  onSubmit: (data: UnitFormData) => void;
  mode: 'create' | 'edit' | 'view';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function UnitForm({ unit, onSubmit, mode }: UnitFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      nome: unit?.nome || '',
      descricao: unit?.descricao || '',
      codigo: unit?.codigo || '',
      is_active: unit?.is_active ?? true,
    },
  });

  const handleFormSubmit = (data: UnitFormData) => {
    onSubmit(data);
  };

  return (
    <form id="form-modal-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Nome */}
      <div className="space-y-2">
        <label htmlFor="nome" className="text-sm font-medium">
          Nome do Departamento *
        </label>
        <Input
          id="nome"
          placeholder="Ex: Recursos Humanos"
          disabled={mode === 'view'}
          {...register('nome')}
          className={errors.nome ? 'border-red-500' : ''}
        />
        {errors.nome && (
          <p className="text-sm text-red-500">{errors.nome.message}</p>
        )}
      </div>

      {/* Código */}
      <div className="space-y-2">
        <label htmlFor="codigo" className="text-sm font-medium">
          Código
        </label>
        <Input
          id="codigo"
          placeholder="Ex: RH, TI, FIN"
          disabled={mode === 'view'}
          {...register('codigo')}
        />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <label htmlFor="descricao" className="text-sm font-medium">
          Descrição
        </label>
        <Textarea
          id="descricao"
          placeholder="Descrição do departamento..."
          disabled={mode === 'view'}
          rows={3}
          {...register('descricao')}
        />
      </div>

      {/* Status Ativo */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          disabled={mode === 'view'}
          {...register('is_active')}
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Departamento ativo
        </label>
      </div>
    </form>
  );
}
