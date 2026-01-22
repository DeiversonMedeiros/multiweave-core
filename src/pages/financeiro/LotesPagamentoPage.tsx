// =====================================================
// PÁGINA: LOTES DE PAGAMENTO
// =====================================================
// Data: 2025-12-12
// Descrição: Página de gestão de lotes de pagamento
// Autor: Sistema MultiWeave Core

import React from 'react';
import { LotesPagamentoPage as LotesPagamentoComponent } from '@/components/financial/LotesPagamentoPage';
import { RequirePage } from '@/components/RequireAuth';

interface LotesPagamentoPageProps {
  className?: string;
}

export default function LotesPagamentoPage({ className }: LotesPagamentoPageProps) {
  return (
    <RequirePage pagePath="/financeiro/lotes-pagamento*" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lotes de Pagamento</h1>
            <p className="text-muted-foreground">
              Agrupe títulos a pagar em lotes para processamento em lote
            </p>
          </div>
        </div>
        <LotesPagamentoComponent />
      </div>
    </RequirePage>
  );
}

