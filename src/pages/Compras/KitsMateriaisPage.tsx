import React, { useState, useMemo } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { useMaterialKits, useMaterialKitWithItems, useCreateMaterialKit, useUpdateMaterialKit, useDeleteMaterialKit } from '@/hooks/compras/useMaterialKits';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import type { MaterialKit, MaterialKitItem } from '@/services/compras/materialKitsService';
import type { MaterialEquipamento } from '@/services/almoxarifado/almoxarifadoService';
import { toast } from 'sonner';

type KitFormData = {
  nome: string;
  descricao: string;
  ativo: boolean;
  itens: { material_id: string; quantidade_padrao: number; material_nome?: string; material_codigo?: string; material_unidade?: string }[];
};

const emptyForm: KitFormData = {
  nome: '',
  descricao: '',
  ativo: true,
  itens: [],
};

export default function KitsMateriaisPage() {
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('ativo');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<MaterialKit | null>(null);
  const [formData, setFormData] = useState<KitFormData>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<MaterialKit | null>(null);

  const { data: kits = [], isLoading } = useMaterialKits(
    filterAtivo === 'todos' ? undefined : filterAtivo === 'ativo'
  );
  const createKit = useCreateMaterialKit();
  const updateKit = useUpdateMaterialKit();
  const deleteKit = useDeleteMaterialKit();

  const filteredKits = useMemo(() => {
    if (!search.trim()) return kits;
    const s = search.toLowerCase();
    return kits.filter(
      (k: MaterialKit) =>
        k.nome?.toLowerCase().includes(s) || k.descricao?.toLowerCase().includes(s)
    );
  }, [kits, search]);

  const openCreate = () => {
    setEditingKit(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (kit: MaterialKit) => {
    setEditingKit(kit);
    setFormData({
      nome: kit.nome,
      descricao: kit.descricao ?? '',
      ativo: kit.ativo ?? true,
      itens: [],
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingKit(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do kit');
      return;
    }
    if (formData.itens.length === 0) {
      toast.error('Adicione pelo menos um material ao kit');
      return;
    }
    try {
      if (editingKit) {
        await updateKit.mutateAsync({
          kitId: editingKit.id,
          input: {
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || undefined,
            ativo: formData.ativo,
            itens: formData.itens.map((i) => ({
              material_id: i.material_id,
              quantidade_padrao: i.quantidade_padrao,
            })),
          },
        });
      } else {
        await createKit.mutateAsync({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || undefined,
          ativo: formData.ativo,
          itens: formData.itens.map((i) => ({
            material_id: i.material_id,
            quantidade_padrao: i.quantidade_padrao,
          })),
        });
      }
      handleCloseModal();
    } catch (err) {
      // toast já tratado nos hooks
    }
  };

  const handleDelete = async (kit: MaterialKit) => {
    try {
      await deleteKit.mutateAsync(kit.id);
      setConfirmDelete(null);
    } catch {
      // toast já tratado nos hooks
    }
  };

  return (
    <RequireAuth requiredPermission={{ type: 'page', name: '/compras/kits*', action: 'read' }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Kits de Materiais</h1>
          <PermissionGuard page="/compras/kits*" action="create" fallback={null}>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Kit
            </Button>
          </PermissionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Kits</CardTitle>
            <p className="text-sm text-muted-foreground">
              Crie kits com materiais já cadastrados para usar nas solicitações de compra.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterAtivo} onValueChange={(v: any) => setFilterAtivo(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredKits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum kit encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKits.map((kit: MaterialKit) => (
                    <TableRow key={kit.id}>
                      <TableCell className="font-medium">{kit.nome}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{kit.descricao || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={kit.ativo ? 'default' : 'secondary'}>
                          {kit.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGuard page="/compras/kits*" action="edit" fallback={null}>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(kit)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard page="/compras/kits*" action="delete" fallback={null}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setConfirmDelete(kit)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal Criar/Editar */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingKit ? 'Editar Kit' : 'Novo Kit de Materiais'}</DialogTitle>
              <DialogDescription>
                {editingKit
                  ? 'Altere os dados do kit e os materiais que o compõem.'
                  : 'Defina o nome, descrição e os materiais que compõem o kit.'}
              </DialogDescription>
            </DialogHeader>
            <KitForm
              formData={formData}
              setFormData={setFormData}
              editingKitId={editingKit?.id ?? null}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              isSubmitting={createKit.isPending || updateKit.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Confirmação de exclusão */}
        <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir kit</DialogTitle>
              <DialogDescription>
                Deseja realmente excluir o kit &quot;{confirmDelete?.nome}&quot;? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  );
}

function KitForm({
  formData,
  setFormData,
  editingKitId,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  formData: KitFormData;
  setFormData: React.Dispatch<React.SetStateAction<KitFormData>>;
  editingKitId: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { data: kitWithItems } = useMaterialKitWithItems(editingKitId);
  const { data: materiais = [] } = useMateriaisEquipamentos({ status: 'ativo' });

  const loadedKitIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!editingKitId) {
      loadedKitIdRef.current = null;
      return;
    }
    if (!kitWithItems?.itens?.length || loadedKitIdRef.current === editingKitId) return;
    loadedKitIdRef.current = editingKitId;
    const materiaisMap = new Map((materiais as MaterialEquipamento[]).map((m) => [m.id, m]));
    setFormData((prev) => ({
      ...prev,
      itens: (kitWithItems.itens ?? []).map((i) => {
        const mat = materiaisMap.get(i.material_id);
        return {
          material_id: i.material_id,
          quantidade_padrao: Number(i.quantidade_padrao),
          material_nome: mat?.nome ?? mat?.descricao ?? i.material_nome,
          material_codigo: mat?.codigo_interno ?? i.material_codigo,
          material_unidade: mat?.unidade_medida ?? i.material_unidade_medida,
        };
      }),
    }));
  }, [editingKitId, kitWithItems?.itens, materiais]);

  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const filteredMateriais = useMemo(() => {
    const idsInKit = new Set(formData.itens.map((i) => i.material_id));
    let list = materiais.filter((m: MaterialEquipamento) => !idsInKit.has(m.id));
    if (materialSearch.trim()) {
      const s = materialSearch.toLowerCase();
      list = list.filter(
        (m: MaterialEquipamento) =>
          (m.descricao ?? '').toLowerCase().includes(s) ||
          (m.codigo_interno ?? '').toLowerCase().includes(s) ||
          (m.nome ?? '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [materiais, formData.itens, materialSearch]);

  const addItem = (material: MaterialEquipamento, qtd: number = 1) => {
    if (formData.itens.some((i) => i.material_id === material.id)) return;
    setFormData((prev) => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          material_id: material.id,
          quantidade_padrao: qtd,
          material_nome: material.nome ?? material.descricao,
          material_codigo: material.codigo_interno,
          material_unidade: material.unidade_medida,
        },
      ],
    }));
    setSelectedMaterialId('');
    setMaterialSearch('');
  };

  const removeItem = (materialId: string) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.filter((i) => i.material_id !== materialId),
    }));
  };

  const updateItemQty = (materialId: string, quantidade_padrao: number) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.map((i) =>
        i.material_id === materialId ? { ...i, quantidade_padrao } : i
      ),
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do kit *</Label>
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex.: Kit Manutenção Preventiva"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={formData.descricao}
            onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
            placeholder="Descrição opcional do kit"
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ativo"
            checked={formData.ativo}
            onCheckedChange={(v) => setFormData((p) => ({ ...p, ativo: v }))}
          />
          <Label htmlFor="ativo">Kit ativo (disponível para uso)</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Materiais do kit *</Label>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Buscar material..."
            value={materialSearch}
            onChange={(e) => setMaterialSearch(e.target.value)}
            className="max-w-[200px]"
          />
          <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione um material" />
            </SelectTrigger>
            <SelectContent>
              {filteredMateriais.slice(0, 50).map((m: MaterialEquipamento) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.codigo_interno} — {m.nome || m.descricao}
                </SelectItem>
              ))}
              {filteredMateriais.length === 0 && (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  {materiais.length === 0 ? 'Nenhum material cadastrado.' : 'Todos já adicionados ou nenhum encontrado.'}
                </div>
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const m = materiais.find((x: MaterialEquipamento) => x.id === selectedMaterialId);
              if (m) addItem(m);
            }}
            disabled={!selectedMaterialId}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Quantidade padrão</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                    Nenhum material no kit. Adicione materiais acima.
                  </TableCell>
                </TableRow>
              ) : (
                formData.itens.map((item) => (
                  <TableRow key={item.material_id}>
                    <TableCell>{item.material_nome || item.material_codigo || item.material_id}</TableCell>
                    <TableCell>{item.material_codigo ?? '—'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.0001}
                        step="any"
                        value={item.quantidade_padrao}
                        onChange={(e) => updateItemQty(item.material_id, Number(e.target.value) || 0)}
                        className="w-24"
                      />
                      {item.material_unidade && (
                        <span className="ml-1 text-muted-foreground text-sm">{item.material_unidade}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeItem(item.material_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.nome.trim() || formData.itens.length === 0}>
          {isSubmitting ? 'Salvando...' : editingKitId ? 'Salvar' : 'Criar kit'}
        </Button>
      </DialogFooter>
    </form>
  );
}
