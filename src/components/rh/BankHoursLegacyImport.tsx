import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, UploadCloud } from 'lucide-react';
import { useActiveEmployees } from '@/hooks/rh/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { useBankHoursLegacyImports } from '@/hooks/useBankHoursLegacyImports';
import { Employee } from '@/integrations/supabase/rh-types';

interface BankHoursLegacyImportProps {
  companyId: string;
}

const today = new Date().toISOString().split('T')[0];

export function BankHoursLegacyImport({ companyId }: BankHoursLegacyImportProps) {
  const { data: employees = [], isLoading: employeesLoading } = useActiveEmployees();
  const { toast } = useToast();
  const {
    imports,
    loading: importsLoading,
    importLegacyHours
  } = useBankHoursLegacyImports(companyId);

  const [form, setForm] = useState({
    employee_id: '',
    hours_amount: 0,
    reference_date: today,
    description: 'Importação de horas legadas'
  });

  const employeeOptions = useMemo(
    () =>
      (employees || []).map((employee: Employee) => ({
        id: employee.id,
        nome: employee.nome,
        matricula: employee.matricula
      })),
    [employees]
  );

  const employeeMap = useMemo(() => {
    return employeeOptions.reduce<Record<string, { nome: string; matricula?: string }>>((acc, employee) => {
      acc[employee.id] = { nome: employee.nome, matricula: employee.matricula };
      return acc;
    }, {});
  }, [employeeOptions]);

  const resetForm = () => {
    setForm({
      employee_id: '',
      hours_amount: 0,
      reference_date: today,
      description: 'Importação de horas legadas'
    });
  };

  const formatHours = (hours: number) => `${hours >= 0 ? '+' : ''}${hours.toFixed(2)}h`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.employee_id) {
      toast({
        title: 'Selecione um colaborador',
        description: 'É necessário escolher o colaborador que receberá as horas legadas.',
        variant: 'destructive'
      });
      return;
    }

    if (!form.hours_amount || form.hours_amount === 0) {
      toast({
        title: 'Informe a quantidade de horas',
        description: 'Use valores positivos para crédito e negativos para débito.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await importLegacyHours({
        employee_id: form.employee_id,
        hours_amount: form.hours_amount,
        description: form.description,
        reference_date: form.reference_date
      });

      toast({
        title: 'Horas importadas com sucesso',
        description: 'O saldo do colaborador foi atualizado e o registro ficou disponível no histórico.'
      });

      resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao importar horas',
        description: error instanceof Error ? error.message : 'Não foi possível concluir a importação.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <span>Importação de Horas Legadas</span>
          </CardTitle>
          <CardDescription>
            Lance saldos existentes antes da implantação. Cada importação gera um ajuste e fica registrada para auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertDescription>
              Use esta ferramenta para trazer o saldo atual dos colaboradores. É possível incluir valores positivos (crédito) ou negativos
              (débito), informando a data histórica correspondente.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select
                value={form.employee_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, employee_id: value }))}
                disabled={employeesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome}
                      {employee.matricula ? ` • ${employee.matricula}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input
                type="date"
                value={form.reference_date}
                max={today}
                onChange={(event) => setForm((prev) => ({ ...prev, reference_date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantidade de Horas</Label>
              <Input
                type="number"
                step="0.25"
                value={form.hours_amount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    hours_amount: Number(event.target.value)
                  }))
                }
                placeholder="Ex: 24 (positivo) ou -4 (negativo)"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Motivo do ajuste"
              />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Limpar
              </Button>
              <Button type="submit" disabled={importsLoading}>
                {importsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Importar Horas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <span>Últimas Importações</span>
          </CardTitle>
          <CardDescription>Histórico dos últimos lançamentos de horas legadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {importsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando histórico...
            </div>
          ) : imports.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhuma importação registrada até o momento. Utilize o formulário acima para adicionar as primeiras horas.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((item) => {
                    const employeeInfo = employeeMap[item.employee_id];
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{employeeInfo?.nome || 'Colaborador'}</span>
                            {employeeInfo?.matricula ? (
                              <span className="text-xs text-muted-foreground">Matrícula: {employeeInfo.matricula}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(item.reference_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge variant={item.hours_amount >= 0 ? 'default' : 'destructive'}>{formatHours(item.hours_amount)}</Badge>
                        </TableCell>
                        <TableCell>{item.description || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

