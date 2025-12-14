// =====================================================
// PÁGINA: OBRIGAÇÕES FISCAIS
// =====================================================
// Data: 2025-12-12
// Descrição: Página de caixa de entrada de obrigações fiscais
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ObrigacoesFiscaisPage as ObrigacoesFiscaisComponent } from '@/components/tributario/ObrigacoesFiscaisPage';
import { RequireModule } from '@/components/RequireAuth';

interface ObrigacoesFiscaisPageProps {
  className?: string;
}

export default function ObrigacoesFiscaisPage({ className }: ObrigacoesFiscaisPageProps) {
  return (
    <RequireModule moduleName="financeiro" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Obrigações Fiscais</h1>
            <p className="text-muted-foreground">
              Centralize e gerencie todas as obrigações fiscais da empresa
            </p>
          </div>
        </div>
        <ObrigacoesFiscaisComponent />
      </div>
    </RequireModule>
  );
}

