// =====================================================
// PÁGINA: CONTAS A RECEBER
// =====================================================
// Data: 2025-01-15
// Descrição: Página de gestão de contas a receber
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ContasReceberPage as ContasReceberComponent } from '@/components/financial/ContasReceberPage';
import { RequireEntity } from '@/components/RequireAuth';

interface ContasReceberPageProps {
  className?: string;
}

export function ContasReceberPage({ className }: ContasReceberPageProps) {
  return (
    <RequireEntity entityName="contas_receber" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
            <p className="text-muted-foreground">
              Gerencie contas a receber e cobrança
            </p>
          </div>
        </div>
        <ContasReceberComponent />
      </div>
    </RequireEntity>
  );
}

