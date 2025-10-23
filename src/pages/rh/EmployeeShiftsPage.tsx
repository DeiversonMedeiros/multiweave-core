import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Clock,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeShifts, useCreateEmployeeShift, useUpdateEmployeeShift, useDeleteEmployeeShift } from '@/hooks/rh/useEmployeeShifts';
import { EmployeeSchedule } from '@/integrations/supabase/rh-types';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function EmployeeShiftsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<EmployeeSchedule | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    schedule_id: '',
    data_inicio: '',
    data_fim: '',
    is_active: true,
    observacoes: ''
  });

  // Hooks
  const { data: shifts = [], isLoading } = useEmployeeShifts();
  const createMutation = useCreateEmployeeShift();
  const updateMutation = useUpdateEmployeeShift();
  const deleteMutation = useDeleteEmployeeShift();

  const isEditing = Boolean(id && id !== 'new');

  useEffect(() => {
    if (isEditing && id) {
      // Buscar dados do turno específico se necessário
      // Por enquanto, vamos usar os dados já carregados pelo hook
    }
  }, [id, isEditing]);

  // Funções removidas - agora usando hooks

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ 
          id, 
          data: formData
        });
        
        toast({
          title: 'Sucesso',
          description: 'Turno de funcionário atualizado com sucesso!'
        });
      } else {
        await createMutation.mutateAsync(formData);
        
        toast({
          title: 'Sucesso',
          description: 'Turno de funcionário criado com sucesso!'
        });
      }

      setShowForm(false);
      setFormData({ 
        employee_id: '', 
        schedule_id: '', 
        data_inicio: '', 
        data_fim: '', 
        is_active: true, 
        observacoes: '' 
      });
      
      if (isEditing) {
        navigate('/rh/employee-shifts');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar turno de funcionário: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedShift) return;

    try {
      await deleteMutation.mutateAsync(selectedShift.id);
      
      toast({
        title: 'Sucesso',
        description: 'Turno de funcionário excluído com sucesso!'
      });

      setShowDeleteDialog(false);
      setSelectedShift(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir turno de funcionário: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredShifts = shifts.filter(shift =>
    (shift.employee?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shift.schedule?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditing && !showForm) {
    return (

    <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Turnos de Funcionários</h1>
            <p className="text-muted-foreground">Gestão de turnos de funcionários</p>
          </div>
        </div>
        <div className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Carregando turno...</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Turnos de Funcionários</h1>
          <p className="text-muted-foreground">Gestão de turnos de funcionários</p>
        </div>
        <Button onClick={() => {
          setFormData({ 
            funcionario_id: '', 
            turno_id: '', 
            data_inicio: '', 
            data_fim: '', 
            ativo: true, 
            observacoes: '' 
          });
          setShowForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Turno
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por funcionário ou turno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Turnos de Funcionários</CardTitle>
          <CardDescription>
            {filteredShifts.length} turno(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Carregando turnos...</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum turno encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.funcionario_nome}</TableCell>
                    <TableCell>{shift.turno_nome}</TableCell>
                    <TableCell>
                      {new Date(shift.data_inicio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {shift.data_fim 
                        ? new Date(shift.data_fim).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.ativo ? 'default' : 'secondary'}>
                        {shift.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/rh/employee-shifts/${shift.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShift(shift);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Turno de Funcionário' : 'Novo Turno de Funcionário'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize as informações do turno de funcionário.' 
                : 'Preencha as informações para criar um novo turno de funcionário.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="funcionario_id" className="text-right">
                  Funcionário
                </Label>
                <Input
                  id="funcionario_id"
                  value={formData.funcionario_id}
                  onChange={(e) => setFormData({ ...formData, funcionario_id: e.target.value })}
                  className="col-span-3"
                  placeholder="ID do funcionário"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="turno_id" className="text-right">
                  Turno
                </Label>
                <Input
                  id="turno_id"
                  value={formData.turno_id}
                  onChange={(e) => setFormData({ ...formData, turno_id: e.target.value })}
                  className="col-span-3"
                  placeholder="ID do turno"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data_inicio" className="text-right">
                  Data Início
                </Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data_fim" className="text-right">
                  Data Fim
                </Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ativo" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                      className="rounded"
                    />
                    <span>Ativo</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="observacoes" className="text-right">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="col-span-3"
                  placeholder="Observações sobre o turno..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o turno de funcionário? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    );
}
