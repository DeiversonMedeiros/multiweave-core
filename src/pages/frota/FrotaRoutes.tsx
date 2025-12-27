// =====================================================
// ROTAS DO MÓDULO FROTA
// Sistema ERP MultiWeave Core
// =====================================================

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardFrota from './DashboardFrota';
import VeiculosPage from './VeiculosPage';
import CondutoresPage from './CondutoresPage';
import VistoriasPage from './VistoriasPage';
import ManutencoesPage from './ManutencoesPage';
import OcorrenciasPage from './OcorrenciasPage';
import SolicitacoesPage from './SolicitacoesPage';
import AlertasPage from './AlertasPage';

export default function FrotaRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardFrota />} />
      <Route path="/dashboard" element={<DashboardFrota />} />
      <Route path="/veiculos" element={<VeiculosPage />} />
      <Route path="/condutores" element={<CondutoresPage />} />
      <Route path="/vistorias" element={<VistoriasPage />} />
      <Route path="/manutencoes" element={<ManutencoesPage />} />
      <Route path="/ocorrencias" element={<OcorrenciasPage />} />
      <Route path="/solicitacoes" element={<SolicitacoesPage />} />
      <Route path="/alertas" element={<AlertasPage />} />
    </Routes>
  );
}
