import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  CheckCircle, 
  Clock,
  FileText,
  Video,
  ExternalLink
} from 'lucide-react';
import { TrainingContent } from '@/services/rh/onlineTrainingService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OnlineTrainingContentPlayerProps {
  content: TrainingContent;
  progress?: {
    tempo_assistido_segundos: number;
    ultima_posicao_segundos: number;
    percentual_concluido: number;
    concluido: boolean;
  };
  onProgressUpdate: (data: {
    tempo_assistido_segundos: number;
    ultima_posicao_segundos: number;
    percentual_concluido: number;
  }) => void;
  onComplete: () => void;
  canAdvance?: boolean;
}

export const OnlineTrainingContentPlayer: React.FC<OnlineTrainingContentPlayerProps> = ({
  content,
  progress,
  onProgressUpdate,
  onComplete,
  canAdvance = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Usar refs para callbacks para evitar loops infinitos
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const onCompleteRef = useRef(onComplete);
  // Ref para rastrear última atualização de progresso e evitar chamadas muito frequentes
  const lastProgressUpdateRef = useRef<{ time: number; timestamp: number }>({ time: 0, timestamp: 0 });
  
  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
    onCompleteRef.current = onComplete;
  }, [onProgressUpdate, onComplete]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const { toast } = useToast();

  const startPosition = progress?.ultima_posicao_segundos || 0;
  const watchedTime = progress?.tempo_assistido_segundos || 0;
  const isCompleted = progress?.concluido || false;
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  
  // Rastreamento de tempo para conteúdo não-mídia (texto, PDF, link)
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [timeTrackingInterval, setTimeTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [contentViewStartTime, setContentViewStartTime] = useState<number | null>(null);

  // Carregar URL do arquivo (signed URL se estiver no Storage)
  useEffect(() => {
    const loadFileUrl = async () => {
      if (!content.url_conteudo && !content.arquivo_path) {
        setFileUrl(null);
        return;
      }

      // Se já é uma URL externa, usar diretamente
      if (content.url_conteudo && content.url_conteudo.startsWith('http')) {
        setFileUrl(content.url_conteudo);
        return;
      }

      // Se tem arquivo_path, gerar signed URL
      if (content.arquivo_path) {
        setLoadingUrl(true);
        try {
          const { data, error } = await supabase.storage
            .from('training-files')
            .createSignedUrl(content.arquivo_path, 3600); // 1 hora de validade

          if (error) throw error;
          if (data) {
            setFileUrl(data.signedUrl);
          }
        } catch (err) {
          console.error('Erro ao gerar signed URL:', err);
          // Fallback para url_conteudo se disponível
          setFileUrl(content.url_conteudo || null);
        } finally {
          setLoadingUrl(false);
        }
      } else {
        setFileUrl(content.url_conteudo || null);
      }
    };

    loadFileUrl();
  }, [content.url_conteudo, content.arquivo_path]);

  // Rastrear tempo para conteúdo não-mídia (texto, PDF, link)
  useEffect(() => {
    console.log('[OnlineTrainingContentPlayer] useEffect tempo tracking executado', {
      tipo_conteudo: content.tipo_conteudo,
      content_id: content.id,
      watchedTime,
      timestamp: new Date().toISOString()
    });

    const needsTimeTracking = ['texto', 'pdf', 'link_externo'].includes(content.tipo_conteudo);
    
    if (needsTimeTracking) {
      console.log('[OnlineTrainingContentPlayer] Iniciando rastreamento de tempo');
      // Iniciar rastreamento quando o componente monta
      const startTime = Date.now();
      setContentViewStartTime(startTime);
      let accumulatedTime = watchedTime; // Tempo já assistido anteriormente
      setTimeSpentSeconds(accumulatedTime);

      // Atualizar tempo a cada segundo localmente
      const interval = setInterval(() => {
        accumulatedTime += 1;
        setTimeSpentSeconds(accumulatedTime);
        
        const tempoMinimoSegundos = 120; // 2 minutos
        const percentual = Math.min((accumulatedTime / tempoMinimoSegundos) * 100, 100);
        
        // Atualizar progresso a cada 15 segundos OU quando atingir o tempo mínimo
        if (accumulatedTime % 15 === 0 || accumulatedTime === tempoMinimoSegundos) {
          console.log('[OnlineTrainingContentPlayer] Chamando onProgressUpdate do intervalo', {
            accumulatedTime,
            percentual
          });
          onProgressUpdateRef.current({
            tempo_assistido_segundos: accumulatedTime,
            ultima_posicao_segundos: 0,
            percentual_concluido: percentual
          });
        }
      }, 1000);

      setTimeTrackingInterval(interval);

      return () => {
        console.log('[OnlineTrainingContentPlayer] Cleanup: limpando intervalo de tempo');
        clearInterval(interval);
        // Não chamar onProgressUpdate no cleanup para evitar loops infinitos
        // O progresso já é salvo periodicamente durante a visualização
      };
    } else {
      console.log('[OnlineTrainingContentPlayer] Não precisa rastrear tempo, limpando');
      // Limpar intervalo se não precisa rastrear
      if (timeTrackingInterval) {
        clearInterval(timeTrackingInterval);
        setTimeTrackingInterval(null);
      }
      setContentViewStartTime(null);
      setTimeSpentSeconds(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.tipo_conteudo, content.id, watchedTime]);

  useEffect(() => {
    console.log('[OnlineTrainingContentPlayer] useEffect media executado', {
      tipo_conteudo: content.tipo_conteudo,
      content_id: content.id,
      startPosition,
      watchedTime,
      duration,
      isCompleted,
      timestamp: new Date().toISOString()
    });

    const mediaElement = content.tipo_conteudo === 'video' ? videoRef.current : 
                        content.tipo_conteudo === 'audio' ? audioRef.current : null;
    
    if (mediaElement && (content.tipo_conteudo === 'video' || content.tipo_conteudo === 'audio')) {
      console.log('[OnlineTrainingContentPlayer] Configurando event listeners para mídia');
      // Restaurar posição anterior
      if (startPosition > 0) {
        mediaElement.currentTime = startPosition;
      }

      // Event listeners
      const handleLoadedMetadata = () => {
        console.log('[OnlineTrainingContentPlayer] Metadata carregado', { duration: mediaElement.duration });
        setDuration(mediaElement.duration);
      };

      const handleTimeUpdate = () => {
        const current = mediaElement.currentTime;
        setCurrentTime(current);
        
        const percent = duration > 0 ? (current / duration) * 100 : 0;
        setProgressPercent(percent);

        // Atualizar progresso a cada 10 segundos, mas com proteção contra chamadas muito frequentes
        const currentFloor = Math.floor(current);
        const now = Date.now();
        const lastUpdate = lastProgressUpdateRef.current;
        
        // Só atualizar se:
        // 1. É múltiplo de 10 segundos
        // 2. É diferente da última atualização
        // 3. Passou pelo menos 2 segundos desde a última atualização (proteção extra)
        if (currentFloor % 10 === 0 && 
            currentFloor > 0 && 
            currentFloor !== lastUpdate.time &&
            (now - lastUpdate.timestamp) > 2000) {
          
          lastProgressUpdateRef.current = { time: currentFloor, timestamp: now };
          
          console.log('[OnlineTrainingContentPlayer] Chamando onProgressUpdate do timeupdate', {
            current: currentFloor,
            percent,
            watchedTime,
            timeSinceLastUpdate: now - lastUpdate.timestamp
          });
          
          onProgressUpdateRef.current({
            tempo_assistido_segundos: watchedTime + currentFloor,
            ultima_posicao_segundos: currentFloor,
            percentual_concluido: percent
          });
        }
      };

      const handleEnded = () => {
        console.log('[OnlineTrainingContentPlayer] Mídia terminou', {
          isCompleted,
          currentTime: mediaElement.currentTime,
          duration: mediaElement.duration
        });
        setIsPlaying(false);
        
        // Sempre chamar onComplete quando o vídeo termina, mesmo se já estava marcado como concluído
        // Isso garante que o progresso seja atualizado no banco
        console.log('[OnlineTrainingContentPlayer] Chamando onComplete ao terminar vídeo');
        onCompleteRef.current();
      };

      mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.addEventListener('timeupdate', handleTimeUpdate);
      mediaElement.addEventListener('ended', handleEnded);

      return () => {
        console.log('[OnlineTrainingContentPlayer] Cleanup: removendo event listeners');
        mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
        mediaElement.removeEventListener('ended', handleEnded);
        // Resetar ref no cleanup
        lastProgressUpdateRef.current = { time: 0, timestamp: 0 };
      };
    } else {
      console.log('[OnlineTrainingContentPlayer] Não é mídia ou elemento não encontrado');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id, content.tipo_conteudo]); // Remover watchedTime, duration, isCompleted das dependências para evitar re-execuções

  const togglePlay = () => {
    const mediaElement = content.tipo_conteudo === 'video' ? videoRef.current : 
                        content.tipo_conteudo === 'audio' ? audioRef.current : null;
    
    if (mediaElement) {
      if (isPlaying) {
        mediaElement.pause();
      } else {
        mediaElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    const mediaElement = content.tipo_conteudo === 'video' ? videoRef.current : 
                        content.tipo_conteudo === 'audio' ? audioRef.current : null;
    
    if (mediaElement) {
      mediaElement.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Renderizar conteúdo baseado no tipo
  const renderContent = () => {
    switch (content.tipo_conteudo) {
      case 'video':
        if (loadingUrl) {
          return (
            <div className="flex items-center justify-center h-64 bg-black rounded-lg">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p>Carregando vídeo...</p>
              </div>
            </div>
          );
        }
        if (!fileUrl) {
          return (
            <Alert>
              <AlertDescription>
                URL do vídeo não disponível.
              </AlertDescription>
            </Alert>
          );
        }
        return (
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={fileUrl}
              className="w-full h-auto max-h-[600px]"
              controls={false}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Controles customizados */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Barra de progresso */}
              <div 
                className="w-full h-2 bg-white/20 rounded-full mb-2 cursor-pointer"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2 text-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <span className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 'audio':
        if (loadingUrl) {
          return (
            <div className="flex items-center justify-center h-64 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando áudio...</p>
              </div>
            </div>
          );
        }
        if (!fileUrl) {
          return (
            <Alert>
              <AlertDescription>
                URL do áudio não disponível.
              </AlertDescription>
            </Alert>
          );
        }
        return (
          <div className="w-full bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border p-6">
            <div className="max-w-2xl mx-auto">
              {/* Player de áudio */}
              <audio
                ref={audioRef}
                src={fileUrl}
                className="w-full mb-4"
                controls={false}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              
              {/* Controles customizados */}
              <div className="space-y-4">
                {/* Barra de progresso */}
                <div 
                  className="w-full h-2 bg-white/40 rounded-full cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Controles */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={togglePlay}
                    className="rounded-full w-16 h-16"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>

                  <div className="flex-1">
                    <div className="text-sm font-medium">{content.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pdf':
        if (loadingUrl) {
          return (
            <div className="flex items-center justify-center h-64 border rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando PDF...</p>
              </div>
            </div>
          );
        }
        if (!fileUrl) {
          return (
            <Alert>
              <AlertDescription>
                URL do PDF não disponível.
              </AlertDescription>
            </Alert>
          );
        }
        return (
          <div className="w-full h-[600px] border rounded-lg overflow-hidden">
            <iframe
              src={fileUrl}
              className="w-full h-full"
              title={content.titulo}
            />
          </div>
        );

      case 'texto':
        return (
          <div className="prose max-w-none p-6 bg-white rounded-lg border">
            <div dangerouslySetInnerHTML={{ __html: content.conteudo_texto || '' }} />
          </div>
        );

      case 'link_externo':
        return (
          <div className="p-6 bg-white rounded-lg border text-center">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">{content.titulo}</h3>
            <p className="text-muted-foreground mb-4">{content.descricao}</p>
            <Button asChild>
              <a href={content.url_conteudo} target="_blank" rel="noopener noreferrer">
                Acessar Conteúdo
              </a>
            </Button>
          </div>
        );

      default:
        return (
          <Alert>
            <AlertDescription>
              Tipo de conteúdo não suportado: {content.tipo_conteudo}
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {content.tipo_conteudo === 'video' && <Video className="h-5 w-5 text-primary" />}
              {content.tipo_conteudo === 'pdf' && <FileText className="h-5 w-5 text-primary" />}
              <CardTitle>{content.titulo}</CardTitle>
            </div>
            {content.descricao && (
              <p className="text-sm text-muted-foreground">{content.descricao}</p>
            )}
          </div>
          {isCompleted && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-4 w-4 mr-1" />
              Concluído
            </Badge>
          )}
        </div>

        {/* Informações adicionais */}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          {content.duracao_minutos && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{content.duracao_minutos} minutos</span>
            </div>
          )}
          {content.ordem > 0 && (
            <Badge variant="outline">Aula {content.ordem}</Badge>
          )}
        </div>

        {/* Progresso */}
        {progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progresso</span>
              <span>{Math.round(progress.percentual_concluido)}%</span>
            </div>
            <Progress value={progress.percentual_concluido} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!canAdvance && !isCompleted && (
          <Alert className="mb-4">
            <AlertDescription>
              Complete o conteúdo anterior antes de avançar para esta aula.
            </AlertDescription>
          </Alert>
        )}

        {renderContent()}
      </CardContent>
    </Card>
  );
};

