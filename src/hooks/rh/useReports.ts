import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  trainingId?: string;
  employeeId?: string;
  department?: string;
  status?: string;
}

interface TrainingStats {
  total_trainings: number;
  completed_trainings: number;
  active_trainings: number;
  cancelled_trainings: number;
  total_enrollments: number;
  approved_enrollments: number;
  pending_enrollments: number;
  rejected_enrollments: number;
  total_attendance_records: number;
  present_records: number;
  absent_records: number;
  average_attendance_percentage: number;
  total_certificates: number;
  valid_certificates: number;
  expired_certificates: number;
  invalid_certificates: number;
}

interface ParticipationReport {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  total_trainings: number;
  completed_trainings: number;
  average_attendance: number;
  certificates_earned: number;
  last_training_date: string;
}

interface CertificateReport {
  training_id: string;
  training_name: string;
  total_enrollments: number;
  certificates_issued: number;
  certificates_valid: number;
  certificates_expired: number;
  average_grade: number;
  completion_rate: number;
}

interface MonthlyTrend {
  month: string;
  trainings: number;
  enrollments: number;
  certificates: number;
  attendance_rate: number;
}

export function useReports(companyId: string, filters?: ReportFilters) {
  // Estatísticas gerais
  const { data: stats, isLoading: isLoadingStats } = useQuery<TrainingStats>({
    queryKey: ['reports', 'stats', companyId, filters],
    queryFn: async () => {
      // Buscar estatísticas de treinamentos
      const trainingResult = await EntityService.list({
        schema: 'rh',
        table: 'trainings',
        companyId,
        filters: { is_active: true }
      });

      // Buscar estatísticas de inscrições
      const enrollmentResult = await EntityService.list({
        schema: 'rh',
        table: 'training_enrollments',
        companyId
      });

      // Buscar estatísticas de presença
      const attendanceResult = await EntityService.list({
        schema: 'rh',
        table: 'training_attendance',
        companyId
      });

      // Buscar estatísticas de certificados
      const certificateResult = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId
      });

      const trainingStats = trainingResult.data;
      const enrollmentStats = enrollmentResult.data;
      const attendanceStats = attendanceResult.data;
      const certificateStats = certificateResult.data;

      // Calcular estatísticas
      const totalTrainings = trainingStats?.length || 0;
      const completedTrainings = trainingStats?.filter(t => 
        t.data_fim && new Date(t.data_fim) < new Date()
      ).length || 0;
      const activeTrainings = trainingStats?.filter(t => 
        t.is_active && (!t.data_fim || new Date(t.data_fim) >= new Date())
      ).length || 0;
      const cancelledTrainings = trainingStats?.filter(t => !t.is_active).length || 0;

      const totalEnrollments = enrollmentStats?.length || 0;
      const approvedEnrollments = enrollmentStats?.filter(e => e.status === 'aprovado').length || 0;
      const pendingEnrollments = enrollmentStats?.filter(e => e.status === 'inscrito').length || 0;
      const rejectedEnrollments = enrollmentStats?.filter(e => e.status === 'rejeitado').length || 0;

      const totalAttendanceRecords = attendanceStats?.length || 0;
      const presentRecords = attendanceStats?.filter(a => a.presente).length || 0;
      const absentRecords = totalAttendanceRecords - presentRecords;
      const averageAttendancePercentage = totalAttendanceRecords > 0 ? 
        Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;

      const totalCertificates = certificateStats?.length || 0;
      const validCertificates = certificateStats?.filter(c => c.is_valid).length || 0;
      const expiredCertificates = certificateStats?.filter(c => 
        c.data_validade && new Date(c.data_validade) < new Date()
      ).length || 0;
      const invalidCertificates = totalCertificates - validCertificates;

      return {
        total_trainings: totalTrainings,
        completed_trainings: completedTrainings,
        active_trainings: activeTrainings,
        cancelled_trainings: cancelledTrainings,
        total_enrollments: totalEnrollments,
        approved_enrollments: approvedEnrollments,
        pending_enrollments: pendingEnrollments,
        rejected_enrollments: rejectedEnrollments,
        total_attendance_records: totalAttendanceRecords,
        present_records: presentRecords,
        absent_records: absentRecords,
        average_attendance_percentage: averageAttendancePercentage,
        total_certificates: totalCertificates,
        valid_certificates: validCertificates,
        expired_certificates: expiredCertificates,
        invalid_certificates: invalidCertificates
      };
    },
    enabled: !!companyId,
  });

  // Relatório de participação
  const { data: participationReport, isLoading: isLoadingParticipation } = useQuery<ParticipationReport[]>({
    queryKey: ['reports', 'participation', companyId, filters],
    queryFn: async () => {
      // Buscar funcionários
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId
      });

      // Buscar dados de presença
      const attendanceResult = await EntityService.list({
        schema: 'rh',
        table: 'training_attendance',
        companyId
      });

      // Buscar certificados
      const certificatesResult = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId
      });

      const employees = employeesResult.data;
      const attendanceData = attendanceResult.data;
      const certificatesData = certificatesResult.data;

      // Processar dados
      const report = employees?.map(employee => {
        const enrollments = employee.training_enrollments || [];
        const completedTrainings = enrollments.filter(e => 
          e.status === 'aprovado' && e.training?.data_fim && new Date(e.training.data_fim) < new Date()
        ).length;

        const employeeAttendance = attendanceData?.filter(a => 
          a.enrollment?.employee_id === employee.id
        ) || [];

        const presentCount = employeeAttendance.filter(a => a.presente).length;
        const totalAttendance = employeeAttendance.length;
        const averageAttendance = totalAttendance > 0 ? 
          Math.round((presentCount / totalAttendance) * 100) : 0;

        const certificatesEarned = certificatesData?.filter(c => 
          c.enrollment?.employee_id === employee.id
        ).length || 0;

        const lastTraining = enrollments
          .filter(e => e.training?.data_fim)
          .sort((a, b) => new Date(b.training!.data_fim!).getTime() - new Date(a.training!.data_fim!).getTime())[0];

        return {
          employee_id: employee.id,
          employee_name: employee.nome,
          employee_email: employee.email,
          department: employee.departamento || 'Não informado',
          total_trainings: enrollments.length,
          completed_trainings: completedTrainings,
          average_attendance: averageAttendance,
          certificates_earned: certificatesEarned,
          last_training_date: lastTraining?.training?.data_fim || 'Nunca'
        };
      }) || [];

      return report;
    },
    enabled: !!companyId,
  });

  // Relatório de certificados
  const { data: certificateReport, isLoading: isLoadingCertificates } = useQuery<CertificateReport[]>({
    queryKey: ['reports', 'certificates', companyId, filters],
    queryFn: async () => {
      // Buscar treinamentos
      const trainingsResult = await EntityService.list({
        schema: 'rh',
        table: 'trainings',
        companyId
      });

      // Buscar inscrições
      const enrollmentsResult = await EntityService.list({
        schema: 'rh',
        table: 'training_enrollments',
        companyId
      });

      // Buscar certificados
      const certificatesResult = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId
      });

      const trainings = trainingsResult.data;
      const enrollments = enrollmentsResult.data;
      const certificates = certificatesResult.data;

      // Processar dados
      const report = trainings?.map(training => {
        const enrollments = training.training_enrollments || [];
        const totalEnrollments = enrollments.length;
        const certificatesIssued = enrollments.reduce((acc, enrollment) => 
          acc + (enrollment.training_certificates?.length || 0), 0
        );

        const allCertificates = enrollments.flatMap(e => e.training_certificates || []);
        const validCertificates = allCertificates.filter(c => c.is_valid).length;
        const expiredCertificates = allCertificates.filter(c => 
          c.data_validade && new Date(c.data_validade) < new Date()
        ).length;

        const grades = allCertificates
          .filter(c => c.nota_final)
          .map(c => c.nota_final!);
        const averageGrade = grades.length > 0 ? 
          Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : 0;

        const completionRate = totalEnrollments > 0 ? 
          Math.round((certificatesIssued / totalEnrollments) * 100) : 0;

        return {
          training_id: training.id,
          training_name: training.nome,
          total_enrollments: totalEnrollments,
          certificates_issued: certificatesIssued,
          certificates_valid: validCertificates,
          certificates_expired: expiredCertificates,
          average_grade: averageGrade,
          completion_rate: completionRate
        };
      }) || [];

      return report;
    },
    enabled: !!companyId,
  });

  // Tendências mensais
  const { data: monthlyTrends, isLoading: isLoadingTrends } = useQuery<MonthlyTrend[]>({
    queryKey: ['reports', 'trends', companyId, filters],
    queryFn: async () => {
      // Buscar dados dos últimos 12 meses
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const trainingsResult = await EntityService.list({
        schema: 'rh',
        table: 'trainings',
        companyId,
        filters: {
          data_inicio: startDate.toISOString().split('T')[0],
          data_fim: endDate.toISOString().split('T')[0]
        }
      });

      const monthlyData = trainingsResult.data;

      // Agrupar por mês
      const monthlyMap = new Map<string, {
        trainings: number;
        enrollments: number;
        certificates: number;
        attendance_records: number;
        present_records: number;
      }>();

      monthlyData?.forEach(training => {
        const month = new Date(training.data_inicio).toISOString().substring(0, 7);
        const current = monthlyMap.get(month) || {
          trainings: 0,
          enrollments: 0,
          certificates: 0,
          attendance_records: 0,
          present_records: 0
        };

        current.trainings += 1;
        current.enrollments += training.training_enrollments?.length || 0;
        current.certificates += training.training_enrollments?.reduce((acc, e) => 
          acc + (e.training_certificates?.length || 0), 0
        ) || 0;

        const attendanceRecords = training.training_enrollments?.flatMap(e => e.training_attendance || []) || [];
        current.attendance_records += attendanceRecords.length;
        current.present_records += attendanceRecords.filter(a => a.presente).length;

        monthlyMap.set(month, current);
      });

      // Converter para array
      const trends = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        trainings: data.trainings,
        enrollments: data.enrollments,
        certificates: data.certificates,
        attendance_rate: data.attendance_records > 0 ? 
          Math.round((data.present_records / data.attendance_records) * 100) : 0
      })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      return trends;
    },
    enabled: !!companyId,
  });

  return {
    stats,
    participationReport,
    certificateReport,
    monthlyTrends,
    isLoadingStats,
    isLoadingParticipation,
    isLoadingCertificates,
    isLoadingTrends,
  };
}

// Hook para exportar relatórios
export function useReportExport() {
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], filename: string) => {
    // Implementar geração de PDF
    console.log('Exportar para PDF:', filename, data);
  };

  return {
    exportToCSV,
    exportToPDF,
  };
}