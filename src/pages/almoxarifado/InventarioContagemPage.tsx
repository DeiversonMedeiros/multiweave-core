import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Package,
  Loader2,
  Save,
  CheckCircle,
  Search,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { useEstoqueAtual } from '@/hooks/almoxarifado/useEstoqueAtualQuery';
import { useInventarioItens, useUpsertInventarioItem } from '@/hooks/almoxarifado/useInventarioItensQuery';
import { useInventario } from '@/hooks/almoxarifado/useInventarioQuery';
import { toast } from 'sonner';
import type { Inventario } from '@/hooks/almoxarifado/useInventarioQuery';

const InventarioContagemPage: React.FC = () => {
  const { inventarioId } = useParams<{ inventarioId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [contagens, setContagens] = useState<Record<string, string>>({}); // material_id -> quantidade_contada (string input)
  const [savingId, setSavingId] = useState<string | null>(null);

  // Inventário
  const { data: inventario, isLoading: loadingInventario } = useQuery({
    queryKey: ['almoxarifado', 'inventarios', inventarioId, selectedCompany?.id],
    queryFn: async () => {
      if (!inventarioId || !selectedCompany?.id) return null;
      return await EntityService.getById<Inventario>({
        schema: 'almoxarifado',
        table: 'inventarios',
        id: inventarioId,
        companyId: selectedCompany.id,
      });
    },
    enabled: !!inventarioId && !!selectedCompany?.id,
  });

  // Estoque do almoxarifado (itens a inventariar) – carrega tudo e filtra por almoxarifado
  const { data: estoqueFull = [], isLoading: loadingEstoque } = useEstoqueAtual();
  const estoqueList = useMemo(() => {
    if (!inventario?.almoxarifado_id) return [];
    return estoqueFull.filter((e) => e.almoxarifado_id === inventario.almoxarifado_id);
  }, [estoqueFull, inventario?.almoxarifado_id]);

  // Itens já contados deste inventário
  const { data: itensContagem = [], isLoading: loadingItens } = useInventarioItens(
    inventarioId,
    inventario?.company_id
  );

  const upsertItem = useUpsertInventarioItem(
    inventarioId!,
    inventario?.company_id || selectedCompany?.id || ''
  );
  const { finalizarInventario, isUpdating } = useInventario();

  // Sincronizar inputs com itens já salvos (apenas quando o conteúdo dos itens mudar, evita loop)
  const prevSyncKeyRef = useRef<string>('');
  const prevInventarioIdRef = useRef<string | undefined>(undefined);
  if (prevInventarioIdRef.current !== inventarioId) {
    prevInventarioIdRef.current = inventarioId;
    prevSyncKeyRef.current = '';
  }
  useEffect(() => {
    const syncKey = itensContagem
      .map((i) => `${i.material_equipamento_id}:${i.quantidade_contada ?? ''}`)
      .sort()
      .join('|');
    if (syncKey === prevSyncKeyRef.current) return;
    prevSyncKeyRef.current = syncKey;
    const next: Record<string, string> = {};
    itensContagem.forEach((item) => {
      next[item.material_equipamento_id] =
        item.quantidade_contada != null ? String(item.quantidade_contada) : '';
    });
    setContagens((prev) => {
      const merged = { ...next, ...prev };
      const same =
        Object.keys(merged).length === Object.keys(prev).length &&
        Object.keys(merged).every((k) => String(merged[k] ?? '') === String(prev[k] ?? ''));
      return same ? prev : merged;
    });
  }, [itensContagem]);

  const itensMap = useMemo(() => {
    const map = new Map(itensContagem.map((i) => [i.material_equipamento_id, i]));
    return map;
  }, [itensContagem]);

  const rows = useMemo(() => {
    return estoqueList.filter((e) => {
      const desc = e.material?.descricao?.toLowerCase() || '';
      const cod = e.material?.codigo_interno?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();
      return !term || desc.includes(term) || cod.includes(term);
    });
  }, [estoqueList, searchTerm]);

  const handleSaveContagem = async (materialId: string, quantidadeSistema: number) => {
    const raw = contagens[materialId]?.trim();
    const valor = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0);
    const item = itensMap.get(materialId);
    setSavingId(materialId);
    try {
      await upsertItem.mutateAsync({
        material_equipamento_id: materialId,
        quantidade_sistema: quantidadeSistema,
        quantidade_contada: valor,
        id: item?.id,
      });
      toast.success('Contagem salva');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar contagem');
    } finally {
      setSavingId(null);
    }
  };

  const handleFinalizar = async () => {
    try {
      await finalizarInventario(inventarioId!);
      toast.success('Inventário finalizado');
      navigate('/almoxarifado/inventario');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao finalizar inventário');
    }
  };

  const loading = loadingInventario || loadingEstoque;
  if (!inventarioId) {
    navigate('/almoxarifado/inventario');
    return null;
  }

  if (loading && !inventario) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inventario) {
    return (
      <div className="p-6">
        <p className="text-destructive">Inventário não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/almoxarifado/inventario')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const podeContar = inventario.status === 'em_andamento' || inventario.status === 'aberto';
  const podeFinalizar = inventario.status === 'em_andamento';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/almoxarifado/inventario')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Package className="h-7 w-7" />
              Contagem de inventário
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Almoxarifado do inventário • Status: {inventario.status}
            </p>
          </div>
        </div>
        {podeFinalizar && (
          <Button onClick={handleFinalizar} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Finalizar inventário
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens do almoxarifado</CardTitle>
          <CardDescription>
            Informe a quantidade contada para cada item. A divergência é calculada automaticamente (contado − sistema).
          </CardDescription>
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingItens && rows.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum item em estoque neste almoxarifado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Unidade</TableHead>
                  <TableHead className="w-28 text-right">Qtd. sistema</TableHead>
                  <TableHead className="w-40">Qtd. contada</TableHead>
                  <TableHead className="w-28 text-right">Divergência</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((estoque) => {
                  const materialId = estoque.material_equipamento_id;
                  const qtdSistema = estoque.quantidade_atual ?? 0;
                  const inputVal = contagens[materialId] ?? '';
                  const qtdContada = inputVal === '' ? null : parseInt(inputVal, 10) || 0;
                  const divergencia = qtdContada != null ? qtdContada - qtdSistema : null;
                  const isSaving = savingId === materialId || upsertItem.isPending;

                  return (
                    <TableRow key={estoque.id}>
                      <TableCell className="font-mono text-sm">
                        {estoque.material?.codigo_interno ?? '-'}
                      </TableCell>
                      <TableCell>{estoque.material?.descricao ?? '-'}</TableCell>
                      <TableCell>{estoque.material?.unidade_medida ?? '-'}</TableCell>
                      <TableCell className="text-right">{qtdSistema}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Contado"
                          value={inputVal}
                          onChange={(e) =>
                            setContagens((prev) => ({
                              ...prev,
                              [materialId]: e.target.value,
                            }))
                          }
                          disabled={!podeContar}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {divergencia != null && (
                          <span
                            className={
                              divergencia === 0
                                ? 'text-muted-foreground'
                                : divergencia > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                            }
                          >
                            {divergencia > 0 ? '+' : ''}{divergencia}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {podeContar && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => handleSaveContagem(materialId, qtdSistema)}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventarioContagemPage;
