// =====================================================
// PÁGINA: CONTABILIDADE
// =====================================================
// Data: 2025-01-15
// Descrição: Página de gestão contábil
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ContabilidadePage as ContabilidadeComponent } from '@/components/financial/ContabilidadePage';
import { RequirePage } from '@/components/RequireAuth';

interface ContabilidadePageProps {
  className?: string;
}

export function ContabilidadePage({ className }: ContabilidadePageProps) {
  return (
    <RequirePage pagePath="/financeiro/contabilidade*" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contabilidade</h1>
            <p className="text-muted-foreground">
              Plano de contas, lançamentos e SPED
            </p>
          </div>
        </div>
        <ContabilidadeComponent />
      </div>
    </RequirePage>
  );
}

