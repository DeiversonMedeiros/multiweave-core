import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dependent, 
  DependentCreateData, 
  DependentUpdateData,
  getParentescoTypes,
  getSexoTypes,
  getDeficienciaTypes,
  getDeficienciaGraus,
  getEscolaridadeTypes,
  getEstadoCivilTypes,
  calculateAge
} from '@/integrations/supabase/rh-types';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useValidateCpf } from '@/hooks/rh/useDependents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

// Schema de validação
const dependentSchema = z.object({
  employee_id: z.string().min(1, 'Funcionário é obrigatório'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().optional().refine((val) => {
    if (!val) return true;
    // Validação básica de CPF (11 dígitos)
    const cleanCpf = val.replace(/\D/g, '');
    return cleanCpf.length === 11;
  }, 'CPF deve ter 11 dígitos'),
  rg: z.string().optional(),
  data_nascimento: z.string().optional(),
  parentesco: z.enum(['conjuge', 'companheiro', 'filho', 'filha', 'pai', 'mae', 'sogro', 'sogra', 'neto', 'neta', 'irmao', 'irma', 'tio', 'tia', 'sobrinho', 'sobrinha', 'outros']),
  sexo: z.enum(['masculino', 'feminino', 'outro']).optional(),
  estado_civil: z.string().optional(),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  nome_mae: z.string().optional(),
  nome_pai: z.string().optional(),
  cpf_mae: z.string().optional(),
  cpf_pai: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  data_casamento: z.string().optional(),
  data_uniao_estavel: z.string().optional(),
  data_separacao: z.string().optional(),
  data_obito: z.string().optional(),
  data_nascimento_mae: z.string().optional(),
  escolaridade: z.string().optional(),
  instituicao_ensino: z.string().optional(),
  possui_deficiencia: z.boolean().default(false),
  tipo_deficiencia: z.string().optional(),
  grau_deficiencia: z.string().optional(),
  necessita_cuidados_especiais: z.boolean().default(false),
  certidao_nascimento: z.string().optional(),
  certidao_casamento: z.string().optional(),
  certidao_uniao_estavel: z.string().optional(),
  comprovante_residencia: z.string().optional(),
  observacoes: z.string().optional(),
});

type DependentFormData = z.infer<typeof dependentSchema>;

interface DependentFormProps {
  dependent?: Dependent;
  employeeId?: string;
  onSubmit: (data: DependentCreateData | DependentUpdateData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DependentForm({ 
  dependent, 
  employeeId, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: DependentFormProps) {
  const [cpfError, setCpfError] = useState<string>('');
  const [isValidatingCpf, setIsValidatingCpf] = useState(false);
  
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data || [];
  const validateCpfMutation = useValidateCpf();

  const form = useForm<DependentFormData>({
    resolver: zodResolver(dependentSchema),
    defaultValues: {
      employee_id: employeeId || dependent?.employee_id || '',
      nome: dependent?.nome || '',
      cpf: dependent?.cpf || '',
      rg: dependent?.rg || '',
      data_nascimento: dependent?.data_nascimento || '',
      parentesco: dependent?.parentesco || 'filho',
      sexo: dependent?.sexo || 'masculino',
      estado_civil: dependent?.estado_civil || '',
      nacionalidade: dependent?.nacionalidade || '',
      naturalidade: dependent?.naturalidade || '',
      nome_mae: dependent?.nome_mae || '',
      nome_pai: dependent?.nome_pai || '',
      cpf_mae: dependent?.cpf_mae || '',
      cpf_pai: dependent?.cpf_pai || '',
      telefone: dependent?.telefone || '',
      email: dependent?.email || '',
      endereco: dependent?.endereco || '',
      cidade: dependent?.cidade || '',
      estado: dependent?.estado || '',
      cep: dependent?.cep || '',
      data_casamento: dependent?.data_casamento || '',
      data_uniao_estavel: dependent?.data_uniao_estavel || '',
      data_separacao: dependent?.data_separacao || '',
      data_obito: dependent?.data_obito || '',
      data_nascimento_mae: dependent?.data_nascimento_mae || '',
      escolaridade: dependent?.escolaridade || '',
      instituicao_ensino: dependent?.instituicao_ensino || '',
      possui_deficiencia: dependent?.possui_deficiencia || false,
      tipo_deficiencia: dependent?.tipo_deficiencia || '',
      grau_deficiencia: dependent?.grau_deficiencia || '',
      necessita_cuidados_especiais: dependent?.necessita_cuidados_especiais || false,
      certidao_nascimento: dependent?.certidao_nascimento || '',
      certidao_casamento: dependent?.certidao_casamento || '',
      certidao_uniao_estavel: dependent?.certidao_uniao_estavel || '',
      comprovante_residencia: dependent?.comprovante_residencia || '',
      observacoes: dependent?.observacoes || '',
    },
  });

  const parentesco = form.watch('parentesco');
  const dataNascimento = form.watch('data_nascimento');
  const possuiDeficiencia = form.watch('possui_deficiencia');

  // Calcular idade baseada na data de nascimento
  const idade = dataNascimento ? calculateAge(dataNascimento) : 0;

  // Validar CPF quando mudar
  useEffect(() => {
    const cpf = form.getValues('cpf');
    if (cpf && cpf.length === 11) {
      validateCpf(cpf);
    } else {
      setCpfError('');
    }
  }, [form.watch('cpf')]);

  const validateCpf = async (cpf: string) => {
    if (!cpf || cpf.length !== 11) return;
    
    setIsValidatingCpf(true);
    try {
      const isRegistered = await validateCpfMutation.mutateAsync({
        cpf,
        excludeId: dependent?.id
      });
      
      if (isRegistered) {
        setCpfError('Este CPF já está cadastrado como dependente');
      } else {
        setCpfError('');
      }
    } catch (error) {
      setCpfError('');
    } finally {
      setIsValidatingCpf(false);
    }
  };

  const handleSubmit = (data: DependentFormData) => {
    if (cpfError) return;
    
    const submitData = {
      ...data,
      company_id: '', // Será preenchido pelo hook
    };

    if (dependent) {
      (submitData as DependentUpdateData).id = dependent.id;
    }

    onSubmit(submitData as DependentCreateData | DependentUpdateData);
  };

  const formatCpf = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCep = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="dados-pessoais" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados-pessoais">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="parentesco">Parentesco</TabsTrigger>
            <TabsTrigger value="documentacao">Documentação</TabsTrigger>
            <TabsTrigger value="observacoes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="dados-pessoais" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funcionário *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!employeeId}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o funcionário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(employees) && employees.length > 0 ? (
                              employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.nome} - {employee.matricula || 'Sem matrícula'}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled>
                                Nenhum funcionário encontrado
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo do dependente" {...field} />
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
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCpf(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                            {isValidatingCpf && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                            )}
                          </div>
                        </FormControl>
                        {cpfError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{cpfError}</AlertDescription>
                          </Alert>
                        )}
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
                          <Input placeholder="Número do RG" {...field} />
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
                          <Input type="date" {...field} />
                        </FormControl>
                        {idade > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Idade: {idade} anos
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sexo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getSexoTypes().map((sexo) => (
                              <SelectItem key={sexo.value} value={sexo.value}>
                                {sexo.label}
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
                    name="estado_civil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado Civil</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado civil" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getEstadoCivilTypes().map((estado) => (
                              <SelectItem key={estado.value} value={estado.value}>
                                {estado.label}
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
                    name="nacionalidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nacionalidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Nacionalidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="naturalidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naturalidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade de nascimento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome_mae"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Mãe</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo da mãe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome_pai"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Pai</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo do pai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf_mae"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF da Mãe</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCpf(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf_pai"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF do Pai</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCpf(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatPhone(e.target.value);
                              field.onChange(formatted);
                            }}
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
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCep(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
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
                          <Input placeholder="UF" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parentesco" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Parentesco e Relacionamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="parentesco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o parentesco" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getParentescoTypes().map((parentesco) => (
                            <SelectItem key={parentesco.value} value={parentesco.value}>
                              {parentesco.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(parentesco === 'conjuge' || parentesco === 'companheiro') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="data_casamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {parentesco === 'conjuge' ? 'Data do Casamento' : 'Data da União Estável'}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data_separacao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Separação</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {(parentesco === 'filho' || parentesco === 'filha') && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="escolaridade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Escolaridade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a escolaridade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getEscolaridadeTypes().map((escolaridade) => (
                                <SelectItem key={escolaridade.value} value={escolaridade.value}>
                                  {escolaridade.label}
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
                      name="instituicao_ensino"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instituição de Ensino</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da escola/faculdade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data_nascimento_mae"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento da Mãe</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="data_obito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Óbito</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentacao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentação e Deficiência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="certidao_nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certidão de Nascimento</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da certidão" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certidao_casamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certidão de Casamento</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da certidão" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certidao_uniao_estavel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certidão de União Estável</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da certidão" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comprovante_residencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comprovante de Residência</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do comprovante" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="possui_deficiencia"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Possui Deficiência</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {possuiDeficiencia && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tipo_deficiencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Deficiência</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getDeficienciaTypes().map((tipo) => (
                                  <SelectItem key={tipo.value} value={tipo.value}>
                                    {tipo.label}
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
                        name="grau_deficiencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grau da Deficiência</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o grau" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getDeficienciaGraus().map((grau) => (
                                  <SelectItem key={grau.value} value={grau.value}>
                                    {grau.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="necessita_cuidados_especiais"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Necessita Cuidados Especiais</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="observacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais sobre o dependente"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !!cpfError}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {dependent ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
