import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { timeRecordSignatureService, TimeRecordSignature } from '@/services/rh/timeRecordSignatureService';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployeeByUserId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Removido interface duplicada - usando a do service

export default function TimeRecordSignaturePage() {
  const [signatures, setSignatures] = useState<TimeRecordSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentCompany } = useMultiTenancy();

  // Buscar usuário logado
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Buscar funcionário pelo user_id
  const { data: employee, isLoading: employeeLoading } = useEmployeeByUserId(user?.id || '');

  useEffect(() => {
    if (currentCompany?.id && employee?.id) {
      loadSignatures();
    }
  }, [currentCompany?.id, employee?.id]);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      
      if (!currentCompany?.id) {
        toast({
          title: 'Erro',
          description: 'Empresa não selecionada.',
          variant: 'destructive',
        });
        return;
      }

      if (!employee?.id) {
        toast({
          title: 'Erro',
          description: 'Funcionário não encontrado.',
          variant: 'destructive',
        });
        return;
      }

      // Buscar assinaturas reais do banco
      const signaturesData = await timeRecordSignatureService.getEmployeeSignatures(
        employee.id,
        currentCompany.id
      );

      setSignatures(signaturesData);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as assinaturas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signatureId: string) => {
    try {
      // TODO: Implementar modal de assinatura
      toast({
        title: 'Funcionalidade em desenvolvimento',
        description: 'O modal de assinatura será implementado em breve.',
      });
    } catch (error) {
      console.error('Erro ao assinar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a assinatura.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'signed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'signed':
        return 'Assinado';
      case 'expired':
        return 'Expirado';
      case 'rejected':
        return 'Rejeitado';
      case 'approved':
        return 'Aprovado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'signed':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'rejected':
        return 'destructive';
      case 'approved':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading || employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Se não há funcionário associado ao usuário
  if (!employee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assinatura de Ponto</h1>
            <p className="text-muted-foreground">
              Assine seus registros de ponto mensais
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Funcionário não encontrado</h3>
            <p className="text-muted-foreground text-center">
              Não foi possível encontrar um funcionário associado ao seu usuário. 
              Entre em contato com o administrador do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assinatura de Ponto</h1>
          <p className="text-muted-foreground">
            Assine seus registros de ponto mensais
          </p>
        </div>
      </div>

      {signatures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura pendente</h3>
            <p className="text-muted-foreground text-center">
              Não há registros de ponto para assinar no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {signatures.map((signature) => (
            <Card key={signature.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatMonthYear(signature.month_year)}
                  </CardTitle>
                  <Badge variant={getStatusVariant(signature.status)}>
                    {getStatusIcon(signature.status)}
                    <span className="ml-1">{getStatusText(signature.status)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2">{getStatusText(signature.status)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Expira em:</span>
                    <span className="ml-2">{formatDate(signature.expires_at)}</span>
                  </div>
                  {signature.signature_timestamp && (
                    <div>
                      <span className="font-medium">Assinado em:</span>
                      <span className="ml-2">{formatDate(signature.signature_timestamp)}</span>
                    </div>
                  )}
                  {signature.manager_approved_at && (
                    <div>
                      <span className="font-medium">Aprovado em:</span>
                      <span className="ml-2">{formatDate(signature.manager_approved_at)}</span>
                    </div>
                  )}
                </div>

                {signature.rejection_reason && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Motivo da rejeição:</strong> {signature.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}

                {isExpired(signature.expires_at) && signature.status === 'pending' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Esta assinatura expirou e não pode mais ser assinada.
                    </AlertDescription>
                  </Alert>
                )}

                {signature.status === 'pending' && !isExpired(signature.expires_at) && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleSign(signature.id)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Assinar Registro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Você tem até a data de expiração para assinar seus registros de ponto. 
          Após o vencimento, não será mais possível assinar e será necessário entrar em contato com o RH.
        </AlertDescription>
      </Alert>
    </div>
  );
}