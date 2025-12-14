// =====================================================
// COMPONENTE: PARAMETRIZAÇÃO TRIBUTÁRIA
// =====================================================
// Data: 2025-12-12
// Descrição: Interface para gerenciar parametrização de tributos
// Autor: Sistema MultiWeave Core
// Módulo: M5 - Motor Tributário

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Building2, 
  Package, 
  Calculator, 
  Shield,
  Plus,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useParametrizacaoTributaria } from '@/hooks/tributario/useParametrizacaoTributaria';
import { ISSConfig, ICMSConfig, IPIConfig, PISCOFINSConfig, INSSRATFAPConfig } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ISSConfigForm } from './forms/ISSConfigForm';
import { ICMSConfigForm } from './forms/ICMSConfigForm';
import { IPIConfigForm } from './forms/IPIConfigForm';
import { PISCofinsConfigForm } from './forms/PISCofinsConfigForm';
import { INSSConfigForm } from './forms/INSSConfigForm';

interface ParametrizacaoTributariaPageProps {
  className?: string;
}

export function ParametrizacaoTributariaPage({ className }: ParametrizacaoTributariaPageProps) {
  const {
    issConfigs,
    loadingISS,
    createISSConfig,
    updateISSConfig,
    deleteISSConfig,
    icmsConfigs,
    loadingICMS,
    createICMSConfig,
    updateICMSConfig,
    deleteICMSConfig,
    ipiConfigs,
    loadingIPI,
    createIPIConfig,
    updateIPIConfig,
    deleteIPIConfig,
    pisCofinsConfigs,
    loadingPISCofins,
    createPISCofinsConfig,
    updatePISCofinsConfig,
    deletePISCofinsConfig,
    inssConfigs,
    loadingINSS,
    createINSSConfig,
    updateINSSConfig,
    deleteINSSConfig,
  } = useParametrizacaoTributaria();

  const [showISSForm, setShowISSForm] = useState(false);
  const [showICMSForm, setShowICMSForm] = useState(false);
  const [showIPIForm, setShowIPIForm] = useState(false);
  const [showPISCofinsForm, setShowPISCofinsForm] = useState(false);
  const [showINSSForm, setShowINSSForm] = useState(false);

  const [editingISS, setEditingISS] = useState<ISSConfig | null>(null);
  const [editingICMS, setEditingICMS] = useState<ICMSConfig | null>(null);
  const [editingIPI, setEditingIPI] = useState<IPIConfig | null>(null);
  const [editingPISCofins, setEditingPISCofins] = useState<PISCOFINSConfig | null>(null);
  const [editingINSS, setEditingINSS] = useState<INSSRATFAPConfig | null>(null);

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const isConfigActive = (dataInicio: string, dataFim?: string) => {
    const hoje = new Date();
    const inicio = new Date(dataInicio);
    const fim = dataFim ? new Date(dataFim) : null;
    
    return inicio <= hoje && (!fim || fim >= hoje);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parametrização Tributária</h2>
          <p className="text-muted-foreground">
            Configure as regras de cálculo para ISS, ICMS, IPI, PIS/COFINS e INSS
          </p>
        </div>
      </div>

      <Tabs defaultValue="iss" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="iss">
            <Receipt className="h-4 w-4 mr-2" />
            ISS
          </TabsTrigger>
          <TabsTrigger value="icms">
            <Building2 className="h-4 w-4 mr-2" />
            ICMS
          </TabsTrigger>
          <TabsTrigger value="ipi">
            <Package className="h-4 w-4 mr-2" />
            IPI
          </TabsTrigger>
          <TabsTrigger value="pis-cofins">
            <Calculator className="h-4 w-4 mr-2" />
            PIS/COFINS
          </TabsTrigger>
          <TabsTrigger value="inss">
            <Shield className="h-4 w-4 mr-2" />
            INSS
          </TabsTrigger>
        </TabsList>

        {/* Tab ISS */}
        <TabsContent value="iss">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações ISS</CardTitle>
                  <CardDescription>
                    Configure as regras de cálculo do Imposto Sobre Serviços
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingISS(null);
                  setShowISSForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingISS ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : issConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma configuração ISS cadastrada
                </p>
              ) : (
                <div className="space-y-4">
                  {issConfigs.map((config) => (
                    <Card key={config.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{config.municipio_nome} - {config.uf}</h3>
                            {isConfigActive(config.data_inicio_vigencia, config.data_fim_vigencia) ? (
                              <Badge variant="default" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Inativa
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Alíquota:</span>
                              <p className="font-medium">{(config.aliquota_iss * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tipo Base:</span>
                              <p className="font-medium">{config.tipo_base_calculo.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vigência:</span>
                              <p className="font-medium">
                                {formatDate(config.data_inicio_vigencia)}
                                {config.data_fim_vigencia && ` - ${formatDate(config.data_fim_vigencia)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingISS(config);
                              setShowISSForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta configuração?')) {
                                deleteISSConfig(config.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab ICMS */}
        <TabsContent value="icms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações ICMS</CardTitle>
                  <CardDescription>
                    Configure as regras de cálculo do Imposto sobre Circulação de Mercadorias e Serviços
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingICMS(null);
                  setShowICMSForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingICMS ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : icmsConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma configuração ICMS cadastrada
                </p>
              ) : (
                <div className="space-y-4">
                  {icmsConfigs.map((config) => (
                    <Card key={config.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{config.uf_nome} - {config.tipo_operacao.replace('_', ' ')}</h3>
                            {isConfigActive(config.data_inicio_vigencia, config.data_fim_vigencia) ? (
                              <Badge variant="default">Ativa</Badge>
                            ) : (
                              <Badge variant="outline">Inativa</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Alíquota:</span>
                              <p className="font-medium">{(config.aliquota_icms * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Redução Base:</span>
                              <p className="font-medium">{config.percentual_reducao_base.toFixed(2)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vigência:</span>
                              <p className="font-medium">
                                {formatDate(config.data_inicio_vigencia)}
                                {config.data_fim_vigencia && ` - ${formatDate(config.data_fim_vigencia)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingICMS(config);
                              setShowICMSForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta configuração?')) {
                                deleteICMSConfig(config.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab IPI */}
        <TabsContent value="ipi">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações IPI</CardTitle>
                  <CardDescription>
                    Configure as regras de cálculo do Imposto sobre Produtos Industrializados
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingIPI(null);
                  setShowIPIForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingIPI ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : ipiConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma configuração IPI cadastrada
                </p>
              ) : (
                <div className="space-y-4">
                  {ipiConfigs.map((config) => (
                    <Card key={config.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {config.ncm || 'NCM não especificado'} - {config.tipo_atividade?.replace('_', ' ') || 'N/A'}
                            </h3>
                            {isConfigActive(config.data_inicio_vigencia, config.data_fim_vigencia) ? (
                              <Badge variant="default">Ativa</Badge>
                            ) : (
                              <Badge variant="outline">Inativa</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Alíquota:</span>
                              <p className="font-medium">{(config.aliquota_ipi * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Crédito:</span>
                              <p className="font-medium">{config.permite_credito_ipi ? 'Sim' : 'Não'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vigência:</span>
                              <p className="font-medium">
                                {formatDate(config.data_inicio_vigencia)}
                                {config.data_fim_vigencia && ` - ${formatDate(config.data_fim_vigencia)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingIPI(config);
                              setShowIPIForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta configuração?')) {
                                deleteIPIConfig(config.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab PIS/COFINS */}
        <TabsContent value="pis-cofins">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações PIS/COFINS</CardTitle>
                  <CardDescription>
                    Configure as regras de cálculo do PIS e COFINS
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingPISCofins(null);
                  setShowPISCofinsForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPISCofins ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : pisCofinsConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma configuração PIS/COFINS cadastrada
                </p>
              ) : (
                <div className="space-y-4">
                  {pisCofinsConfigs.map((config) => (
                    <Card key={config.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">Regime {config.regime_apuracao === 'cumulativo' ? 'Cumulativo' : 'Não Cumulativo'}</h3>
                            {isConfigActive(config.data_inicio_vigencia, config.data_fim_vigencia) ? (
                              <Badge variant="default">Ativa</Badge>
                            ) : (
                              <Badge variant="outline">Inativa</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">PIS Cumulativo:</span>
                              <p className="font-medium">{config.aliquota_pis_cumulativo ? `${(config.aliquota_pis_cumulativo * 100).toFixed(4)}%` : '-'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">PIS Não Cumulativo:</span>
                              <p className="font-medium">{config.aliquota_pis_nao_cumulativo ? `${(config.aliquota_pis_nao_cumulativo * 100).toFixed(4)}%` : '-'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">COFINS Cumulativo:</span>
                              <p className="font-medium">{config.aliquota_cofins_cumulativo ? `${(config.aliquota_cofins_cumulativo * 100).toFixed(4)}%` : '-'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vigência:</span>
                              <p className="font-medium">
                                {formatDate(config.data_inicio_vigencia)}
                                {config.data_fim_vigencia && ` - ${formatDate(config.data_fim_vigencia)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPISCofins(config);
                              setShowPISCofinsForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta configuração?')) {
                                deletePISCofinsConfig(config.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab INSS */}
        <TabsContent value="inss">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações INSS/RAT/FAP</CardTitle>
                  <CardDescription>
                    Configure as regras de cálculo do INSS, RAT e FAP
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingINSS(null);
                  setShowINSSForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingINSS ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : inssConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma configuração INSS cadastrada
                </p>
              ) : (
                <div className="space-y-4">
                  {inssConfigs.map((config) => (
                    <Card key={config.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {config.cnae ? `${config.cnae} - ${config.cnae_descricao}` : 'Configuração Geral'}
                            </h3>
                            {isConfigActive(config.data_inicio_vigencia, config.data_fim_vigencia) ? (
                              <Badge variant="default">Ativa</Badge>
                            ) : (
                              <Badge variant="outline">Inativa</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">RAT:</span>
                              <p className="font-medium">{(config.aliquota_rat * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">FAP:</span>
                              <p className="font-medium">{config.fap.toFixed(4)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Alíquota Final:</span>
                              <p className="font-medium">{(config.aliquota_final * 100).toFixed(4)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vigência:</span>
                              <p className="font-medium">
                                {formatDate(config.data_inicio_vigencia)}
                                {config.data_fim_vigencia && ` - ${formatDate(config.data_fim_vigencia)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingINSS(config);
                              setShowINSSForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta configuração?')) {
                                deleteINSSConfig(config.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      {showISSForm && (
        <ISSConfigForm
          config={editingISS}
          onSave={async (data) => {
            if (editingISS) {
              await updateISSConfig(editingISS.id, data);
            } else {
              await createISSConfig(data);
            }
            setShowISSForm(false);
            setEditingISS(null);
          }}
          onCancel={() => {
            setShowISSForm(false);
            setEditingISS(null);
          }}
        />
      )}

      {showICMSForm && (
        <ICMSConfigForm
          config={editingICMS}
          onSave={async (data) => {
            if (editingICMS) {
              await updateICMSConfig(editingICMS.id, data);
            } else {
              await createICMSConfig(data);
            }
            setShowICMSForm(false);
            setEditingICMS(null);
          }}
          onCancel={() => {
            setShowICMSForm(false);
            setEditingICMS(null);
          }}
        />
      )}

      {showIPIForm && (
        <IPIConfigForm
          config={editingIPI}
          onSave={async (data) => {
            if (editingIPI) {
              await updateIPIConfig(editingIPI.id, data);
            } else {
              await createIPIConfig(data);
            }
            setShowIPIForm(false);
            setEditingIPI(null);
          }}
          onCancel={() => {
            setShowIPIForm(false);
            setEditingIPI(null);
          }}
        />
      )}

      {showPISCofinsForm && (
        <PISCofinsConfigForm
          config={editingPISCofins}
          onSave={async (data) => {
            if (editingPISCofins) {
              await updatePISCofinsConfig(editingPISCofins.id, data);
            } else {
              await createPISCofinsConfig(data);
            }
            setShowPISCofinsForm(false);
            setEditingPISCofins(null);
          }}
          onCancel={() => {
            setShowPISCofinsForm(false);
            setEditingPISCofins(null);
          }}
        />
      )}

      {showINSSForm && (
        <INSSConfigForm
          config={editingINSS}
          onSave={async (data) => {
            if (editingINSS) {
              await updateINSSConfig(editingINSS.id, data);
            } else {
              await createINSSConfig(data);
            }
            setShowINSSForm(false);
            setEditingINSS(null);
          }}
          onCancel={() => {
            setShowINSSForm(false);
            setEditingINSS(null);
          }}
        />
      )}
    </div>
  );
}

