// =====================================================
// ROTAS DO MÓDULO LOGÍSTICA
// Sistema ERP MultiWeave Core
// =====================================================

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLogistica from './DashboardLogistica';
import CalendarioPage from './CalendarioPage';
import ViagensPage from './ViagensPage';
import CustosLogisticosPage from './CustosLogisticosPage';

export default function LogisticaRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLogistica />} />
      <Route path="/dashboard" element={<DashboardLogistica />} />
      <Route path="/calendario" element={<CalendarioPage />} />
      <Route path="/viagens" element={<ViagensPage />} />
      <Route path="/custos" element={<CustosLogisticosPage />} />
    </Routes>
  );
}

