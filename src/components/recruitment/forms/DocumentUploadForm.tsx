// =====================================================
// FORMULÁRIO: UPLOAD DE DOCUMENTO
// =====================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateCandidateDocument } from '@/hooks/rh/useRecruitment';
import { 
  candidateDocumentCreateSchema, 
  CandidateDocumentCreateData 
} from '@/lib/validations/recruitment-validations';
import { toast } from 'sonner';
import { Upload, FileText, X } from 'lucide-react';

interface DocumentUploadFormProps {
  onSuccess?: () => void;
  initialData?: Partial<CandidateDocumentCreateData>;
}

export function DocumentUploadForm({ onSuccess, initialData }: DocumentUploadFormProps) {
  const createMutation = useCreateCandidateDocument();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<CandidateDocumentCreateData>({
    resolver: zodResolver(candidateDocumentCreateSchema),
    defaultValues: {
      candidate_id: initialData?.candidate_id || '',
      document_type: initialData?.document_type || 'curriculo',
      file_name: initialData?.file_name || '',
      file_path: initialData?.file_path || '',
      file_size: initialData?.file_size || 0,
      mime_type: initialData?.mime_type || ''
    }
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    form.setValue('file_name', file.name);
    form.setValue('file_size', file.size);
    form.setValue('mime_type', file.type);
    // Em um cenário real, você faria upload do arquivo para o Supabase Storage aqui
    form.setValue('file_path', `documents/${file.name}`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    form.setValue('file_name', '');
    form.setValue('file_size', 0);
    form.setValue('mime_type', '');
    form.setValue('file_path', '');
  };

  const onSubmit = async (data: CandidateDocumentCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Documento enviado com sucesso!');
      form.reset();
      setSelectedFile(null);
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao enviar documento');
      console.error('Error uploading document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Candidato */}
          <FormField
            control={form.control}
            name="candidate_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Candidato *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ID do candidato" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  ID do candidato para o qual o documento será enviado
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo de Documento */}
          <FormField
            control={form.control}
            name="document_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Documento *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="curriculo">Currículo</SelectItem>
                    <SelectItem value="carteira_identidade">Carteira de Identidade</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="comprovante_residencia">Comprovante de Residência</SelectItem>
                    <SelectItem value="certificado">Certificado</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Tipo do documento que está sendo enviado
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Upload de Arquivo */}
        <div className="space-y-4">
          <FormLabel>Arquivo *</FormLabel>
          
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Arraste e solte o arquivo aqui
                </p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
                <Input
                  type="file"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Selecionar Arquivo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || !selectedFile}
          >
            {createMutation.isPending ? 'Enviando...' : 'Enviar Documento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
