import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardMetalurgicaPage from './DashboardMetalurgicaPage';
import OrdensProducaoPage from './OrdensProducaoPage';
import OrdensServicoPage from './OrdensServicoPage';
import LotesPage from './LotesPage';
import QualidadePage from './QualidadePage';
import GalvanizacaoPage from './GalvanizacaoPage';
import ProdutosPage from './ProdutosPage';
import MaquinasPage from './MaquinasPage';
import PCPPage from './PCPPage';
import RelatoriosMetalurgicaPage from './RelatoriosMetalurgicaPage';
import NaoConformidadesPage from './NaoConformidadesPage';

export function MetalurgicaRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardMetalurgicaPage />} />
      <Route path="/dashboard" element={<DashboardMetalurgicaPage />} />
      <Route path="/ordens-producao" element={<OrdensProducaoPage />} />
      <Route path="/ordens-servico" element={<OrdensServicoPage />} />
      <Route path="/lotes" element={<LotesPage />} />
      <Route path="/qualidade" element={<QualidadePage />} />
      <Route path="/galvanizacao" element={<GalvanizacaoPage />} />
      <Route path="/produtos" element={<ProdutosPage />} />
      <Route path="/maquinas" element={<MaquinasPage />} />
      <Route path="/pcp" element={<PCPPage />} />
      <Route path="/nao-conformidades" element={<NaoConformidadesPage />} />
      <Route path="/relatorios" element={<RelatoriosMetalurgicaPage />} />
    </Routes>
  );
}

