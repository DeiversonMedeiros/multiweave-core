import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  Plus, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

export default function ReembolsosPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar solicitações de reembolso
  const { data: reimbursementRequests, isLoading } = useQuery({
    queryKey: ['reimbursement-requests', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'reimbursement_requests',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Mutação para solicitar reembolso
  const reimbursementMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !selectedCompany?.id) throw new Error('Funcionário ou empresa não encontrado');
      
      let fileUrl = '';
      if (file) {
        const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const uniqueName = `${Date.now()}_${sanitizedOriginalName}`;
        // Estrutura: {company_id}/{employee_id}/{filename}
        const filePath = `${selectedCompany.id}/${employee.id}/${uniqueName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reimbursements')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        fileUrl = uploadData.path;
      }
      
      const result = await EntityService.create({
        schema: 'rh',
        table: 'reimbursement_requests',
        companyId: selectedCompany.id,
        data: {
          employee_id: employee.id,
          tipo_despesa: category,
          valor_solicitado: parseFloat(amount),
          data_despesa: expenseDate, // formato YYYY-MM-DD
          descricao: description,
          comprovante_url: fileUrl,
          status: 'pendente'
        }
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement-requests', employee?.id] });
      setIsDialogOpen(false);
      setAmount('');
      setCategory('');
      setDescription('');
      setExpenseDate('');
      setFile(null);
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de reembolso foi enviada para aprovação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!amount || !category || !description || !expenseDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    reimbursementMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reembolsos</h1>
          <p className="text-gray-600">
            Solicite reembolsos de despesas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Solicitar Reembolso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Solicitar Reembolso</DialogTitle>
              <DialogDescription>
                Solicite o reembolso de suas despesas
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="transporte">Transporte</option>
                  <option value="hospedagem">Hospedagem</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Data da Despesa</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a despesa..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">Comprovante (PDF, JPG, PNG)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={reimbursementMutation.isPending}
              >
                {reimbursementMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Solicitações</CardTitle>
          <CardDescription>
            Histórico de solicitações de reembolso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reimbursementRequests && reimbursementRequests.length > 0 ? (
            <div className="space-y-4">
              {reimbursementRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-green-100 text-green-600">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {request.tipo_despesa} - R$ {Number(request.valor_solicitado ?? 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{request.descricao}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <Badge variant="outline">
                      {getStatusLabel(request.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma solicitação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    );
}
