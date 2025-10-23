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
  Award,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Calendar
} from 'lucide-react';
import { useReports, useReportExport } from '@/hooks/rh/useReports';
import { useCompany } from '@/lib/company-context';

interface CertificateReportProps {
  filters?: any;
}

const CertificateReport: React.FC<CertificateReportProps> = ({ filters }) => {
  const { selectedCompany } = useCompany();
  const { certificateReport, isLoadingCertificates } = useReports(selectedCompany?.id || '', filters);
  const { exportToCSV, exportToPDF } = useReportExport();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('completion_rate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtrar e ordenar dados
  const filteredData = certificateReport?.filter(training => {
    const matchesSearch = 
      training.training_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'high' && training.completion_rate >= 80) ||
      (statusFilter === 'medium' && training.completion_rate >= 50 && training.completion_rate < 80) ||
      (statusFilter === 'low' && training.completion_rate < 50);
    
    return matchesSearch && matchesStatus;
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
      exportToCSV(sortedData, 'relatorio_certificados');
    } else {
      exportToPDF(sortedData, 'relatorio_certificados');
    }
  };

  const getCompletionBadge = (rate: number) => {
    if (rate >= 80) {
      return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    } else if (rate >= 60) {
      return <Badge className="bg-blue-100 text-blue-800">Bom</Badge>;
    } else if (rate >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Baixo</Badge>;
    }
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 8) {
      return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    } else if (grade >= 6) {
      return <Badge className="bg-blue-100 text-blue-800">Bom</Badge>;
    } else if (grade >= 4) {
      return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Baixo</Badge>;
    }
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 80) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (rate >= 50) {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  if (isLoadingCertificates) {
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
              <Award className="h-5 w-5" />
              Relatório de Certificados
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
                placeholder="Buscar treinamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status de Conclusão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="high">Alto (80%+)</SelectItem>
                <SelectItem value="medium">Médio (50-79%)</SelectItem>
                <SelectItem value="low">Baixo (menos de 50%)</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Total de Treinamentos</p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Inscrições</p>
                <p className="text-2xl font-bold">
                  {filteredData.reduce((acc, training) => acc + training.total_enrollments, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Certificados Emitidos</p>
                <p className="text-2xl font-bold">
                  {filteredData.reduce((acc, training) => acc + training.certificates_issued, 0)}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa Média de Conclusão</p>
                <p className="text-2xl font-bold">
                  {filteredData.length > 0 ? 
                    Math.round(filteredData.reduce((acc, training) => acc + training.completion_rate, 0) / filteredData.length) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Certificados */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('training_name')}
                  >
                    <div className="flex items-center gap-2">
                      Treinamento
                      {sortBy === 'training_name' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('total_enrollments')}
                  >
                    <div className="flex items-center gap-2">
                      Inscrições
                      {sortBy === 'total_enrollments' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('certificates_issued')}
                  >
                    <div className="flex items-center gap-2">
                      Certificados
                      {sortBy === 'certificates_issued' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('completion_rate')}
                  >
                    <div className="flex items-center gap-2">
                      Taxa de Conclusão
                      {sortBy === 'completion_rate' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('average_grade')}
                  >
                    <div className="flex items-center gap-2">
                      Nota Média
                      {sortBy === 'average_grade' && (
                        sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Válidos/Expirados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length > 0 ? (
                  sortedData.map((training, index) => (
                    <TableRow key={training.training_id}>
                      <TableCell>
                        <div className="font-medium">{training.training_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="text-lg font-bold">{training.total_enrollments}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">
                            {training.certificates_issued}
                          </div>
                          <div className="text-xs text-gray-500">
                            {training.total_enrollments > 0 ? 
                              Math.round((training.certificates_issued / training.total_enrollments) * 100) : 0}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold">{training.completion_rate}%</div>
                          {getCompletionBadge(training.completion_rate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {training.average_grade.toFixed(1)}
                          </div>
                          {training.average_grade > 0 && getGradeBadge(training.average_grade)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(training.completion_rate)}
                          <span className="text-sm">
                            {training.completion_rate >= 80 ? 'Excelente' : 
                             training.completion_rate >= 50 ? 'Bom' : 'Baixo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            <span className="text-sm">{training.certificates_valid}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            <span className="text-sm">{training.certificates_expired}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum treinamento encontrado</p>
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

      {/* Resumo de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Taxa de Conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Excelente (80%+)</span>
                </div>
                <span className="font-bold">
                  {filteredData.filter(t => t.completion_rate >= 80).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Bom (60-79%)</span>
                </div>
                <span className="font-bold">
                  {filteredData.filter(t => t.completion_rate >= 60 && t.completion_rate < 80).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Regular (40-59%)</span>
                </div>
                <span className="font-bold">
                  {filteredData.filter(t => t.completion_rate >= 40 && t.completion_rate < 60).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Baixo (menos de 40%)</span>
                </div>
                <span className="font-bold">
                  {filteredData.filter(t => t.completion_rate < 40).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Treinamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedData.slice(0, 5).map((training, index) => (
                <div key={training.training_id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="text-sm font-medium">{training.training_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{training.completion_rate}%</div>
                    <div className="text-xs text-gray-500">{training.certificates_issued} certificados</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CertificateReport;
