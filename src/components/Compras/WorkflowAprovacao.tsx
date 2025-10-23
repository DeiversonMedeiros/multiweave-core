import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  User, 
  Calendar,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Aprovacao {
  id: string;
  aprovador_id: string;
  aprovador_nome: string;
  nivel_aprovacao: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data_aprovacao?: string;
  observacoes?: string;
  created_at: string;
}

interface WorkflowAprovacaoProps {
  requisicaoId: string;
  valorTotal: number;
  onAprovacaoChange: (aprovacoes: Aprovacao[]) => void;
  readonly?: boolean;
}

const WorkflowAprovacao: React.FC<WorkflowAprovacaoProps> = ({
  requisicaoId,
  valorTotal,
  onAprovacaoChange,
  readonly = false
}) => {
  const { toast } = useToast();
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  // Configurações de aprovação baseadas no valor
  const getNiveisAprovacao = (valor: number) => {
    if (valor <= 1000) return [1];
    if (valor <= 5000) return [1, 2];
    if (valor <= 10000) return [1, 2, 3];
    return [1, 2, 3, 4];
  };

  const niveisNecessarios = getNiveisAprovacao(valorTotal);

  // Carregar aprovações
  useEffect(() => {
    carregarAprovacoes();
  }, [requisicaoId]);

  const carregarAprovacoes = async () => {
    try {
      setLoading(true);
      // Aqui seria a chamada para a API
      // const response = await fetch(`/api/compras/requisicoes/${requisicaoId}/aprovacoes`);
      // const data = await response.json();
      
      // Dados mock para demonstração
      const mockAprovacoes: Aprovacao[] = [
        {
          id: '1',
          aprovador_id: '1',
          aprovador_nome: 'João Silva',
          nivel_aprovacao: 1,
          status: 'aprovado',
          data_aprovacao: '2025-01-15T10:30:00Z',
          observacoes: 'Aprovado conforme orçamento',
          created_at: '2025-01-15T10:00:00Z'
        },
        {
          id: '2',
          aprovador_id: '2',
          aprovador_nome: 'Maria Santos',
          nivel_aprovacao: 2,
          status: 'pendente',
          created_at: '2025-01-15T10:30:00Z'
        }
      ];
      
      setAprovacoes(mockAprovacoes);
      onAprovacaoChange(mockAprovacoes);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar aprovações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pendente':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': { label: 'Pendente', variant: 'secondary' as const },
      'aprovado': { label: 'Aprovado', variant: 'default' as const },
      'rejeitado': { label: 'Rejeitado', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getNivelLabel = (nivel: number) => {
    const niveis = {
      1: 'Aprovação Nível 1',
      2: 'Aprovação Nível 2', 
      3: 'Aprovação Nível 3',
      4: 'Aprovação Nível 4'
    };
    return niveis[nivel as keyof typeof niveis] || `Nível ${nivel}`;
  };

  const getValorLimite = (nivel: number) => {
    const limites = {
      1: 'até R$ 1.000',
      2: 'até R$ 5.000',
      3: 'até R$ 10.000',
      4: 'acima de R$ 10.000'
    };
    return limites[nivel as keyof typeof limites] || '';
  };

  const handleAprovar = async () => {
    try {
      // Implementar aprovação
      toast({
        title: 'Sucesso',
        description: 'Requisição aprovada com sucesso',
      });
      setMostrarFormulario(false);
      carregarAprovacoes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao aprovar requisição',
        variant: 'destructive'
      });
    }
  };

  const handleRejeitar = async () => {
    try {
      // Implementar rejeição
      toast({
        title: 'Sucesso',
        description: 'Requisição rejeitada',
      });
      setMostrarFormulario(false);
      carregarAprovacoes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao rejeitar requisição',
        variant: 'destructive'
      });
    }
  };

  const getStatusGeral = () => {
    const aprovacoesPendentes = aprovacoes.filter(a => a.status === 'pendente');
    const aprovacoesRejeitadas = aprovacoes.filter(a => a.status === 'rejeitado');
    
    if (aprovacoesRejeitadas.length > 0) return 'rejeitada';
    if (aprovacoesPendentes.length === 0) return 'aprovada';
    return 'pendente';
  };

  const statusGeral = getStatusGeral();

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Carregando aprovações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Workflow de Aprovação</span>
            <div className="flex items-center space-x-2">
              {statusGeral === 'aprovada' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {statusGeral === 'rejeitada' && <XCircle className="h-5 w-5 text-red-500" />}
              {statusGeral === 'pendente' && <Clock className="h-5 w-5 text-yellow-500" />}
              <Badge variant={statusGeral === 'aprovada' ? 'default' : statusGeral === 'rejeitada' ? 'destructive' : 'secondary'}>
                {statusGeral === 'aprovada' ? 'Aprovada' : statusGeral === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Informações do Valor */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Valor Total: R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-sm text-blue-700 mt-1">
                Requer aprovação em {niveisNecessarios.length} nível(is)
              </div>
            </div>

            {/* Lista de Aprovações */}
            <div className="space-y-3">
              {niveisNecessarios.map((nivel) => {
                const aprovacao = aprovacoes.find(a => a.nivel_aprovacao === nivel);
                const isPendente = !aprovacao || aprovacao.status === 'pendente';
                const isAprovado = aprovacao?.status === 'aprovado';
                const isRejeitado = aprovacao?.status === 'rejeitado';

                return (
                  <div
                    key={nivel}
                    className={`p-4 border rounded-md ${
                      isAprovado ? 'border-green-200 bg-green-50' :
                      isRejeitado ? 'border-red-200 bg-red-50' :
                      isPendente ? 'border-yellow-200 bg-yellow-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(aprovacao?.status || 'pendente')}
                        <div>
                          <div className="font-medium">{getNivelLabel(nivel)}</div>
                          <div className="text-sm text-gray-600">
                            {getValorLimite(nivel)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {aprovacao ? (
                          <>
                            {getStatusBadge(aprovacao.status)}
                            <div className="text-sm text-gray-500">
                              {aprovacao.aprovador_nome}
                            </div>
                          </>
                        ) : (
                          <Badge variant="secondary">Aguardando</Badge>
                        )}
                      </div>
                    </div>

                    {aprovacao && (
                      <div className="mt-3 space-y-2">
                        {aprovacao.observacoes && (
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="text-sm text-gray-600">
                              {aprovacao.observacoes}
                            </div>
                          </div>
                        )}
                        {aprovacao.data_aprovacao && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(aprovacao.data_aprovacao).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Formulário de Aprovação */}
            {!readonly && statusGeral === 'pendente' && (
              <div className="mt-6 p-4 border rounded-md bg-gray-50">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Sua Aprovação</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="observacoes-aprovacao">Observações</Label>
                    <Textarea
                      id="observacoes-aprovacao"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Adicione observações sobre sua aprovação..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={handleAprovar} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button onClick={handleRejeitar} variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowAprovacao;
