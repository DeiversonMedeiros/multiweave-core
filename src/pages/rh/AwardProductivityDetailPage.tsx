// =====================================================
// PÁGINA PARA VISUALIZAR DETALHES DA PREMIAÇÃO
// =====================================================

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, Edit, Trash2, CheckCircle, DollarSign } from 'lucide-react';
import { useAwardProductivity, useDeleteAwardProductivity, useApproveAward, useMarkAsPaid } from '@/hooks/rh/useAwardsProductivity';
import { formatCurrency, formatDate, getAwardTypeLabel, getAwardTypeColor, getAwardStatusLabel, getAwardStatusColor } from '@/services/rh/awardsProductivityService';
import { useEmployees } from '@/hooks/rh/useEmployees';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const AwardProductivityDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: award, isLoading, error } = useAwardProductivity(id!);
  const { data: employees } = useEmployees();
  const deleteMutation = useDeleteAwardProductivity();
  const approveMutation = useApproveAward();
  const markAsPaidMutation = useMarkAsPaid();

  const handleDelete = async () => {
    if (!award) return;
    try {
      await deleteMutation.mutateAsync(award.id);
      navigate('/rh/awards-productivity');
    } catch (err) {
      toast.error('Erro ao excluir premiação.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleApprove = async () => {
    if (!award) return;
    try {
      await approveMutation.mutateAsync({ id: award.id, approvedBy: 'current-user-id' }); // TODO: usar ID do usuário atual
      toast.success('Premiação aprovada com sucesso!');
    } catch (err) {
      toast.error('Erro ao aprovar premiação.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!award) return;
    try {
      await markAsPaidMutation.mutateAsync(award.id);
      toast.success('Premiação marcada como paga!');
    } catch (err) {
      toast.error('Erro ao marcar como pago.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const getEmployeeName = (employeeId: string) => {
    if (!employees || employees.length === 0) {
      return 'Carregando...';
    }
    return employees.find(emp => emp.id === employeeId)?.nome || 'Funcionário Desconhecido';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando premiação...</div>
      </div>
    );
  }

  if (error || !award) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Erro ao carregar premiação: {error?.message || 'Premiação não encontrada'}
        </div>
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/rh/awards-productivity')}>
            Voltar para Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/rh/awards-productivity')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gift className="h-8 w-8" />
              {award.nome}
            </h1>
            <p className="text-muted-foreground">
              Detalhes da premiação
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {award.status === 'pendente' && (
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Aprovar
            </Button>
          )}
          {award.status === 'aprovado' && (
            <Button
              onClick={handleMarkAsPaid}
              disabled={markAsPaidMutation.isPending}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Marcar como Pago
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/rh/awards-productivity/${award.id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a premiação.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(award.valor)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getAwardStatusColor(award.status)}>
              {getAwardStatusLabel(award.status)}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getAwardTypeColor(award.tipo)}>
              {getAwardTypeLabel(award.tipo)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Funcionário</label>
              <p className="text-sm">{getEmployeeName(award.employee_id)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome da Premiação</label>
              <p className="text-sm">{award.nome}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Mês de Referência</label>
              <p className="text-sm">{formatDate(award.mes_referencia)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo de Cálculo</label>
              <p className="text-sm">{award.tipo_calculo}</p>
            </div>
            {award.percentual && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Percentual</label>
                <p className="text-sm">{award.percentual}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas e Critérios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {award.meta_estabelecida && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Meta Estabelecida</label>
                <p className="text-sm">{formatCurrency(award.meta_estabelecida)}</p>
              </div>
            )}
            {award.meta_atingida && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Meta Atingida</label>
                <p className="text-sm">{formatCurrency(award.meta_atingida)}</p>
              </div>
            )}
            {award.percentual_atingimento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Percentual de Atingimento</label>
                <p className="text-sm">{award.percentual_atingimento}%</p>
              </div>
            )}
            {award.criterios && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Critérios</label>
                <p className="text-sm">{award.criterios}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Descrição e Observações */}
      {(award.descricao || award.observacoes) && (
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {award.descricao && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm">{award.descricao}</p>
              </div>
            )}
            {award.observacoes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações</label>
                <p className="text-sm">{award.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações de Aprovação e Pagamento */}
      {(award.data_aprovacao || award.data_pagamento) && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {award.data_aprovacao && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Aprovação</label>
                <p className="text-sm">{formatDate(award.data_aprovacao)}</p>
              </div>
            )}
            {award.data_pagamento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Pagamento</label>
                <p className="text-sm">{formatDate(award.data_pagamento)}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
              <p className="text-sm">{formatDate(award.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
              <p className="text-sm">{formatDate(award.updated_at)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AwardProductivityDetailPage;
