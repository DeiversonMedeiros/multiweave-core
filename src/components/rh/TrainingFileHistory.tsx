import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  FileText, 
  Video, 
  Download,
  Trash2,
  Calendar
} from 'lucide-react';
import { useTrainingNotificationService } from '@/hooks/rh/useTrainingNotificationService';
import { TrainingFileHistory } from '@/services/rh/trainingNotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrainingFileHistoryProps {
  trainingId?: string;
  contentId?: string;
}

export const TrainingFileHistory: React.FC<TrainingFileHistoryProps> = ({
  trainingId,
  contentId
}) => {
  const { getFileHistory, loading } = useTrainingNotificationService();
  const { toast } = useToast();
  const [files, setFiles] = useState<TrainingFileHistory[]>([]);

  useEffect(() => {
    loadHistory();
  }, [trainingId, contentId]);

  const loadHistory = async () => {
    const result = await getFileHistory(trainingId, contentId);
    setFiles(result.files || []);
  };

  const handleDownload = async (file: TrainingFileHistory) => {
    try {
      if (file.file_path) {
        // Gerar signed URL para download
        const { data, error } = await supabase.storage
          .from('training-files')
          .createSignedUrl(file.file_path, 3600);

        if (error) throw error;

        // Fazer download
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_path.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (file.file_url) {
        // URL externa
        window.open(file.file_url, '_blank');
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o arquivo',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (file: TrainingFileHistory) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      if (file.file_path) {
        const { error } = await supabase.storage
          .from('training-files')
          .remove([file.file_path]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Arquivo excluído com sucesso',
        });

        await loadHistory();
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o arquivo',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando histórico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Arquivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum arquivo encontrado no histórico.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Arquivos ({files.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.content_id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {getFileIcon(file.file_type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{file.content_title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(file.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {file.file_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(file)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};



