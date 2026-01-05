// =====================================================
// MODAL DE REGISTRO DE PONTO - VERSÃO OTIMIZADA (UNIFICADA)
// =====================================================
// Versão: 1.0.0-unified
// Data: 2025-01-20
// Descrição: Modal otimizado para evitar race conditions e erros removeChild
//            - Fila serializada para operações assíncronas (GPS, geocode, upload)
//            - AbortController para cancelar operações pendentes
//            - Safe unmount do Leaflet (esconde via CSS antes de desmontar)
//            - Bloqueio interno do modal durante operações críticas
//            - Funciona em dispositivos antigos (Chrome WebView)
//            - Suporta registro offline
//            - Permite registro fora da zona (com aviso)
//            - Respeita configurações de ponto eletrônico
//            - MODAL UNIFICADO: Localização, Foto e Confirmação em uma única tela

import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoCapture } from './PhotoCapture';
import { LocationZoneMap } from './LocationZoneMap';
import { SimpleLocationMap } from './SimpleLocationMap';
import { PhotoCaptureErrorBoundary } from './PhotoCaptureErrorBoundary';
import { GeolocationService } from '@/services/geolocationService';
import { useTimeRecordPhoto } from '@/hooks/rh/useTimeRecordPhoto';
import { useLocationZones } from '@/hooks/rh/useLocationZones';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { CheckCircle, AlertCircle, Loader2, MapPin, Camera } from 'lucide-react';
import { CameraService } from '@/services/cameraService';
import { EmployeeLocationZonesService } from '@/services/rh/employeeLocationZonesService';

interface TimeRecordRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    address: string;
    localizacao_type: 'gps' | 'manual' | 'wifi';
    outsideZone: boolean;
  }) => void;
  typeLabel: string;
  employeeId: string;
}

// Tipo para tarefas da fila
type QueueTask = () => Promise<void>;

// Constante de versão do modal
const MODAL_VERSION = '1.0.0-unified';
const MODAL_TYPE = 'unified'; // 'unified' = modal único, 'steps' = modal em etapas

