// =====================================================
// FORMULÁRIO PARA CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MedicalAgreement, MedicalAgreementCreateData, MedicalAgreementUpdateData } from '@/integrations/supabase/rh-types';
import { useAgreementTypes } from '@/hooks/rh/useMedicalAgreements';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.').max(255, 'Nome deve ter no máximo 255 caracteres.'),
  tipo: z.enum(['medico', 'odontologico', 'ambos'], {
    required_error: 'Tipo é obrigatório.',
  }),
  cnpj: z.string().optional(),
  razao_social: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido.').optional().or(z.literal('')),
  site: z.string().url('URL inválida.').optional().or(z.literal('')),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'Estado deve ter no máximo 2 caracteres.').optional(),
  cep: z.string().max(8, 'CEP deve ter no máximo 8 caracteres.').optional(),
  contato_responsavel: z.string().optional(),
  telefone_contato: z.string().optional(),
  email_contato: z.string().email('Email de contato inválido.').optional().or(z.literal('')),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface MedicalAgreementFormProps {
  initialData?: MedicalAgreement;
  onSubmit: (data: MedicalAgreementCreateData | MedicalAgreementUpdateData) => void;
  isLoading?: boolean;
}

const MedicalAgreementForm: React.FC<MedicalAgreementFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const agreementTypes = useAgreementTypes();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      tipo: initialData?.tipo || 'medico',
      cnpj: initialData?.cnpj || '',
      razao_social: initialData?.razao_social || '',
      telefone: initialData?.telefone || '',
      email: initialData?.email || '',
      site: initialData?.site || '',
      endereco: initialData?.endereco || '',
      cidade: initialData?.cidade || '',
      estado: initialData?.estado || '',
      cep: initialData?.cep || '',
      contato_responsavel: initialData?.contato_responsavel || '',
      telefone_contato: initialData?.telefone_contato || '',
      email_contato: initialData?.email_contato || '',
      observacoes: initialData?.observacoes || '',
      ativo: initialData?.ativo ?? true,
    },
  });

  const watchedAtivo = watch('ativo');

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      ...(initialData && { id: initialData.id }),
    };
    onSubmit(submitData as MedicalAgreementCreateData | MedicalAgreementUpdateData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Convênio *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Ex: Unimed, Bradesco Saúde..."
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={watch('tipo')}
                onValueChange={(value) => setValue('tipo', value as any)}
              >
                <SelectTrigger className={errors.tipo ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {agreementTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-red-500">{errors.tipo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                {...register('cnpj')}
                placeholder="00.000.000/0000-00"
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input
                id="razao_social"
                {...register('razao_social')}
                placeholder="Razão social da empresa"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={watchedAtivo}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
            <Label htmlFor="ativo">Convênio ativo</Label>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                placeholder="(00) 0000-0000"
                className={errors.telefone ? 'border-red-500' : ''}
              />
              {errors.telefone && (
                <p className="text-sm text-red-500">{errors.telefone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="contato@convenio.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                {...register('site')}
                placeholder="https://www.convenio.com"
                className={errors.site ? 'border-red-500' : ''}
              />
              {errors.site && (
                <p className="text-sm text-red-500">{errors.site.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Textarea
              id="endereco"
              {...register('endereco')}
              placeholder="Rua, número, bairro..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                {...register('cidade')}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                {...register('estado')}
                placeholder="UF"
                maxLength={2}
                className={errors.estado ? 'border-red-500' : ''}
              />
              {errors.estado && (
                <p className="text-sm text-red-500">{errors.estado.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                {...register('cep')}
                placeholder="00000-000"
                maxLength={8}
                className={errors.cep ? 'border-red-500' : ''}
              />
              {errors.cep && (
                <p className="text-sm text-red-500">{errors.cep.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato Responsável */}
      <Card>
        <CardHeader>
          <CardTitle>Contato Responsável</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contato_responsavel">Nome do Responsável</Label>
              <Input
                id="contato_responsavel"
                {...register('contato_responsavel')}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone_contato">Telefone do Responsável</Label>
              <Input
                id="telefone_contato"
                {...register('telefone_contato')}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_contato">Email do Responsável</Label>
              <Input
                id="email_contato"
                type="email"
                {...register('email_contato')}
                placeholder="responsavel@convenio.com"
                className={errors.email_contato ? 'border-red-500' : ''}
              />
              {errors.email_contato && (
                <p className="text-sm text-red-500">{errors.email_contato.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              placeholder="Informações adicionais sobre o convênio..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'} Convênio
        </Button>
      </div>
    </form>
  );
};

export default MedicalAgreementForm;
