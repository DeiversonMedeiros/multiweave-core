// =====================================================
// MÓDULO DE RECURSOS HUMANOS - COMPONENTES
// =====================================================

// Componentes base reutilizáveis
export { default as EnhancedDataTable } from './EnhancedDataTable';
export { default as FormModal } from './FormModal';
export { default as TableActions } from './TableActions';
export { default as EmployeeForm } from './EmployeeForm';
export { default as TimeClock } from './TimeClock';
export { default as BenefitConfigurationForm } from './BenefitConfigurationForm';
export { default as VacationForm } from './VacationForm';
export { default as MedicalCertificateForm } from './MedicalCertificateForm';
export { default as PayrollForm } from './PayrollForm';

// Componentes de Analytics
export { default as EmployeeStatsCard } from './analytics/EmployeeStatsCard';
export { default as PayrollStatsCard } from './analytics/PayrollStatsCard';
export { default as TimeTrackingChart } from './analytics/TimeTrackingChart';
export { default as BenefitsChart } from './analytics/BenefitsChart';
export { default as AttendanceChart } from './analytics/AttendanceChart';

// Componentes de Folha de Pagamento
export { default as PayrollProcessingCard } from './payroll/PayrollProcessingCard';
export { default as PayrollSummary } from './payroll/PayrollSummary';
export { default as PayrollItem } from './payroll/PayrollItem';
export { default as PayrollCalculation } from './payroll/PayrollCalculation';

// Componentes específicos
export { default as EmployeeCard } from './EmployeeCard';
export { default as TimeRecordCard } from './TimeRecordCard';
export { default as VacationCard } from './VacationCard';
export { default as MedicalCertificateCard } from './MedicalCertificateCard';
export { default as BenefitCard } from './BenefitCard';
export { default as PayrollCard } from './PayrollCard';

// Componentes de filtros
export { default as EmployeeFilters } from './filters/EmployeeFilters';
export { default as TimeRecordFilters } from './filters/TimeRecordFilters';
export { default as PayrollFilters } from './filters/PayrollFilters';
export { default as BenefitFilters } from './filters/BenefitFilters';

// Componentes de relatórios
export { default as EmployeeReport } from './reports/EmployeeReport';
export { default as TimeRecordReport } from './reports/TimeRecordReport';
export { default as PayrollReport } from './reports/PayrollReport';
export { default as BenefitsReport } from './reports/BenefitsReport';
