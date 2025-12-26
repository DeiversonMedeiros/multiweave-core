import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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
import { ImageUpload } from '@/components/ui/image-upload';
import { useRHData } from '@/hooks/generic/useEntityData';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useCompany } from '@/lib/company-context';
import { useEmployeeUser } from '@/hooks/rh/useEmployeeUser';
import { useLocationZones } from '@/hooks/rh/useLocationZones';
import { useDeficiencyTypes } from '@/hooks/rh/useDeficiencyTypes';
import { EmployeeLocationZonesService } from '@/services/rh/employeeLocationZonesService';
import { Employee, EmployeeInsert, EmployeeUpdate } from '@/integrations/supabase/rh-types';
import { Calendar, MapPin, Phone, Mail, User, Building, DollarSign, AlertCircle, UserCheck, Navigation } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmployeeDocumentsTab } from '@/components/rh/EmployeeDocumentsTab';
import { useDependentsByEmployee } from '@/hooks/rh/useDependents';
import { DependentsList } from '@/components/rh/DependentsList';
import { Users } from 'lucide-react';

// =====================================================
// COMPONENTE PARA ABA DE DEPENDENTES (MODO VIEW)
// =====================================================

function EmployeeDependentsViewTab({ employeeId, employeeName, employeeMatricula }: { 
  employeeId: string;
  employeeName?: string;
  employeeMatricula?: string;
}) {
  const { data: dependents, isLoading } = useDependentsByEmployee(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dependentes...</p>
        </div>
      </div>
    );
  }

  if (!dependents || dependents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dependente cadastrado</h3>
          <p className="text-muted-foreground text-center">
            Este funcionário ainda não possui dependentes cadastrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Converter para DependentWithEmployee (adicionar campos do funcionário)
  const dependentsWithEmployee = dependents.map(dep => ({
    ...dep,
    funcionario_nome: employeeName || '',
    funcionario_matricula: employeeMatricula,
    funcionario_cpf: ''
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dependentes do Funcionário</h3>
          <p className="text-sm text-muted-foreground">
            Total: {dependents.length} dependente{dependents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      <DependentsList
        dependents={dependentsWithEmployee}
        isLoading={isLoading}
        showEmployeeInfo={false}
      />
    </div>
  );
}

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const employeeSchema = z.object({
  // Dados pessoais básicos
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  rg: z.string().optional(),
  rg_orgao_emissor: z.string().optional(),
  rg_uf_emissao: z.string().max(2, 'UF deve ter 2 caracteres').optional(),
  rg_data_emissao: z.string().optional(),
  data_nascimento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  sexo: z.enum(['masculino', 'feminino', 'outro', 'nao_informar']).optional(),
  orientacao_sexual: z.enum(['heterossexual', 'homossexual', 'bissexual', 'pansexual', 'assexual', 'outro', 'nao_informar', 'prefiro_nao_dizer']).optional(),
  
  // Endereço
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().min(2, 'Estado deve ter 2 caracteres').max(2, 'Estado deve ter 2 caracteres'),
  cep: z.string().optional(),
  
  // Dados pessoais adicionais
  estado_civil: z.string().optional(),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  nome_mae: z.string().optional(),
  nome_pai: z.string().optional(),
  
  // Dados profissionais
  matricula: z.string().optional(),
  data_admissao: z.string().min(1, 'Data de admissão é obrigatória'),
  data_demissao: z.string().optional(),
  cargo_id: z.string().optional(),
  departamento_id: z.string().optional(),
  work_shift_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  gestor_imediato_id: z.string().optional().or(z.undefined()),
  salario_base: z.number().min(0, 'Salário deve ser positivo').optional(),
  status: z.enum(['ativo', 'inativo', 'afastado', 'demitido', 'aposentado', 'licenca']).default('ativo'),
  requer_registro_ponto: z.boolean().default(true), // Artigo 62 da CLT
  location_zone_ids: z.array(z.string()).default([]), // Array de IDs de zonas de localização
  tipo_contrato_trabalho: z.enum(['CLT', 'PJ', 'Estagiario', 'Menor_Aprendiz', 'Terceirizado', 'Autonomo', 'Cooperado', 'Temporario', 'Intermitente', 'Outro']).optional(),
  vinculo_periculosidade: z.boolean().optional(),
  vinculo_insalubridade: z.boolean().optional(),
  grau_insalubridade: z.enum(['minimo', 'medio', 'maximo']).optional(),
  
  // Documentos pessoais - Título de Eleitor
  titulo_eleitor: z.string().optional(),
  titulo_eleitor_zona: z.string().optional(),
  titulo_eleitor_secao: z.string().optional(),
  
  // Documentos pessoais - CTPS
  ctps: z.string().optional(),
  ctps_serie: z.string().optional(),
  ctps_uf: z.string().max(2, 'UF deve ter 2 caracteres').optional(),
  ctps_data_emissao: z.string().optional(),
  
  // Documentos pessoais - CNH
  cnh_numero: z.string().optional(),
  cnh_validade: z.string().optional(),
  cnh_categoria: z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']).optional(),
  
  // Documentos pessoais - Outros
  certidao_nascimento: z.string().optional(),
  certidao_casamento_numero: z.string().optional(),
  certidao_casamento_data: z.string().optional(),
  certidao_uniao_estavel_numero: z.string().optional(),
  certidao_uniao_estavel_data: z.string().optional(),
  pis_pasep: z.string().optional(),
  certificado_reservista: z.string().optional(),
  comprovante_endereco: z.string().optional(),
  foto_funcionario: z.string().optional(),
  escolaridade: z.string().optional(),
  cartao_sus: z.string().optional(),
  registros_profissionais: z.record(z.string()).optional(),
  outros_vinculos_empregaticios: z.boolean().optional(),
  detalhes_outros_vinculos: z.string().optional(),
  
  // Deficiência
  possui_deficiencia: z.boolean().optional(),
  deficiencia_tipo_id: z.string().optional(),
  deficiencia_grau: z.enum(['leve', 'moderada', 'severa', 'profunda']).optional(),
  deficiencia_laudo_url: z.string().optional(),
  
  // RNE (Registro Nacional de Estrangeiro)
  rne_numero: z.string().optional(),
  rne_orgao: z.string().optional(),
  rne_data_expedicao: z.string().optional(),
  
  // Dados bancários
  banco_nome: z.string().optional(),
  banco_agencia: z.string().optional(),
  banco_conta: z.string().optional(),
  banco_tipo_conta: z.enum(['corrente', 'poupanca', 'salario']).optional(),
  banco_pix: z.string().optional(),
  
  // Vínculo com usuário
  user_id: z.string().optional().nullable(),
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

export interface EmployeeFormRef {
  submit: () => Promise<{ success: boolean; validationError?: boolean }>;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const EmployeeForm = forwardRef<EmployeeFormRef, EmployeeFormProps>(({ 
  employee, 
  onSubmit, 
  mode 
}, ref) => {
  const { selectedCompany } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  // Hooks para carregar dados relacionados usando nova abordagem genérica
  const { data: positionsData, isLoading: positionsLoading } = useRHData('positions', selectedCompany?.id || '');
  const { data: unitsData, isLoading: unitsLoading } = useRHData('units', selectedCompany?.id || '');
  const { data: workShiftsData, isLoading: workShiftsLoading } = useRHData('work_shifts', selectedCompany?.id || '');
  const { data: costCentersData, isLoading: costCentersLoading } = useCostCenters();
  const { data: employeesData, isLoading: employeesLoading } = useRHData('employees', selectedCompany?.id || '');
  const { data: locationZonesData, isLoading: locationZonesLoading } = useLocationZones({ ativo: true });
  const { data: deficiencyTypesData } = useDeficiencyTypes();
  
  // Hook para gerenciar vínculos usuário-funcionário
  const { availableUsers, isUserAlreadyLinked, users } = useEmployeeUser();
  
  const positions = (positionsData || []).sort((a, b) => 
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  );
  const units = unitsData || [];
  const workShifts = workShiftsData || [];
  const costCenters = costCentersData?.data || [];
  const employees = employeesData || [];
  const locationZones = locationZonesData || [];
  const deficiencyTypes = deficiencyTypesData || [];
  
  // Usuários disponíveis para gestor imediato (todos os usuários da empresa, não apenas funcionários)
  const availableManagers = users || [];

  // Configuração do formulário
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      nome: employee?.nome || '',
      cpf: employee?.cpf || '',
      rg: employee?.rg || '',
      rg_orgao_emissor: employee?.rg_orgao_emissor || '',
      rg_uf_emissao: employee?.rg_uf_emissao || '',
      rg_data_emissao: employee?.rg_data_emissao || '',
      data_nascimento: employee?.data_nascimento || '',
      telefone: employee?.telefone || '',
      email: employee?.email || '',
      sexo: employee?.sexo || undefined,
      orientacao_sexual: employee?.orientacao_sexual || undefined,
      endereco: employee?.endereco || '',
      cidade: employee?.cidade || '',
      estado: employee?.estado || '',
      cep: employee?.cep || '',
      estado_civil: employee?.estado_civil || '',
      nacionalidade: employee?.nacionalidade || '',
      naturalidade: employee?.naturalidade || '',
      nome_mae: employee?.nome_mae || '',
      nome_pai: employee?.nome_pai || '',
      matricula: employee?.matricula || '',
      data_admissao: employee?.data_admissao || '',
      data_demissao: employee?.data_demissao || '',
      cargo_id: employee?.cargo_id || '',
      departamento_id: employee?.departamento_id || '',
      work_shift_id: employee?.work_shift_id || '',
      cost_center_id: employee?.cost_center_id || '',
      gestor_imediato_id: employee?.gestor_imediato_id || undefined,
      salario_base: employee?.salario_base ?? 0,
      status: employee?.status || 'ativo',
      requer_registro_ponto: employee?.requer_registro_ponto ?? true,
      location_zone_ids: [], // Será carregado separadamente
      user_id: employee?.user_id || 'none',
      tipo_contrato_trabalho: employee?.tipo_contrato_trabalho || undefined,
      vinculo_periculosidade: employee?.vinculo_periculosidade || false,
      vinculo_insalubridade: employee?.vinculo_insalubridade || false,
      grau_insalubridade: employee?.grau_insalubridade || undefined,
      
      // Documentos pessoais - Título de Eleitor
      titulo_eleitor: employee?.titulo_eleitor || '',
      titulo_eleitor_zona: employee?.titulo_eleitor_zona || '',
      titulo_eleitor_secao: employee?.titulo_eleitor_secao || '',
      
      // Documentos pessoais - CTPS
      ctps: employee?.ctps || '',
      ctps_serie: employee?.ctps_serie || '',
      ctps_uf: employee?.ctps_uf || '',
      ctps_data_emissao: employee?.ctps_data_emissao || '',
      
      // Documentos pessoais - CNH
      cnh_numero: employee?.cnh_numero || '',
      cnh_validade: employee?.cnh_validade || '',
      cnh_categoria: employee?.cnh_categoria || undefined,
      
      // Documentos pessoais - Outros
      certidao_nascimento: employee?.certidao_nascimento || '',
      certidao_casamento_numero: employee?.certidao_casamento_numero || '',
      certidao_casamento_data: employee?.certidao_casamento_data || '',
      certidao_uniao_estavel_numero: employee?.certidao_uniao_estavel_numero || '',
      certidao_uniao_estavel_data: employee?.certidao_uniao_estavel_data || '',
      pis_pasep: employee?.pis_pasep || '',
      certificado_reservista: employee?.certificado_reservista || '',
      comprovante_endereco: employee?.comprovante_endereco || '',
      foto_funcionario: employee?.foto_funcionario || '',
      escolaridade: employee?.escolaridade || '',
      cartao_sus: employee?.cartao_sus || '',
      registros_profissionais: employee?.registros_profissionais || {},
      outros_vinculos_empregaticios: employee?.outros_vinculos_empregaticios || false,
      detalhes_outros_vinculos: employee?.detalhes_outros_vinculos || '',
      
      // Deficiência
      possui_deficiencia: employee?.possui_deficiencia || false,
      deficiencia_tipo_id: employee?.deficiencia_tipo_id || '',
      deficiencia_grau: employee?.deficiencia_grau || undefined,
      deficiencia_laudo_url: employee?.deficiencia_laudo_url || '',
      
      // RNE (Registro Nacional de Estrangeiro)
      rne_numero: employee?.rne_numero || '',
      rne_orgao: employee?.rne_orgao || '',
      rne_data_expedicao: employee?.rne_data_expedicao || '',
      
      // Dados bancários
      banco_nome: employee?.banco_nome || '',
      banco_agencia: employee?.banco_agencia || '',
      banco_conta: employee?.banco_conta || '',
      banco_tipo_conta: employee?.banco_tipo_conta || undefined,
      banco_pix: employee?.banco_pix || '',
    },
  });

  // Carregar zonas de localização do funcionário quando estiver editando
  // Este useEffect deve estar DEPOIS da inicialização do form
  useEffect(() => {
    let isMounted = true;
    
    const loadEmployeeLocationZones = async () => {
      if (!isMounted) return;
      
      if (employee?.id && selectedCompany?.id) {
        try {
          const relationships = await EmployeeLocationZonesService.getByEmployeeId(
            employee.id,
            selectedCompany.id
          );
          
          if (!isMounted) return;
          
          const zoneIds = relationships.map(rel => rel.location_zone_id);
          const currentIds = form.getValues('location_zone_ids') || [];
          
          // Só atualizar se os valores forem diferentes para evitar loops
          if (JSON.stringify(zoneIds.sort()) !== JSON.stringify(currentIds.sort())) {
            form.setValue('location_zone_ids', zoneIds, { shouldDirty: false, shouldValidate: false });
          }
        } catch (error) {
          console.error('Erro ao carregar zonas de localização do funcionário:', error);
        }
      } else if (!employee?.id) {
        // Se não há employee, garantir que está vazio
        const currentIds = form.getValues('location_zone_ids') || [];
        if (currentIds.length > 0) {
          form.setValue('location_zone_ids', [], { shouldDirty: false, shouldValidate: false });
        }
      }
    };

    loadEmployeeLocationZones();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, selectedCompany?.id]);

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

  // Função para preencher dados do usuário selecionado
  const handleUserSelection = (userId: string) => {
    if (!userId || userId === 'none') {
      // Se não selecionou usuário ou selecionou "none", limpar campos
      form.setValue('nome', '');
      form.setValue('email', '');
      return;
    }

    const selectedUser = availableUsers.find(user => user.id === userId);
    if (selectedUser) {
      // Preencher automaticamente nome e email do usuário
      form.setValue('nome', selectedUser.nome);
      form.setValue('email', selectedUser.email);
    }
  };

  // Mapeamento de campos obrigatórios por aba
  const requiredFieldsByTab: Record<string, string[]> = {
    personal: ['nome', 'cpf'],
    professional: ['data_admissao'],
    additional: [],
    documents: [],
    banking: [],
    education: [],
    contact: [],
    address: ['estado'],
  };

  // Função para verificar quais abas têm erros
  const getTabsWithErrors = () => {
    const errors = form.formState.errors;
    const tabsWithErrors: string[] = [];
    
    Object.keys(requiredFieldsByTab).forEach((tab) => {
      const fields = requiredFieldsByTab[tab];
      const hasError = fields.some(field => errors[field as keyof typeof errors]);
      if (hasError) {
        tabsWithErrors.push(tab);
      }
    });
    
    return tabsWithErrors;
  };

  // Função para obter mensagens de erro por aba
  const getErrorMessagesByTab = () => {
    const errors = form.formState.errors;
    const errorMessages: Record<string, string[]> = {};
    
    Object.keys(requiredFieldsByTab).forEach((tab) => {
      const fields = requiredFieldsByTab[tab];
      const tabErrors: string[] = [];
      
      fields.forEach(field => {
        const error = errors[field as keyof typeof errors];
        if (error) {
          const fieldName = field === 'nome' ? 'Nome' : 
                           field === 'cpf' ? 'CPF' : 
                           field === 'data_admissao' ? 'Data de Admissão' :
                           field === 'estado' ? 'Estado' : field;
          tabErrors.push(fieldName);
        }
      });
      
      if (tabErrors.length > 0) {
        errorMessages[tab] = tabErrors;
      }
    });
    
    return errorMessages;
  };

  // Handlers
  const handleSubmit = async (data: EmployeeFormData) => {
    setHasTriedSubmit(true);
    setIsSubmitting(true);
    
    try {
      // Converter "none" para null para o user_id
      const submitData = {
        ...data,
        user_id: data.user_id === 'none' ? null : data.user_id
      };
      
      // Enviar todos os dados incluindo location_zone_ids
      // O componente pai será responsável por sincronizar as zonas
      await onSubmit(submitData as any);
      
      // Se estiver editando, sincronizar as zonas aqui também (backup)
      // O componente pai também fará isso, mas fazemos aqui para garantir
      if (mode === 'edit' && employee?.id && selectedCompany?.id) {
        await EmployeeLocationZonesService.syncEmployeeZones(
          employee.id,
          data.location_zone_ids,
          selectedCompany.id
        );
      }
      
      setHasTriedSubmit(false);
    } catch (error) {
      // Re-lançar o erro para que seja tratado pelo componente pai
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === 'view';

  // Expor função de submit para o componente pai
  useImperativeHandle(ref, () => ({
    submit: () => {
      return new Promise<{ success: boolean; validationError?: boolean }>((resolve) => {
        const submitHandler = form.handleSubmit(
          async (data) => {
            try {
              await handleSubmit(data);
              resolve({ success: true });
            } catch (error) {
              // Em caso de erro no submit, resolver com success: false
              resolve({ success: false });
            }
          },
          (errors) => {
            // Se houver erros de validação, navegar para a primeira aba com erro
            setHasTriedSubmit(true);
            const tabsWithErrors = getTabsWithErrors();
            if (tabsWithErrors.length > 0) {
              setActiveTab(tabsWithErrors[0]);
            }
            // Resolver com indicador de erro de validação (não rejeitar para evitar unhandled rejection)
            resolve({ success: false, validationError: true });
          }
        );
        submitHandler();
      });
    }
  }));

  // Atualizar erros quando o formulário mudar
  const tabsWithErrors = getTabsWithErrors();
  const errorMessagesByTab = getErrorMessagesByTab();
  
  // Resetar hasTriedSubmit quando todos os erros forem corrigidos
  useEffect(() => {
    if (hasTriedSubmit && tabsWithErrors.length === 0) {
      setHasTriedSubmit(false);
    }
  }, [hasTriedSubmit, tabsWithErrors.length]);
  const tabLabels: Record<string, string> = {
    personal: 'Dados Pessoais',
    additional: 'Dados Adicionais',
    documents: 'Documentos',
    banking: 'Dados Bancários',
    education: 'Escolaridade',
    professional: 'Profissionais',
    contact: 'Contato',
    address: 'Endereço',
  };

  return (
    <Form {...form}>
      <form id="employee-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Alerta de campos obrigatórios não preenchidos */}
        {hasTriedSubmit && tabsWithErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Campos obrigatórios não preenchidos</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-1">
                {Object.entries(errorMessagesByTab).map(([tab, fields]) => (
                  <div key={tab} className="text-sm">
                    <strong>{tabLabels[tab]}:</strong> {fields.join(', ')}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs">
                Navegue pelas abas destacadas em vermelho para preencher os campos obrigatórios.
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${mode === 'view' ? 'grid-cols-10' : 'grid-cols-9'} mb-8 gap-1`}>
            <TabsTrigger 
              value="personal" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('personal') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Dados Pessoais
                {tabsWithErrors.includes('personal') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="additional" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('additional') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Dados Adicionais
                {tabsWithErrors.includes('additional') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('documents') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Documentos
                {tabsWithErrors.includes('documents') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="banking" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('banking') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Dados Bancários
                {tabsWithErrors.includes('banking') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="education" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('education') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Escolaridade
                {tabsWithErrors.includes('education') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="professional" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('professional') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Profissionais
                {tabsWithErrors.includes('professional') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="contact" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('contact') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Contato
                {tabsWithErrors.includes('contact') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="address" 
              className={`text-sm px-2 py-2 relative ${tabsWithErrors.includes('address') ? 'text-red-600 font-semibold' : ''}`}
            >
              <span className="flex items-center gap-1">
                Endereço
                {tabsWithErrors.includes('address') && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full">
                    !
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="attachments" 
              className="text-sm px-2 py-2"
            >
              <span className="flex items-center gap-1">
                Anexos
              </span>
            </TabsTrigger>
            {mode === 'view' && (
              <TabsTrigger 
                value="dependents" 
                className="text-sm px-2 py-2"
              >
                <span className="flex items-center gap-1">
                  Dependentes
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* DADOS PESSOAIS */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Informações básicas do funcionário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Campo de seleção de usuário - apenas para criação */}
                {mode === 'create' && (
                  <FormField
                    control={form.control}
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Vincular a Usuário Existente
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleUserSelection(value);
                          }} 
                          value={field.value || 'none'}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um usuário (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                Não vincular a usuário
                              </div>
                            </SelectItem>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  {user.nome} - {user.email}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecione um usuário para vincular automaticamente os dados. 
                          {availableUsers.length === 0 && (
                            <span className="text-amber-600 font-medium">
                              {' '}Nenhum usuário disponível para vínculo.
                            </span>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            disabled={isReadOnly || (mode === 'create' && form.watch('user_id') && form.watch('user_id') !== 'none')}
                          />
                        </FormControl>
                        {mode === 'create' && form.watch('user_id') && form.watch('user_id') !== 'none' && (
                          <FormDescription>
                            Preenchido automaticamente pelo usuário selecionado
                          </FormDescription>
                        )}
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
                    name="rg_orgao_emissor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão Emissor do RG</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Ex: SSP, IFP"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rg_uf_emissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF de Emissão do RG</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="UF"
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
                    name="rg_data_emissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Emissão do RG</FormLabel>
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

          {/* DADOS PESSOAIS ADICIONAIS */}
          <TabsContent value="additional" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Dados Pessoais Adicionais
                </CardTitle>
                <CardDescription>
                  Informações complementares do funcionário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="estado_civil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado Civil</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado civil" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                            <SelectItem value="uniao_estavel">União Estável</SelectItem>
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
                          <Input 
                            {...field} 
                            placeholder="Nacionalidade"
                            disabled={isReadOnly}
                          />
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
                          <Input 
                            {...field} 
                            placeholder="Cidade de nascimento"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome_mae"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Mãe</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome completo da mãe"
                            disabled={isReadOnly}
                          />
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
                          <Input 
                            {...field} 
                            placeholder="Nome completo do pai"
                            disabled={isReadOnly}
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                            <SelectItem value="nao_informar">Não informar</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orientacao_sexual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orientação Sexual</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a orientação sexual" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="heterossexual">Heterossexual</SelectItem>
                            <SelectItem value="homossexual">Homossexual</SelectItem>
                            <SelectItem value="bissexual">Bissexual</SelectItem>
                            <SelectItem value="pansexual">Pansexual</SelectItem>
                            <SelectItem value="assexual">Assexual</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                            <SelectItem value="nao_informar">Não informar</SelectItem>
                            <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="possui_deficiencia"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Possui deficiência (PCD)
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('possui_deficiencia') && (
                    <>
                      <FormField
                        control={form.control}
                        name="deficiencia_tipo_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Deficiência</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo de deficiência" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {deficiencyTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.nome}
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
                        name="deficiencia_grau"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grau da Deficiência</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o grau" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="leve">Leve</SelectItem>
                                <SelectItem value="moderada">Moderada</SelectItem>
                                <SelectItem value="severa">Severa</SelectItem>
                                <SelectItem value="profunda">Profunda</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deficiencia_laudo_url"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>URL do Laudo Médico da Deficiência</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="URL do anexo do laudo"
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormDescription>
                              Link ou caminho para o arquivo do laudo médico
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTOS PESSOAIS */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Documentos Pessoais
                </CardTitle>
                <CardDescription>
                  Documentos obrigatórios para admissão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="certidao_nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certidão de Nascimento</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da certidão"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certidao_casamento_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Certidão de Casamento</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da certidão"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certidao_casamento_data"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Certidão de Casamento</FormLabel>
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
                    name="certidao_uniao_estavel_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Certidão de União Estável</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da certidão"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certidao_uniao_estavel_data"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Certidão de União Estável</FormLabel>
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
                    name="titulo_eleitor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título de Eleitor</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número do título de eleitor"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="titulo_eleitor_zona"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zona Eleitoral</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Zona"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="titulo_eleitor_secao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seção Eleitoral</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Seção"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ctps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carteira de Trabalho (CTPS)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da CTPS"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormDescription>
                          Física ou digital (CTPS Digital)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ctps_serie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Série da CTPS</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Série"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ctps_uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF de Emissão da CTPS</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="UF"
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
                    name="ctps_data_emissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Emissão da CTPS</FormLabel>
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
                    name="pis_pasep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIS/PASEP</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número do PIS/PASEP ou NIS/NIT"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certificado_reservista"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Certificado de Reservista</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número do certificado (homens até 45 anos)"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnh_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da CNH</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da CNH"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnh_validade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validade da CNH</FormLabel>
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
                    name="cnh_categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria da CNH</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A">A - Motocicleta</SelectItem>
                            <SelectItem value="B">B - Automóvel</SelectItem>
                            <SelectItem value="C">C - Caminhão</SelectItem>
                            <SelectItem value="D">D - Ônibus</SelectItem>
                            <SelectItem value="E">E - Carreta</SelectItem>
                            <SelectItem value="AB">AB - Motocicleta e Automóvel</SelectItem>
                            <SelectItem value="AC">AC - Motocicleta e Caminhão</SelectItem>
                            <SelectItem value="AD">AD - Motocicleta e Ônibus</SelectItem>
                            <SelectItem value="AE">AE - Motocicleta e Carreta</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rne_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do RNE</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Registro Nacional de Estrangeiro"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rne_orgao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão Emissor do RNE</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Órgão emissor"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rne_data_expedicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Expedição do RNE</FormLabel>
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
                    name="comprovante_endereco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comprovante de Endereço</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Comprovante atualizado (últimos 3 meses)"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cartao_sus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cartão do SUS</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número do cartão do SUS"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="foto_funcionario"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormControl>
                          <ImageUpload
                            value={field.value || ''}
                            onChange={field.onChange}
                            disabled={isReadOnly}
                            label="Foto do Funcionário"
                            description="Faça upload da foto do funcionário"
                            maxSize={5}
                            acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
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

          {/* DADOS BANCÁRIOS */}
          <TabsContent value="banking" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Dados Bancários
                </CardTitle>
                <CardDescription>
                  Informações da conta bancária do funcionário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="banco_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Banco</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome do banco"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="banco_agencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da agência"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="banco_conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Número da conta"
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="banco_tipo_conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Conta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de conta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Conta Poupança</SelectItem>
                            <SelectItem value="salario">Conta Salário</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Preferencialmente conta corrente ou salário, sem ser conjunta
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="banco_pix"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Chave PIX</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Chave PIX (CPF, email, telefone ou chave aleatória)"
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

          {/* ESCOLARIDADE E FORMAÇÃO */}
          <TabsContent value="education" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Escolaridade e Formação
                </CardTitle>
                <CardDescription>
                  Informações educacionais e registros profissionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="escolaridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escolaridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a escolaridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                            <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                            <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                            <SelectItem value="medio_completo">Médio Completo</SelectItem>
                            <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                            <SelectItem value="superior_completo">Superior Completo</SelectItem>
                            <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                            <SelectItem value="mestrado">Mestrado</SelectItem>
                            <SelectItem value="doutorado">Doutorado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outros_vinculos_empregaticios"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={isReadOnly}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Possui outros vínculos empregatícios
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('outros_vinculos_empregaticios') && (
                    <FormField
                      control={form.control}
                      name="detalhes_outros_vinculos"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Detalhes dos Outros Vínculos</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Descreva os outros vínculos empregatícios"
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Registros Profissionais */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Registros Profissionais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">CREA</Label>
                      <Input 
                        placeholder="Número do CREA"
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const current = form.getValues('registros_profissionais') || {};
                          form.setValue('registros_profissionais', { ...current, crea: e.target.value });
                        }}
                        defaultValue={form.getValues('registros_profissionais')?.crea || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">CRM</Label>
                      <Input 
                        placeholder="Número do CRM"
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const current = form.getValues('registros_profissionais') || {};
                          form.setValue('registros_profissionais', { ...current, crm: e.target.value });
                        }}
                        defaultValue={form.getValues('registros_profissionais')?.crm || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">OAB</Label>
                      <Input 
                        placeholder="Número da OAB"
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const current = form.getValues('registros_profissionais') || {};
                          form.setValue('registros_profissionais', { ...current, oab: e.target.value });
                        }}
                        defaultValue={form.getValues('registros_profissionais')?.oab || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">COREN</Label>
                      <Input 
                        placeholder="Número do COREN"
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const current = form.getValues('registros_profissionais') || {};
                          form.setValue('registros_profissionais', { ...current, coren: e.target.value });
                        }}
                        defaultValue={form.getValues('registros_profissionais')?.coren || ''}
                      />
                    </div>
                  </div>
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
                          value={field.value || ''}
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
                          value={field.value || ''}
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
                    name="work_shift_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turno de Trabalho</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um turno" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workShifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {shift.nome} - {shift.hora_inicio} às {shift.hora_fim}
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
                    name="cost_center_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Custo</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um centro de custo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {costCenters.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.nome} - {center.codigo}
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
                    name="gestor_imediato_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gestor Imediato</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um gestor imediato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableManagers.length === 0 ? (
                              <SelectItem value="none" disabled>
                                Nenhum usuário disponível
                              </SelectItem>
                            ) : (
                              availableManagers
                                .filter(user => {
                                  // Não pode ser o próprio funcionário se ele tiver user_id
                                  if (employee?.user_id && user.id === employee.user_id) {
                                    return false;
                                  }
                                  return true;
                                })
                                .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.nome} - {user.email}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecione um usuário como gestor imediato. Pode ser um funcionário ou usuário terceirizado.
                        </FormDescription>
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
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              className="pl-10"
                              value={field.value && field.value > 0 ? field.value : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(0);
                                } else {
                                  const numValue = parseFloat(value);
                                  field.onChange(isNaN(numValue) ? 0 : numValue);
                                }
                              }}
                              onBlur={field.onBlur}
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
                    name="tipo_contrato_trabalho"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Contrato de Trabalho</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de contrato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CLT">CLT - Consolidação das Leis do Trabalho</SelectItem>
                            <SelectItem value="PJ">PJ - Pessoa Jurídica</SelectItem>
                            <SelectItem value="Estagiario">Estagiário</SelectItem>
                            <SelectItem value="Menor_Aprendiz">Menor Aprendiz</SelectItem>
                            <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                            <SelectItem value="Autonomo">Autônomo</SelectItem>
                            <SelectItem value="Cooperado">Cooperado</SelectItem>
                            <SelectItem value="Temporario">Temporário</SelectItem>
                            <SelectItem value="Intermitente">Intermitente</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vinculo_periculosidade"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Vínculo a Periculosidade
                          </FormLabel>
                          <FormDescription>
                            Funcionário trabalha em condições de periculosidade
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vinculo_insalubridade"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Vínculo a Insalubridade
                          </FormLabel>
                          <FormDescription>
                            Funcionário trabalha em condições insalubres
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('vinculo_insalubridade') && (
                    <FormField
                      control={form.control}
                      name="grau_insalubridade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grau de Insalubridade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o grau" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="minimo">Mínimo</SelectItem>
                              <SelectItem value="medio">Médio</SelectItem>
                              <SelectItem value="maximo">Máximo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
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
                            <SelectItem value="aposentado">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                Aposentado
                              </div>
                            </SelectItem>
                            <SelectItem value="licenca">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                Licença
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requer_registro_ponto"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={isReadOnly}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Requer Registro de Ponto
                          </FormLabel>
                          <FormDescription>
                            Baseado no Artigo 62 da CLT. Desmarque se o funcionário não precisa registrar ponto (ex: gerentes, confiança).
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location_zone_ids"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="flex items-center gap-2">
                          <Navigation className="h-4 w-4" />
                          Zonas de Localização para Registro de Ponto
                        </FormLabel>
                        <div className="space-y-3 border rounded-lg p-4">
                          {locationZonesLoading ? (
                            <div className="text-sm text-muted-foreground">Carregando zonas...</div>
                          ) : locationZones.length === 0 ? (
                            <div className="text-sm text-amber-600 font-medium">
                              Nenhuma zona de localização cadastrada. Configure em RH → Zonas de Localização.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {locationZones.map((zone) => {
                                const isChecked = field.value?.includes(zone.id) || false;
                                return (
                                  <div
                                    key={zone.id}
                                    className="flex items-center space-x-3 p-2 rounded-md border hover:bg-accent"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (isReadOnly) return;
                                        const currentIds = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentIds, zone.id]);
                                        } else {
                                          field.onChange(currentIds.filter(id => id !== zone.id));
                                        }
                                      }}
                                      disabled={isReadOnly}
                                    />
                                    <div className="flex-1">
                                      <label 
                                        className="text-sm font-medium cursor-pointer"
                                        onClick={(e) => {
                                          if (isReadOnly) return;
                                          e.preventDefault();
                                          const currentIds = field.value || [];
                                          if (isChecked) {
                                            field.onChange(currentIds.filter(id => id !== zone.id));
                                          } else {
                                            field.onChange([...currentIds, zone.id]);
                                          }
                                        }}
                                      >
                                        {zone.nome}
                                      </label>
                                      {zone.descricao && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {zone.descricao}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Raio: {zone.raio_metros}m
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <FormDescription>
                          Selecione uma ou mais zonas de localização onde o funcionário pode registrar ponto. 
                          Se nenhuma for selecionada, não haverá restrição de localização.
                        </FormDescription>
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
                            disabled={isReadOnly || (mode === 'create' && form.watch('user_id') && form.watch('user_id') !== 'none')}
                          />
                        </FormControl>
                        {mode === 'create' && form.watch('user_id') && form.watch('user_id') !== 'none' && (
                          <FormDescription>
                            Preenchido automaticamente pelo usuário selecionado
                          </FormDescription>
                        )}
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
                        <FormLabel>Estado *</FormLabel>
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

          {/* ANEXOS */}
          <TabsContent value="attachments" className="space-y-4">
            <EmployeeDocumentsTab 
              employeeId={employee?.id || null}
              mode={mode}
            />
          </TabsContent>

          {/* DEPENDENTES - Apenas no modo view */}
          {mode === 'view' && employee?.id && (
            <TabsContent value="dependents" className="space-y-4">
              <EmployeeDependentsViewTab 
                employeeId={employee.id}
                employeeName={employee.nome}
                employeeMatricula={employee.matricula}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* BOTÕES REMOVIDOS - FormModal controla as ações */}
      </form>
    </Form>
  );
});

EmployeeForm.displayName = 'EmployeeForm';

export default EmployeeForm;
