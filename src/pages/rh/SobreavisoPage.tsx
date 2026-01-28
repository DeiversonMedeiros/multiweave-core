import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Clock, AlertCircle } from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { SobreavisoForm } from '@/components/rh/SobreavisoForm';
import {
  useSobreavisoEscalas,
  useCreateSobreavisoEscala,
  useUpdateSobreavisoEscala,
  useDeleteSobreavisoEscala,
} from '@/hooks/rh/useSobreaviso';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { SobreavisoEscala } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { toast } from '@/hooks/use-toast';

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return s;
  }
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v);
}

export default function SobreavisoPage() {
  const { selectedCompany } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEscala, setSelectedEscala] = useState<SobreavisoEscala | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  const { data: escalas = [], isLoading, refetch } = useSobreavisoEscalas();
  const createMutation = useCreateSobreavisoEscala();
  const updateMutation = useUpdateSobreavisoEscala();
  const deleteMutation = useDeleteSobreavisoEscala();
  const { data: employeesData } = useEmployees();
  const employees = (employeesData?.data || []).map((e: { id: string; nome: string; salario_base?: number }) => ({
    id: e.id,
    nome: e.nome,
    salario_base: e.salario_base,
  }));

  const handleCreate = () => {
    setSelectedEscala(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (item: SobreavisoEscala) => {
    setSelectedEscala(item);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (item: SobreavisoEscala) => {
    setSelectedEscala(item);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta escala de sobreaviso?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Escala de sobreaviso excluída.');
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir. Tente novamente.');
    }
  };

  const handleSave = async (data: Partial<SobreavisoEscala>) => {
    try {
      if (selectedEscala?.id) {
        await updateMutation.mutateAsync({ id: selectedEscala.id, data });
        toast.success('Escala de sobreaviso atualizada.');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Escala de sobreaviso cadastrada.');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar. Verifique os dados e tente novamente.');
    }
  };

  const getEmployeeName = (employeeId: string) =>
    employees.find((e) => e.id === employeeId)?.nome ?? employeeId?.slice(0, 8) ?? '-';

  const columns = [
    {
      key: 'employee_nome',
      header: 'Funcionário',
      render: (item: SobreavisoEscala) =>
        (item as any).employee_nome ?? getEmployeeName(item.employee_id),
    },
    {
      key: 'data_escala',
      header: 'Data',
      render: (item: SobreavisoEscala) => formatDate(item.data_escala),
    },
    {
      key: 'duracao_horas',
      header: 'Duração',
      render: (item: SobreavisoEscala) => `${item.duracao_horas} h`,
    },
    {
      key: 'valor_pago',
      header: 'Valor (1/3)',
      render: (item: SobreavisoEscala) => formatCurrency(item.valor_pago),
    },
    {
      key: 'referencia',
      header: 'Ref.',
      render: (item: SobreavisoEscala) =>
        `${String(item.mes_referencia).padStart(2, '0')}/${item.ano_referencia}`,
    },
    {
      key: 'folha_processada',
      header: 'Folha',
      render: (item: SobreavisoEscala) =>
        item.folha_processada ? (
          <span className="text-muted-foreground text-xs">Processada</span>
        ) : (
          <span className="text-amber-600 text-xs">Pendente</span>
        ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item: SobreavisoEscala) => (
        <TableActions
          onView={() => handleView(item)}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item.id)}
        />
      ),
    },
  ];

  return (
    <RequirePage pagePath="/rh/sobreaviso*" action="read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sobreaviso</h1>
            <p className="text-muted-foreground">
              Escalas de sobreaviso: regime de espera remunerado com 1/3 da hora normal (Súmula 428 TST). Máx. 24h por escala.
            </p>
          </div>
          <PermissionButton page="/rh/sobreaviso*" action="create" onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova escala
          </PermissionButton>
        </div>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Regras (CLT e Súmula 428 TST)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Remuneração: 1/3 do valor da hora normal.</p>
            <p>• Cada escala não pode exceder 24 horas.</p>
            <p>• Reflexos: férias, 13º salário, folha, DSR e FGTS.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Escalas de sobreaviso
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cadastre e consulte as escalas para inclusão na folha de pagamento.
            </p>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              data={escalas}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Buscar por funcionário ou data..."
            />
          </CardContent>
        </Card>

        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'create' ? 'Nova escala de sobreaviso' : modalMode === 'edit' ? 'Editar escala' : 'Detalhes da escala'}
          description="Regime de espera: 1/3 da hora normal. Máximo 24 horas por escala."
          showFooter={false}
          size="md"
        >
          <SobreavisoForm
            escala={selectedEscala ?? undefined}
            mode={modalMode}
            employees={employees}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </FormModal>
      </div>
    </RequirePage>
  );
}
