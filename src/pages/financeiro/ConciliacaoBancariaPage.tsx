// =====================================================
// PÁGINA: CONCILIAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-12-12
// Descrição: Página de conciliação bancária
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ConciliacaoBancariaPage as ConciliacaoBancariaComponent } from '@/components/financial/ConciliacaoBancariaPage';
import { RequirePage } from '@/components/RequireAuth';

interface ConciliacaoBancariaPageProps {
  className?: string;
}

export default function ConciliacaoBancariaPage({ className }: ConciliacaoBancariaPageProps) {
  return (
    <RequirePage pagePath="/financeiro/conciliacao-bancaria*" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conciliação Bancária</h1>
            <p className="text-muted-foreground">
              Importe extratos e concilie movimentações bancárias com títulos
            </p>
          </div>
        </div>
        <ConciliacaoBancariaComponent />
      </div>
    </RequirePage>
  );
}

