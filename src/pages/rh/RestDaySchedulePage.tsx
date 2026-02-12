import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  User,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { RestDayScheduleService, RestDaySchedule } from '@/services/rh/restDayScheduleService';
import { useRHData } from '@/hooks/generic/useEntityData';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';

function RestDaySchedulePageContent() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [restDays, setRestDays] = useState<RestDaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRestDay, setSelectedRestDay] = useState<RestDaySchedule | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    data_folga: '',
    horas_descontar: '',
    observacoes: '',
  });

  // Buscar funcionários
  const { data: employeesData } = useRHData('employees', selectedCompany?.id || '');

  useEffect(() => {
    if (selectedCompany?.id) {
      loadRestDays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id, dateFilter.startDate, dateFilter.endDate]);

  const loadRestDays = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const result = await RestDayScheduleService.list({
        company_id: selectedCompany.id,
        data_inicio: dateFilter.startDate || undefined,
        data_fim: dateFilter.endDate || undefined,
        limit: 1000,
      });
      setRestDays(result.data);
    } catch (error: any) {
      console.error('Erro ao carregar escala de folga:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar escala de folga: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany?.id) {
      toast({
        title: 'Erro',
        description: 'Nenhuma empresa selecionada',
        variant: 'destructive',
      });
      return;
    }

    try {
      await RestDayScheduleService.create({
        employee_id: formData.employee_id,
        company_id: selectedCompany.id,
        data_folga: formData.data_folga,
        horas_descontar: formData.horas_descontar ? parseFloat(formData.horas_descontar) : null,
        observacoes: formData.observacoes || null,
      }, user?.id);

      toast({
        title: 'Sucesso',
        description: 'Dia de folga registrado com sucesso! As horas foram descontadas do banco de horas.',
      });

      setShowForm(false);
      setFormData({
        employee_id: '',
        data_folga: '',
        horas_descontar: '',
        observacoes: '',
      });
      loadRestDays();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao registrar dia de folga: ' + (error.message || 'Erro desconhecido'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedRestDay) return;

    try {
      await RestDayScheduleService.remove(selectedRestDay.id);
      toast({
        title: 'Sucesso',
        description: 'Dia de folga removido com sucesso! O débito foi revertido no banco de horas.',
      });
      setShowDeleteDialog(false);
      setSelectedRestDay(null);
      loadRestDays();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover dia de folga: ' + (error.message || 'Erro desconhecido'),
        variant: 'destructive',
      });
    }
  };

  const filteredRestDays = restDays.filter(restDay => {
    const matchesSearch = 
      (restDay.employee?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (restDay.employee?.matricula || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma empresa selecionada. Selecione uma empresa para acessar a escala de folga.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escala de Folga</h1>
          <p className="text-muted-foreground">
            Gerencie dias de folga adicionais para funcionários e desconte horas do banco de horas
          </p>
        </div>
        <PermissionButton
          path="/rh/rest-day-schedule*"
          action="create"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Folga
        </PermissionButton>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Ao inserir um dia de folga, as horas correspondentes serão automaticamente descontadas do banco de horas do funcionário. 
          Se não especificar a quantidade de horas, será usado o valor padrão do turno do funcionário.
        </AlertDescription>
      </Alert>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por funcionário ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Dias de Folga Registrados</CardTitle>
          <CardDescription>
            {filteredRestDays.length} dia(s) de folga encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Carregando escala de folga...</p>
            </div>
          ) : filteredRestDays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum dia de folga registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Data da Folga</TableHead>
                  <TableHead>Horas Descontadas</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Data de Registro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestDays.map((restDay) => (
                  <TableRow key={restDay.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{restDay.employee?.nome || 'N/A'}</div>
                          {restDay.employee?.matricula && (
                            <div className="text-sm text-muted-foreground">
                              Matrícula: {restDay.employee.matricula}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(restDay.data_folga).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Clock className="h-3 w-3" />
                        {restDay.horas_descontar || 'Automático'}h
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {restDay.observacoes || (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(restDay.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionButton
                        path="/rh/rest-day-schedule*"
                        action="delete"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRestDay(restDay);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </PermissionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Folga</DialogTitle>
            <DialogDescription>
              Registre um dia de folga adicional para um funcionário. As horas serão descontadas automaticamente do banco de horas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Funcionário *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesData && employeesData.length > 0 ? (
                      employeesData.map((employee: any) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nome} {employee.matricula && `(${employee.matricula})`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-employees" disabled>
                        Nenhum funcionário encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_folga">Data da Folga *</Label>
                <Input
                  id="data_folga"
                  type="date"
                  value={formData.data_folga}
                  onChange={(e) => setFormData({ ...formData, data_folga: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horas_descontar">
                  Horas a Descontar (opcional)
                </Label>
                <Input
                  id="horas_descontar"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.horas_descontar}
                  onChange={(e) => setFormData({ ...formData, horas_descontar: e.target.value })}
                  placeholder="Deixe em branco para usar horas do turno"
                />
                <p className="text-sm text-muted-foreground">
                  Se não especificar, será usado o valor padrão do turno do funcionário
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a folga (opcional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    employee_id: '',
                    data_folga: '',
                    horas_descontar: '',
                    observacoes: '',
                  });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Registrar Folga</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este dia de folga? O débito no banco de horas será revertido automaticamente.
              {selectedRestDay && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p><strong>Funcionário:</strong> {selectedRestDay.employee?.nome}</p>
                  <p><strong>Data:</strong> {new Date(selectedRestDay.data_folga).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Horas:</strong> {selectedRestDay.horas_descontar || 'Automático'}h</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RestDaySchedulePage() {
  return (
    <RequirePage path="/rh/rest-day-schedule*">
      <RestDaySchedulePageContent />
    </RequirePage>
  );
}
