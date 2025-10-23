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
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Cotacao {
  id: string;
  numero_cotacao: string;
  data_cotacao: string;
  data_vencimento: string;
  status: string;
  fornecedor_nome: string;
  valor_total: number;
  requisicao_id: string;
  observacoes?: string;
  created_at: string;
}

// Componente principal protegido por permissões
export default function CotacoesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();

  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'cotacoes', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Cotações de Preços</h1>
          
          {/* Botão de criar protegido por permissão */}
          <PermissionGuard 
            entity="cotacoes" 
            action="create"
            fallback={
              <Button disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Cotação
              </Button>
            }
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Cotação
            </Button>
          </PermissionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            <CotacoesList />
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}

// Componente da lista de cotações
function CotacoesList() {
  const { canEditEntity, canDeleteEntity } = usePermissions();
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);

  // Dados de exemplo
  useEffect(() => {
    setCotacoes([
      {
        id: '1',
        numero_cotacao: 'COT-2025-001',
        data_cotacao: '2025-01-20',
        data_vencimento: '2025-01-25',
        status: 'Pendente',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        valor_total: 1450.00,
        requisicao_id: 'REQ-2025-001',
        observacoes: 'Cotação para material de manutenção',
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
          <Input placeholder="Buscar cotações..." />
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
            <TableHead>Data Cotação</TableHead>
            <TableHead>Data Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Requisição</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cotacoes.map((cotacao) => (
            <TableRow key={cotacao.id}>
              <TableCell className="font-medium">{cotacao.numero_cotacao}</TableCell>
              <TableCell>{new Date(cotacao.data_cotacao).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{new Date(cotacao.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{getStatusBadge(cotacao.status)}</TableCell>
              <TableCell>{cotacao.fornecedor_nome}</TableCell>
              <TableCell>R$ {cotacao.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  <FileText className="h-3 w-3 mr-1" />
                  {cotacao.requisicao_id}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {/* Botão de editar protegido por permissão */}
                  <PermissionGuard 
                    entity="cotacoes" 
                    action="edit"
                    fallback={null}
                  >
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  
                  {/* Botão de excluir protegido por permissão */}
                  <PermissionGuard 
                    entity="cotacoes" 
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