import React, { useState, useEffect } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RequisicaoCompra {
  id: string;
  numero_requisicao: string;
  data_solicitacao: string;
  data_necessidade: string;
  status: string;
  prioridade: string;
  valor_total_estimado: number;
  solicitante_nome: string;
  centro_custo_nome: string;
  observacoes?: string;
  created_at: string;
}

interface RequisicaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  observacoes?: string;
}

// Componente principal protegido por permissões
export default function RequisicoesCompraPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();

  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'solicitacoes_compra', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Solicitações de Compra</h1>
          
          {/* Botão de criar protegido por permissão */}
          <PermissionGuard 
            entity="solicitacoes_compra" 
            action="create"
            fallback={
              <Button disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Solicitação
              </Button>
            }
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </PermissionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <RequisicoesList />
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}

// Componente da lista de requisições
function RequisicoesList() {
  const { canEditEntity, canDeleteEntity } = usePermissions();
  const [requisicoes, setRequisicoes] = useState<RequisicaoCompra[]>([]);

  // Dados de exemplo
  useEffect(() => {
    setRequisicoes([
      {
        id: '1',
        numero_requisicao: 'REQ-2025-001',
        data_solicitacao: '2025-01-20',
        data_necessidade: '2025-01-25',
        status: 'Pendente',
        prioridade: 'Alta',
        valor_total_estimado: 1500.00,
        solicitante_nome: 'João Silva',
        centro_custo_nome: 'Manutenção',
        observacoes: 'Material urgente para manutenção',
        created_at: '2025-01-20T10:00:00Z'
      }
    ]);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'Aprovada':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
      case 'Rejeitada':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Buscar solicitações..." />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Data Solicitação</TableHead>
            <TableHead>Data Necessidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisicoes.map((requisicao) => (
            <TableRow key={requisicao.id}>
              <TableCell className="font-medium">{requisicao.numero_requisicao}</TableCell>
              <TableCell>{new Date(requisicao.data_solicitacao).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{new Date(requisicao.data_necessidade).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{getStatusBadge(requisicao.status)}</TableCell>
              <TableCell>
                <Badge variant={requisicao.prioridade === 'Alta' ? 'destructive' : 'secondary'}>
                  {requisicao.prioridade}
                </Badge>
              </TableCell>
              <TableCell>R$ {requisicao.valor_total_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>{requisicao.solicitante_nome}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {/* Botão de editar protegido por permissão */}
                  <PermissionGuard 
                    entity="solicitacoes_compra" 
                    action="edit"
                    fallback={null}
                  >
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  
                  {/* Botão de excluir protegido por permissão */}
                  <PermissionGuard 
                    entity="solicitacoes_compra" 
                    action="delete"
                    fallback={null}
                  >
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}