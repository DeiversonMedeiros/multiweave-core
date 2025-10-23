// =====================================================
// COMPONENTE: ABA DE DOCUMENTOS
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Trash2,
  Upload,
  FileText,
  Calendar,
  User,
  File
} from 'lucide-react';
import { useCandidateDocuments } from '@/hooks/rh/useRecruitment';
import { CandidateDocumentFilters } from '@/integrations/supabase/recruitment-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DocumentUploadForm } from './forms/DocumentUploadForm';

export function DocumentUploadTab() {
  const [filters, setFilters] = useState<CandidateDocumentFilters>({});
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: documents, isLoading } = useCandidateDocuments(filters);

  const getDocumentTypeBadge = (type: string) => {
    const typeConfig = {
      curriculo: { variant: 'default' as const, label: 'Currículo' },
      carteira_identidade: { variant: 'secondary' as const, label: 'RG' },
      cpf: { variant: 'secondary' as const, label: 'CPF' },
      comprovante_residencia: { variant: 'outline' as const, label: 'Comprovante' },
      certificado: { variant: 'default' as const, label: 'Certificado' },
      outro: { variant: 'outline' as const, label: 'Outro' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.outro;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do arquivo, candidato..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Documento</label>
              <Select
                value={filters.document_type || ''}
                onValueChange={(value) => setFilters({ ...filters, document_type: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="curriculo">Currículo</SelectItem>
                  <SelectItem value="carteira_identidade">RG</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="comprovante_residencia">Comprovante</SelectItem>
                  <SelectItem value="certificado">Certificado</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Candidato</label>
              <Input
                placeholder="ID do candidato"
                value={filters.candidate_id || ''}
                onChange={(e) => setFilters({ ...filters, candidate_id: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload por</label>
              <Input
                placeholder="Nome do usuário"
                value={filters.uploaded_by || ''}
                onChange={(e) => setFilters({ ...filters, uploaded_by: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>
              {documents?.length || 0} documentos encontrados
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>Upload Documento</Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload de Documento</DialogTitle>
                <DialogDescription>
                  Faça upload de um documento para um candidato
                </DialogDescription>
              </DialogHeader>
              <DocumentUploadForm onSuccess={() => setShowForm(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Candidato</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Upload por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-muted-foreground" />
                      {document.file_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDocumentTypeBadge(document.document_type)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Candidato
                    </div>
                  </TableCell>
                  <TableCell>
                    {document.file_size ? formatFileSize(document.file_size) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {document.uploaded_by_name || 'Usuário'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(document.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                        <DropdownMenuItem onClick={() => setSelectedDocument(document)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
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
        </CardContent>
      </Card>
    </div>
  );
}
