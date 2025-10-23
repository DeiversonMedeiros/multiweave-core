import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Filter,
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Mail,
  Building
} from 'lucide-react';
import { useReports, useReportExport } from '@/hooks/rh/useReports';
import { useCompany } from '@/lib/company-context';

interface ParticipationReportProps {
  filters?: any;
}

const ParticipationReport: React.FC<ParticipationReportProps> = ({ filters }) => {
  const { selectedCompany } = useCompany();
  const { participationReport, isLoadingParticipation } = useReports(selectedCompany?.id || '', filters);
  const { exportToCSV, exportToPDF } = useReportExport();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total_trainings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Filtrar e ordenar dados
  const filteredData = participationReport?.filter(employee => {
    const matchesSearch = 
      employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  }) || [];

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a];
    const bValue = b[sortBy as keyof typeof b];
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
      exportToCSV(sortedData, 'relatorio_participacao');
    } else {
      exportToPDF(sortedData, 'relatorio_participacao');
    }
  };

  const getPerformanceBadge = (attendance: number) => {
    if (attendance >= 90) {
      return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    } else if (attendance >= 80) {
      return <Badge className="bg-blue-100 text-blue-800">Bom</Badge>;
    } else if (attendance >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Baixo</Badge>;
    }
  };

  const getTrendIcon = (current: number, average: number) => {
    if (current > average) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < average) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'Nunca') return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoadingParticipation) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Relatório de Participação
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="TI">TI</SelectItem>
                <SelectItem value="Vendas">Vendas</SelectItem>
                <SelectItem value="Financeiro">Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Funcionários</p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Média de Treinamentos</p>
                <p className="text-2xl font-bold">
                  {filteredData.length > 0 ? 
                    Math.round(filteredData.reduce((acc, emp) => acc + emp.total_trainings, 0) / filteredData.length) : 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Média de Presença</p>
                <p className="text-2xl font-bold">
                  {filteredData.length > 0 ? 
                    Math.round(filteredData.reduce((acc, emp) => acc + emp.average_attendance, 0) / filteredData.length) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Certificados</p>
                <p className="text-2xl font-bold">
                  {filteredData.reduce((acc, emp) => acc + emp.certificates_earned, 0)}
                </p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Participação */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('employee_name')}
                  >
                    <div className="flex items-center gap-2">
                      Funcionário
                      {sortBy === 'employee_name' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center gap-2">
                      Departamento
                      {sortBy === 'department' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('total_trainings')}
                  >
                    <div className="flex items-center gap-2">
                      Treinamentos
                      {sortBy === 'total_trainings' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('completed_trainings')}
                  >
                    <div className="flex items-center gap-2">
                      Concluídos
                      {sortBy === 'completed_trainings' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('average_attendance')}
                  >
                    <div className="flex items-center gap-2">
                      Presença
                      {sortBy === 'average_attendance' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('certificates_earned')}
                  >
                    <div className="flex items-center gap-2">
                      Certificados
                      {sortBy === 'certificates_earned' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('last_training_date')}
                  >
                    <div className="flex items-center gap-2">
                      Último Treinamento
                      {sortBy === 'last_training_date' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length > 0 ? (
                  sortedData.map((employee, index) => (
                    <TableRow key={employee.employee_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.employee_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {employee.employee_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-gray-400" />
                          {employee.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="text-lg font-bold">{employee.total_trainings}</div>
                          <div className="text-xs text-gray-500">
                            {employee.completed_trainings} concluídos
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {employee.completed_trainings}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.total_trainings > 0 ? 
                              Math.round((employee.completed_trainings / employee.total_trainings) * 100) : 0}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold">{employee.average_attendance}%</div>
                          {getPerformanceBadge(employee.average_attendance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">
                            {employee.certificates_earned}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.total_trainings > 0 ? 
                              Math.round((employee.certificates_earned / employee.total_trainings) * 100) : 0}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(employee.last_training_date)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum funcionário encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipationReport;
