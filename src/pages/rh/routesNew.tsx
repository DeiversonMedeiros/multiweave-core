import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Importar páginas - NOVA ABORDAGEM
import RHDashboard from './RHDashboard';
import EmployeesPageNew from './EmployeesPageNew';
import PositionsPageNew from './PositionsPageNew';
import UnitsPageNew from './UnitsPageNew';
import TimeRecordsPageNew from './TimeRecordsPageNew';
import BenefitsPageNew from './BenefitsPageNew';
import PayrollPageNew from './PayrollPageNew';

// Importar novas páginas - FASE 1: ESTRUTURA ORGANIZACIONAL
import WorkShiftsPage from './WorkShiftsPage';
import EmploymentContractsPage from './EmploymentContractsPage';

// Importar páginas - FASE 2: PARÂMETROS E CONFIGURAÇÕES
import RubricasPage from './RubricasPage';

// Importar páginas - FASE 3: CONFIGURAÇÕES TRIBUTÁRIAS
import InssBracketsPage from './InssBracketsPage';
import IrrfBracketsPage from './IrrfBracketsPage';
import FgtsConfigPage from './FgtsConfigPage';

// Importar páginas - FASE 4: MOTOR DE CÁLCULO
import PayrollCalculationPage from './PayrollCalculationPage';
import TimeBankPage from './TimeBankPage';
import HolidaysPage from './HolidaysPage';
import PeriodicExamsPage from './PeriodicExamsPage';
import DisciplinaryActionsPage from './DisciplinaryActionsPage';
import AwardsProductivityPage from './AwardsProductivityPage';
import AwardProductivityNewPage from './AwardProductivityNewPage';
import AwardProductivityEditPage from './AwardProductivityEditPage';
import AwardProductivityDetailPage from './AwardProductivityDetailPage';
import MedicalAgreementsPage from './MedicalAgreementsPage';
import MedicalAgreementNewPage from './MedicalAgreementNewPage';
import MedicalAgreementEditPage from './MedicalAgreementEditPage';
import MedicalAgreementDetailPage from './MedicalAgreementDetailPage';
import MedicalPlanNewPage from './MedicalPlanNewPage';
import EmployeeMedicalPlanNewPage from './EmployeeMedicalPlanNewPage';
import UnionsPage from './UnionsPage';
import UnionNewPage from './UnionNewPage';
import EmployeeUnionMembershipNewPage from './EmployeeUnionMembershipNewPage';

// Importar páginas - FASE 5: GESTÃO OPERACIONAL (Em desenvolvimento)
import VacationsPage from './VacationsPage';
import MedicalCertificatesPage from './MedicalCertificatesPage';
import RecruitmentPage from './RecruitmentPage';
import TrainingPage from './TrainingPage';

// =====================================================
// ROTAS DO MÓDULO RH - NOVA ABORDAGEM
// =====================================================

