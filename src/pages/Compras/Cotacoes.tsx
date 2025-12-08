import React, { useMemo, useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuotes } from '@/hooks/compras/useComprasData';

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
  const { data: cotacoes = [], isLoading } = useQuotes();
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    if (!search) return cotacoes;
    return cotacoes.filter((cotacao: any) =>
      cotacao.numero_cotacao?.toLowerCase().includes(search.toLowerCase()) ||
      cotacao.status?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [cotacoes, search]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar cotações..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Carregando cotações...
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((cotacao: any) => (
              <TableRow key={cotacao.id}>
                <TableCell className="font-medium">{cotacao.numero_cotacao}</TableCell>
                <TableCell>
                  {cotacao.data_cotacao
                    ? new Date(cotacao.data_cotacao).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>
                  {cotacao.data_validade
                    ? new Date(cotacao.data_validade).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>{getStatusBadge(cotacao.workflow_state || cotacao.status)}</TableCell>
                <TableCell>{cotacao.fornecedor_nome || cotacao.fornecedor_id}</TableCell>
                <TableCell>
                  {cotacao.valor_total
                    ? `R$ ${Number(cotacao.valor_total).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : '--'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    {cotacao.requisicao_id || '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>

                    <PermissionGuard entity="cotacoes" action="edit" fallback={null}>
                      <Button variant="outline" size="sm" disabled={!canEditEntity}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>

                    <PermissionGuard entity="cotacoes" action="delete" fallback={null}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={!canDeleteEntity}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Componente do formulário de nova cotação
function NovaCotacaoForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    data_vencimento: '',
    fornecedor_nome: '',
    requisicao_id: '',
    observacoes: '',
    itens: [] as any[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você implementaria a lógica de criação da cotação
    toast({
      title: "Cotação criada",
      description: "A cotação de preços foi criada com sucesso.",
    });
    onClose();
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        id: Date.now().toString(),
        material_nome: '',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: 0,
        valor_total: 0,
        observacoes: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_vencimento">Data de Vencimento</Label>
          <Input
            id="data_vencimento"
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fornecedor_nome">Fornecedor</Label>
          <Input
            id="fornecedor_nome"
            value={formData.fornecedor_nome}
            onChange={(e) => setFormData(prev => ({ ...prev, fornecedor_nome: e.target.value }))}
            placeholder="Nome do fornecedor"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requisicao_id">Requisição de Compra</Label>
        <Input
          id="requisicao_id"
          value={formData.requisicao_id}
          onChange={(e) => setFormData(prev => ({ ...prev, requisicao_id: e.target.value }))}
          placeholder="ID da requisição de compra"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          placeholder="Observações adicionais"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Itens da Cotação</Label>
          <Button type="button" onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {formData.itens.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Item {index + 1}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={item.material_nome}
                  onChange={(e) => updateItem(index, 'material_nome', e.target.value)}
                  placeholder="Nome do material"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={item.quantidade}
                  onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                  min="1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={item.unidade}
                  onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                  placeholder="UN, KG, etc."
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.valor_unitario}
                  onChange={(e) => updateItem(index, 'valor_unitario', Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Observações do Item</Label>
                <Input
                  value={item.observacoes}
                  onChange={(e) => updateItem(index, 'observacoes', e.target.value)}
                  placeholder="Observações específicas do item"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Criar Cotação
        </Button>
      </div>
    </form>
  );
}