export function TimeRecordRegistrationModal({
  isOpen,
  onClose,
  onConfirm,
  typeLabel,
  employeeId
}: TimeRecordRegistrationModalProps) {
  // Log de versão ao montar o componente
  useEffect(() => {
    console.log('[MODAL][VERSION] 🎯 Modal de Registro de Ponto carregado', {
      version: MODAL_VERSION,
      type: MODAL_TYPE,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
      isOpen,
      employeeId
    });
  }, []);

  // Estados de UI/dados
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationAttempted, setLocationAttempted] = useState(false); // Controlar se já tentou buscar localização
  const [isWithinZone, setIsWithinZone] = useState<boolean | null>(null);
  const [locationType, setLocationType] = useState<'gps' | 'manual' | 'wifi'>('gps');
  const [showMap, setShowMap] = useState(false);
  // Usar mapa simples por padrão para máxima compatibilidade com navegadores antigos
  // O mapa simples usa apenas imagem estática, sem dependências pesadas como Leaflet
  const [useSimpleMap] = useState(true); // Sempre usar mapa simples para evitar problemas de compatibilidade
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(true); // Controlar visibilidade do PhotoCapture sem desmontar
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false); // Estado intermediário para evitar conflitos de renderização
  
  // Refs para lifecycle e controle de operações
  const isMountedRef = useRef(true);
  const isClosingRef = useRef(false);
  const locationRequestedRef = useRef(false);
  const photoCaptureKeyRef = useRef(0);
  
  // Refs para fila serializada e AbortController
  const abortControllersRef = useRef<Set<AbortController>>(new Set());
  const queueRef = useRef<Array<QueueTask>>([]);
  const runningQueueRef = useRef(false);

  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { uploadPhoto, uploading } = useTimeRecordPhoto({ employeeId });
  const { saveOfflineRecord } = useOfflineStorage();
  const { data: companyZones } = useLocationZones();
  
  const { data: employeeZoneRelations } = useQuery({
    queryKey: ['employee-location-zones', employeeId, selectedCompany?.id],
    queryFn: async () => {
      if (!employeeId || !selectedCompany?.id) return [];
      return await EmployeeLocationZonesService.getByEmployeeId(employeeId, selectedCompany.id);
    },
    enabled: !!employeeId && !!selectedCompany?.id && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  // -----------------------------
  // Fila serializada para operações assíncronas
  // -----------------------------
  const pushQueue = (task: QueueTask) => {
    queueRef.current.push(task);
    runQueue();
  };

  const runQueue = async () => {
    if (runningQueueRef.current) return;
    runningQueueRef.current = true;

    while (queueRef.current.length > 0) {
      const task = queueRef.current.shift()!;
      try {
        await task();
      } catch (err) {
        console.warn('[Modal][Queue] task failed', err);
      }
      if (!isMountedRef.current) break;
    }

    runningQueueRef.current = false;
  };

  // -----------------------------
  // Helper para criar AbortController com timeout
  // -----------------------------
  function makeAbortControllerWithTimeout(ms = 20000): AbortController {
    const ctrl = new AbortController();
    abortControllersRef.current.add(ctrl);
    
    if (ms > 0) {
      const timeoutId = setTimeout(() => {
        try {
          ctrl.abort();
        } catch {
          // Ignorar erros ao abortar
        }
      }, ms);
      
      // Limpar timeout quando o controller for removido
      ctrl.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
      }, { once: true });
    }
    
    return ctrl;
  }

  // Helper para aguardar
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // -----------------------------
  // Lifecycle e conectividade
  // -----------------------------
  useEffect(() => {
    isMountedRef.current = true;
    isClosingRef.current = false;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Abortar todos os controllers pendentes
      abortControllersRef.current.forEach((ctrl) => {
        try {
          ctrl.abort();
        } catch {
          // Ignorar
        }
      });
      abortControllersRef.current.clear();
    };
  }, []);

  const activeZones = useMemo(() => {
    return (companyZones || []).filter((zone) => zone.ativo);
  }, [companyZones]);

  const enforcedZone = useMemo(() => {
    if (!employeeZoneRelations || employeeZoneRelations.length === 0) {
      return null;
    }
    const zoneMap = new Map(activeZones.map((zone) => [zone.id, zone]));
    for (const relation of employeeZoneRelations) {
      const zone = zoneMap.get(relation.location_zone_id);
      if (zone) return zone;
    }
    return null;
  }, [employeeZoneRelations, activeZones]);

  const hasZoneRestriction = !!enforcedZone;

  // -----------------------------
  // Controle de abertura/fechamento do modal
  // -----------------------------
  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      isMountedRef.current = true;
      setLockedOpen(true);
      
      // NOVA ABORDAGEM: Não iniciar localização automaticamente
      // A localização será buscada DEPOIS que a foto for capturada
      // Isso evita race conditions e melhora a UX
    } else {
      // Se o parent fechou mas estamos locked, ignorar até safeClose
      if (lockedOpen) {
        console.log('[Modal] parent set isOpen=false while lockedOpen=true — ignoring until safeClose');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Resetar estado ao fechar modal
  useEffect(() => {
    if (!lockedOpen) {
      // Limpar estados quando fechar
      setTimeout(() => {
        setCapturedPhoto(null);
        setPhotoUrl(null);
        if (photoPreviewUrl) {
          try {
            URL.revokeObjectURL(photoPreviewUrl);
          } catch {
            // Ignorar erros ao revogar URL
          }
        }
        setPhotoPreviewUrl(null);
        setLocation(null);
        setAddress(null);
        setError(null);
        setIsWithinZone(null);
        setShowMap(false);
        setShowPhotoCapture(true);
        setIsProcessingPhoto(false);
        setLocationAttempted(false);
        locationRequestedRef.current = false;
        isClosingRef.current = false;
        isMountedRef.current = true;
      }, 300);
    }
  }, [lockedOpen, photoPreviewUrl]);

  // Validar se está dentro da zona
  useEffect(() => {
    if (location && enforcedZone) {
      const distance = GeolocationService.calculateDistance(
        location.lat,
        location.lon,
        enforcedZone.latitude,
        enforcedZone.longitude
      );
      const within = distance <= (enforcedZone.raio_metros || 100);
      setIsWithinZone(within);
    } else {
      setIsWithinZone(null);
    }
  }, [location, enforcedZone]);

  // Obter endereço quando location mudar (via fila)
  useEffect(() => {
    if (!isMountedRef.current || isClosingRef.current) return;
    
    if (location && !address && !isLoadingAddress) {
      if (isOnline) {
        // Adicionar à fila para serializar com outras operações
        pushQueue(async () => {
          if (isMountedRef.current && !isClosingRef.current) {
            await handleReverseGeocode();
          }
        });
      } else {
        // Offline: usar coordenadas como endereço imediatamente
        const coordAddress = `Coordenadas: ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
        console.log('[MODAL][GEOCODE] 📴 Offline - definindo endereço como coordenadas', { address: coordAddress });
        setAddress(coordAddress);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, address, isLoadingAddress, isOnline]);

  // -----------------------------
  // Reverse Geocode com AbortController
  // -----------------------------
  const handleReverseGeocode = async (loc?: { lat: number; lon: number }, parentController?: AbortController) => {
    const targetLocation = loc || location;
    if (!targetLocation || isLoadingAddress || !isOnline) return;
    
    console.log('[MODAL][GEOCODE] 🔄 Iniciando reverse geocode', { lat: targetLocation.lat, lon: targetLocation.lon });
    setIsLoadingAddress(true);
    
    const controller = parentController || makeAbortControllerWithTimeout(15000);
    
    try {
      // Wrapper para suportar abort (GeolocationService não tem suporte nativo)
      const result = await Promise.race([
        GeolocationService.reverseGeocode(targetLocation.lat, targetLocation.lon),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          }, { once: true });
        })
      ]);
      
      if (!isMountedRef.current || isClosingRef.current || controller.signal.aborted) return;
      
      const addressText = result.address || `Coordenadas: ${targetLocation.lat.toFixed(6)}, ${targetLocation.lon.toFixed(6)}`;
      console.log('[MODAL][GEOCODE] ✅ Endereço obtido', { address: addressText });
      setAddress(addressText);
    } catch (err: any) {
      if (controller.signal.aborted || !isMountedRef.current || isClosingRef.current) return;
      
      console.warn('[MODAL][GEOCODE] ❌ Erro ao obter endereço:', err);
      // Fallback: usar coordenadas como endereço
      const coordAddress = `Coordenadas: ${targetLocation.lat.toFixed(6)}, ${targetLocation.lon.toFixed(6)}`;
      console.log('[MODAL][GEOCODE] 📍 Usando coordenadas como endereço (fallback)', { address: coordAddress });
      setAddress(coordAddress);
    } finally {
      if (!isClosingRef.current && !controller.signal.aborted) {
        setIsLoadingAddress(false);
      }
      abortControllersRef.current.delete(controller);
    }
  };

  // -----------------------------
  // Captura de foto - NOVA ABORDAGEM: Foto primeiro, localização depois
  // -----------------------------
  const handlePhotoCapture = (file: File) => {
    const startTime = performance.now();
    console.log('[MODAL][PHOTO] 📸 handlePhotoCapture INÍCIO', { 
      fileName: file.name, 
      fileSize: file.size,
      isMounted: isMountedRef.current,
      isClosing: isClosingRef.current,
      timestamp: new Date().toISOString()
    });
    
    if (!isMountedRef.current || isClosingRef.current) {
      console.warn('[MODAL][PHOTO] ⚠️ Retornando cedo - condições não atendidas', {
        isMounted: isMountedRef.current,
        isClosing: isClosingRef.current
      });
      return;
    }
    
    // CRÍTICO: Marcar como processando para evitar renderização conflitante
    console.log('[MODAL][PHOTO] 🔄 Marcando isProcessingPhoto = true');
    setIsProcessingPhoto(true);
    
    console.log('[MODAL][PHOTO] ⏱️ Agendando processamento com setTimeout 200ms');
    // CRÍTICO: NÃO esconder PhotoCapture ainda - primeiro atualizar os estados
    // Isso evita o erro insertBefore porque o React não tenta renderizar uma transição inválida
    setTimeout(() => {
      const elapsed = performance.now() - startTime;
      console.log('[MODAL][PHOTO] ⏰ setTimeout executado', {
        elapsed: `${elapsed.toFixed(2)}ms`,
        isMounted: isMountedRef.current,
        isClosing: isClosingRef.current
      });
      
      if (!isMountedRef.current || isClosingRef.current) {
        console.warn('[MODAL][PHOTO] ⚠️ Retornando no setTimeout - condições não atendidas');
        setIsProcessingPhoto(false);
        return;
      }
      
      console.log('[MODAL][PHOTO] 🧹 Limpando preview anterior se existir');
      // Limpar preview anterior se existir
      if (photoPreviewUrl) {
        try {
          URL.revokeObjectURL(photoPreviewUrl);
          console.log('[MODAL][PHOTO] ✅ Preview anterior revogado');
        } catch (err) {
          console.warn('[MODAL][PHOTO] ⚠️ Erro ao revogar preview anterior:', err);
        }
      }
      
      console.log('[MODAL][PHOTO] 🖼️ Criando novo preview URL');
      // Criar preview e definir capturedPhoto
      try {
        const previewUrl = URL.createObjectURL(file);
        console.log('[MODAL][PHOTO] ✅ Preview URL criado', { previewUrl: previewUrl.substring(0, 50) + '...' });
        
        console.log('[MODAL][PHOTO] 📝 Atualizando estados: setPhotoPreviewUrl e setCapturedPhoto');
        console.log('[MODAL][PHOTO] 📝 ANTES setPhotoPreviewUrl - estado atual:', {
          hasPhotoPreviewUrl: !!photoPreviewUrl,
          hasCapturedPhoto: !!capturedPhoto,
          showPhotoCapture,
          isProcessingPhoto
        });
        
        // CRÍTICO: Usar startTransition para marcar atualizações como não urgentes
        // Isso permite que o React processe de forma mais suave e evita conflitos de DOM
        console.log('[MODAL][PHOTO] 🎬 Atualizando estados usando startTransition');
        startTransition(() => {
          console.log('[MODAL][PHOTO] 🔄 startTransition executado - atualizando estados');
          try {
            setPhotoPreviewUrl(previewUrl);
            setCapturedPhoto(file);
            setIsProcessingPhoto(false);
            console.log('[MODAL][PHOTO] ✅ Estados atualizados dentro de startTransition');
          } catch (err) {
            console.error('[MODAL][PHOTO] ❌ Erro ao atualizar estados:', err);
            // Se der erro, tentar novamente de forma mais segura
            setTimeout(() => {
              if (isMountedRef.current && !isClosingRef.current) {
                setPhotoPreviewUrl(previewUrl);
                setCapturedPhoto(file);
                setIsProcessingPhoto(false);
              }
            }, 50);
          }
        });
        
        // Esconder PhotoCapture em um requestAnimationFrame duplo DEPOIS do startTransition
        // Isso garante que o React já processou a mudança de capturedPhoto
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[MODAL][PHOTO] 🎬 Segundo requestAnimationFrame - escondendo PhotoCapture');
            try {
              setShowPhotoCapture(false);
              console.log('[MODAL][PHOTO] ✅ PhotoCapture escondido');
            } catch (err) {
              console.warn('[MODAL][PHOTO] ⚠️ Erro ao esconder PhotoCapture (ignorado):', err);
            }
          });
        });
        
        console.log('[MODAL][PHOTO] 📤 Adicionando upload à fila');
        // Processar upload via fila (serializado)
        pushQueue(async () => {
          console.log('[MODAL][PHOTO] 📤 Upload iniciado na fila');
          if (isMountedRef.current && !isClosingRef.current) {
            await handleUploadPhoto(file);
          } else {
            console.warn('[MODAL][PHOTO] ⚠️ Upload cancelado - condições não atendidas');
          }
        });
        
        console.log('[MODAL][PHOTO] 📍 Verificando se precisa buscar localização');
        // NOVA ABORDAGEM: Buscar localização DEPOIS que a foto foi capturada
        // Isso evita race conditions e melhora a UX
        if (!location && !locationRequestedRef.current) {
          console.log('[MODAL][PHOTO] 📍 Iniciando busca de localização');
          locationRequestedRef.current = true;
          setLocationAttempted(false); // Resetar flag antes de tentar
          setError(null); // Limpar erro anterior
          pushQueue(async () => {
            console.log('[MODAL][PHOTO] 📍 Busca de localização iniciada na fila');
            if (isMountedRef.current && !isClosingRef.current) {
              await handleGetLocation();
            } else {
              console.warn('[MODAL][PHOTO] ⚠️ Busca de localização cancelada - condições não atendidas');
            }
          });
        } else {
          console.log('[MODAL][PHOTO] ⏭️ Localização já existe ou já foi solicitada', {
            hasLocation: !!location,
            locationRequested: locationRequestedRef.current
          });
        }
        
        const totalElapsed = performance.now() - startTime;
        console.log('[MODAL][PHOTO] ✅ handlePhotoCapture CONCLUÍDO', {
          totalElapsed: `${totalElapsed.toFixed(2)}ms`
        });
      } catch (err) {
        const elapsed = performance.now() - startTime;
        console.error('[MODAL][PHOTO] ❌ Erro ao processar foto:', {
          error: err,
          elapsed: `${elapsed.toFixed(2)}ms`
        });
        setIsProcessingPhoto(false);
        setError('Erro ao processar foto. Tente novamente.');
      }
    }, 200); // Delay aumentado para garantir estabilidade
    
    console.log('[MODAL][PHOTO] ⏸️ handlePhotoCapture pausado (aguardando setTimeout)');
  };

  // -----------------------------
  // Upload de foto com AbortController
  // -----------------------------
  const handleUploadPhoto = async (photoFile?: File) => {
    const fileToUpload = photoFile || capturedPhoto;
    if (!fileToUpload || !selectedCompany?.id || !isMountedRef.current || isClosingRef.current) {
      console.log('[MODAL][UPLOAD] ⚠️ Condições não atendidas', {
        hasFile: !!fileToUpload,
        hasCompany: !!selectedCompany?.id,
        isMounted: isMountedRef.current,
        isClosing: isClosingRef.current
      });
      return;
    }

    setIsUploadingPhoto(true);
    setError(null);
    
    const controller = makeAbortControllerWithTimeout(30000);

    try {
      console.log('[MODAL][UPLOAD] 🔄 Iniciando processamento da foto', {
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size
      });

      // Comprimir foto (não pode ser abortado, mas é rápido)
      const compressedPhoto = await CameraService.compressImage(fileToUpload, 1920, 1080, 0.8);
      
      if (controller.signal.aborted || !isMountedRef.current || isClosingRef.current) return;
      
      console.log('[MODAL][UPLOAD] ✅ Foto comprimida', {
        originalSize: fileToUpload.size,
        compressedSize: compressedPhoto.size
      });

      if (isOnline) {
        console.log('[MODAL][UPLOAD] 🌐 Fazendo upload da foto...');
        
        // Upload com verificação de abort
        const uploadPromise = uploadPhoto(compressedPhoto);
        const abortPromise = new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          }, { once: true });
        });
        
        const url = await Promise.race([uploadPromise, abortPromise]);
        
        if (controller.signal.aborted || !isMountedRef.current || isClosingRef.current) return;
        
        if (!url) {
          throw new Error('Erro ao fazer upload da foto');
        }
        
        console.log('[MODAL][UPLOAD] ✅ Upload concluído', { url: url.substring(0, 50) + '...' });
        setPhotoUrl(url);
      } else {
        console.log('[MODAL][UPLOAD] 📴 Modo offline - criando URL temporária');
        const tempUrl = URL.createObjectURL(compressedPhoto);
        setPhotoUrl(tempUrl);
        console.log('[MODAL][UPLOAD] ✅ URL temporária criada', { photoUrl: tempUrl.substring(0, 50) + '...' });
        
        try {
          await saveOfflineRecord('time_record_photo', {
            employee_id: employeeId,
            company_id: selectedCompany.id,
            photo_file: compressedPhoto,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.warn('[MODAL][UPLOAD] Erro ao salvar foto offline:', err);
        }
      }
      
      // Após upload, mostrar mapa novamente (com delay maior para estabilidade em navegadores antigos)
      await wait(300);
      if (isMountedRef.current && !isClosingRef.current && !controller.signal.aborted) {
        // Usar requestAnimationFrame para garantir sincronização com o DOM
        requestAnimationFrame(() => {
          if (isMountedRef.current && !isClosingRef.current) {
            setShowMap(true);
          }
        });
      }
    } catch (err: any) {
      if (controller.signal.aborted || !isMountedRef.current || isClosingRef.current) return;
      
      console.error('[MODAL][UPLOAD] ❌ Erro', err);
      setError(err.message || 'Erro ao processar foto');
      toast({
        title: 'Erro ao processar foto',
        description: err.message || 'Erro ao processar foto',
        variant: 'destructive'
      });
    } finally {
      if (!isClosingRef.current && !controller.signal.aborted) {
        setIsUploadingPhoto(false);
      }
      abortControllersRef.current.delete(controller);
    }
  };

  // -----------------------------
  // Obter localização GPS com AbortController
  // -----------------------------
  const handleGetLocation = async () => {
    if (!isMountedRef.current || isClosingRef.current) return;
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo navegador');
      setLocationAttempted(true);
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);
    setError(null);
    setLocationAttempted(true); // Marcar que tentou buscar
    
    const controller = makeAbortControllerWithTimeout(20000);

    try {
      // Wrapper para suportar abort no GeolocationService
      const position = await Promise.race([
        GeolocationService.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 0
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          }, { once: true });
        })
      ]);
      
      if (controller.signal.aborted || !isMountedRef.current || isClosingRef.current) return;
      
      const newLocation = {
        lat: position.latitude,
        lon: position.longitude
      };
      
      setLocation(newLocation);
      setLocationType('gps');
      
      // Definir endereço temporário imediatamente
      if (!address) {
        const tempAddress = `Coordenadas: ${newLocation.lat.toFixed(6)}, ${newLocation.lon.toFixed(6)}`;
        console.log('[MODAL][LOCATION] 📍 Definindo endereço temporário', { address: tempAddress });
        setAddress(tempAddress);
      }
      
      // Aguardar estabilidade antes de mostrar mapa (delay maior para navegadores antigos)
      await wait(350);
      if (isMountedRef.current && !isClosingRef.current && !controller.signal.aborted) {
        // Usar requestAnimationFrame para garantir sincronização com o DOM
        requestAnimationFrame(() => {
          if (isMountedRef.current && !isClosingRef.current) {
            setShowMap(true);
          }
        });
      }
      
      // Chain reverse geocode via fila
      pushQueue(async () => {
        if (isMountedRef.current && !isClosingRef.current) {
          await handleReverseGeocode(newLocation, controller);
        }
      });
    } catch (err: any) {
      if (controller.signal.aborted || !isMountedRef.current || isClosingRef.current) return;
      
      const friendlyMessage = err?.code === 1
        ? 'Permissão de localização negada. Libere o acesso ao GPS do navegador e tente novamente.'
        : err?.code === 2
        ? 'Não foi possível determinar sua localização. Verifique se o GPS está ativo.'
        : err?.code === 3
        ? 'A solicitação de localização expirou. Tente novamente.'
        : err?.message === 'aborted'
        ? 'Operação cancelada'
        : 'Erro ao obter localização GPS. Verifique as permissões do navegador.';
      
      setError(friendlyMessage);
    } finally {
      if (!isClosingRef.current && !controller.signal.aborted) {
        setIsLoadingLocation(false);
      }
      abortControllersRef.current.delete(controller);
    }
  };

  // -----------------------------
  // Confirmação do registro
  // -----------------------------
  const handleConfirm = () => {
    if (!photoUrl || !location || !address) {
      setError('Todos os dados são obrigatórios');
      return;
    }

    const outsideZone = hasZoneRestriction && isWithinZone === false;

    if (outsideZone) {
      toast({
        title: 'Registro fora da zona configurada',
        description: `O ponto será salvo com alerta para o RH (${enforcedZone?.nome}).`,
        variant: 'default'
      });
    }

    const confirmData = {
      photoUrl,
      latitude: location.lat,
      longitude: location.lon,
      address,
      localizacao_type: locationType,
      outsideZone: outsideZone || false
    };
    
    onConfirm(confirmData);
    void safeClose();
  };

  // -----------------------------
  // Fechamento seguro do modal
  // -----------------------------
  const safeClose = async () => {
    // Bloquear fechamento durante operações críticas
    if (isUploadingPhoto || isLoadingLocation || runningQueueRef.current) {
      console.log('[Modal] safeClose blocked — operations running');
      
      // Tentar cancelar operações pendentes
      abortControllersRef.current.forEach((ctrl) => {
        try {
          ctrl.abort();
        } catch {
          // Ignorar
        }
      });
      
      // Aguardar operações se resolverem
      await wait(350);
    }
    
    // Esconder mapa antes de desmontar (usar requestAnimationFrame para sincronização)
    requestAnimationFrame(() => {
      if (isMountedRef.current) {
        setShowMap(false);
      }
    });
    
    // Aguardar um frame antes de continuar
    await wait(100);
    
    // Limpar preview URL
    if (photoPreviewUrl) {
      try {
        URL.revokeObjectURL(photoPreviewUrl);
      } catch {
        // Ignorar
      }
    }
    
    setLockedOpen(false);
    isClosingRef.current = true;
    
    // Delay maior para estabilidade DOM antes de chamar onClose (navegadores antigos precisam mais tempo)
    await wait(400);
    
    if (isMountedRef.current) {
      onClose();
      isClosingRef.current = false;
      isMountedRef.current = true;
    }
  };

  const canConfirm = !!photoUrl && !!location && !!address && !isUploadingPhoto && !isLoadingLocation;
  
  // Log para debug com versão - com logs mais detalhados
  useEffect(() => {
    if (lockedOpen) {
      console.log('[MODAL][DEBUG] Estado do modal', {
        version: MODAL_VERSION,
        type: MODAL_TYPE,
        hasPhotoUrl: !!photoUrl,
        hasLocation: !!location,
        hasAddress: !!address,
        hasCapturedPhoto: !!capturedPhoto,
        showPhotoCapture,
        canConfirm,
        isUploadingPhoto,
        isLoadingLocation,
        isOnline,
        isMounted: isMountedRef.current,
        isClosing: isClosingRef.current,
        photoUrl: photoUrl ? photoUrl.substring(0, 50) + '...' : null,
        location: location ? { lat: location.lat, lon: location.lon } : null,
        address: address ? address.substring(0, 50) + '...' : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
        timestamp: new Date().toISOString()
      });
    }
  }, [photoUrl, location, address, canConfirm, lockedOpen, isUploadingPhoto, isLoadingLocation, isOnline, capturedPhoto, showPhotoCapture]);
  
  // Log específico quando capturedPhoto muda
  useEffect(() => {
    if (capturedPhoto) {
      console.log('[MODAL][PHOTO][STATE] 📝 capturedPhoto definido', {
        fileName: capturedPhoto.name,
        fileSize: capturedPhoto.size,
        fileType: capturedPhoto.type,
        hasPhotoPreviewUrl: !!photoPreviewUrl,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[MODAL][PHOTO][STATE] 📝 capturedPhoto removido', {
        timestamp: new Date().toISOString()
      });
    }
  }, [capturedPhoto, photoPreviewUrl]);
  
  // Log específico quando showPhotoCapture muda
  useEffect(() => {
    console.log('[MODAL][PHOTO][STATE] 👁️ showPhotoCapture alterado', {
      showPhotoCapture,
      hasCapturedPhoto: !!capturedPhoto,
      timestamp: new Date().toISOString()
    });
  }, [showPhotoCapture, capturedPhoto]);
  const canProceedFromLocation = !!location;

  if (!lockedOpen || isClosingRef.current) {
    return null;
  }

  return (
    <Dialog
      open={lockedOpen && !isClosingRef.current}
      onOpenChange={(open) => {
        if (!open) {
          console.log('[Dialog] onOpenChange false received — delegating to safeClose');
          void safeClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar {typeLabel}</DialogTitle>
          <DialogDescription>
            Complete os dados abaixo para registrar seu ponto
            <span className="text-xs text-muted-foreground ml-2">
              (v{MODAL_VERSION} - {MODAL_TYPE})
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção 1: Captura de Foto (PRIMEIRO - mais rápido) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Foto</h3>
              {photoUrl && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>

            {!capturedPhoto && !isProcessingPhoto ? (
              // CRÍTICO: Usar Error Boundary para capturar e ignorar erros insertBefore
              // Este Error Boundary específico ignora erros de DOM durante transições
              <PhotoCaptureErrorBoundary
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Alert variant="default">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Erro ao renderizar câmera. Tente novamente.
                      </AlertDescription>
                    </Alert>
                  </div>
                }
                onError={(error, errorInfo) => {
                  // Log detalhado para debug, mas não quebrar a aplicação
                  console.warn('[MODAL][PHOTO][ERROR_BOUNDARY] Erro capturado:', {
                    error: error.message,
                    errorInfo,
                    timestamp: new Date().toISOString()
                  });
                }}
              >
                {/* Wrapper adicional para garantir que o PhotoCapture seja renderizado de forma segura */}
                <div 
                  key={`photo-capture-wrapper-${photoCaptureKeyRef.current}`}
                  style={{ 
                    visibility: showPhotoCapture ? 'visible' : 'hidden',
                    position: showPhotoCapture ? 'relative' : 'absolute',
                    height: showPhotoCapture ? 'auto' : 0,
                    overflow: showPhotoCapture ? 'visible' : 'hidden',
                    pointerEvents: showPhotoCapture ? 'auto' : 'none',
                    width: showPhotoCapture ? 'auto' : 0
                  }}
                >
                  <PhotoCapture
                    key={`photo-capture-${photoCaptureKeyRef.current}`}
                    onCapture={(file) => {
                      console.log('[MODAL][PHOTO][RENDER] 📞 onCapture recebido no PhotoCapture', {
                        fileName: file.name,
                        fileSize: file.size,
                        timestamp: new Date().toISOString()
                      });
                      handlePhotoCapture(file);
                    }}
                    onCancel={safeClose}
                    required={true}
                  />
                </div>
              </PhotoCaptureErrorBoundary>
            ) : isProcessingPhoto ? (
              // Estado intermediário: mostrar loading enquanto processa
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Processando foto...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(photoUrl || photoPreviewUrl) && (
                  <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                    <img
                      src={photoPreviewUrl || photoUrl || ''}
                      alt="Foto capturada"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {isUploadingPhoto || uploading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">
                      {isOnline ? 'Enviando foto...' : 'Processando foto...'}
                    </span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setPhotoUrl(null);
                      if (photoPreviewUrl) {
                        URL.revokeObjectURL(photoPreviewUrl);
                        setPhotoPreviewUrl(null);
                      }
                      setShowPhotoCapture(true); // Mostrar PhotoCapture novamente
                      photoCaptureKeyRef.current += 1;
                    }}
                    className="w-full"
                  >
                    Tirar outra foto
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Seção 2: Localização GPS (DEPOIS - pode demorar) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Localização</h3>
              {location && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>

            {isLoadingLocation ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Obtendo sua localização GPS...
                </p>
              </div>
            ) : location ? (
              <>
                {/* Mapa: usar versão simplificada por padrão para máxima compatibilidade */}
                <div 
                  style={{ 
                    height: 250, 
                    visibility: showMap && location?.lat && location?.lon && !isClosingRef.current ? 'visible' : 'hidden',
                    position: 'relative'
                  }}
                >
                  {showMap && location?.lat && location?.lon && !isClosingRef.current ? (
                    useSimpleMap ? (
                      // Mapa simplificado - compatível com todos os navegadores
                      <SimpleLocationMap
                        centerLat={location.lat}
                        centerLon={location.lon}
                        radius={enforcedZone?.raio_metros || 100}
                        height="250px"
                        address={address || undefined}
                      />
                    ) : (
                      // Mapa Leaflet - mais recursos mas pode ter problemas em navegadores antigos
                      <LocationZoneMap
                        key={`map-${location.lat.toFixed(4)}-${location.lon.toFixed(4)}-${enforcedZone?.raio_metros || 100}`}
                        centerLat={location.lat}
                        centerLon={location.lon}
                        radius={enforcedZone?.raio_metros || 100}
                        showCurrentLocation={false}
                        editable={false}
                        height="250px"
                      />
                    )
                  ) : (
                    // Placeholder para manter o espaço do DOM estável
                    <div style={{ height: '100%', width: '100%' }} />
                  )}
                </div>

                {address && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Endereço:</p>
                    <p className="text-sm text-muted-foreground">{address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordenadas: {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  </div>
                )}

                {!hasZoneRestriction && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma zona de localização está configurada. O registro seguirá sem validação geográfica.
                    </AlertDescription>
                  </Alert>
                )}

                {hasZoneRestriction && isWithinZone === false && (
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você está fora da zona permitida (<strong>{enforcedZone?.nome}</strong>). O registro será salvo, mas ficará marcado para revisão.
                    </AlertDescription>
                  </Alert>
                )}

                {hasZoneRestriction && isWithinZone && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Localização validada na zona <strong>{enforcedZone?.nome}</strong>.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    locationRequestedRef.current = false;
                    pushQueue(() => handleGetLocation());
                  }}
                >
                  Atualizar Localização
                </Button>
              </>
            ) : locationAttempted ? (
              // Só mostrar erro se já tentou buscar e falhou
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || 'Não foi possível obter sua localização. Verifique se o GPS está ativo e se o navegador tem permissão de localização.'}
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      locationRequestedRef.current = false;
                      setLocationAttempted(false);
                      setError(null);
                      pushQueue(() => handleGetLocation());
                    }}
                    className="flex-1"
                  >
                    Tentar novamente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLocation({ lat: 0, lon: 0 });
                      setAddress('Localização não disponível');
                      setLocationType('manual');
                      setError(null);
                      setLocationAttempted(true);
                    }}
                    className="flex-1"
                  >
                    Continuar sem localização
                  </Button>
                </div>
              </>
            ) : (
              // Se ainda não tentou buscar, mostrar mensagem informativa
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  A localização será obtida automaticamente após capturar a foto.
                </p>
              </div>
            )}
          </div>

          {/* Botão de Confirmação */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={safeClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1"
            >
              {isUploadingPhoto || uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Registro
                </>
              )}
            </Button>
          </div>

          {/* Mensagens de erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
