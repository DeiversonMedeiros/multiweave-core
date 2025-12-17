// =====================================================
// PÁGINA: CONTAS A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Página de gestão de contas a pagar
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ContasPagarPage as ContasPagarComponent } from '@/components/financial/ContasPagarPage';
import { RequireEntity } from '@/components/RequireAuth';

interface ContasPagarPageProps {
  className?: string;
}

export function ContasPagarPage({ className }: ContasPagarPageProps) {
  return (
    <RequireEntity entityName="contas_pagar" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
            <p className="text-muted-foreground">
              Gerencie contas a pagar e aprovações
            </p>
          </div>
        </div>
        <ContasPagarComponent />
      </div>
    </RequireEntity>
  );
}

