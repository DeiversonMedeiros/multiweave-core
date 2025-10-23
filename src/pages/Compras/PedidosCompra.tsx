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
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PedidoCompra {
  id: string;
  numero_pedido: string;
  data_pedido: string;
  data_entrega_prevista: string;
  status: string;
  fornecedor_nome: string;
  valor_total: number;
  cotacao_id: string;
  observacoes?: string;
  created_at: string;
}

// Componente principal protegido por permissões
export default function PedidosCompraPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();

  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'pedidos_compra', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pedidos de Compra</h1>
          
          {/* Botão de criar protegido por permissão */}
          <PermissionGuard 
            entity="pedidos_compra" 
            action="create"
            fallback={
              <Button disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Pedido
              </Button>
            }
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </PermissionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <PedidosList />
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}

// Componente da lista de pedidos
function PedidosList() {
  const { canEditEntity, canDeleteEntity } = usePermissions();
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);

  // Dados de exemplo
  useEffect(() => {
    setPedidos([
      {
        id: '1',
        numero_pedido: 'PED-2025-001',
        data_pedido: '2025-01-20',
        data_entrega_prevista: '2025-01-30',
        status: 'Pendente',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        valor_total: 1450.00,
        cotacao_id: 'COT-2025-001',
        observacoes: 'Pedido baseado na cotação aprovada',
        created_at: '2025-01-20T10:00:00Z'
      }
    ]);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'Aprovado':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'Rejeitado':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      case 'Entregue':
        return <Badge variant="outline" className="text-blue-600"><CheckCircle className="h-3 w-3 mr-1" />Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Buscar pedidos..." />
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
            <TableHead>Data Pedido</TableHead>
            <TableHead>Data Entrega Prevista</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Cotação</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id}>
              <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
              <TableCell>{new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{new Date(pedido.data_entrega_prevista).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{getStatusBadge(pedido.status)}</TableCell>
              <TableCell>{pedido.fornecedor_nome}</TableCell>
              <TableCell>R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {pedido.cotacao_id}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {/* Botão de editar protegido por permissão */}
                  <PermissionGuard 
                    entity="pedidos_compra" 
                    action="edit"
                    fallback={null}
                  >
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  
                  {/* Botão de excluir protegido por permissão */}
                  <PermissionGuard 
                    entity="pedidos_compra" 
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