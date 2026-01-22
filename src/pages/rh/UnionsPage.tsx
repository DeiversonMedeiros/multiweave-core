// =====================================================
// PÁGINA PRINCIPAL DE SINDICATOS
// =====================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Building2, FileText, Handshake, UserCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnions, useEmployeeUnionMemberships, useUnionContributions, useCollectiveAgreements, useUnionNegotiations, useUnionRepresentatives, useUnionsStats, useUnionTypes, useMembershipStatuses, useContributionStatuses, useNegotiationStatuses } from '@/hooks/rh/useUnions';
import { getUnionTypeLabel, getUnionTypeColor, getMembershipStatusLabel, getMembershipStatusColor, getContributionStatusLabel, getContributionStatusColor, getNegotiationStatusLabel, getNegotiationStatusColor, formatCurrency, formatDate } from '@/services/rh/unionsService';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const UnionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<string>('all');
  const [contributionStatusFilter, setContributionStatusFilter] = useState<string>('all');
  const [negotiationStatusFilter, setNegotiationStatusFilter] = useState<string>('all');

  const unionTypes = useUnionTypes();
  const membershipStatuses = useMembershipStatuses();
  const contributionStatuses = useContributionStatuses();
  const negotiationStatuses = useNegotiationStatuses();

  // Queries
  const { data: unions, isLoading: unionsLoading } = useUnions({
    nome: searchTerm || undefined,
    tipo: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const { data: memberships, isLoading: membershipsLoading } = useEmployeeUnionMemberships({
    status: membershipStatusFilter !== 'all' ? membershipStatusFilter : undefined,
  });

  const { data: contributions, isLoading: contributionsLoading } = useUnionContributions({
    status: contributionStatusFilter !== 'all' ? contributionStatusFilter : undefined,
  });

  const { data: agreements, isLoading: agreementsLoading } = useCollectiveAgreements();

  const { data: negotiations, isLoading: negotiationsLoading } = useUnionNegotiations({
    status: negotiationStatusFilter !== 'all' ? negotiationStatusFilter : undefined,
  });

  const { data: representatives, isLoading: representativesLoading } = useUnionRepresentatives();

  const { data: stats } = useUnionsStats();

  const filteredUnions = unions?.filter(union =>
    union.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (typeFilter === 'all' || union.tipo === typeFilter)
  );

  const filteredMemberships = memberships?.filter(membership =>
    membershipStatusFilter === 'all' || membership.status === membershipStatusFilter
  );

  const filteredContributions = contributions?.filter(contribution =>
    contributionStatusFilter === 'all' || contribution.status === contributionStatusFilter
  );

  const filteredNegotiations = negotiations?.filter(negotiation =>
    negotiationStatusFilter === 'all' || negotiation.status === negotiationStatusFilter
  );

  return (
    <RequirePage pagePath="/rh/unions*" action="read">
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Gestão Sindical
          </h1>
          <p className="text-muted-foreground">
            Gerencie sindicatos, filiações, contribuições e negociações coletivas
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/rh/unions/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Sindicato
            </Button>
          </Link>
          <Link to="/rh/employee-union-memberships/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Filiação
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Sindicatos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_unions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_unions || 0} ativos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filiações Ativas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_memberships || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_memberships || 0} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contribuições Pendentes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_contributions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.pending_value || 0)} em valores
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negociações Ativas</CardTitle>
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_negotiations || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_negotiations || 0} total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="unions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unions">Sindicatos</TabsTrigger>
          <TabsTrigger value="memberships">Filiações</TabsTrigger>
          <TabsTrigger value="contributions">Contribuições</TabsTrigger>
          <TabsTrigger value="agreements">Convenções</TabsTrigger>
          <TabsTrigger value="negotiations">Negociações</TabsTrigger>
          <TabsTrigger value="representatives">Representantes</TabsTrigger>
        </TabsList>

        {/* Tab: Sindicatos */}
        <TabsContent value="unions" className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar sindicatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {unionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUnions?.map((union) => (
              <Card key={union.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{union.nome}</CardTitle>
                    <Badge className={getUnionTypeColor(union.tipo)}>
                      {getUnionTypeLabel(union.tipo)}
                    </Badge>
                  </div>
                  {union.sigla && (
                    <p className="text-sm text-muted-foreground">{union.sigla}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {union.categoria && (
                    <p className="text-sm"><strong>Categoria:</strong> {union.categoria}</p>
                  )}
                  {union.cidade && union.estado && (
                    <p className="text-sm"><strong>Localização:</strong> {union.cidade}/{union.estado}</p>
                  )}
                  {union.presidente && (
                    <p className="text-sm"><strong>Presidente:</strong> {union.presidente}</p>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <Link to={`/rh/unions/${union.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </Link>
                    <Link to={`/rh/unions/${union.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {unionsLoading && (
            <div className="text-center py-8">
              <p>Carregando sindicatos...</p>
            </div>
          )}

          {!unionsLoading && (!filteredUnions || filteredUnions.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum sindicato encontrado.</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Filiações */}
        <TabsContent value="memberships" className="space-y-4">
          <div className="flex gap-4">
            <Select value={membershipStatusFilter} onValueChange={setMembershipStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {membershipStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredMemberships?.map((membership) => (
              <Card key={membership.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{membership.employee?.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {membership.union?.nome} • {membership.employee?.matricula}
                      </p>
                      <p className="text-sm">
                        Filiação: {formatDate(membership.data_filiacao)}
                        {membership.data_desfiliacao && (
                          <> • Desfiliação: {formatDate(membership.data_desfiliacao)}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={getMembershipStatusColor(membership.status)}>
                        {getMembershipStatusLabel(membership.status)}
                      </Badge>
                      {membership.valor_mensalidade && (
                        <p className="text-sm font-medium">
                          {formatCurrency(membership.valor_mensalidade)}/mês
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {membershipsLoading && (
            <div className="text-center py-8">
              <p>Carregando filiações...</p>
            </div>
          )}

          {!membershipsLoading && (!filteredMemberships || filteredMemberships.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma filiação encontrada.</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Contribuições */}
        <TabsContent value="contributions" className="space-y-4">
          <div className="flex gap-4">
            <Select value={contributionStatusFilter} onValueChange={setContributionStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {contributionStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredContributions?.map((contribution) => (
              <Card key={contribution.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{contribution.employee?.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {contribution.union?.nome} • {contribution.mes_referencia}
                      </p>
                      <p className="text-sm">
                        {contribution.tipo_contribuicao.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={getContributionStatusColor(contribution.status)}>
                        {getContributionStatusLabel(contribution.status)}
                      </Badge>
                      <p className="text-sm font-medium">
                        {formatCurrency(contribution.valor)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {contributionsLoading && (
            <div className="text-center py-8">
              <p>Carregando contribuições...</p>
            </div>
          )}

          {!contributionsLoading && (!filteredContributions || filteredContributions.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma contribuição encontrada.</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Convenções Coletivas */}
        <TabsContent value="agreements" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {agreements?.map((agreement) => (
              <Card key={agreement.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{agreement.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {agreement.union?.nome} • {agreement.tipo_documento.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm">
                        Vigência: {formatDate(agreement.data_vigencia_inicio)}
                        {agreement.data_vigencia_fim && (
                          <> até {formatDate(agreement.data_vigencia_fim)}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant={agreement.status === 'vigente' ? 'default' : 'secondary'}>
                        {agreement.status.toUpperCase()}
                      </Badge>
                      {agreement.percentual_reajuste && (
                        <p className="text-sm font-medium">
                          {agreement.percentual_reajuste}% reajuste
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {agreementsLoading && (
            <div className="text-center py-8">
              <p>Carregando convenções...</p>
            </div>
          )}

          {!agreementsLoading && (!agreements || agreements.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma convenção coletiva encontrada.</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Negociações */}
        <TabsContent value="negotiations" className="space-y-4">
          <div className="flex gap-4">
            <Select value={negotiationStatusFilter} onValueChange={setNegotiationStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {negotiationStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredNegotiations?.map((negotiation) => (
              <Card key={negotiation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{negotiation.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {negotiation.union?.nome} • {negotiation.tipo_negociacao.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm">
                        Período: {formatDate(negotiation.data_inicio)}
                        {negotiation.data_fim && (
                          <> até {formatDate(negotiation.data_fim)}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={getNegotiationStatusColor(negotiation.status)}>
                        {getNegotiationStatusLabel(negotiation.status)}
                      </Badge>
                      {negotiation.percentual_aceito && (
                        <p className="text-sm font-medium">
                          {negotiation.percentual_aceito}% aprovado
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {negotiationsLoading && (
            <div className="text-center py-8">
              <p>Carregando negociações...</p>
            </div>
          )}

          {!negotiationsLoading && (!filteredNegotiations || filteredNegotiations.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma negociação encontrada.</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Representantes */}
        <TabsContent value="representatives" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {representatives?.map((representative) => (
              <Card key={representative.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{representative.employee?.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {representative.union?.nome} • {representative.employee?.matricula}
                      </p>
                      <p className="text-sm">
                        Cargo: {representative.cargo}
                      </p>
                      <p className="text-sm">
                        Mandato: {formatDate(representative.data_inicio)}
                        {representative.data_fim && (
                          <> até {formatDate(representative.data_fim)}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={representative.status === 'ativo' ? 'default' : 'secondary'}>
                        {representative.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {representativesLoading && (
            <div className="text-center py-8">
              <p>Carregando representantes...</p>
            </div>
          )}

          {!representativesLoading && (!representatives || representatives.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum representante sindical encontrado.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </RequirePage>
  );
};

export default UnionsPage;
