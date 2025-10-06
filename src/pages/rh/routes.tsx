import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Importar páginas
import RHDashboard from './RHDashboard';
import EmployeesPage from './EmployeesPage';
import PositionsPage from './PositionsPage';
import UnitsPage from './UnitsPage';
import TimeRecordsPage from './TimeRecordsPage';
// import WorkSchedulesPage from './WorkSchedulesPage';
import BenefitsPage from './BenefitsPage';
// import VacationsPage from './VacationsPage';
// import MedicalCertificatesPage from './MedicalCertificatesPage';
import PayrollPage from './PayrollPage';
// import RecruitmentPage from './RecruitmentPage';
// import TrainingPage from './TrainingPage';

// Importar páginas de Analytics
// import AnalyticsDashboard from './analytics/AnalyticsDashboard';
// import EmployeeAnalytics from './analytics/EmployeeAnalytics';
// import PayrollAnalytics from './analytics/PayrollAnalytics';
// import TimeTrackingAnalytics from './analytics/TimeTrackingAnalytics';
// import BenefitsAnalytics from './analytics/BenefitsAnalytics';

// Importar páginas de Folha de Pagamento
// import PayrollProcessing from './payroll/PayrollProcessing';
// import PayrollReports from './payroll/PayrollReports';
// import PayrollHistory from './payroll/PayrollHistory';
// import PayrollConfig from './payroll/PayrollConfig';

// =====================================================
// ROTAS DO MÓDULO RH
// =====================================================

export function RHRoutes() {
  return (
    <Routes>
      {/* Dashboard Principal */}
      <Route path="/" element={<RHDashboard />} />
      
      {/* Gestão de Funcionários */}
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/employees/new" element={<EmployeesPage />} />
      <Route path="/employees/:id" element={<EmployeesPage />} />
      <Route path="/employees/:id/edit" element={<EmployeesPage />} />
      
      {/* Gestão de Cargos */}
      <Route path="/positions" element={<PositionsPage />} />
      <Route path="/positions/new" element={<PositionsPage />} />
      <Route path="/positions/:id" element={<PositionsPage />} />
      <Route path="/positions/:id/edit" element={<PositionsPage />} />
      
      {/* Gestão de Departamentos */}
      <Route path="/units" element={<UnitsPage />} />
      <Route path="/units/new" element={<UnitsPage />} />
      <Route path="/units/:id" element={<UnitsPage />} />
      <Route path="/units/:id/edit" element={<UnitsPage />} />
      
      {/* Controle de Ponto */}
      <Route path="/time-records" element={<TimeRecordsPage />} />
      <Route path="/time-records/new" element={<TimeRecordsPage />} />
      <Route path="/time-records/:id" element={<TimeRecordsPage />} />
      <Route path="/time-records/:id/edit" element={<TimeRecordsPage />} />
      
      {/* Escalas de Trabalho */}
      {/* <Route path="/work-schedules" element={<WorkSchedulesPage />} />
      <Route path="/work-schedules/new" element={<WorkSchedulesPage />} />
      <Route path="/work-schedules/:id" element={<WorkSchedulesPage />} />
      <Route path="/work-schedules/:id/edit" element={<WorkSchedulesPage />} /> */}
      
      {/* Sistema de Benefícios */}
      <Route path="/benefits" element={<BenefitsPage />} />
      <Route path="/benefits/new" element={<BenefitsPage />} />
      <Route path="/benefits/:id" element={<BenefitsPage />} />
      <Route path="/benefits/:id/edit" element={<BenefitsPage />} />
      
      {/* Férias e Licenças */}
      {/* <Route path="/vacations" element={<VacationsPage />} />
      <Route path="/vacations/new" element={<VacationsPage />} />
      <Route path="/vacations/:id" element={<VacationsPage />} />
      <Route path="/vacations/:id/edit" element={<VacationsPage />} /> */}
      
      {/* Atestados Médicos */}
      {/* <Route path="/medical-certificates" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/new" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/:id" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/:id/edit" element={<MedicalCertificatesPage />} /> */}
      
      {/* Folha de Pagamento */}
      <Route path="/payroll" element={<PayrollPage />} />
      <Route path="/payroll/new" element={<PayrollPage />} />
      <Route path="/payroll/:id" element={<PayrollPage />} />
      <Route path="/payroll/:id/edit" element={<PayrollPage />} />
      
      {/* Recrutamento */}
      {/* <Route path="/recruitment" element={<RecruitmentPage />} />
      <Route path="/recruitment/new" element={<RecruitmentPage />} />
      <Route path="/recruitment/:id" element={<RecruitmentPage />} />
      <Route path="/recruitment/:id/edit" element={<RecruitmentPage />} /> */}
      
      {/* Treinamentos */}
      {/* <Route path="/training" element={<TrainingPage />} />
      <Route path="/training/new" element={<TrainingPage />} />
      <Route path="/training/:id" element={<TrainingPage />} />
      <Route path="/training/:id/edit" element={<TrainingPage />} /> */}
      
      {/* Analytics */}
      {/* <Route path="/analytics" element={<AnalyticsDashboard />} />
      <Route path="/analytics/employees" element={<EmployeeAnalytics />} />
      <Route path="/analytics/payroll" element={<PayrollAnalytics />} />
      <Route path="/analytics/time-tracking" element={<TimeTrackingAnalytics />} />
      <Route path="/analytics/benefits" element={<BenefitsAnalytics />} /> */}
    </Routes>
  );
}

export default RHRoutes;
