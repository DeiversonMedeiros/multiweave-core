import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownToLine, 
  Plus, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntradasMateriais, EntradaMaterial } from '@/hooks/almoxarifado/useEntradasMateriaisQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import XMLUploadModal from '@/components/almoxarifado/XMLUploadModal';
import { toast } from 'sonner';
import { RequireEntity } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';

const EntradasMateriaisPage: React.FC = () => {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [selectedEntrada, setSelectedEntrada] = useState<EntradaMaterial | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Hooks para dados
  const { 
    data: entradas = [], 
    isLoading: loading, 
    error, 
    refetch
  } = useEntradasMateriais({
    status: filterStatus !== 'todos' ? filterStatus : undefined,
    data_inicio: filterDataInicio || undefined,
    data_fim: filterDataFim || undefined,
    search: searchTerm || undefined
  });

  const { data: almoxarifados = [] } = useAlmoxarifados();
  const { data: materiais = [] } = useMateriaisEquipamentos();
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];

  // Os filtros são aplicados automaticamente via queryKey

  const handleAprovarEntrada = async (entradaId: string) => {
    try {
      // Aqui seria necessário obter o ID do usuário atual
      const usuarioId = 'current-user-id'; // TODO: Implementar obtenção do usuário atual
      await aprovarEntrada(entradaId, usuarioId);
      toast.success('Entrada aprovada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aprovar entrada');
      console.error(error);
    }
  };

  const handleRejeitarEntrada = async (entradaId: string) => {
    const motivo = prompt('Motivo da rejeição:');
    if (!motivo) return;

    try {
      await rejeitarEntrada(entradaId, motivo);
      toast.success('Entrada rejeitada');
    } catch (error) {
      toast.error('Erro ao rejeitar entrada');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente' },
      inspecao: { color: 'bg-blue-100 text-blue-800', icon: FileText, text: 'Em Inspeção' },
      aprovado: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Aprovado' },
      rejeitado: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejeitado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const IconComponent = config.icon;

    return (
    <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <RequireEntity entityName="entradas_materiais" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <ArrowDownToLine className="inline-block mr-3 h-8 w-8" />
              Entradas de Materiais
            </h1>
            <p className="text-gray-600">
              Recebimento e controle de materiais via NF-e
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload XML
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número da nota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="inspecao">Em Inspeção</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Data início"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
              />

              <Input
                type="date"
                placeholder="Data fim"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando entradas...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de Entradas */}
      {!loading && !error && (
        <div className="space-y-4">
          {entradas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ArrowDownToLine className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma entrada encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece fazendo upload de uma NF-e ou criando uma entrada manual
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Entrada
                </Button>
              </CardContent>
            </Card>
          ) : (
            entradas.map((entrada) => (
              <Card key={entrada.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Entrada #{entrada.numero_nota || entrada.id.slice(-8)}
                        </h3>
                        {getStatusBadge(entrada.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Data:</span> {formatDate(entrada.data_entrada)}
                        </div>
                        <div>
                          <span className="font-medium">Fornecedor:</span> {entrada.fornecedor?.nome || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Valor Total:</span> {formatCurrency(entrada.valor_total || 0)}
                        </div>
                        <div>
                          <span className="font-medium">Itens:</span> {entrada.itens?.length || 0}
                        </div>
                      </div>

                      {entrada.nfe && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">NF-e:</span> {entrada.nfe.numero_nfe} - 
                          <span className="ml-1">Status SEFAZ: {entrada.nfe.status_sefaz}</span>
                        </div>
                      )}

                      {entrada.observacoes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Observações:</span> {entrada.observacoes}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedEntrada(entrada);
                          setShowChecklist(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {entrada.status === 'pendente' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAprovarEntrada(entrada.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRejeitarEntrada(entrada.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal de Upload XML */}
      <XMLUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={(entradaId) => {
          toast.success('Entrada criada com sucesso!');
          refetch();
        }}
      />

      {/* Modal de Checklist */}
      {showChecklist && selectedEntrada && (
        <ChecklistModal
          entrada={selectedEntrada}
          isOpen={showChecklist}
          onClose={() => {
            setShowChecklist(false);
            setSelectedEntrada(null);
          }}
        />
      )}
    </div>
    </RequireEntity>
  );
};

// Componente de Modal de Checklist
interface ChecklistModalProps {
  entrada: EntradaMaterial;
  isOpen: boolean;
  onClose: () => void;
}

const ChecklistModal: React.FC<ChecklistModalProps> = ({ entrada, isOpen, onClose }) => {
  const { checklistItems, criterios, loading, createChecklistItem, updateChecklistItem } = useChecklistRecebimento(entrada.id);

  if (!isOpen) return null;

  return (
    
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Checklist de Recebimento</h2>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Entrada #{entrada.numero_nota || entrada.id.slice(-8)} - {entrada.fornecedor?.nome}
          </p>
          
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Carregando checklist...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entrada.itens?.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {item.material?.descricao} ({item.material?.codigo_interno})
                    </CardTitle>
                    <CardDescription>
                      Quantidade: {item.quantidade_recebida} {item.material?.unidade_medida}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {criterios.map((criterio) => (
                        <div key={criterio.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${item.id}-${criterio.id}`}
                            className="rounded"
                          />
                          <label htmlFor={`${item.id}-${criterio.id}`} className="text-sm">
                            {criterio.nome}
                            {criterio.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    );
};

export default EntradasMateriaisPage;
