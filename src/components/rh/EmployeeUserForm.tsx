import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { EmployeeUser, User } from '../../hooks/rh/useEmployeeUser';

interface EmployeeUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeUser | null;
  availableUsers: User[];
  onLinkEmployee: (employeeId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  onUnlinkEmployee: (employeeId: string) => Promise<{ success: boolean; error?: string }>;
}

export const EmployeeUserForm: React.FC<EmployeeUserFormProps> = ({
  isOpen,
  onClose,
  employee,
  availableUsers,
  onLinkEmployee,
  onUnlinkEmployee
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = employee?.status_vinculo === 'Vinculado';

  useEffect(() => {
    if (employee) {
      setSelectedUserId(employee.user_id || '');
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (isLinked) {
        // Desvincular
        result = await onUnlinkEmployee(employee.id);
      } else {
        // Vincular
        if (!selectedUserId) {
          setError('Selecione um usuário para vincular');
          return;
        }
        result = await onLinkEmployee(employee.id, selectedUserId);
      }

      if (result.success) {
        onClose();
        setSelectedUserId('');
      } else {
        setError(result.error || 'Erro na operação');
      }
    } catch (err) {
      setError('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setError(null);
    onClose();
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLinked ? (
              <>
                <UserMinus className="h-5 w-5" />
                Desvincular Usuário
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Vincular Usuário
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLinked 
              ? `Desvincular o funcionário ${employee.nome} do usuário atual?`
              : `Vincular o funcionário ${employee.nome} a um usuário do sistema?`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações do Funcionário */}
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{employee.nome}</div>
              <div className="text-sm text-muted-foreground">
                {employee.matricula && `Matrícula: ${employee.matricula}`}
                {employee.matricula && employee.cpf && ' • '}
                {employee.cpf && `CPF: ${employee.cpf}`}
              </div>
            </div>
          </div>

          {/* Usuário Atual (se vinculado) */}
          {isLinked && employee.user_name && (
            <div className="space-y-2">
              <Label>Usuário Atual</Label>
              <div className="p-3 bg-muted rounded-md">
                <div className="font-medium">{employee.user_name}</div>
                <div className="text-sm text-muted-foreground">{employee.user_email}</div>
              </div>
            </div>
          )}

          {/* Seleção de Usuário (se não vinculado) */}
          {!isLinked && (
            <div className="space-y-2">
              <Label htmlFor="user">Usuário para Vincular</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.nome}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário disponível para vínculo
                </p>
              )}
            </div>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (!isLinked && !selectedUserId)}
              variant={isLinked ? "destructive" : "default"}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLinked ? 'Desvincular' : 'Vincular'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

