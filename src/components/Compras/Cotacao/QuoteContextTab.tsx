// =====================================================
// TAB: CONTEXTO DA COTAÇÃO
// =====================================================
// Exibe informações gerais da cotação

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePurchaseQuoteStore } from '@/stores/purchaseQuoteStore';
import { 
  FileText, 
  Building2, 
  FolderKanban, 
  User, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export function QuoteContextTab() {
  const { context, updateGeneralNotes } = usePurchaseQuoteStore();

  if (!context) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Nenhum contexto carregado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informações da Cotação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Número da Cotação</Label>
              <p className="text-sm font-medium">{context.numero_cotacao || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <div className="mt-1">
                <Badge variant={context.type === 'EMERGENCY' ? 'destructive' : 'default'}>
                  {context.type === 'EMERGENCY' ? 'Emergencial' : 'Normal'}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge variant="outline">{context.status || 'Não definido'}</Badge>
              </div>
            </div>
            {context.prazo_resposta && (
              <div>
                <Label className="text-xs text-muted-foreground">Prazo de Resposta</Label>
                <p className="text-sm">{context.prazo_resposta}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Comprador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <p className="text-sm font-medium">{context.buyer.nome}</p>
            </div>
            {context.buyer.email && (
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm">{context.buyer.email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requisições Vinculadas */}
      {context.requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requisições Vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.requests.map((req) => (
                <Badge key={req.id} variant="outline">
                  {req.numero_requisicao}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Centro de Custo e Projeto */}
      {(context.costCenter || context.project) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {context.costCenter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Centro de Custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="text-sm font-medium">{context.costCenter.codigo}</p>
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="text-sm">{context.costCenter.nome}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {context.project && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Projeto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="text-sm font-medium">{context.project.codigo}</p>
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="text-sm">{context.project.nome}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Observações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Observações Gerais</CardTitle>
          <CardDescription>
            Informações adicionais sobre a cotação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="general-notes">Notas</Label>
            <Textarea
              id="general-notes"
              value={context.generalNotes || ''}
              onChange={(e) => updateGeneralNotes(e.target.value)}
              placeholder="Adicione observações sobre a cotação..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

