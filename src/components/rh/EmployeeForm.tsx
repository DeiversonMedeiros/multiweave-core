import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRHData } from '@/hooks/generic/useEntityData';
import { useCompany } from '@/lib/company-context';
import { Employee, EmployeeInsert, EmployeeUpdate } from '@/integrations/supabase/rh-types';
import { Calendar, MapPin, Phone, Mail, User, Building, DollarSign, AlertCircle } from 'lucide-react';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const employeeSchema = z.object({
  // Dados pessoais
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  rg: z.string().optional(),
  data_nascimento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().min(2, 'Estado deve ter 2 caracteres').max(2, 'Estado deve ter 2 caracteres').optional(),
  cep: z.string().optional(),
  
  // Dados profissionais
  matricula: z.string().optional(),
  data_admissao: z.string().min(1, 'Data de admissão é obrigatória'),
  data_demissao: z.string().optional(),
  cargo_id: z.string().optional(),
  departamento_id: z.string().optional(),
  salario_base: z.number().min(0, 'Salário deve ser positivo').optional(),
  status: z.enum(['ativo', 'inativo', 'afastado', 'demitido']).default('ativo'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

// =====================================================
// INTERFACES
// =====================================================

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (data: EmployeeFormData) => void;
  mode: 'create' | 'edit' | 'view';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function EmployeeForm({ 
  employee, 
  onSubmit, 
  mode 
}: EmployeeFormProps) {
  const { selectedCompany } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks para carregar dados relacionados usando nova abordagem genérica
  const { data: positionsData, isLoading: positionsLoading } = useRHData('positions', selectedCompany?.id || '');
  const { data: unitsData, isLoading: unitsLoading } = useRHData('units', selectedCompany?.id || '');
  
  const positions = positionsData?.data || [];
  const units = unitsData?.data || [];

  // Configuração do formulário
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      nome: employee?.nome || '',
      cpf: employee?.cpf || '',
      rg: employee?.rg || '',
      data_nascimento: employee?.data_nascimento || '',
      telefone: employee?.telefone || '',
      email: employee?.email || '',
      endereco: employee?.endereco || '',
      cidade: employee?.cidade || '',
      estado: employee?.estado || '',
      cep: employee?.cep || '',
      matricula: employee?.matricula || '',
      data_admissao: employee?.data_admissao || '',
      data_demissao: employee?.data_demissao || '',
      cargo_id: employee?.cargo_id || '',
      departamento_id: employee?.departamento_id || '',
      salario_base: employee?.salario_base || undefined,
      status: employee?.status || 'ativo',
    },
  });

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar CEP
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  // Handlers
  const handleSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Form {...form}>
      <form id="employee-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="professional">Dados Profissionais</TabsTrigger>
            <TabsTrigger value="contact">Contato</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
          </TabsList>

          {/* DADOS PESSOAIS */}
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Informações básicas do funcionário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome completo do funcionário"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="000.000.000-00"
                            onChange={(e) => {
                              const formatted = formatCPF(e.target.value);
                              field.onChange(formatted);
                            }}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RG</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número do RG"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DADOS PROFISSIONAIS */}
          <TabsContent value="professional" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Dados Profissionais
                </CardTitle>
                <CardDescription>
                  Informações relacionadas ao trabalho
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="matricula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matrícula</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da matrícula"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormDescription>
                          Deixe em branco para gerar automaticamente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_admissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Admissão *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cargo_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {positions.map((position) => (
                              <SelectItem key={position.id} value={position.id}>
                                {position.nome}
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
                    name="departamento_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um departamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.nome}
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
                    name="salario_base"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário Base</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              className="pl-10"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                Ativo
                              </div>
                            </SelectItem>
                            <SelectItem value="inativo">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                Inativo
                              </div>
                            </SelectItem>
                            <SelectItem value="afastado">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                Afastado
                              </div>
                            </SelectItem>
                            <SelectItem value="demitido">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                Demitido
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {employee?.data_demissao && (
                  <FormField
                    control={form.control}
                    name="data_demissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Demissão</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DADOS DE CONTATO */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Dados de Contato
                </CardTitle>
                <CardDescription>
                  Informações para contato com o funcionário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="(11) 99999-9999"
                            onChange={(e) => {
                              const formatted = formatPhone(e.target.value);
                              field.onChange(formatted);
                            }}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="email@exemplo.com"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ENDEREÇO */}
          <TabsContent value="address" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </CardTitle>
                <CardDescription>
                  Informações de endereço do funcionário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Endereço completo"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Cidade"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="SP"
                            maxLength={2}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="00000-000"
                            onChange={(e) => {
                              const formatted = formatCEP(e.target.value);
                              field.onChange(formatted);
                            }}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* BOTÕES REMOVIDOS - FormModal controla as ações */}
      </form>
    </Form>
  );
}

export default EmployeeForm;
