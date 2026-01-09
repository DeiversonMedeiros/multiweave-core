import React, { useMemo, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Clock,
  AlertCircle,
  FileCheck,
  ListChecks
} from 'lucide-react';
import { useQuotes } from '@/hooks/compras/useComprasData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CotacoesRealizadas } from '@/components/Compras/CotacoesRealizadas';
import { RequisicoesDisponiveis } from '@/components/Compras/RequisicoesDisponiveis';
import { ModalGerarCotacao } from '@/components/Compras/ModalGerarCotacao';

// Componente principal protegido por permissões
export default function CotacoesPage() {
  const [activeTab, setActiveTab] = useState('realizadas');
  const [showGerarCotacao, setShowGerarCotacao] = useState(false);
  const [selectedRequisicoes, setSelectedRequisicoes] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Calcular estatísticas das cotações
  const { data: cotacoes = [] } = useQuotes();
  const stats = useMemo(() => {
    const abertas = cotacoes.filter((c: any) => 
      (c.workflow_state || c.status) === 'aberta' || 
      (c.workflow_state || c.status) === 'em_cotacao'
    ).length;
    const aguardando = cotacoes.filter((c: any) => 
      (c.workflow_state || c.status) === 'pendente' ||
      (c.workflow_state || c.status) === 'aguardando_resposta'
    ).length;
    const vencidas = cotacoes.filter((c: any) => {
      const prazo = c.prazo_resposta || c.data_validade;
      if (!prazo) return false;
      return new Date(prazo) < new Date() && 
        (c.workflow_state || c.status) !== 'aprovada' &&
        (c.workflow_state || c.status) !== 'reprovada';
    }).length;
    return { abertas, aguardando, vencidas };
  }, [cotacoes]);

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

        {/* Cards de Status - Apenas na aba de Cotações Realizadas */}
        {activeTab === 'realizadas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Abertas</p>
                    <p className="text-2xl font-bold">{stats.abertas}</p>
                  </div>
                  <FileCheck className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aguardando Resposta</p>
                    <p className="text-2xl font-bold">{stats.aguardando}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vencidas</p>
                    <p className="text-2xl font-bold">{stats.vencidas}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="realizadas">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Cotações Realizadas
                </TabsTrigger>
                <TabsTrigger value="disponiveis">
                  <ListChecks className="h-4 w-4 mr-2" />
                  Requisições Disponíveis
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="realizadas" className="mt-6">
                <CotacoesRealizadas />
              </TabsContent>
              
              <TabsContent value="disponiveis" className="mt-6">
                <RequisicoesDisponiveis 
                  onGerarCotacao={(requisicoes, itemIds) => {
                    setSelectedRequisicoes(requisicoes);
                    setSelectedItemIds(itemIds || []);
                    setShowGerarCotacao(true);
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Modal Gerar Cotação */}
        <ModalGerarCotacao
          isOpen={showGerarCotacao}
          onClose={() => {
            setShowGerarCotacao(false);
            // ✅ Limpar seleções quando modal fechar
            // Isso garante que o botão "Gerar Cotação" não mostre contagem após fechar
            setSelectedRequisicoes([]);
            setSelectedItemIds([]);
          }}
          requisicoesIds={selectedRequisicoes}
          itemIds={selectedItemIds.length > 0 ? selectedItemIds : undefined}
        />
      </div>
    </RequireAuth>
  );
}
