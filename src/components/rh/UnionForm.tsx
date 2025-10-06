// =====================================================
// FORMULÁRIO PARA SINDICATOS
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Union, UnionCreateData, UnionUpdateData } from '@/integrations/supabase/rh-types';
import { useUnionTypes } from '@/hooks/rh/useUnions';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.').max(255, 'Nome deve ter no máximo 255 caracteres.'),
  sigla: z.string().max(50, 'Sigla deve ter no máximo 50 caracteres.').optional(),
  tipo: z.enum(['patronal', 'trabalhadores', 'categoria', 'profissional', 'misto'], {
    required_error: 'Tipo é obrigatório.',
  }),
  categoria: z.string().max(100, 'Categoria deve ter no máximo 100 caracteres.').optional(),
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos.').optional(),
  inscricao_municipal: z.string().max(50, 'Inscrição municipal deve ter no máximo 50 caracteres.').optional(),
  inscricao_estadual: z.string().max(50, 'Inscrição estadual deve ter no máximo 50 caracteres.').optional(),
  razao_social: z.string().max(255, 'Razão social deve ter no máximo 255 caracteres.').optional(),
  telefone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres.').optional(),
  email: z.string().email('Email deve ser válido.').max(255, 'Email deve ter no máximo 255 caracteres.').optional(),
  site: z.string().max(255, 'Site deve ter no máximo 255 caracteres.').optional(),
  endereco: z.string().optional(),
  cidade: z.string().max(100, 'Cidade deve ter no máximo 100 caracteres.').optional(),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres.').optional(),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos.').optional(),
  presidente: z.string().max(255, 'Presidente deve ter no máximo 255 caracteres.').optional(),
  telefone_presidente: z.string().max(20, 'Telefone do presidente deve ter no máximo 20 caracteres.').optional(),
  email_presidente: z.string().email('Email do presidente deve ser válido.').max(255, 'Email do presidente deve ter no máximo 255 caracteres.').optional(),
  data_fundacao: z.string().optional(),
  numero_registro: z.string().max(50, 'Número de registro deve ter no máximo 50 caracteres.').optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface UnionFormProps {
  initialData?: Union;
  onSubmit: (data: UnionCreateData | UnionUpdateData) => void;
  isLoading?: boolean;
}

