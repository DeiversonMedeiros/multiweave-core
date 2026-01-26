import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  Shield
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useLotes } from '@/hooks/metalurgica/useLotes';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InspecaoInput } from '@/types/metalurgica';

const QualidadePage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isInspecaoModalOpen, setIsInspecaoModalOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<string | null>(null);

  // Dados
  const { data: lotesData, isLoading: lotesLoading } = useLotes({
    search: searchTerm || undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
  });

  const { data: inspecoesData, isLoading: inspecoesLoading } = useQuery({
    queryKey: ['metalurgica', 'inspecoes', selectedCompany?.id],
    queryFn: () => metalurgicaService.listInspecoes(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
  });

  const { data: certificadosData, isLoading: certificadosLoading } = useQuery({
    queryKey: ['metalurgica', 'certificados', selectedCompany?.id],
    queryFn: () => metalurgicaService.listCertificadosQualidade(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
  });

  const lotes = lotesData?.data || [];
  const inspecoes = inspecoesData?.data || [];
  const certificados = certificadosData?.data || [];

  // Formulário de inspeção
  const [formData, setFormData] = useState<InspecaoInput>({
    lote_id: '',
    tipo: 'inspecao_final',
    quantidade_inspecionada: 0,
    quantidade_aprovada: 0,
    quantidade_reprovada: 0,
  });

  const createInspecao = useMutation({
    mutationFn: async (data: InspecaoInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.createInspecao(selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'inspecoes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'lotes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'certificados'] });
      toast.success('Inspeção registrada com sucesso!');
      setIsInspecaoModalOpen(false);
    },
  });

  const handleCriarInspecao = async () => {
    if (!formData.lote_id || formData.quantidade_inspecionada <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.quantidade_aprovada + formData.quantidade_reprovada !== formData.quantidade_inspecionada) {
      toast.error('A soma de aprovados e reprovados deve ser igual à quantidade inspecionada');
      return;
    }

    try {
      await createInspecao.mutateAsync(formData);
    } catch (error) {
      toast.error('Erro ao registrar inspeção');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pendente: { label: 'Pendente', variant: 'outline' },
      em_andamento: { label: 'Em Andamento', variant: 'secondary' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      reprovada: { label: 'Reprovada', variant: 'destructive' },
      retrabalho: { label: 'Retrabalho', variant: 'secondary' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const lotesAguardandoInspecao = lotes.filter(l => l.status === 'aguardando_inspecao');

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Shield className="inline-block mr-3 h-8 w-8" />
              Controle de Qualidade
            </h1>
            <p className="text-gray-600">
              Inspeções, certificados e não conformidades
            </p>
          </div>
          
          {lotesAguardandoInspecao.length > 0 && (
            <PermissionButton
              page="/metalurgica/qualidade*"
              action="create"
              onClick={() => {
                setSelectedLote(lotesAguardandoInspecao[0].id);
                setFormData({
                  ...formData,
                  lote_id: lotesAguardandoInspecao[0].id,
                  quantidade_inspecionada: lotesAguardandoInspecao[0].quantidade_produzida,
                });
                setIsInspecaoModalOpen(true);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Nova Inspeção ({lotesAguardandoInspecao.length})
            </PermissionButton>
          )}
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lotes Aguardando</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lotesAguardandoInspecao.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inspeções Realizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inspecoes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Certificados Emitidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificados.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inspecoes.length > 0
                  ? (
                      (inspecoes.filter(i => i.status === 'aprovada').length / inspecoes.length) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          {/* Lotes Aguardando Inspeção */}
          <Card>
            <CardHeader>
              <CardTitle>Lotes Aguardando Inspeção</CardTitle>
            </CardHeader>
            <CardContent>
              {lotesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Carregando...</span>
                </div>
              ) : lotesAguardandoInspecao.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum lote aguardando inspeção</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número Lote</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Data Produção</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesAguardandoInspecao.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                        <TableCell>Produto {lote.produto_id}</TableCell>
                        <TableCell>{lote.quantidade_produzida}</TableCell>
                        <TableCell>
                          {format(new Date(lote.data_producao), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLote(lote.id);
                              setFormData({
                                ...formData,
                                lote_id: lote.id,
                                quantidade_inspecionada: lote.quantidade_produzida,
                              });
                              setIsInspecaoModalOpen(true);
                            }}
                          >
                            Inspecionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Inspeções Realizadas */}
          <Card>
            <CardHeader>
              <CardTitle>Inspeções Realizadas</CardTitle>
            </CardHeader>
            <CardContent>
              {inspecoesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Carregando...</span>
                </div>
              ) : inspecoes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma inspeção realizada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Aprovados</TableHead>
                      <TableHead>Reprovados</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspecoes.map((inspecao) => (
                      <TableRow key={inspecao.id}>
                        <TableCell className="font-medium">Lote {inspecao.lote_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{inspecao.tipo}</Badge>
                        </TableCell>
                        <TableCell>{inspecao.quantidade_inspecionada || '-'}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {inspecao.quantidade_aprovada}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {inspecao.quantidade_reprovada}
                        </TableCell>
                        <TableCell>{getStatusBadge(inspecao.status)}</TableCell>
                        <TableCell>
                          {inspecao.data_inspecao
                            ? format(new Date(inspecao.data_inspecao), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Certificados */}
          <Card>
            <CardHeader>
              <CardTitle>Certificados de Qualidade</CardTitle>
            </CardHeader>
            <CardContent>
              {certificadosLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Carregando...</span>
                </div>
              ) : certificados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum certificado emitido</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número Certificado</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificados.map((certificado) => (
                      <TableRow key={certificado.id}>
                        <TableCell className="font-medium">
                          {certificado.numero_certificado}
                        </TableCell>
                        <TableCell>Lote {certificado.lote_id}</TableCell>
                        <TableCell>{certificado.quantidade_certificada}</TableCell>
                        <TableCell>
                          {format(new Date(certificado.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de Inspeção */}
        <Dialog open={isInspecaoModalOpen} onOpenChange={setIsInspecaoModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Inspeção de Qualidade</DialogTitle>
              <DialogDescription>
                Registre os resultados da inspeção do lote
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Tipo de Inspeção *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspecao_inicial">Inspeção Inicial</SelectItem>
                    <SelectItem value="inspecao_final">Inspeção Final</SelectItem>
                    <SelectItem value="inspecao_galvanizado">Inspeção Galvanizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantidade Inspecionada *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantidade_inspecionada}
                  onChange={(e) => {
                    const qtd = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      quantidade_inspecionada: qtd,
                      quantidade_aprovada: Math.min(formData.quantidade_aprovada, qtd),
                      quantidade_reprovada: Math.min(formData.quantidade_reprovada, qtd),
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade Aprovada *</Label>
                  <Input
                    type="number"
                    min="0"
                    max={formData.quantidade_inspecionada}
                    value={formData.quantidade_aprovada}
                    onChange={(e) => {
                      const aprovada = parseFloat(e.target.value) || 0;
                      const reprovada = formData.quantidade_inspecionada - aprovada;
                      setFormData({
                        ...formData,
                        quantidade_aprovada: aprovada,
                        quantidade_reprovada: Math.max(0, reprovada),
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Quantidade Reprovada *</Label>
                  <Input
                    type="number"
                    min="0"
                    max={formData.quantidade_inspecionada}
                    value={formData.quantidade_reprovada}
                    onChange={(e) => {
                      const reprovada = parseFloat(e.target.value) || 0;
                      const aprovada = formData.quantidade_inspecionada - reprovada;
                      setFormData({
                        ...formData,
                        quantidade_reprovada: reprovada,
                        quantidade_aprovada: Math.max(0, aprovada),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsInspecaoModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCriarInspecao} disabled={createInspecao.isPending}>
                  {createInspecao.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Registrar Inspeção'
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

export default QualidadePage;

