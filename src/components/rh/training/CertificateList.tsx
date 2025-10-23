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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Download, 
  Edit,
  Trash2,
  Award,
  Calendar,
  User,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useCertificate } from '@/hooks/rh/useCertificate';
import { useCompany } from '@/lib/company-context';
import CertificateGenerator from './CertificateGenerator';

interface CertificateListProps {
  trainingId?: string;
  onGenerate: (enrollmentId: string) => void;
  onView: (certificateId: string) => void;
}

interface TrainingCertificate {
  id: string;
  enrollment_id: string;
  data_emissao: string;
  url_certificado?: string;
  hash_verificacao: string;
  nota_final?: number;
  observacoes?: string;
  is_valid: boolean;
  data_validade?: string;
  created_at: string;
  updated_at: string;
  enrollment?: {
    id: string;
    training_id: string;
    employee_id: string;
    status: string;
    training?: {
      id: string;
      nome: string;
      data_inicio: string;
      data_fim?: string;
      local?: string;
      carga_horaria: number;
      instrutor?: string;
    };
    employee?: {
      id: string;
      nome: string;
      email: string;
      cargo?: string;
      cpf?: string;
    };
  };
}

const CertificateList: React.FC<CertificateListProps> = ({ trainingId, onGenerate, onView }) => {
  const { selectedCompany } = useCompany();
  const { certificates, isLoading, error, getCertificateStats } = useCertificate(selectedCompany?.id || '');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<TrainingCertificate | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // Filtrar certificados
  const filteredCertificates = certificates?.filter(certificate => {
    const matchesSearch = 
      certificate.enrollment?.employee?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.enrollment?.employee?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.enrollment?.training?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.hash_verificacao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'valid' && certificate.is_valid) ||
      (statusFilter === 'expired' && certificate.data_validade && new Date(certificate.data_validade) < new Date()) ||
      (statusFilter === 'invalid' && !certificate.is_valid);
    const matchesTraining = !trainingId || certificate.enrollment?.training_id === trainingId;
    
    return matchesSearch && matchesStatus && matchesTraining;
  }) || [];

  const getStatusBadge = (certificate: TrainingCertificate) => {
    const isExpired = certificate.data_validade && new Date(certificate.data_validade) < new Date();
    
    if (!certificate.is_valid) {
      return <Badge variant="destructive">Inválido</Badge>;
    }
    
    if (isExpired) {
      return <Badge variant="outline">Expirado</Badge>;
    }
    
    return <Badge variant="default">Válido</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}`;
  };

  const handleGenerate = (enrollmentId: string) => {
    onGenerate(enrollmentId);
  };

  const handleView = (certificateId: string) => {
    onView(certificateId);
  };

  const handleDownload = (certificate: TrainingCertificate) => {
    if (certificate.url_certificado) {
      window.open(certificate.url_certificado, '_blank');
    } else {
      // Gerar PDF do certificado
      console.log('Gerar PDF para:', certificate.id);
    }
  };

  const handleEdit = (certificate: TrainingCertificate) => {
    setSelectedCertificate(certificate);
    setShowGenerator(true);
  };

  const handleGeneratorClose = () => {
    setShowGenerator(false);
    setSelectedCertificate(null);
  };

  const stats = getCertificateStats();

  if (isLoading) {
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

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Erro ao carregar certificados: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Certificados</span>
            {trainingId && (
              <Button onClick={() => setShowGenerator(true)}>
                <Award className="h-4 w-4 mr-2" />
                Emitir Certificado
              </Button>
            )}
          </CardTitle>
          
          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-600">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
                <div className="text-sm text-green-600">Válidos</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
                <div className="text-sm text-red-600">Expirados</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.validPercentage}%</div>
                <div className="text-sm text-purple-600">Taxa Válidos</div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar certificados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="valid">Válidos</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                  <SelectItem value="invalid">Inválidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredCertificates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum certificado encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou emitir um novo certificado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((certificate) => (
                    <TableRow key={certificate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{certificate.enrollment?.employee?.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {certificate.enrollment?.employee?.email}
                          </div>
                          {certificate.enrollment?.employee?.cargo && (
                            <div className="text-sm text-gray-500">
                              {certificate.enrollment.employee.cargo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{certificate.enrollment?.training?.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {certificate.enrollment?.training?.data_inicio && 
                              formatDate(certificate.enrollment.training.data_inicio)
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {certificate.enrollment?.training?.carga_horaria}h
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(certificate.data_emissao)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {certificate.data_validade ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(certificate.data_validade)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {certificate.nota_final ? (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{certificate.nota_final}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(certificate)}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs text-gray-500">
                          {formatHash(certificate.hash_verificacao)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(certificate.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(certificate)}>
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(certificate)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => console.log('Deletar:', certificate.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Geração/Edição */}
      {showGenerator && (
        <CertificateGenerator
          trainingId={trainingId}
          certificate={selectedCertificate}
          onSave={handleGeneratorClose}
          onCancel={handleGeneratorClose}
        />
      )}
    </>
  );
};

export default CertificateList;