export function RHRoutesNew() {
  return (
    <Routes>
      {/* Dashboard Principal */}
      <Route path="/" element={<RHDashboard />} />
      
      {/* Gestão de Funcionários - NOVA ABORDAGEM */}
      <Route path="/employees" element={<EmployeesPageNew />} />
      <Route path="/employees/new" element={<EmployeesPageNew />} />
      <Route path="/employees/:id" element={<EmployeesPageNew />} />
      <Route path="/employees/:id/edit" element={<EmployeesPageNew />} />
      
      {/* Gestão de Cargos - NOVA ABORDAGEM */}
      <Route path="/positions" element={<PositionsPageNew />} />
      <Route path="/positions/new" element={<PositionsPageNew />} />
      <Route path="/positions/:id" element={<PositionsPageNew />} />
      <Route path="/positions/:id/edit" element={<PositionsPageNew />} />
      
      {/* Gestão de Departamentos - NOVA ABORDAGEM */}
      <Route path="/units" element={<UnitsPageNew />} />
      <Route path="/units/new" element={<UnitsPageNew />} />
      <Route path="/units/:id" element={<UnitsPageNew />} />
      <Route path="/units/:id/edit" element={<UnitsPageNew />} />
      
      {/* Controle de Ponto - NOVA ABORDAGEM */}
      <Route path="/time-records" element={<TimeRecordsPageNew />} />
      <Route path="/time-records/new" element={<TimeRecordsPageNew />} />
      <Route path="/time-records/:id" element={<TimeRecordsPageNew />} />
      <Route path="/time-records/:id/edit" element={<TimeRecordsPageNew />} />
      
      {/* Sistema de Benefícios - NOVA ABORDAGEM */}
      <Route path="/benefits" element={<BenefitsPageNew />} />
      <Route path="/benefits/new" element={<BenefitsPageNew />} />
      <Route path="/benefits/:id" element={<BenefitsPageNew />} />
      <Route path="/benefits/:id/edit" element={<BenefitsPageNew />} />
      
      {/* Folha de Pagamento - NOVA ABORDAGEM */}
      <Route path="/payroll" element={<PayrollPageNew />} />
      <Route path="/payroll/new" element={<PayrollPageNew />} />
      <Route path="/payroll/:id" element={<PayrollPageNew />} />
      <Route path="/payroll/:id/edit" element={<PayrollPageNew />} />

      {/* FASE 1: ESTRUTURA ORGANIZACIONAL - NOVAS PÁGINAS */}
      
      {/* Turnos de Trabalho */}
      <Route path="/work-shifts" element={<WorkShiftsPage />} />
      <Route path="/work-shifts/new" element={<WorkShiftsPage />} />
      <Route path="/work-shifts/:id" element={<WorkShiftsPage />} />
      <Route path="/work-shifts/:id/edit" element={<WorkShiftsPage />} />
      
      {/* Contratos de Trabalho */}
      <Route path="/employment-contracts" element={<EmploymentContractsPage />} />
      <Route path="/employment-contracts/new" element={<EmploymentContractsPage />} />
      <Route path="/employment-contracts/:id" element={<EmploymentContractsPage />} />
      <Route path="/employment-contracts/:id/edit" element={<EmploymentContractsPage />} />

      {/* FASE 2: PARÂMETROS E CONFIGURAÇÕES */}
      
      {/* Rubricas */}
      <Route path="/rubricas" element={<RubricasPage />} />
      <Route path="/rubricas/new" element={<RubricasPage />} />
      <Route path="/rubricas/:id" element={<RubricasPage />} />
      <Route path="/rubricas/:id/edit" element={<RubricasPage />} />

      {/* FASE 3: CONFIGURAÇÕES TRIBUTÁRIAS */}
      
      {/* Faixas INSS */}
      <Route path="/inss-brackets" element={<InssBracketsPage />} />
      <Route path="/inss-brackets/new" element={<InssBracketsPage />} />
      <Route path="/inss-brackets/:id" element={<InssBracketsPage />} />
      <Route path="/inss-brackets/:id/edit" element={<InssBracketsPage />} />

      {/* Faixas IRRF */}
      <Route path="/irrf-brackets" element={<IrrfBracketsPage />} />
      <Route path="/irrf-brackets/new" element={<IrrfBracketsPage />} />
      <Route path="/irrf-brackets/:id" element={<IrrfBracketsPage />} />
      <Route path="/irrf-brackets/:id/edit" element={<IrrfBracketsPage />} />

      {/* Configurações FGTS */}
      <Route path="/fgts-config" element={<FgtsConfigPage />} />
      <Route path="/fgts-config/new" element={<FgtsConfigPage />} />
      <Route path="/fgts-config/:id" element={<FgtsConfigPage />} />
      <Route path="/fgts-config/:id/edit" element={<FgtsConfigPage />} />

      {/* FASE 4: MOTOR DE CÁLCULO */}
      
      {/* Motor de Cálculo */}
      <Route path="/payroll-calculation" element={<PayrollCalculationPage />} />

      {/* FASE 5: GESTÃO OPERACIONAL (Em desenvolvimento) */}
      
      {/* Férias e Licenças */}
      <Route path="/vacations" element={<VacationsPage />} />
      <Route path="/vacations/new" element={<VacationsPage />} />
      <Route path="/vacations/:id" element={<VacationsPage />} />
      <Route path="/vacations/:id/edit" element={<VacationsPage />} />
      
      {/* Atestados Médicos */}
      <Route path="/medical-certificates" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/new" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/:id" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/:id/edit" element={<MedicalCertificatesPage />} />
      
      {/* Recrutamento */}
      <Route path="/recruitment" element={<RecruitmentPage />} />
      <Route path="/recruitment/new" element={<RecruitmentPage />} />
      <Route path="/recruitment/:id" element={<RecruitmentPage />} />
      <Route path="/recruitment/:id/edit" element={<RecruitmentPage />} />
      
      {/* Treinamentos */}
      <Route path="/training" element={<TrainingPage />} />
      <Route path="/training/new" element={<TrainingPage />} />
      <Route path="/training/:id" element={<TrainingPage />} />
      <Route path="/training/:id/edit" element={<TrainingPage />} />
      
      {/* FASE 5: GESTÃO OPERACIONAL */}
      <Route path="/time-bank" element={<TimeBankPage />} />
      <Route path="/time-bank/new" element={<TimeBankPage />} />
      <Route path="/time-bank/:id" element={<TimeBankPage />} />
      <Route path="/time-bank/:id/edit" element={<TimeBankPage />} />
      
      <Route path="/holidays" element={<HolidaysPage />} />
      <Route path="/holidays/new" element={<HolidaysPage />} />
      <Route path="/holidays/:id" element={<HolidaysPage />} />
      <Route path="/holidays/:id/edit" element={<HolidaysPage />} />
      
      <Route path="/periodic-exams" element={<PeriodicExamsPage />} />
      <Route path="/periodic-exams/new" element={<PeriodicExamsPage />} />
      <Route path="/periodic-exams/:id" element={<PeriodicExamsPage />} />
      <Route path="/periodic-exams/:id/edit" element={<PeriodicExamsPage />} />
      
      <Route path="/disciplinary-actions" element={<DisciplinaryActionsPage />} />
      <Route path="/disciplinary-actions/new" element={<DisciplinaryActionsPage />} />
      <Route path="/disciplinary-actions/:id" element={<DisciplinaryActionsPage />} />
      <Route path="/disciplinary-actions/:id/edit" element={<DisciplinaryActionsPage />} />
      
      {/* FASE 6: GESTÃO DE BENEFÍCIOS E CONVÊNIOS */}
      <Route path="/awards-productivity" element={<AwardsProductivityPage />} />
      <Route path="/awards-productivity/new" element={<AwardProductivityNewPage />} />
      <Route path="/awards-productivity/:id" element={<AwardProductivityDetailPage />} />
      <Route path="/awards-productivity/:id/edit" element={<AwardProductivityEditPage />} />
      
      {/* Convênios Médicos e Odontológicos */}
      <Route path="/medical-agreements" element={<MedicalAgreementsPage />} />
      <Route path="/medical-agreements/new" element={<MedicalAgreementNewPage />} />
      <Route path="/medical-agreements/:id" element={<MedicalAgreementDetailPage />} />
      <Route path="/medical-agreements/:id/edit" element={<MedicalAgreementEditPage />} />
      <Route path="/medical-plans/new" element={<MedicalPlanNewPage />} />
      <Route path="/medical-plans/:id" element={<MedicalAgreementsPage />} />
      <Route path="/medical-plans/:id/edit" element={<MedicalAgreementsPage />} />
      <Route path="/employee-medical-plans/new" element={<EmployeeMedicalPlanNewPage />} />
      <Route path="/employee-medical-plans/:id" element={<MedicalAgreementsPage />} />
      <Route path="/employee-medical-plans/:id/edit" element={<MedicalAgreementsPage />} />
      
      {/* Sindicatos e Gestão Sindical */}
      <Route path="/unions" element={<UnionsPage />} />
      <Route path="/unions/new" element={<UnionNewPage />} />
      <Route path="/unions/:id" element={<UnionsPage />} />
      <Route path="/unions/:id/edit" element={<UnionsPage />} />
      <Route path="/employee-union-memberships/new" element={<EmployeeUnionMembershipNewPage />} />
      <Route path="/employee-union-memberships/:id" element={<UnionsPage />} />
      <Route path="/employee-union-memberships/:id/edit" element={<UnionsPage />} />
      
    </Routes>
  );
}

export default RHRoutesNew;
