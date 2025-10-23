import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Employee, Unit, Position } from '@/integrations/supabase/rh-types';

// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================

const unitSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  codigo: z.string().optional(),
  responsavel_id: z.string().optional(),
});

const employeeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  matricula: z.string().optional(),
  cpf: z.string().min(11, 'CPF deve ter pelo menos 11 dígitos'),
  rg: z.string().optional(),
  data_nascimento: z.string().optional(),
  data_admissao: z.string().min(1, 'Data de admissão é obrigatória'),
  cargo_id: z.string().optional(),
  departamento_id: z.string().optional(),
  salario_base: z.number().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  manager_id: z.string().optional(),
});

// =====================================================
// TIPOS
// =====================================================

export interface OrganogramaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  mode: 'unit' | 'employee';
  initialData?: Unit | Employee;
  units: Unit[];
  employees: Employee[];
  positions: Position[];
  parentUnitId?: string;
}

type UnitFormData = z.infer<typeof unitSchema>;
type EmployeeFormData = z.infer<typeof employeeSchema>;

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function OrganogramaForm({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  units,
  employees,
  positions,
  parentUnitId
}: OrganogramaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UnitFormData | EmployeeFormData>({
    resolver: zodResolver(mode === 'unit' ? unitSchema : employeeSchema),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    if (initialData) {
      if (mode === 'unit') {
        const unit = initialData as Unit;
        return {
          nome: unit.nome || '',
          descricao: unit.descricao || '',
          codigo: unit.codigo || '',
          responsavel_id: unit.responsavel_id || 'none',
        };
      } else {
        const employee = initialData as Employee;
        return {
          nome: employee.nome || '',
          matricula: employee.matricula || '',
          cpf: employee.cpf || '',
          rg: employee.rg || '',
          data_nascimento: employee.data_nascimento || '',
          data_admissao: employee.data_admissao || '',
          cargo_id: employee.cargo_id || '',
          departamento_id: employee.departamento_id || parentUnitId || '',
          salario_base: employee.salario_base || 0,
          telefone: employee.telefone || '',
          email: employee.email || '',
          endereco: employee.endereco || '',
          cidade: employee.cidade || '',
          estado: employee.estado || '',
          cep: employee.cep || '',
          manager_id: employee.manager_id || 'none',
        };
      }
    }

    if (mode === 'unit') {
      return {
        nome: '',
        descricao: '',
        codigo: '',
        responsavel_id: 'none',
      };
    } else {
      return {
        nome: '',
        matricula: '',
        cpf: '',
        rg: '',
        data_nascimento: '',
        data_admissao: '',
        cargo_id: '',
        departamento_id: parentUnitId || '',
        salario_base: 0,
        telefone: '',
        email: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        manager_id: 'none',
      };
    }
  }

  const handleSubmit = async (data: UnitFormData | EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      // Processar dados para converter "none" em undefined/null
      const processedData = { ...data };
      
      if (mode === 'unit') {
        const unitData = processedData as UnitFormData;
        if (unitData.responsavel_id === 'none') {
          unitData.responsavel_id = undefined;
        }
      } else {
        const employeeData = processedData as EmployeeFormData;
        if (employeeData.manager_id === 'none') {
          employeeData.manager_id = undefined;
        }
        if (employeeData.position_id === 'none') {
          employeeData.position_id = undefined;
        }
      }
      
      await onSubmit(processedData);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar' : 'Adicionar'} {mode === 'unit' ? 'Departamento' : 'Funcionário'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'unit' 
              ? 'Preencha os dados do departamento para criar ou editar no organograma.'
              : 'Preencha os dados do funcionário para adicionar ao organograma.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {mode === 'unit' ? (
              <UnitFormFields form={form} units={units} employees={employees} />
            ) : (
              <EmployeeFormFields 
                form={form} 
                units={units} 
                employees={employees} 
                positions={positions} 
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : (initialData ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// CAMPOS DO FORMULÁRIO DE UNIDADE
// =====================================================

interface UnitFormFieldsProps {
  form: any;
  units: Unit[];
  employees: Employee[];
}

function UnitFormFields({ form, units, employees }: UnitFormFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Departamento *</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Recursos Humanos" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="descricao"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Descrição do departamento..."
                className="resize-none"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="codigo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input placeholder="Ex: RH" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsavel_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// =====================================================
// CAMPOS DO FORMULÁRIO DE FUNCIONÁRIO
// =====================================================

interface EmployeeFormFieldsProps {
  form: any;
  units: Unit[];
  employees: Employee[];
  positions: Position[];
}

function EmployeeFormFields({ form, units, employees, positions }: EmployeeFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Dados Pessoais */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Dados Pessoais</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="matricula"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matrícula</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF *</FormLabel>
                <FormControl>
                  <Input placeholder="000.000.000-00" {...field} />
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
                  <Input placeholder="00.000.000-0" {...field} />
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Dados Profissionais */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Dados Profissionais</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_admissao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Admissão *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
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
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="departamento_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            name="cargo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        </div>

        <FormField
          control={form.control}
          name="manager_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gerente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gerente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sem gerente</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Contato */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Contato</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} />
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

        <FormField
          control={form.control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input placeholder="Rua, número, bairro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
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

          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input placeholder="00000-000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
