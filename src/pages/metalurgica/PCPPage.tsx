import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProdutos } from '@/hooks/metalurgica/useProdutos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PCPPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanejamento, setSelectedPlanejamento] = useState<string | null>(null);

  const { data: planejamentosData, isLoading } = useQuery({
    queryKey: ['metalurgica', 'planejamentos', selectedCompany?.id],
    queryFn: () => metalurgicaService.listPlanejamentos(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
  });

  const { data: produtosData } = useProdutos();
  const produtos = produtosData?.data || [];
  const planejamentos = planejamentosData?.data || [];

  const [formData, setFormData] = useState({
    periodo_inicio: '',
    periodo_fim: '',
    observacoes: '',
    itens: [] as Array<{ produto_id: string; quantidade_planejada: number; data_prevista?: string }>,
  });

  const createPlanejamento = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return await metalurgicaService.createPlanejamento(selectedCompany.id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'planejamentos'] });
      toast.success('Planejamento criado com sucesso!');
      setIsModalOpen(false);
    },
  });

  const handleCreate = async () => {
    if (!formData.periodo_inicio || !formData.periodo_fim) {
      toast.error('Preencha o período');
      return;
    }

    try {
      await createPlanejamento.mutateAsync({
        periodo_inicio: formData.periodo_inicio,
        periodo_fim: formData.periodo_fim,
        observacoes: formData.observacoes,
        itens: formData.itens,
      });
    } catch (error) {
      toast.error('Erro ao criar planejamento');
    }
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <BarChart3 className="inline-block mr-3 h-8 w-8" />
              PCP - Planejamento e Controle de Produção
            </h1>
            <p className="text-gray-600">
              Planejar e controlar a produção por período
            </p>
          </div>
          
          <PermissionButton
            entity="planejamento_producao"
            action="create"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Planejamento
          </PermissionButton>
        </div>

        {/* Lista de Planejamentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : planejamentos.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500">Nenhum planejamento encontrado</p>
              </CardContent>
            </Card>
          ) : (
            planejamentos.map((planejamento) => (
              <Card key={planejamento.id} className="cursor-pointer hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Planejamento</span>
                    <Badge>{planejamento.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Período: </span>
                      <span className="font-medium">
                        {format(new Date(planejamento.periodo_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(planejamento.periodo_fim), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPlanejamento(planejamento.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Criação */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Planejamento de Produção</DialogTitle>
              <DialogDescription>
                Defina o período e os produtos a serem produzidos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formData.periodo_inicio}
                    onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={formData.periodo_fim}
                    onChange={(e) => setFormData({ ...formData, periodo_fim: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Input
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre o planejamento"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createPlanejamento.isPending}>
                  {createPlanejamento.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Criar Planejamento'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RequireModule>
  );
};

export default PCPPage;

