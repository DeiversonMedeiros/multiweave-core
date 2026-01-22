import React from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';

/**
 * EXEMPLOS DE COMO PROTEGER PÁGINAS E COMPONENTES
 * 
 * Este arquivo demonstra as diferentes formas de usar o sistema de permissões
 * para controlar o acesso a funcionalidades específicas.
 */

// =====================================================
// EXEMPLO 1: Proteção de Página Completa
// =====================================================
export function ExemploProtecaoPagina() {
  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'page', 
        name: '/compras/requisicoes*', 
        action: 'read' 
      }}
      fallback={
        <div className="text-center p-8">
          <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Página de Solicitações de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Esta página só é acessível para usuários com permissão de leitura em 'solicitacoes_compra'.</p>
        </CardContent>
      </Card>
    </RequireAuth>
  );
}

// =====================================================
// EXEMPLO 2: Proteção de Botões e Ações
// =====================================================
export function ExemploProtecaoBotoes() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo de Proteção de Botões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Botão de Criar (Solicitações):</h3>
          
          {/* Método 1: Usando PermissionGuard */}
          <PermissionGuard 
            page="/compras/requisicoes*" 
            action="create"
            fallback={
              <Button disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Solicitação (Sem Permissão)
              </Button>
            }
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Solicitação
            </Button>
          </PermissionGuard>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Botão de Editar (Cotações):</h3>
          
          {/* Método 2: Usando hook usePermissions */}
          {canEditPage('/compras/cotacoes*') ? (
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar Cotação
            </Button>
          ) : (
            <Button disabled variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar Cotação (Sem Permissão)
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Botão de Excluir (Pedidos):</h3>
          
          {/* Método 3: Renderização condicional */}
          {canDeletePage('/compras/pedidos*') && (
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Pedido
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXEMPLO 3: Proteção de Seções de Página
// =====================================================
export function ExemploProtecaoSecoes() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seção de Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionGuard 
            entity="solicitacoes_compra" 
            action="read"
            fallback={
              <div className="text-center p-4 bg-gray-50 rounded">
                <XCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Você não tem permissão para visualizar solicitações</p>
              </div>
            }
          >
            <div className="space-y-2">
              <p>Lista de solicitações de compra...</p>
              <Badge variant="outline">REQ-2025-001</Badge>
              <Badge variant="outline">REQ-2025-002</Badge>
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção de Cotações</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionGuard 
            entity="cotacoes" 
            action="read"
            fallback={
              <div className="text-center p-4 bg-gray-50 rounded">
                <XCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Você não tem permissão para visualizar cotações</p>
              </div>
            }
          >
            <div className="space-y-2">
              <p>Lista de cotações...</p>
              <Badge variant="outline">COT-2025-001</Badge>
              <Badge variant="outline">COT-2025-002</Badge>
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// EXEMPLO 4: Verificação de Permissões Dinâmicas
// =====================================================
const ENTIDADE_PAGINA: Record<string, string> = {
  solicitacoes_compra: '/compras/requisicoes*',
  cotacoes: '/compras/cotacoes*',
  pedidos_compra: '/compras/pedidos*',
  fornecedores: '/compras/fornecedores*'
};

export function ExemploPermissoesDinamicas() {
  const { canReadPage, canCreatePage, canEditPage, canDeletePage } = usePermissions();

  const entidades = [
    'solicitacoes_compra',
    'cotacoes',
    'pedidos_compra',
    'fornecedores'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificação Dinâmica de Permissões (por Página)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entidades.map((entidade) => {
            const path = ENTIDADE_PAGINA[entidade] ?? `/${entidade}*`;
            return (
              <div key={entidade} className="border rounded p-4">
                <h3 className="font-semibold mb-2 capitalize">
                  {entidade.replace('_', ' ')}
                </h3>
                <p className="text-xs text-muted-foreground font-mono mb-2">{path}</p>
                <div className="flex gap-2">
                  <Badge variant={canReadPage(path) ? "default" : "secondary"}>
                    <Eye className="h-3 w-3 mr-1" />
                    Ler
                  </Badge>
                  <Badge variant={canCreatePage(path) ? "default" : "secondary"}>
                    <Plus className="h-3 w-3 mr-1" />
                    Criar
                  </Badge>
                  <Badge variant={canEditPage(path) ? "default" : "secondary"}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Badge>
                  <Badge variant={canDeletePage(path) ? "default" : "secondary"}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXEMPLO 5: Página Completa com Todas as Proteções
// =====================================================
export function ExemploPaginaCompleta() {
  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'solicitacoes_compra', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Processo de Compras</h1>
          
          <div className="flex gap-2">
            <PermissionGuard 
              entity="solicitacoes_compra" 
              action="create"
              fallback={null}
            >
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Solicitação
              </Button>
            </PermissionGuard>
            
            <PermissionGuard 
              entity="cotacoes" 
              action="create"
              fallback={null}
            >
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nova Cotação
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ExemploProtecaoBotoes />
          <ExemploProtecaoSecoes />
          <ExemploPermissoesDinamicas />
        </div>
      </div>
    </RequireAuth>
  );
}
