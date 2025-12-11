import React, { useEffect, useState } from 'react';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Building2, FolderOpen, Wrench } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RequisicaoItemDetail {
  id: string;
  material_id: string;
  material_nome: string;
  quantidade: number;
  unidade_medida: string;
  observacoes?: string;
}

interface RequisicaoDetail {
  numero_requisicao: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  servico_nome?: string;
  itens: RequisicaoItemDetail[];
}

interface RequisicaoCompraDetailsProps {
  requisicaoId: string;
}

export function RequisicaoCompraDetails({ requisicaoId }: RequisicaoCompraDetailsProps) {
  const { selectedCompany } = useCompany();
  const [requisicaoDetail, setRequisicaoDetail] = useState<RequisicaoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedCompany?.id || !requisicaoId) return;
      
      try {
        setLoading(true);
        
        // 1. Buscar requisição principal
        const requisicaoResult = await EntityService.getById<{
          id: string;
          numero_requisicao: string;
          centro_custo_id?: string;
          projeto_id?: string;
          service_id?: string;
        }>({
          schema: 'compras',
          table: 'requisicoes_compra',
          id: requisicaoId,
          companyId: selectedCompany.id
        });

        if (!requisicaoResult) {
          setLoading(false);
          return;
        }

        // 2. Buscar itens da requisição
        const itensResult = await EntityService.list<{
          id: string;
          material_id: string;
          quantidade: number;
          unidade_medida: string;
          observacoes?: string;
        }>({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId: selectedCompany.id,
          filters: { requisicao_id: requisicaoId },
          page: 1,
          pageSize: 1000,
          skipCompanyFilter: true
        });

        // 3. Buscar nomes dos materiais, centro de custo, projeto e serviço
        const materialIds = [...new Set(itensResult.data.map(i => i.material_id))];
        const materialsMap = new Map<string, string>();
        
        // Buscar materiais
        for (const materialId of materialIds) {
          try {
            const material = await EntityService.getById<{ id: string; nome: string; descricao?: string }>({
              schema: 'almoxarifado',
              table: 'materiais_equipamentos',
              id: materialId,
              companyId: selectedCompany.id
            });
            if (material) {
              materialsMap.set(materialId, material.nome || material.descricao || 'Material não encontrado');
            }
          } catch (err) {
            console.warn('Erro ao buscar material:', err);
          }
        }

        // Buscar centro de custo
        let centroCustoNome: string | undefined;
        if (requisicaoResult.centro_custo_id) {
          try {
            const centroCusto = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'cost_centers',
              id: requisicaoResult.centro_custo_id,
              companyId: selectedCompany.id
            });
            centroCustoNome = centroCusto?.nome;
          } catch (err) {
            console.warn('Erro ao buscar centro de custo:', err);
          }
        }

        // Buscar projeto
        let projetoNome: string | undefined;
        if (requisicaoResult.projeto_id) {
          try {
            const projeto = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'projects',
              id: requisicaoResult.projeto_id,
              companyId: selectedCompany.id
            });
            projetoNome = projeto?.nome;
          } catch (err) {
            console.warn('Erro ao buscar projeto:', err);
          }
        }

        // Buscar serviço
        let servicoNome: string | undefined;
        if (requisicaoResult.service_id) {
          try {
            const servico = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'services',
              id: requisicaoResult.service_id,
              companyId: selectedCompany.id
            });
            servicoNome = servico?.nome;
          } catch (err) {
            console.warn('Erro ao buscar serviço:', err);
          }
        }

        // 4. Mapear itens com nomes dos materiais
        const itensComDetalhes: RequisicaoItemDetail[] = itensResult.data.map(item => ({
          id: item.id,
          material_id: item.material_id,
          material_nome: materialsMap.get(item.material_id) || 'Material não encontrado',
          quantidade: item.quantidade,
          unidade_medida: item.unidade_medida,
          observacoes: item.observacoes
        }));

        setRequisicaoDetail({
          numero_requisicao: requisicaoResult.numero_requisicao,
          centro_custo_nome: centroCustoNome,
          projeto_nome: projetoNome,
          servico_nome: servicoNome,
          itens: itensComDetalhes
        });
      } catch (error) {
        console.error('Erro ao carregar detalhes da requisição:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [requisicaoId, selectedCompany?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando detalhes...</span>
      </div>
    );
  }

  if (!requisicaoDetail) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Não foi possível carregar os detalhes da requisição
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informações gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {requisicaoDetail.centro_custo_nome && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Centro de Custo:</span>
            <span className="font-medium">{requisicaoDetail.centro_custo_nome}</span>
          </div>
        )}
        {requisicaoDetail.projeto_nome && (
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Projeto:</span>
            <span className="font-medium">{requisicaoDetail.projeto_nome}</span>
          </div>
        )}
        {requisicaoDetail.servico_nome && (
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Serviço:</span>
            <span className="font-medium">{requisicaoDetail.servico_nome}</span>
          </div>
        )}
      </div>

      {/* Grid de itens */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens da Requisição ({requisicaoDetail.itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requisicaoDetail.itens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item encontrado
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-40">Quantidade</TableHead>
                      <TableHead className="w-64">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisicaoDetail.itens.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm text-muted-foreground font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.material_nome}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {item.quantidade.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3
                            })} {item.unidade_medida}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                          <div className="truncate" title={item.observacoes || undefined}>
                            {item.observacoes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

