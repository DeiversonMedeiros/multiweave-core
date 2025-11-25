// =====================================================
// PÁGINA: FISCAL
// =====================================================
// Data: 2025-01-15
// Descrição: Página de gestão fiscal
// Autor: Sistema MultiWeave Core

import React from 'react';
import { FiscalPage as FiscalComponent } from '@/components/financial/FiscalPage';
import { RequireModule } from '@/components/RequireAuth';

interface FiscalPageProps {
  className?: string;
}

export function FiscalPage({ className }: FiscalPageProps) {
  return (
    <RequireModule moduleName="financeiro" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fiscal</h1>
            <p className="text-muted-foreground">
              NF-e, NFS-e e integração SEFAZ
            </p>
          </div>
        </div>
        <FiscalComponent />
      </div>
    </RequireModule>
  );
}