const UnionForm: React.FC<UnionFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const unionTypes = useUnionTypes();

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
      sigla: initialData?.sigla || '',
      tipo: initialData?.tipo || 'trabalhadores',
      categoria: initialData?.categoria || '',
      cnpj: initialData?.cnpj || '',
      inscricao_municipal: initialData?.inscricao_municipal || '',
      inscricao_estadual: initialData?.inscricao_estadual || '',
      razao_social: initialData?.razao_social || '',
      telefone: initialData?.telefone || '',
      email: initialData?.email || '',
      site: initialData?.site || '',
      endereco: initialData?.endereco || '',
      cidade: initialData?.cidade || '',
      estado: initialData?.estado || '',
      cep: initialData?.cep || '',
      presidente: initialData?.presidente || '',
      telefone_presidente: initialData?.telefone_presidente || '',
      email_presidente: initialData?.email_presidente || '',
      data_fundacao: initialData?.data_fundacao?.split('T')[0] || '',
      numero_registro: initialData?.numero_registro || '',
      observacoes: initialData?.observacoes || '',
      ativo: initialData?.ativo ?? true,
    },
  });

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      sigla: data.sigla || undefined,
      categoria: data.categoria || undefined,
      cnpj: data.cnpj || undefined,
      inscricao_municipal: data.inscricao_municipal || undefined,
      inscricao_estadual: data.inscricao_estadual || undefined,
      razao_social: data.razao_social || undefined,
      telefone: data.telefone || undefined,
      email: data.email || undefined,
      site: data.site || undefined,
      endereco: data.endereco || undefined,
      cidade: data.cidade || undefined,
      estado: data.estado || undefined,
      cep: data.cep || undefined,
      presidente: data.presidente || undefined,
      telefone_presidente: data.telefone_presidente || undefined,
      email_presidente: data.email_presidente || undefined,
      data_fundacao: data.data_fundacao || undefined,
      numero_registro: data.numero_registro || undefined,
      observacoes: data.observacoes || undefined,
      ...(initialData && { id: initialData.id }),
    };
    onSubmit(submitData as UnionCreateData | UnionUpdateData);
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
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                {...register('nome')}
                className={errors.nome ? 'border-red-500' : ''}
                placeholder="Nome do sindicato"
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sigla">Sigla</Label>
              <Input
                id="sigla"
                {...register('sigla')}
                className={errors.sigla ? 'border-red-500' : ''}
                placeholder="Ex: SINDIMETAL"
              />
              {errors.sigla && (
                <p className="text-sm text-red-500">{errors.sigla.message}</p>
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
                  {unionTypes.map((type) => (
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
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                {...register('categoria')}
                className={errors.categoria ? 'border-red-500' : ''}
                placeholder="Ex: Metalúrgicos, Bancários"
              />
              {errors.categoria && (
                <p className="text-sm text-red-500">{errors.categoria.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentação */}
      <Card>
        <CardHeader>
          <CardTitle>Documentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                {...register('cnpj')}
                className={errors.cnpj ? 'border-red-500' : ''}
                placeholder="00.000.000/0000-00"
              />
              {errors.cnpj && (
                <p className="text-sm text-red-500">{errors.cnpj.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
              <Input
                id="inscricao_municipal"
                {...register('inscricao_municipal')}
                className={errors.inscricao_municipal ? 'border-red-500' : ''}
              />
              {errors.inscricao_municipal && (
                <p className="text-sm text-red-500">{errors.inscricao_municipal.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                {...register('inscricao_estadual')}
                className={errors.inscricao_estadual ? 'border-red-500' : ''}
              />
              {errors.inscricao_estadual && (
                <p className="text-sm text-red-500">{errors.inscricao_estadual.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_registro">Número de Registro</Label>
              <Input
                id="numero_registro"
                {...register('numero_registro')}
                className={errors.numero_registro ? 'border-red-500' : ''}
              />
              {errors.numero_registro && (
                <p className="text-sm text-red-500">{errors.numero_registro.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razao_social">Razão Social</Label>
            <Input
              id="razao_social"
              {...register('razao_social')}
              className={errors.razao_social ? 'border-red-500' : ''}
            />
            {errors.razao_social && (
              <p className="text-sm text-red-500">{errors.razao_social.message}</p>
            )}
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
                className={errors.telefone ? 'border-red-500' : ''}
                placeholder="(11) 99999-9999"
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
                className={errors.email ? 'border-red-500' : ''}
                placeholder="contato@sindicato.com.br"
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
                className={errors.site ? 'border-red-500' : ''}
                placeholder="https://www.sindicato.com.br"
              />
              {errors.site && (
                <p className="text-sm text-red-500">{errors.site.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fundacao">Data de Fundação</Label>
              <Input
                id="data_fundacao"
                type="date"
                {...register('data_fundacao')}
                className={errors.data_fundacao ? 'border-red-500' : ''}
              />
              {errors.data_fundacao && (
                <p className="text-sm text-red-500">{errors.data_fundacao.message}</p>
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
              className={errors.endereco ? 'border-red-500' : ''}
              placeholder="Rua, número, bairro..."
              rows={3}
            />
            {errors.endereco && (
              <p className="text-sm text-red-500">{errors.endereco.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                {...register('cidade')}
                className={errors.cidade ? 'border-red-500' : ''}
              />
              {errors.cidade && (
                <p className="text-sm text-red-500">{errors.cidade.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                {...register('estado')}
                className={errors.estado ? 'border-red-500' : ''}
                placeholder="SP"
                maxLength={2}
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
                className={errors.cep ? 'border-red-500' : ''}
                placeholder="00000-000"
              />
              {errors.cep && (
                <p className="text-sm text-red-500">{errors.cep.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presidente */}
      <Card>
        <CardHeader>
          <CardTitle>Presidência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="presidente">Nome do Presidente</Label>
              <Input
                id="presidente"
                {...register('presidente')}
                className={errors.presidente ? 'border-red-500' : ''}
              />
              {errors.presidente && (
                <p className="text-sm text-red-500">{errors.presidente.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone_presidente">Telefone do Presidente</Label>
              <Input
                id="telefone_presidente"
                {...register('telefone_presidente')}
                className={errors.telefone_presidente ? 'border-red-500' : ''}
                placeholder="(11) 99999-9999"
              />
              {errors.telefone_presidente && (
                <p className="text-sm text-red-500">{errors.telefone_presidente.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_presidente">Email do Presidente</Label>
              <Input
                id="email_presidente"
                type="email"
                {...register('email_presidente')}
                className={errors.email_presidente ? 'border-red-500' : ''}
                placeholder="presidente@sindicato.com.br"
              />
              {errors.email_presidente && (
                <p className="text-sm text-red-500">{errors.email_presidente.message}</p>
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
              placeholder="Informações adicionais sobre o sindicato..."
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
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'} Sindicato
        </Button>
      </div>
    </form>
  );
};

export default UnionForm;
