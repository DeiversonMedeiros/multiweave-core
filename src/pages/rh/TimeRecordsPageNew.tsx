import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Calendar,
  Coffee,
  Clock3,
  Clock4,
  Camera,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { TimeRecord } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeRecordsPaginated, useDeleteTimeRecord, useApproveTimeRecord, useRejectTimeRecord } from '@/hooks/rh/useTimeRecords';
import { useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { RequirePage } from '@/components/RequireAuth';
import { TimeRecordForm } from '@/components/rh/TimeRecordForm';
import { useTimeRecordEvents } from '@/hooks/rh/useTimeRecordEvents';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { formatDateOnly, formatDateToISO, formatDecimalHoursToHhMm } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { EmployeesService } from '@/services/rh/employeesService';
import { 
  generateTimeRecordReportHTML, 
  generateTimeRecordReportCSV, 
  downloadFile,
  calculateDSR,
  getBankHoursBalanceUntilDate,
  TimeRecordReportData,
  completeRecordsWithRestDays,
  getMonthDaysInfo,
  DAY_NATURE_OPTIONS,
  getDayNatureFromRecord,
  getDayNatureLabel,
  isDayNatureNoNegativeHours
} from '@/services/rh/timeRecordReportService';
import { toast } from 'sonner';
import { TimeRecordsImportModal } from '@/components/rh/TimeRecordsImportModal';

// =====================================================
// COMPONENTE DE IMAGEM DO MODAL COM TRATAMENTO DE ERRO
// =====================================================
interface PhotoModalImageProps {
  photoUrl: string;
  extractPhotoPath: (url: string) => string | null;
  generateSignedUrl: (photo: any) => Promise<string | null>;
}

function PhotoModalImage({ photoUrl, extractPhotoPath, generateSignedUrl }: PhotoModalImageProps) {
  const [currentUrl, setCurrentUrl] = useState(photoUrl);
  const [hasError, setHasError] = useState(false);
  const hasTriedSignedUrlRef = useRef(false);
  
  const handleError = useCallback(async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    
    // Se já tentou signed URL, mostrar mensagem de erro
    if (hasTriedSignedUrlRef.current) {
      console.error('[PhotoModalImage] ⚠️ Erro ao carregar foto no modal após tentar signed URL', { 
        originalUrl: photoUrl?.substring(0, 50),
        currentUrl: currentUrl?.substring(0, 50)
      });
      setHasError(true);
      return;
    }
    
    // Primeira tentativa: gerar signed URL
    hasTriedSignedUrlRef.current = true;
    console.log('[PhotoModalImage] 🔄 Tentando gerar signed URL para modal:', {
      originalUrl: photoUrl?.substring(0, 50)
    });
    
    try {
      const photoPath = extractPhotoPath(photoUrl);
      if (!photoPath) {
        console.warn('[PhotoModalImage] ⚠️ Não foi possível extrair path da foto');
        setHasError(true);
        return;
      }
      
      const photo = { photo_url: photoUrl };
      const signedUrl = await generateSignedUrl(photo);
      
      if (signedUrl && signedUrl !== currentUrl) {
        setCurrentUrl(signedUrl);
        img.src = signedUrl;
      } else {
        console.warn('[PhotoModalImage] ⚠️ Não foi possível gerar signed URL para modal');
        setHasError(true);
      }
    } catch (err) {
      console.error('[PhotoModalImage] ❌ Erro ao gerar signed URL para modal:', err);
      setHasError(true);
    }
  }, [photoUrl, currentUrl, extractPhotoPath, generateSignedUrl]);
  
  // Resetar quando photoUrl mudar
  useEffect(() => {
    setCurrentUrl(photoUrl);
    setHasError(false);
    hasTriedSignedUrlRef.current = false;
  }, [photoUrl]);
  
  if (hasError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90 rounded-lg overflow-hidden p-8">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <p className="text-white text-lg font-medium mb-2">Erro ao carregar foto</p>
        <p className="text-gray-400 text-sm text-center">
          Não foi possível carregar a foto. A URL pode estar inválida ou o arquivo pode não existir mais.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.open(photoUrl, '_blank')}
        >
          Tentar abrir em nova aba
        </Button>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/90 rounded-lg overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt="Foto do registro de ponto"
        className="max-w-full max-h-[90vh] object-contain"
        referrerPolicy="no-referrer"
        onError={handleError}
        onLoad={(e) => {
          // Resetar flag quando carregar com sucesso
          hasTriedSignedUrlRef.current = false;
          (e.target as HTMLImageElement).style.opacity = '1';
        }}
      />
    </div>
  );
}

// =====================================================
// COMPONENTE DE IMAGEM COM PROTEÇÃO CONTRA LOOP
// =====================================================
interface PhotoImageWithErrorHandlingProps {
  photo: any;
  photoUrl: string;
  recordId: string;
  photoKey: string;
  idx: number;
  employeeName: string;
  onPhotoClick: (url: string) => void;
  generateSignedUrl: (photo: any) => Promise<string | null>;
  extractPhotoPath: (url: string) => string | null;
}

function PhotoImageWithErrorHandling({ 
  photo, 
  photoUrl, 
  recordId, 
  photoKey, 
  idx, 
  employeeName,
  onPhotoClick,
  generateSignedUrl,
  extractPhotoPath
}: PhotoImageWithErrorHandlingProps) {
  const errorAttemptsRef = useRef(0);
  const hasTriedSignedUrlRef = useRef(false);
  
  const handleError = useCallback(async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    
    // Limitar tentativas para evitar loop infinito
    errorAttemptsRef.current += 1;
    
    // Se já tentou signed URL, não tentar novamente - ocultar imediatamente
    if (hasTriedSignedUrlRef.current) {
      console.warn(`[PhotoImage] ⚠️ Signed URL já foi tentada, ocultando imagem:`, {
        recordId,
        photoKey,
        attempts: errorAttemptsRef.current
      });
      img.style.display = 'none';
      return;
    }
    
    // Se já tentou mais de uma vez, ocultar a imagem
    if (errorAttemptsRef.current > 1) {
      console.warn(`[PhotoImage] ⚠️ Múltiplas tentativas falharam, ocultando imagem:`, {
        recordId,
        photoKey,
        attempts: errorAttemptsRef.current
      });
      img.style.display = 'none';
      return;
    }
    
    // Primeira tentativa: gerar signed URL
    hasTriedSignedUrlRef.current = true;
    console.log(`[PhotoImage] 🔄 Tentando gerar signed URL:`, {
      recordId,
      photoKey,
      originalUrl: photoUrl?.substring(0, 50)
    });
    
    try {
      const signedUrl = await generateSignedUrl(photo);
      
      if (signedUrl && signedUrl !== img.src) {
        // Resetar contador antes de tentar carregar signed URL
        errorAttemptsRef.current = 0;
        img.src = signedUrl;
      } else {
        console.warn(`[PhotoImage] ⚠️ Não foi possível gerar signed URL:`, {
          recordId,
          photoKey,
          photoPath: extractPhotoPath(photo.photo_url)
        });
        img.style.display = 'none';
      }
    } catch (err) {
      console.error(`[PhotoImage] ❌ Erro ao gerar signed URL:`, err);
      img.style.display = 'none';
    }
  }, [recordId, photoKey, photo, photoUrl, generateSignedUrl, extractPhotoPath]);
  
  return (
    <img
      src={photoUrl}
      alt={`Foto ${idx + 1} de ${employeeName}`}
      className="h-20 w-auto rounded border object-cover cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
      onClick={() => {
        const fullUrl = photo.signed_full_url || photo.photo_url || photoUrl;
        onPhotoClick(fullUrl);
      }}
      onLoad={(e) => {
        // Resetar contador de erros quando carregar com sucesso
        errorAttemptsRef.current = 0;
        hasTriedSignedUrlRef.current = false;
        (e.target as HTMLImageElement).style.opacity = '1';
      }}
      onError={handleError}
    />
  );
}

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function TimeRecordsPageNew() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 365 dias atrás (1 ano)
    endDate: new Date().toISOString().split('T')[0] // Hoje
  });
  const [searchTerm, setSearchTerm] = useState('');
  // Estado separado para o filtro de funcionário (como na página antiga)
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('registros');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [summaryMonth, setSummaryMonth] = useState<string>('');
  const [summaryYear, setSummaryYear] = useState<string>('');
  // Estado para controlar quais cards têm endereços expandidos
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  // Cache de signed URLs geradas sob demanda
  const [signedUrlCache, setSignedUrlCache] = useState<Map<string, string>>(new Map());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // Estado para armazenar registros completos (com DSR, Férias, etc.) por funcionário
  const [completeRecordsByEmployee, setCompleteRecordsByEmployee] = useState<Map<string, TimeRecord[]>>(new Map());
  /** Overrides de Natureza do Dia: chave `${employeeId}-${dateStr}` -> valor (normal, dsr, feriado, etc.) */
  const [dayNatureOverrides, setDayNatureOverrides] = useState<Record<string, string>>({});
  const { data: eventsData } = useTimeRecordEvents(selectedRecord?.id || undefined);

  // Helper para extrair path relativo do photo_url
  const extractPhotoPath = useCallback((photoUrl: string): string | null => {
    if (!photoUrl) return null;
    
    // Se já é uma signed URL, extrair o path
    const signMatch = photoUrl.match(/\/storage\/v1\/object\/sign\/time-record-photos\/(.+?)(?:\?|$)/);
    if (signMatch) return signMatch[1];
    
    // Se é URL pública, extrair o path
    const publicMatch = photoUrl.match(/\/storage\/v1\/object\/public\/time-record-photos\/(.+?)(?:\?|$)/);
    if (publicMatch) return publicMatch[1];
    
    // Se contém time-record-photos, extrair o path
    const bucketMatch = photoUrl.match(/time-record-photos[\/](.+?)(?:\?|$)/);
    if (bucketMatch) return bucketMatch[1];
    
    // Se não é URL completa, pode ser path relativo
    if (!/^https?:\/\//i.test(photoUrl)) {
      return photoUrl.replace(/^\//, '').split('?')[0];
    }
    
    return null;
  }, []);

  // Função para gerar signed URL sob demanda
  const generateSignedUrl = useCallback(async (photo: any): Promise<string | null> => {
    if (!photo || !photo.photo_url) return null;
    
    // Verificar cache primeiro
    const cacheKey = photo.photo_url;
    if (signedUrlCache.has(cacheKey)) {
      return signedUrlCache.get(cacheKey) || null;
    }
    
    // Extrair path relativo
    const photoPath = extractPhotoPath(photo.photo_url);
    if (!photoPath) return null;
    
    try {
      const { data, error } = await supabase
        .storage
        .from('time-record-photos')
        .createSignedUrl(photoPath, 3600); // Válida por 1 hora
      
      if (error || !data) {
        console.warn('[TimeRecordsPageNew] Erro ao gerar signed URL:', error);
        return null;
      }
      
      // Adicionar ao cache
      setSignedUrlCache(prev => new Map(prev).set(cacheKey, data.signedUrl));
      return data.signedUrl;
    } catch (e) {
      console.error('[TimeRecordsPageNew] Exceção ao gerar signed URL:', e);
      return null;
    }
  }, [signedUrlCache, extractPhotoPath]);

  // Helper para obter URL da foto
  // NOTA: Signed URLs não são geradas automaticamente no serviço para evitar ERR_INSUFFICIENT_RESOURCES
  // quando há muitos registros. Esta função tenta usar URLs públicas primeiro.
  // Se o bucket for privado, as fotos serão carregadas sob demanda via onError.
  const getPhotoUrl = useCallback((photo: any) => {
    if (!photo || !photo.photo_url) return '';
    
    // Priorizar signed URLs se já foram geradas
    if (photo.signed_thumb_url) return photo.signed_thumb_url;
    if (photo.signed_full_url) return photo.signed_full_url;
    
    // Verificar cache
    const cacheKey = photo.photo_url;
    if (signedUrlCache.has(cacheKey)) {
      return signedUrlCache.get(cacheKey) || '';
    }
    
    // Se já é uma URL completa HTTP/HTTPS (incluindo signed URLs), retornar como está
    if (photo.photo_url.includes('http://') || photo.photo_url.includes('https://')) {
      return photo.photo_url;
    }
    
    // Construir URL do Supabase Storage (bucket pode ser público ou privado)
    const supabaseUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) return photo.photo_url;
    
    // Remover barras iniciais e query params para construir o caminho
    const cleanPath = photo.photo_url.replace(/^\//, '').split('?')[0];
    
    // Se já contém /storage/v1/, retornar como está
    if (photo.photo_url.includes('/storage/v1/')) {
      return photo.photo_url;
    }
    
    // Construir URL pública do bucket time-record-photos
    // Se o bucket for privado, esta URL não funcionará, mas será tratado no onError
    return `${supabaseUrl}/storage/v1/object/public/time-record-photos/${cleanPath}`;
  }, [signedUrlCache]);
  
  // Carregar lista de funcionários para o filtro
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];

  // Log para verificar se os funcionários estão sendo carregados
  useEffect(() => {
    console.group('[TimeRecordsPageNew] 👥 Funcionários');
    console.log('📊 employeesData:', employeesData);
    console.log('👥 employees (processado):', employees);
    console.log('📈 Total de funcionários:', employees.length);
    console.log('⏳ isLoadingEmployees:', isLoadingEmployees);
    if (employees.length > 0) {
      console.log('👤 Primeiros 3 funcionários:', employees.slice(0, 3).map(e => ({ id: e.id, nome: e.nome })));
    }
    console.groupEnd();
  }, [employeesData, employees, isLoadingEmployees]);

  // Monitorar mudanças no employeeFilter
  useEffect(() => {
    console.group('[TimeRecordsPageNew] 🔍 employeeFilter mudou');
    console.log('👤 employeeFilter:', employeeFilter);
    console.log('👤 Tipo:', typeof employeeFilter);
    console.log('👤 Valor para Select:', employeeFilter || 'all');
    console.groupEnd();
  }, [employeeFilter]);

  // Monitorar mudanças no estado filters
  useEffect(() => {
    console.group('[TimeRecordsPageNew] 📊 Estado filters mudou');
    console.log('🔍 Estado completo:', filters);
    console.log('👤 employeeId:', filters.employeeId);
    console.log('📅 startDate:', filters.startDate);
    console.log('📅 endDate:', filters.endDate);
    console.log('📊 status:', filters.status);
    console.log('🔍 search:', filters.search);
    console.groupEnd();
  }, [filters]);

  // Calcular datas do mês/ano selecionado para o resumo
  const summaryDateRange = useMemo(() => {
    if (summaryMonth && summaryYear) {
      const month = parseInt(summaryMonth);
      const year = parseInt(summaryYear);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Último dia do mês
      return {
        start: formatDateToISO(startDate),
        end: formatDateToISO(endDate)
      };
    }
    return null;
  }, [summaryMonth, summaryYear]);

  // Calcular datas para a query baseado na aba ativa
  const dateRangeForQuery = useMemo(() => {
    if (activeTab === 'resumo' && summaryMonth && summaryYear) {
      // Na aba resumo, quando há mês/ano selecionado, buscar apenas aquele mês
      const month = parseInt(summaryMonth);
      const year = parseInt(summaryYear);
      const startDate = new Date(year, month - 1, 1);
      // Último dia do mês: usar new Date(year, month, 0) que retorna o último dia do mês anterior
      const endDate = new Date(year, month, 0);
      return {
        start: formatDateToISO(startDate),
        end: formatDateToISO(endDate)
      };
    }
    // Se estiver na aba resumo sem mês/ano, não buscar dados (retornar null para desabilitar query)
    if (activeTab === 'resumo' && (!summaryMonth || !summaryYear)) {
      return null;
    }
    return { start: filters.startDate, end: filters.endDate };
  }, [activeTab, summaryMonth, summaryYear, filters.startDate, filters.endDate]);

  // Preparar parâmetros para a query
  const queryParams = useMemo(() => {
    // Se estiver na aba resumo sem mês/ano selecionado, não executar query
    if (activeTab === 'resumo' && (!summaryMonth || !summaryYear)) {
      return null;
    }
    
    // Se dateRangeForQuery for null, não executar query
    if (!dateRangeForQuery) {
      return null;
    }
    
    const params: {
      startDate: string;
      endDate: string;
      status?: string;
      pageSize: number;
      employeeId?: string;
    } = {
      startDate: dateRangeForQuery.start,
      endDate: dateRangeForQuery.end,
      status: filters.status !== 'all' ? filters.status : undefined,
      pageSize: activeTab === 'resumo' && summaryMonth && summaryYear ? 1000 : 10, // Na aba resumo com mês/ano, usar pageSize muito maior para garantir todos os registros
    };
    
    // Adicionar employeeId apenas se estiver definido
    if (employeeFilter) {
      params.employeeId = employeeFilter;
    }
    
    return params;
  }, [dateRangeForQuery, filters.status, employeeFilter, activeTab, summaryMonth, summaryYear]);

  // Usar paginação infinita otimizada
  // Se estiver na aba resumo sem mês/ano selecionado, não executar query
  const shouldFetch = activeTab !== 'resumo' || (summaryMonth && summaryYear);
  
  const queryResult = useTimeRecordsPaginated(
    shouldFetch && queryParams ? queryParams : {
      startDate: filters.startDate,
      endDate: filters.endDate,
      pageSize: 10
    },
    {
      enabled: shouldFetch && !!queryParams
    }
  );
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    error,
    isRefetching,
    dataUpdatedAt
  } = queryResult;

  // Log quando dados são atualizados
  useEffect(() => {
    if (dataUpdatedAt) {
      console.log(`[TimeRecordsPageNew] 📊 Dados atualizados:`, {
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
        totalPages: data?.pages?.length || 0,
        totalRecords: data?.pages?.flatMap(p => p.data).length || 0,
        isRefetching,
        isLoading,
        timestamp: new Date().toISOString()
      });
    }
  }, [dataUpdatedAt, data, isRefetching, isLoading]);

  // Combinar todas as páginas em um único array
  const records = useMemo(() => {
    console.log(`[TimeRecordsPageNew] 🔄 Combinando páginas:`, {
      totalPages: data?.pages?.length || 0,
      totalRecords: data?.pages?.flatMap(p => p.data).length || 0,
      isLoading,
      isFetchingNextPage,
      timestamp: new Date().toISOString()
    });
    const allRecords = data?.pages.flatMap(page => page.data) || [];
    
    // Log detalhado da combinação
    if (data?.pages && data.pages.length > 0) {
      console.log('[TimeRecordsPageNew] 🔄 Combinando páginas:', {
        totalPages: data.pages.length,
        totalRecords: allRecords.length,
        recordsPorPagina: data.pages.map((p, idx) => ({
          pagina: idx + 1,
          count: p.data.length,
          hasMore: p.hasMore,
          nextCursor: p.nextCursor,
          totalCount: p.totalCount
        })),
        idsUnicos: new Set(allRecords.map(r => r.id)).size,
        idsDuplicados: allRecords.length - new Set(allRecords.map(r => r.id)).size
      });
    }
    
    return allRecords;
  }, [data?.pages]);
  
  // Log detalhado para debug
  useEffect(() => {
    if (activeTab === 'resumo' && summaryMonth && summaryYear) {
      console.log('[TimeRecordsPageNew] 📊 DEBUG - Estado da paginação:', {
        totalPages: data?.pages?.length || 0,
        totalRecords: records.length,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        summaryMonth,
        summaryYear,
        dateRange: dateRangeForQuery,
        queryParams: queryParams ? {
          startDate: queryParams.startDate,
          endDate: queryParams.endDate,
          pageSize: queryParams.pageSize
        } : null
      });
      
      // Log das datas dos registros carregados
      if (records.length > 0) {
        const dates = records.map(r => r.data_registro).sort();
        const registrosZerados = records.filter(r => !r.horas_trabalhadas || r.horas_trabalhadas === 0);
        const registrosComDados = records.filter(r => r.horas_trabalhadas && r.horas_trabalhadas > 0);
        
        console.log('[TimeRecordsPageNew] 📅 DEBUG - Datas dos registros carregados:', {
          total: records.length,
          primeiraData: dates[0],
          ultimaData: dates[dates.length - 1],
          todasDatas: dates.slice(0, 20), // Primeiras 20 datas
          registrosZerados: registrosZerados.length,
          registrosComDados: registrosComDados.length,
          sampleZerados: registrosZerados.slice(0, 3).map(r => ({
            id: r.id,
            data_registro: r.data_registro,
            employee_nome: r.employee_nome,
            horas_trabalhadas: r.horas_trabalhadas,
            horas_extras_50: r.horas_extras_50,
            horas_extras_100: r.horas_extras_100,
            horas_noturnas: r.horas_noturnas,
            tipo: typeof r.horas_trabalhadas,
          })),
          sampleComDados: registrosComDados.slice(0, 3).map(r => ({
            id: r.id,
            data_registro: r.data_registro,
            employee_nome: r.employee_nome,
            horas_trabalhadas: r.horas_trabalhadas,
            horas_extras_50: r.horas_extras_50,
            horas_extras_100: r.horas_extras_100,
            horas_noturnas: r.horas_noturnas,
            tipo: typeof r.horas_trabalhadas,
          })),
        });
      }
    }
  }, [activeTab, summaryMonth, summaryYear, records.length, data?.pages?.length, hasNextPage, isFetchingNextPage, isLoading, dateRangeForQuery, queryParams]);
  const createRecord = useCreateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const queryClient = useQueryClient();
  const updateRecord = useUpdateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const deleteRecordMutation = useDeleteTimeRecord();
  const approveRecordMutation = useApproveTimeRecord();
  const rejectRecordMutation = useRejectTimeRecord();

  // Removido IntersectionObserver - agora só carrega ao clicar no botão "Carregar mais"

  // Refetch quando filtros mudarem ou quando mudar a aba/mês/ano (exatamente como na página antiga)
  // NOTA: Não incluir refetch nas dependências para evitar loops infinitos
  // O React Query já invalida a query quando a queryKey muda
  useEffect(() => {
    // O refetch será automático quando a queryKey mudar devido aos parâmetros
    // Não precisamos chamar refetch() manualmente aqui
  }, [filters.startDate, filters.endDate, filters.status, employeeFilter, activeTab, summaryMonth, summaryYear, dateRangeForQuery?.start, dateRangeForQuery?.end]);

  // Carregar todas as páginas quando estiver na aba de resumo E tiver mês/ano selecionado
  // Usar useRef para evitar loops infinitos
  const loadingAllPagesRef = useRef(false);
  const lastSummaryKey = useRef<string>('');
  
  useEffect(() => {
    const summaryKey = `${summaryMonth}-${summaryYear}`;
    const keyChanged = lastSummaryKey.current !== summaryKey;
    
    // Só iniciar carregamento se:
    // 1. Está na aba resumo
    // 2. Tem mês/ano selecionado
    // 3. A chave mudou (novo mês/ano) OU ainda não carregou todas as páginas
    // 4. Não está carregando atualmente
    // 5. A query inicial terminou de carregar (isLoading === false)
    // 6. Há mais páginas para carregar (hasNextPage === true)
    if (activeTab === 'resumo' && summaryMonth && summaryYear && !loadingAllPagesRef.current && !isLoading && hasNextPage) {
      // Se a chave mudou, resetar o ref
      if (keyChanged) {
        lastSummaryKey.current = summaryKey;
        loadingAllPagesRef.current = false; // Reset para permitir novo carregamento
      }
      
      // Se já está carregando ou já carregou para esta chave, não fazer nada
      if (loadingAllPagesRef.current) {
        return;
      }
      
      console.log('[TimeRecordsPageNew] 🔄 Iniciando carregamento de todas as páginas para:', { summaryMonth, summaryYear, hasNextPage });
      
      // Aguardar um pouco para garantir que a query inicial foi executada
      const loadAllPages = async () => {
        loadingAllPagesRef.current = true;
        try {
          let attempts = 0;
          const maxAttempts = 50; // Limite máximo de tentativas
          
          console.log('[TimeRecordsPageNew] 📄 Estado inicial:', { 
            hasNextPage, 
            isFetchingNextPage, 
            isLoading,
            totalPages: data?.pages?.length || 0,
            totalRecords: records.length,
            totalCount: data?.pages[0]?.totalCount || 0
          });
          
          // Continuar enquanto houver mais páginas
          // Usar uma função helper para obter o estado atualizado
          const getCurrentState = () => {
            const currentData = queryResult.data;
            const currentRecords = currentData?.pages.flatMap(page => page.data) || [];
            return {
              totalPages: currentData?.pages?.length || 0,
              totalRecords: currentRecords.length,
              hasNextPage: queryResult.hasNextPage,
              isFetching: queryResult.isFetchingNextPage,
              totalCount: currentData?.pages[0]?.totalCount || 0
            };
          };
          
          let lastState = getCurrentState();
          
          while (lastState.hasNextPage && !lastState.isFetching && attempts < maxAttempts) {
            // Obter estado atual do React Query ANTES do fetch (sempre do queryResult)
            const stateBefore = getCurrentState();
            const pagesBefore = queryResult.data?.pages || [];
            const pageIdsBefore = pagesBefore.flatMap(p => p.data.map(r => r.id));
            
            console.log(`[TimeRecordsPageNew] 📥 Carregando página ${attempts + 1}...`, {
              ...stateBefore,
              attempts,
              pagesCount: pagesBefore.length,
              pageIdsCount: pageIdsBefore.length,
              pageIdsSample: pageIdsBefore.slice(0, 5),
              nextCursor: stateBefore.hasNextPage ? (stateBefore.totalRecords) : undefined,
              reactQueryState: {
                hasNextPage: queryResult.hasNextPage,
                isFetchingNextPage: queryResult.isFetchingNextPage,
                isLoading: queryResult.isLoading,
                dataPagesCount: queryResult.data?.pages?.length || 0
              }
            });
            
            // Fazer fetch da próxima página
            await fetchNextPage();
            attempts++;
            
            // Aguardar para que o React Query atualize o estado
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Obter estado atualizado do React Query (sempre do queryResult)
            const newState = getCurrentState();
            const pagesAfter = queryResult.data?.pages || [];
            const pageIdsAfter = pagesAfter.flatMap(p => p.data.map(r => r.id));
            const newPageIds = pageIdsAfter.filter(id => !pageIdsBefore.includes(id));
            
            console.log(`[TimeRecordsPageNew] 📊 Após fetch ${attempts}:`, {
              antes: {
                ...stateBefore,
                pagesCount: pagesBefore.length,
                pageIdsCount: pageIdsBefore.length
              },
              depois: {
                ...newState,
                pagesCount: pagesAfter.length,
                pageIdsCount: pageIdsAfter.length
              },
              registrosAdicionados: newState.totalRecords - stateBefore.totalRecords,
              novosIds: newPageIds.length,
              novosIdsSample: newPageIds.slice(0, 5),
              detalhesPaginas: pagesAfter.map((p, idx) => ({
                index: idx,
                dataLength: p.data.length,
                hasMore: p.hasMore,
                totalCount: p.totalCount,
                nextCursor: p.nextCursor,
                sampleIds: p.data.slice(0, 3).map(r => r.id)
              })),
              reactQueryState: {
                hasNextPage: queryResult.hasNextPage,
                isFetchingNextPage: queryResult.isFetchingNextPage,
                isLoading: queryResult.isLoading,
                dataPagesCount: queryResult.data?.pages?.length || 0
              }
            });
            
            // Se não há mais páginas, parar
            if (!newState.hasNextPage) {
              console.log(`[TimeRecordsPageNew] ✅ Não há mais páginas. Total carregado: ${newState.totalRecords} de ${newState.totalCount}`);
              break;
            }
            
            // Verificar se as páginas aumentaram (mais confiável que totalRecords)
            const pagesIncreased = pagesAfter.length > pagesBefore.length;
            const recordsIncreased = newState.totalRecords > stateBefore.totalRecords;
            
            // Se os registros não aumentaram após 2 tentativas, verificar se as páginas aumentaram
            if (attempts >= 2 && !recordsIncreased && !pagesIncreased) {
              console.warn(`[TimeRecordsPageNew] ⚠️ Registros não aumentaram após ${attempts} tentativas. Verificando se há mais páginas...`, {
                antes: {
                  totalRecords: stateBefore.totalRecords,
                  pagesCount: pagesBefore.length,
                  pageIdsCount: pageIdsBefore.length
                },
                depois: {
                  totalRecords: newState.totalRecords,
                  pagesCount: pagesAfter.length,
                  pageIdsCount: pageIdsAfter.length,
                  novosIds: newPageIds.length
                },
                reactQueryState: {
                  hasNextPage: queryResult.hasNextPage,
                  isFetchingNextPage: queryResult.isFetchingNextPage,
                  isLoading: queryResult.isLoading,
                  dataPages: queryResult.data?.pages?.length,
                  dataPagesDetails: queryResult.data?.pages?.map((p, idx) => ({
                    index: idx,
                    dataLength: p.data.length,
                    hasMore: p.hasMore,
                    nextCursor: p.nextCursor
                  }))
                }
              });
              
              // Aguardar um pouco mais e verificar novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const recheckState = getCurrentState();
              const recheckPages = queryResult.data?.pages || [];
              const recheckRecords = recheckPages.flatMap(p => p.data);
              
              // Se ainda não há mudança e hasNextPage é true, pode ser um bug
              // Mas verificar se as páginas aumentaram (mais confiável)
              if (recheckState.hasNextPage && recheckState.totalRecords === stateBefore.totalRecords && recheckPages.length === pagesBefore.length) {
                console.error(`[TimeRecordsPageNew] 🛑 Possível bug: hasNextPage=true mas registros/páginas não aumentam. Parando para evitar loop infinito.`, {
                  estado: recheckState,
                  pagesCount: recheckPages.length,
                  pagesCountAntes: pagesBefore.length,
                  pagesDetails: recheckPages.map((p, idx) => ({
                    index: idx,
                    dataLength: p.data.length,
                    hasMore: p.hasMore,
                    nextCursor: p.nextCursor,
                    totalCount: p.totalCount,
                    sampleIds: p.data.slice(0, 3).map(r => r.id)
                  })),
                  recordsCount: recheckRecords.length,
                  recordsSample: recheckRecords.slice(0, 3).map(r => ({ id: r.id, data_registro: r.data_registro })),
                  reactQueryState: {
                    hasNextPage: queryResult.hasNextPage,
                    isFetchingNextPage: queryResult.isFetchingNextPage,
                    isLoading: queryResult.isLoading
                  }
                });
                break;
              }
              
              // Se as páginas aumentaram, continuar
              if (recheckPages.length > pagesBefore.length) {
                console.log(`[TimeRecordsPageNew] ✅ Páginas aumentaram após recheck: ${pagesBefore.length} -> ${recheckPages.length}`);
                lastState = recheckState;
              } else {
                lastState = recheckState;
              }
            } else {
              // Se registros ou páginas aumentaram, continuar normalmente
              lastState = newState;
            }
          }
          
          const finalState = getCurrentState();
          
          console.log('[TimeRecordsPageNew] ✅ Carregamento concluído:', {
            ...finalState,
            totalAttempts: attempts
          });
          
          if (finalState.totalRecords < finalState.totalCount && !finalState.hasNextPage) {
            console.warn(`[TimeRecordsPageNew] ⚠️ ATENÇÃO: Carregados ${finalState.totalRecords} de ${finalState.totalCount} registros, mas hasNextPage=false. Pode haver um problema na paginação.`);
          }
        } finally {
          loadingAllPagesRef.current = false;
        }
      };
      loadAllPages();
    }
  }, [activeTab, summaryMonth, summaryYear, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage, data, records]);

  // Filtrar registros por termo de busca
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const searchLower = searchTerm.toLowerCase();
    return records.filter(record => {
      const employeeName = (record.employee_nome || '').toLowerCase();
      const employeeMatricula = (record.employee_matricula || '').toLowerCase();
      const observacoes = (record.observacoes || '').toLowerCase();
      return employeeName.includes(searchLower) || 
             employeeMatricula.includes(searchLower) ||
             observacoes.includes(searchLower);
    });
  }, [records, searchTerm]);

  // Filtrar registros por mês e ano para o resumo
  const filteredRecordsForSummary = useMemo(() => {
    // Se não há mês/ano selecionado, retornar array vazio (não calcular resumo)
    if (!summaryMonth || !summaryYear) {
      return [];
    }

    const month = parseInt(summaryMonth);
    const year = parseInt(summaryYear);

    console.log(`[TimeRecordsPageNew] 🔍 Iniciando filtro para ${month}/${year}. Total de registros antes do filtro: ${filteredRecords.length}`);
    
    const filtered = filteredRecords.filter(record => {
      // Parse da data de forma segura, evitando problemas de timezone
      // data_registro vem como string no formato YYYY-MM-DD
      const dateStr = record.data_registro;
      if (!dateStr) {
        console.warn('[TimeRecordsPageNew] ⚠️ Registro sem data_registro:', record.id);
        return false;
      }
      
      // Extrair ano, mês e dia diretamente da string para evitar problemas de timezone
      const [yearStr, monthStr] = dateStr.split('-');
      const recordYear = parseInt(yearStr);
      const recordMonth = parseInt(monthStr);
      
      const matches = recordMonth === month && recordYear === year;
      
      // Log apenas para alguns registros para não poluir o console
      if (filteredRecords.length < 50 || Math.random() < 0.01) {
        console.log(`[TimeRecordsPageNew] 🔍 Verificando registro: ${dateStr} -> ${recordMonth}/${recordYear} (esperado: ${month}/${year}) -> ${matches ? '✅' : '❌'}`);
      }
      
      return matches;
    });
    
    // Debug: Log detalhado
    console.log(`[TimeRecordsPageNew] ✅ Filtro concluído: ${filtered.length} registros de ${filteredRecords.length} total para ${month}/${year}`);
    
    if (filtered.length > 0) {
      const dates = filtered.map(r => r.data_registro).sort();
      const uniqueDates = [...new Set(dates)];
      console.log(`[TimeRecordsPageNew] 📅 Datas filtradas:`, {
        total: filtered.length,
        datasUnicas: uniqueDates.length,
        primeiraData: dates[0],
        ultimaData: dates[dates.length - 1],
        todasDatasUnicas: uniqueDates
      });
    } else if (filteredRecords.length > 0) {
      // Se não encontrou nenhum registro mas havia registros para filtrar, investigar
      const sampleDates = filteredRecords.slice(0, 10).map(r => r.data_registro);
      console.warn(`[TimeRecordsPageNew] ⚠️ Nenhum registro encontrado para ${month}/${year}, mas havia ${filteredRecords.length} registros. Amostra de datas:`, sampleDates);
    }
    
    return filtered;
  }, [filteredRecords, summaryMonth, summaryYear]);

  // Agrupar registros por funcionário e calcular totais
  const employeeSummary = useMemo(() => {
    // Só calcular resumo se houver mês/ano selecionado
    if (!summaryMonth || !summaryYear) {
      return [];
    }

    // Log detalhado dos registros filtrados
    const sampleRecords = filteredRecordsForSummary.slice(0, 10).map(r => ({
      id: r.id,
      data: (r as any).data_registro,
      funcionario: (r as any).employee_nome,
      horas_trabalhadas: r.horas_trabalhadas,
      horas_extras_50: r.horas_extras_50,
      horas_extras_100: r.horas_extras_100,
      horas_noturnas: r.horas_noturnas,
      horas_negativas: r.horas_negativas,
      status: r.status
    }));
    
    // Verificar quantos registros têm valores zerados
    const registrosZerados = filteredRecordsForSummary.filter(r => 
      (r.horas_trabalhadas || 0) === 0 && 
      (r.horas_extras_50 || 0) === 0 && 
      (r.horas_extras_100 || 0) === 0 && 
      (r.horas_noturnas || 0) === 0 && 
      (r.horas_negativas || 0) === 0
    );
    
    console.log(`[TimeRecordsPageNew] 📊 Iniciando cálculo do resumo por funcionário:`, {
      totalRegistrosFiltrados: filteredRecordsForSummary.length,
      registrosZerados: registrosZerados.length,
      registrosComDados: filteredRecordsForSummary.length - registrosZerados.length,
      sampleRecords: sampleRecords.slice(0, 10).map(r => ({
        id: r.id,
        data_registro: (r as any).data,
        employee_nome: (r as any).funcionario,
        horas_trabalhadas: r.horas_trabalhadas,
        horas_extras_50: r.horas_extras_50,
        horas_extras_100: r.horas_extras_100,
        horas_noturnas: r.horas_noturnas,
        horas_negativas: r.horas_negativas,
        tipo_horas_trabalhadas: typeof r.horas_trabalhadas,
        tipo_horas_extras_50: typeof r.horas_extras_50,
        tipo_horas_extras_100: typeof r.horas_extras_100,
        tipo_horas_noturnas: typeof r.horas_noturnas,
        status: r.status,
        is_null: r.horas_trabalhadas === null,
        is_zero: r.horas_trabalhadas === 0,
      })),
      registrosZeradosSample: registrosZerados.slice(0, 5).map(r => ({
        id: r.id,
        data_registro: r.data_registro,
        employee_nome: r.employee_nome,
        horas_trabalhadas: r.horas_trabalhadas,
        horas_extras_50: r.horas_extras_50,
        horas_extras_100: r.horas_extras_100,
        horas_noturnas: r.horas_noturnas,
        horas_negativas: r.horas_negativas,
        tipo_horas_trabalhadas: typeof r.horas_trabalhadas,
        status: r.status,
        is_null: r.horas_trabalhadas === null,
        is_zero: r.horas_trabalhadas === 0,
      }))
    });

    const grouped = new Map<string, {
      employeeId: string;
      employeeName: string;
      employeeMatricula?: string;
      records: TimeRecord[];
      totalHorasTrabalhadas: number;
      totalHorasNegativas: number;
      totalHorasExtras50: number;
      totalHorasExtras100: number;
      totalHorasNoturnas: number;
    }>();

    filteredRecordsForSummary.forEach(record => {
      const employeeId = record.employee_id;
      const employeeName = record.employee_nome || 'Funcionário sem nome';
      const employeeMatricula = record.employee_matricula;

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, {
          employeeId,
          employeeName,
          employeeMatricula,
          records: [],
          totalHorasTrabalhadas: 0,
          totalHorasNegativas: 0,
          totalHorasExtras50: 0,
          totalHorasExtras100: 0,
          totalHorasNoturnas: 0,
        });
      }

      const summary = grouped.get(employeeId)!;
      summary.records.push(record);
      
      // Considerar apenas registros aprovados para o resumo
      // Registros pendentes não devem aparecer nos totais
      if (record.status !== 'aprovado') {
        return; // Pular registros não aprovados
      }
      
      // Converter para número e garantir que não seja NaN
      const horasTrabalhadas = Number(record.horas_trabalhadas) || 0;
      const horasNegativas = Number(record.horas_negativas) || 0;
      const horasExtras50 = Number(record.horas_extras_50) || 0;
      const horasExtras100 = Number(record.horas_extras_100) || 0;
      const horasNoturnas = Number(record.horas_noturnas) || 0;
      
      // Log detalhado para registros zerados ou com dados
      const isZerado = horasTrabalhadas === 0 && horasNegativas === 0 && horasExtras50 === 0 && 
                       horasExtras100 === 0 && horasNoturnas === 0;
      
      // Log todos os registros zerados e alguns com dados
      if (isZerado || Math.random() < 0.1) {
        console.log(`[TimeRecordsPageNew] 📝 Processando registro ${isZerado ? '(ZERADO)' : '(COM DADOS)'}:`, {
          id: record.id,
          data: record.data_registro,
          funcionario: employeeName,
          horas_trabalhadas_original: record.horas_trabalhadas,
          horas_trabalhadas_convertida: horasTrabalhadas,
          horas_extras_50_original: record.horas_extras_50,
          horas_extras_50_convertida: horasExtras50,
          horas_extras_100_original: record.horas_extras_100,
          horas_extras_100_convertida: horasExtras100,
          horas_noturnas_original: record.horas_noturnas,
          horas_noturnas_convertida: horasNoturnas,
          horas_negativas_original: record.horas_negativas,
          horas_negativas_convertida: horasNegativas,
          tipo_horas_trabalhadas: typeof record.horas_trabalhadas,
          tipo_horas_extras_50: typeof record.horas_extras_50,
          tipo_horas_extras_100: typeof record.horas_extras_100,
          tipo_horas_noturnas: typeof record.horas_noturnas,
          is_null: record.horas_trabalhadas === null,
          is_zero: record.horas_trabalhadas === 0,
          status: record.status,
          antes_soma: {
            totalHorasTrabalhadas: summary.totalHorasTrabalhadas,
            totalHorasExtras50: summary.totalHorasExtras50,
            totalHorasExtras100: summary.totalHorasExtras100,
            totalHorasNoturnas: summary.totalHorasNoturnas,
          }
        });
      }
      
      // CORREÇÃO: Não incluir horas negativas de dias futuros no total
      const recordDate = new Date(record.data_registro);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFutureDate = recordDate > today;
      
      summary.totalHorasTrabalhadas += horasTrabalhadas;
      // Só somar horas negativas se não for dia futuro
      if (!isFutureDate) {
        summary.totalHorasNegativas += horasNegativas;
      }
      summary.totalHorasExtras50 += horasExtras50;
      summary.totalHorasExtras100 += horasExtras100;
      summary.totalHorasNoturnas += horasNoturnas;
      
      // LOG DETALHADO: Verificar valores após somar (apenas para primeiros 3 registros de cada funcionário)
      if (summary.records.length <= 3) {
        console.log(`[TimeRecordsPageNew] 📊 Após somar registro ${summary.records.length}:`, {
          id: record.id,
          valores_somados: {
            horasTrabalhadas,
            horasNegativas,
            horasExtras50,
            horasExtras100,
            horasNoturnas,
          },
          depois_soma: {
            totalHorasTrabalhadas: summary.totalHorasTrabalhadas,
            totalHorasExtras50: summary.totalHorasExtras50,
            totalHorasExtras100: summary.totalHorasExtras100,
            totalHorasNoturnas: summary.totalHorasNoturnas,
          }
        });
      }
    });

    const result = Array.from(grouped.values()).sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName)
    );
    
    // Debug: Log dos resultados
    console.log('[TimeRecordsPageNew] Resumo calculado:', {
      totalFuncionarios: result.length,
      totalRegistros: filteredRecordsForSummary.length,
      mes: summaryMonth,
      ano: summaryYear,
      exemplos: result.slice(0, 3).map(s => ({
        nome: s.employeeName,
        totalHoras: s.totalHorasTrabalhadas,
        totalExtras50: s.totalHorasExtras50,
        totalExtras100: s.totalHorasExtras100,
        totalNegativas: s.totalHorasNegativas,
        qtdRegistros: s.records.length
      }))
    });
    
    return result;
  }, [filteredRecordsForSummary, summaryMonth, summaryYear]);

  // Completar registros com DSR, Férias, Atestado, etc. para cada funcionário (retroativo)
  useEffect(() => {
    if (!summaryMonth || !summaryYear || !selectedCompany?.id || employeeSummary.length === 0) {
      setCompleteRecordsByEmployee(new Map());
      return;
    }

    const month = parseInt(summaryMonth);
    const year = parseInt(summaryYear);
    const newCompleteRecords = new Map<string, TimeRecord[]>();

    // Processar cada funcionário de forma assíncrona
    const processEmployees = async () => {
      const promises = employeeSummary.map(async (summary) => {
        try {
          // Buscar informações dos dias do mês (retroativo - funciona para qualquer mês/ano)
          const daysInfo = await getMonthDaysInfo(
            summary.employeeId,
            selectedCompany.id,
            month,
            year
          );

          // Completar registros com DSR, Férias, Atestado, etc.
          const completeRecords = await completeRecordsWithRestDays(
            summary.records,
            month,
            year,
            daysInfo,
            summary.employeeId,
            selectedCompany.id
          );

          newCompleteRecords.set(summary.employeeId, completeRecords);
        } catch (err) {
          console.error(`[TimeRecordsPageNew] Erro ao completar registros para ${summary.employeeName}:`, err);
          // Em caso de erro, usar registros originais
          newCompleteRecords.set(summary.employeeId, summary.records);
        }
      });

      await Promise.all(promises);
      setCompleteRecordsByEmployee(newCompleteRecords);
    };

    processEmployees();
  }, [employeeSummary, summaryMonth, summaryYear, selectedCompany?.id]);

  // Carregar overrides de Natureza do Dia do banco (registros virtuais: DSR, Férias, etc.)
  useEffect(() => {
    if (!summaryMonth || !summaryYear || !selectedCompany?.id || employeeSummary.length === 0) return;
    const month = parseInt(summaryMonth);
    const year = parseInt(summaryYear);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0);
    const lastDayStr = lastDay.toISOString().split('T')[0];

    (async () => {
      try {
        const { data: rows } = await EntityService.list<{ id: string; employee_id: string; data_registro: string; natureza_dia: string }>({
          schema: 'rh',
          table: 'time_record_day_nature_override',
          companyId: selectedCompany.id,
          filters: { data_registro_gte: firstDay, data_registro_lte: lastDayStr },
          pageSize: 2000
        });
        const employeeIdsSet = new Set(employeeSummary.map((s) => s.employeeId));
        const map: Record<string, string> = {};
        (rows || []).forEach((r) => {
          if (!employeeIdsSet.has(r.employee_id)) return;
          const dateStr = typeof r.data_registro === 'string' ? r.data_registro.split('T')[0] : r.data_registro;
          map[`${r.employee_id}-${dateStr}`] = r.natureza_dia;
        });
        setDayNatureOverrides((prev) => ({ ...map, ...prev }));
      } catch (err) {
        console.warn('[TimeRecordsPageNew] Erro ao buscar overrides de natureza:', err);
      }
    })();
  }, [employeeSummary, summaryMonth, summaryYear, selectedCompany?.id]);

  const toggleEmployeeExpanded = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    console.group(`[TimeRecordsPageNew] 🔄 handleFilterChange - ${key}`);
    console.log('📥 Parâmetros recebidos:', { key, value });
    const newValue = value === 'all' ? undefined : value;
    console.log('🔄 Valor processado:', { original: value, processed: newValue });
    
    setFilters(prev => {
      console.log('📊 Estado anterior:', prev);
      const updated = {
        ...prev,
        [key]: newValue
      };
      console.log('✅ Estado atualizado:', updated);
      console.log('🔍 employeeId no estado:', updated.employeeId);
      console.groupEnd();
      return updated;
    });
  };

  // Handler específico para o filtro de funcionário (exatamente como na página antiga)
  const handleEmployeeFilter = (value: string) => {
    console.group('[TimeRecordsPageNew] 👤 handleEmployeeFilter');
    console.log('📥 Valor recebido:', value);
    console.log('📥 Tipo do valor:', typeof value);
    const newFilter = value === 'all' ? '' : value;
    console.log('🔄 Novo filtro:', newFilter);
    console.log('🔄 Tipo do novo filtro:', typeof newFilter);
    setEmployeeFilter(newFilter);
    console.log('✅ employeeFilter atualizado');
    console.groupEnd();
  };

  const handleCreate = () => {
    setSelectedRecord(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (record: TimeRecord) => {
    setSelectedRecord(record);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (record: TimeRecord) => {
    setSelectedRecord(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (record: TimeRecord) => {
    if (window.confirm(`Tem certeza que deseja excluir este registro de ponto?`)) {
      try {
        await deleteRecordMutation.mutateAsync(record.id);
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
      }
    }
  };

  const handleApprove = async (record: TimeRecord) => {
    try {
      await approveRecordMutation.mutateAsync({ id: record.id });
    } catch (error) {
      console.error('Erro ao aprovar registro:', error);
    }
  };

  const handleReject = async (record: TimeRecord) => {
    const reason = prompt('Motivo da rejeição:');
    if (reason) {
      try {
        await rejectRecordMutation.mutateAsync({ id: record.id, observacoes: reason });
      } catch (error) {
        console.error('Erro ao rejeitar registro:', error);
      }
    }
  };

  const handleModalSubmit = async (data: Partial<TimeRecord>) => {
    try {
      if (modalMode === 'create') {
        await createRecord.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedRecord) {
        await updateRecord.mutateAsync({
          id: selectedRecord.id,
          data: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando registros de ponto para CSV...');
  };

  // Handler para download de folha de ponto em PDF
  const handleDownloadTimeRecordPDF = async (summary: typeof employeeSummary[0]) => {
    if (!summaryMonth || !summaryYear || !selectedCompany?.id) {
      toast.error('Selecione o mês e o ano para gerar a folha de ponto');
      return;
    }

    try {
      toast.loading('Gerando folha de ponto...', { id: 'generate-time-record-pdf' });

      // Buscar dados da empresa (companies está no schema public, sem company_id)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', selectedCompany.id)
        .single();
      
      if (companyError) {
        console.warn('Erro ao buscar dados da empresa:', companyError);
      }

      // Buscar dados completos do funcionário (incluindo cargo)
      const employeeData = await EmployeesService.getById(summary.employeeId, selectedCompany.id);
      
      // Buscar cargo se houver cargo_id
      let cargoData = null;
      if (employeeData?.cargo_id) {
        cargoData = await EntityService.getById<any>({
          schema: 'rh',
          table: 'positions',
          id: employeeData.cargo_id,
          companyId: selectedCompany.id
        });
      }

      // Buscar saldo do banco de horas
      const bankHoursBalance = await getBankHoursBalanceUntilDate(
        summary.employeeId,
        selectedCompany.id,
        new Date(parseInt(summaryYear), parseInt(summaryMonth), 0) // Último dia do mês
      );

      // Calcular DSR
      const dsr = calculateDSR(summary.records, parseInt(summaryMonth), parseInt(summaryYear));

      // Overrides de Natureza do Dia para este funcionário (chave = dateStr para o relatório)
      const employeeDayOverrides: Record<string, string> = {};
      Object.entries(dayNatureOverrides).forEach(([k, v]) => {
        if (k.startsWith(summary.employeeId + '-')) {
          employeeDayOverrides[k.slice(summary.employeeId.length + 1)] = v;
        }
      });

      // Preparar dados
      const reportData: TimeRecordReportData = {
        employeeId: summary.employeeId,
        employeeName: summary.employeeName,
        employeeMatricula: summary.employeeMatricula,
        month: parseInt(summaryMonth),
        year: parseInt(summaryYear),
        records: summary.records,
        bankHoursBalance,
        dsr,
        companyId: selectedCompany.id,
        dayNatureOverrides: Object.keys(employeeDayOverrides).length > 0 ? employeeDayOverrides : undefined,
        company: companyData ? {
          id: companyData.id,
          razao_social: companyData.razao_social,
          nome_fantasia: companyData.nome_fantasia,
          cnpj: companyData.cnpj,
          inscricao_estadual: companyData.inscricao_estadual,
          logo_url: companyData.logo_url,
          endereco: companyData.endereco,
          contato: companyData.contato,
          numero_empresa: companyData.numero_empresa
        } : undefined,
        employee: employeeData ? {
          id: employeeData.id,
          nome: employeeData.nome,
          matricula: employeeData.matricula,
          cpf: employeeData.cpf,
          estado: employeeData.estado,
          cargo: cargoData ? { nome: cargoData.nome } : null
        } : undefined
      };

      // Gerar HTML (agora é assíncrono)
      const html = await generateTimeRecordReportHTML(reportData);
      
      // Fazer download
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(summaryMonth) - 1];
      const filename = `Folha_Ponto_${summary.employeeName.replace(/\s+/g, '_')}_${monthName}_${summaryYear}.html`;
      
      downloadFile(html, filename, 'text/html');
      
      toast.success('Folha de ponto gerada com sucesso!', { id: 'generate-time-record-pdf' });
    } catch (error) {
      console.error('Erro ao gerar folha de ponto:', error);
      toast.error('Erro ao gerar folha de ponto', { id: 'generate-time-record-pdf' });
    }
  };

  // Handler para download de CSV
  const handleDownloadTimeRecordCSV = async (summary: typeof employeeSummary[0]) => {
    if (!summaryMonth || !summaryYear || !selectedCompany?.id) {
      toast.error('Selecione o mês e o ano para gerar o CSV');
      return;
    }

    try {
      toast.loading('Gerando arquivo CSV...', { id: 'generate-time-record-csv' });

      // Buscar saldo do banco de horas
      const bankHoursBalance = await getBankHoursBalanceUntilDate(
        summary.employeeId,
        selectedCompany.id,
        new Date(parseInt(summaryYear), parseInt(summaryMonth), 0) // Último dia do mês
      );

      // Calcular DSR
      const dsr = calculateDSR(summary.records, parseInt(summaryMonth), parseInt(summaryYear));

      // Overrides de Natureza do Dia para este funcionário
      const employeeDayOverrides: Record<string, string> = {};
      Object.entries(dayNatureOverrides).forEach(([k, v]) => {
        if (k.startsWith(summary.employeeId + '-')) {
          employeeDayOverrides[k.slice(summary.employeeId.length + 1)] = v;
        }
      });

      // Preparar dados
      const reportData: TimeRecordReportData = {
        employeeId: summary.employeeId,
        employeeName: summary.employeeName,
        employeeMatricula: summary.employeeMatricula,
        month: parseInt(summaryMonth),
        year: parseInt(summaryYear),
        records: summary.records,
        bankHoursBalance,
        dsr,
        companyId: selectedCompany.id,
        dayNatureOverrides: Object.keys(employeeDayOverrides).length > 0 ? employeeDayOverrides : undefined
      };

      // Gerar CSV (agora é assíncrono)
      const csv = await generateTimeRecordReportCSV(reportData);
      
      // Fazer download
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(summaryMonth) - 1];
      const filename = `Folha_Ponto_${summary.employeeName.replace(/\s+/g, '_')}_${monthName}_${summaryYear}.csv`;
      
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      
      toast.success('Arquivo CSV gerado com sucesso!', { id: 'generate-time-record-csv' });
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      toast.error('Erro ao gerar arquivo CSV', { id: 'generate-time-record-csv' });
    }
  };

  const handleClockIn = () => {
    // TODO: Implementar registro de entrada
    console.log('Registrando entrada...');
  };

  const handleClockOut = () => {
    // TODO: Implementar registro de saída
    console.log('Registrando saída...');
  };

  // Funções auxiliares para formatação e visualização
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      default:
        return status || 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  // Função para formatar horário com data - sempre mostra a data quando disponível
  const formatTimeWithDate = (time?: string, date?: string, baseDate?: string) => {
    if (!time) return '--:--';
    const timeOnly = time.substring(0, 5);
    
    // Determinar qual data usar
    let dateToUse: string | undefined;
    if (date) {
      dateToUse = date;
    } else if (baseDate) {
      dateToUse = baseDate;
    } else {
      return timeOnly;
    }
    
    // SEMPRE mostrar a data quando disponível
    const [year, month, day] = dateToUse.split('-');
    if (year && month && day) {
      return `${timeOnly} (${day.padStart(2, '0')}/${month.padStart(2, '0')})`;
    }
    
    return timeOnly;
  };

  const calculateTotalHours = (record: TimeRecord) => {
    if (!record.entrada) return '--:--';
    // Sem saída: exibir horas parciais (ex.: entrada + início almoço) quando o backend já calculou
    if (!record.saida) {
      const horas = record.horas_trabalhadas != null ? Number(record.horas_trabalhadas) : 0;
      if (horas > 0) return formatDecimalHoursToHhMm(horas);
      return '--:--';
    }
    
    // CORREÇÃO: Usar campos *_date quando disponíveis para calcular corretamente quando cruza meia-noite
    // Determinar datas a usar
    const entradaDate = record.entrada_date || record.base_date || record.data_registro;
    const saidaDate = record.saida_date || record.base_date || record.data_registro;
    
    // Se saída (hora) < entrada (hora) e as datas são iguais, assumir saída no dia seguinte
    const entradaTime = record.entrada.substring(0, 5); // HH:MM
    const saidaTime = record.saida.substring(0, 5); // HH:MM
    const saidaTimeNum = parseInt(saidaTime.split(':')[0]) * 60 + parseInt(saidaTime.split(':')[1]);
    const entradaTimeNum = parseInt(entradaTime.split(':')[0]) * 60 + parseInt(entradaTime.split(':')[1]);
    
    let saidaDateToUse = saidaDate;
    if (saidaTimeNum < entradaTimeNum && entradaDate === saidaDate) {
      // Saída cruzou meia-noite: usar dia seguinte
      const saidaDateObj = new Date(saidaDate);
      saidaDateObj.setDate(saidaDateObj.getDate() + 1);
      saidaDateToUse = saidaDateObj.toISOString().split('T')[0];
    }
    
    const entrada = new Date(`${entradaDate}T${record.entrada}`);
    const saida = new Date(`${saidaDateToUse}T${record.saida}`);
    
    // Subtrair tempo de almoço se existir
    let almocoTime = 0;
    if (record.entrada_almoco && record.saida_almoco) {
      const entradaAlmocoDate = record.entrada_almoco_date || entradaDate;
      const saidaAlmocoDate = record.saida_almoco_date || entradaDate;
      const entradaAlmoco = new Date(`${entradaAlmocoDate}T${record.entrada_almoco}`);
      const saidaAlmoco = new Date(`${saidaAlmocoDate}T${record.saida_almoco}`);
      almocoTime = saidaAlmoco.getTime() - entradaAlmoco.getTime();
    }
    
    const totalMs = saida.getTime() - entrada.getTime() - almocoTime;
    
    // Se ainda deu negativo, tentar com saída no dia seguinte
    if (totalMs < 0 && entradaDate === saidaDate) {
      const saidaNextDay = new Date(`${saidaDateToUse}T${record.saida}`);
      const totalMsFixed = saidaNextDay.getTime() - entrada.getTime() - almocoTime;
      if (totalMsFixed > 0) {
        const hours = Math.floor(totalMsFixed / (1000 * 60 * 60));
        const minutes = Math.floor((totalMsFixed % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Se deu negativo, retornar formato negativo
    if (totalMs < 0) {
      return `-${Math.abs(hours).toString().padStart(2, '0')}:${Math.abs(minutes).toString().padStart(2, '0')}`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getLocationForRecord = (record: TimeRecord) => {
    // Prioridade: usar all_locations se disponível, senão usar campos diretos
    if (record.all_locations && Array.isArray(record.all_locations) && record.all_locations.length > 0) {
      // Buscar primeiro evento do tipo 'entrada'
      const entradaLocation = record.all_locations.find((loc: any) => loc.event_type === 'entrada');
      
      if (entradaLocation) {
        return {
          latitude: entradaLocation.latitude,
          longitude: entradaLocation.longitude,
          endereco: entradaLocation.endereco,
          hasCoords: Boolean(entradaLocation.latitude && entradaLocation.longitude),
          hasAddress: Boolean(entradaLocation.endereco),
        };
      }
      
      // Se não encontrar entrada, usar primeira localização disponível
      const firstLocation = record.all_locations[0];
      if (firstLocation && (firstLocation.latitude || firstLocation.longitude || firstLocation.endereco)) {
        return {
          latitude: firstLocation.latitude,
          longitude: firstLocation.longitude,
          endereco: firstLocation.endereco,
          hasCoords: Boolean(firstLocation.latitude && firstLocation.longitude),
          hasAddress: Boolean(firstLocation.endereco),
        };
      }
    }
    
    // Fallback para campos diretos
    const lat = record.entrada_latitude || (record as any).latitude;
    const lng = record.entrada_longitude || (record as any).longitude;
    const addr = record.entrada_endereco || (record as any).endereco || record.endereco;
    
    return {
      latitude: lat,
      longitude: lng,
      endereco: addr,
      hasCoords: Boolean(lat && lng),
      hasAddress: Boolean(addr),
    };
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 365 dias atrás (1 ano)
      endDate: new Date().toISOString().split('T')[0]
    });
    setEmployeeFilter('');
    setSearchTerm('');
  };

  // Colunas e actions removidas - agora usamos visualização em cards

  if (error) {
    return (
      <RequirePage pagePath="/portal-colaborador/historico-marcacoes*" action="read">
        <div className="p-6">
          <div className="text-red-500">Erro ao carregar registros de ponto: {error.message}</div>
        </div>
      </RequirePage>
    );
  }

  return (
    <RequirePage pagePath="/portal-colaborador/historico-marcacoes*" action="read">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de ponto dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClockIn} className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Entrada
          </Button>
          <Button onClick={handleClockOut} variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Saída
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Importar em Massa
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Funcionário ou observações..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário</label>
              <Select
                value={employeeFilter || 'all'}
                onValueChange={(value) => {
                  console.log('🎯 [Select] onValueChange disparado com valor:', value);
                  handleEmployeeFilter(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {employees.length > 0 ? (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.nome} {employee.matricula ? `(${employee.matricula})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>Carregando funcionários...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {employees.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum funcionário encontrado</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={resetFilters}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registros" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Registros de Ponto
          </TabsTrigger>
          <TabsTrigger value="resumo" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Resumo por Funcionário
          </TabsTrigger>
        </TabsList>

        {/* Aba: Registros de Ponto */}
        <TabsContent value="registros" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Ponto</CardTitle>
              <CardDescription>
                {isLoading 
                  ? 'Carregando registros...'
                  : filteredRecords && filteredRecords.length > 0 
                    ? `${filteredRecords.length} registro(s) encontrado(s)`
                    : 'Nenhum registro encontrado'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 animate-spin" />
                <span>Carregando registros de ponto...</span>
              </div>
            </div>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                console.log(`[TimeRecordsPageNew] 🎨 Renderizando card do registro:`, {
                  recordId: record.id,
                  dataRegistro: record.data_registro,
                  timestamp: new Date().toISOString()
                });
                
                const location = getLocationForRecord(record);
                const mapHref = location.hasCoords
                  ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                  : location.hasAddress
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.endereco || '')}`
                    : undefined;
                
                // Processar fotos - buscar de múltiplas fontes
                // Prioridade: all_photos (vindas de time_record_event_photos via RPC) > first_event_photo_url > foto_url
                let allPhotos = (record as any).all_photos;
                
                if (typeof allPhotos === 'string') {
                  try {
                    allPhotos = JSON.parse(allPhotos);
                  } catch (e) {
                    allPhotos = null;
                  }
                }
                
                let photos: Array<any> = [];
                
                // Prioridade 1: Usar all_photos se disponível (vem de time_record_event_photos)
                if (allPhotos && Array.isArray(allPhotos) && allPhotos.length > 0) {
                  photos = allPhotos;
                  console.log(`[TimeRecordsPageNew] 📸 Fotos processadas para registro ${record.id}:`, {
                    recordId: record.id,
                    dataRegistro: record.data_registro,
                    totalPhotos: photos.length,
                    photoIds: photos.map((p: any) => p.id || p.event_id || 'no-id'),
                    photoUrls: photos.map((p: any) => p.photo_url?.substring(0, 50) || 'no-url')
                  });
                } else {
                  // Prioridade 2: Fallback para first_event_photo_url (primeira foto do primeiro evento)
                  const fallbackPhotoUrl = record.first_event_photo_url || (record as any).foto_url || record.foto_url;
                  if (fallbackPhotoUrl) {
                    photos = [{
                      photo_url: fallbackPhotoUrl,
                      signed_thumb_url: (record as any).first_event_thumb_url || (record as any).foto_thumb_url,
                      signed_full_url: (record as any).first_event_full_url || (record as any).foto_full_url,
                    }];
                  }
                }
                
                const firstPhoto = photos.length > 0 ? photos[0] : null;
                const hasMultiplePhotos = photos.length > 1;

                return (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {formatDateOnly(record.data_registro)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-semibold text-gray-700">
                              {record.employee_nome || 'Nome não encontrado'}
                            </p>
                            {record.employee_matricula && (
                              <span className="text-xs text-gray-500">
                                ({record.employee_matricula})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Criado em {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status || '')}
                        <Badge className={getStatusColor(record.status || '')}>
                          {getStatusLabel(record.status || '')}
                        </Badge>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(record)}
                            className="h-8 w-8 p-0"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEditPage('/rh/time-records*') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="h-8 w-8 p-0"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeletePage('/rh/time-records*') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              className="h-8 w-8 p-0 text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Horários */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock3 className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.entrada, record.entrada_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Início Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.entrada_almoco, record.entrada_almoco_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Fim Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.saida_almoco, record.saida_almoco_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock4 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.saida, record.saida_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.entrada_extra1, record.entrada_extra1_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.saida_extra1, record.saida_extra1_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                    </div>

                    {/* Total de horas e observações */}
                    <div className="flex items-center justify-between pt-3 border-t mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Total de horas: </span>
                          <span className="font-medium text-gray-900">
                            {calculateTotalHours(record)}
                          </span>
                        </div>
                        {/* Horas Extras ou Negativas */}
                        {((record.horas_extras_50 && record.horas_extras_50 > 0) || 
                          (record.horas_extras_100 && record.horas_extras_100 > 0)) ? (
                          <div className="flex items-center gap-2 text-sm">
                            {record.horas_extras_50 && record.horas_extras_50 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 50%:</span>
                                <span className="font-medium text-blue-600">
                                  +{formatDecimalHoursToHhMm(record.horas_extras_50)}
                                </span>
                                <span className="text-xs text-gray-400">(Banco)</span>
                              </div>
                            )}
                            {record.horas_extras_100 && record.horas_extras_100 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 100%:</span>
                                <span className="font-medium text-orange-600">
                                  +{formatDecimalHoursToHhMm(record.horas_extras_100)}
                                </span>
                                <span className="text-xs text-gray-400">(Pagamento)</span>
                              </div>
                            )}
                          </div>
                        ) : record.horas_extras != null && Number(record.horas_extras) > 0 ? (
                          // Fallback para registros antigos
                          <div className="text-sm">
                            <span className="text-gray-500">Extras: </span>
                            <span className="font-medium text-orange-600">
                              +{formatDecimalHoursToHhMm(Number(record.horas_extras))}
                            </span>
                          </div>
                        ) : (() => {
                          // CORREÇÃO: Não mostrar horas negativas para dias futuros
                          const recordDate = new Date(record.data_registro);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isFutureDate = recordDate > today;
                          
                          // Se tem horas negativas e não é dia futuro, mostrar
                          if (record.horas_negativas && record.horas_negativas > 0 && !isFutureDate) {
                            return (
                              <div className="text-sm">
                                <span className="text-gray-500">Negativas: </span>
                                <span className="font-medium text-red-600">
                                  {formatDecimalHoursToHhMm(-(record.horas_negativas || 0))}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      {record.observacoes && (
                        <div className="text-sm text-gray-600 max-w-md">
                          <span className="text-gray-500">Observações: </span>
                          <span>{record.observacoes}</span>
                        </div>
                      )}
                    </div>

                    {/* Endereços e Localizações */}
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                          {/* Botão para expandir/recolher */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Localização</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                const newExpanded = new Set(expandedAddresses);
                                if (newExpanded.has(record.id)) {
                                  newExpanded.delete(record.id);
                                } else {
                                  newExpanded.add(record.id);
                                }
                                setExpandedAddresses(newExpanded);
                              }}
                            >
                              {expandedAddresses.has(record.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Recolher</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Expandir</span>
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {/* Conteúdo das localizações (mostrar apenas se expandido) */}
                          {expandedAddresses.has(record.id) && (
                            <div>
                          {/* Buscar todas as localizações do registro */}
                          {(() => {
                            let allLocations = (record as any).all_locations;
                            
                            if (typeof allLocations === 'string') {
                              try {
                                allLocations = JSON.parse(allLocations);
                              } catch (e) {
                                allLocations = null;
                              }
                            }
                            
                            // Se tiver all_locations, mostrar todas
                            if (allLocations && Array.isArray(allLocations) && allLocations.length > 0) {
                              return (
                                <div className="space-y-2">
                                  {allLocations.map((loc: any, idx: number) => {
                                    const locLat = loc.latitude;
                                    const locLng = loc.longitude;
                                    const locAddr = loc.endereco || '';
                                    const locHasCoords = Boolean(locLat && locLng);
                                    const locHasAddress = Boolean(locAddr);
                                    const locMapHref = locHasCoords
                                      ? `https://www.google.com/maps?q=${locLat},${locLng}`
                                      : locHasAddress
                                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locAddr)}`
                                        : undefined;
                                    
                                    const getEventTypeLabel = (eventType?: string) => {
                                      const labels: Record<string, string> = {
                                        'entrada': 'Entrada',
                                        'saida': 'Saída',
                                        'entrada_almoco': 'Almoço E',
                                        'saida_almoco': 'Almoço S',
                                        'extra_inicio': 'Extra E',
                                        'extra_fim': 'Extra S',
                                        'manual': 'Manual'
                                      };
                                      return labels[eventType || ''] || eventType || '';
                                    };
                                    
                                    const eventLabel = loc.event_type ? getEventTypeLabel(loc.event_type) : '';
                                    
                                    return (
                                      <div key={loc.id || idx} className="border-l-2 border-blue-200 pl-2">
                                        {eventLabel && (
                                          <div className="text-xs font-medium text-blue-600 mb-1">{eventLabel}</div>
                                        )}
                                        {/* Sempre mostrar endereço quando disponível */}
                                        {locHasAddress && (
                                          <div className="text-gray-900 font-medium max-w-full break-words mb-1">
                                            {locAddr.trim()}
                                          </div>
                                        )}
                                        <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                          {locHasCoords && (
                                            <span className="font-mono text-xs">
                                              {locLat}, {locLng}
                                            </span>
                                          )}
                                          {!locHasAddress && locHasCoords && (
                                            <span className="text-gray-400 text-xs">(Sem endereço)</span>
                                          )}
                                          {locMapHref && (
                                            <a
                                              href={locMapHref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                            >
                                              <MapPin className="h-3 w-3" />
                                              Ver no mapa
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            
                            // Fallback: usar localização única da função getLocationForRecord
                            const location = getLocationForRecord(record);
                            const mapHref = location.hasCoords
                              ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                              : location.hasAddress
                                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.endereco || '')}`
                                : undefined;
                            
                            if (location.hasAddress || location.hasCoords) {
                              return (
                                <div>
                                  {/* Sempre mostrar endereço quando disponível */}
                                  {location.hasAddress && (
                                    <div className="text-gray-900 font-medium max-w-full break-words mb-1" title={location.endereco || ''}>
                                      {location.endereco?.trim()}
                                    </div>
                                  )}
                                  <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                    {location.hasCoords && (
                                      <span className="font-mono text-xs">
                                        {location.latitude}, {location.longitude}
                                      </span>
                                    )}
                                    {!location.hasAddress && location.hasCoords && (
                                      <span className="text-gray-400 text-xs">(Sem endereço)</span>
                                    )}
                                    {mapHref && (
                                      <a
                                        href={mapHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                      >
                                        <MapPin className="h-3 w-3" />
                                        Ver no mapa
                                      </a>
                                    )}
                                    {record.localizacao_type && (
                                      <span className="text-xs">• origem: {record.localizacao_type}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            
                            // Sem localização
                            return (
                              <div className="text-gray-500 text-xs">Coordenadas e endereço não informados</div>
                            );
                          })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Galeria de fotos (sempre que houver fotos) */}
                    {photos.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Fotos do dia ({photos.length})
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {photos.map((photo: any, idx: number) => {
                            const photoUrl = getPhotoUrl(photo);
                            if (!photoUrl) return null;
                            
                            // Criar key estável para evitar recriação da imagem
                            const photoKey = `photo-${record.id}-${photo.id || photo.event_id || `idx-${idx}`}-${photo.photo_url?.substring(0, 30) || 'no-url'}`;
                            
                            return (
                              <PhotoImageWithErrorHandling
                                key={photoKey}
                                photo={photo}
                                photoUrl={photoUrl}
                                recordId={record.id}
                                photoKey={photoKey}
                                idx={idx}
                                employeeName={record.employee_nome}
                                onPhotoClick={(fullUrl) => {
                                  setSelectedPhotoUrl(fullUrl);
                                  setPhotoModalOpen(true);
                                }}
                                generateSignedUrl={generateSignedUrl}
                                extractPhotoPath={extractPhotoPath}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Indicador de carregamento */}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Clock className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Carregando mais registros...</span>
                </div>
              )}
              
              {/* Botão "Carregar mais" */}
              {hasNextPage && !isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('[TimeRecordsPageNew] 🖱️ Botão "Carregar mais" clicado');
                      fetchNextPage();
                    }}
                    className="w-full max-w-xs"
                  >
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum registro encontrado</p>
              <p className="text-sm text-gray-500 mt-2">
                Ajuste os filtros ou registre os primeiros pontos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Aba: Resumo por Funcionário */}
        <TabsContent value="resumo" className="mt-6">
          {/* Filtros de Mês e Ano */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
              <CardDescription>
                Selecione o mês e o ano para visualizar o resumo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mês</label>
                  <Select
                    value={summaryMonth}
                    onValueChange={setSummaryMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Janeiro</SelectItem>
                      <SelectItem value="2">Fevereiro</SelectItem>
                      <SelectItem value="3">Março</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Maio</SelectItem>
                      <SelectItem value="6">Junho</SelectItem>
                      <SelectItem value="7">Julho</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Setembro</SelectItem>
                      <SelectItem value="10">Outubro</SelectItem>
                      <SelectItem value="11">Novembro</SelectItem>
                      <SelectItem value="12">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano</label>
                  <Select
                    value={summaryYear}
                    onValueChange={setSummaryYear}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo por Funcionário</CardTitle>
              <CardDescription>
                {summaryMonth && summaryYear 
                  ? `Resumo de ${new Date(parseInt(summaryYear), parseInt(summaryMonth) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
                  : 'Visualize o resumo de horas trabalhadas, horas negativas, horas extras e horas noturnas por funcionário'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!summaryMonth || !summaryYear ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Selecione o mês e o ano</p>
                  <p className="text-sm text-gray-500">
                    Por favor, selecione o mês e o ano nos filtros acima para visualizar o resumo
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-6 w-6 animate-spin" />
                    <span>Carregando resumo...</span>
                  </div>
                </div>
              ) : employeeSummary.length > 0 ? (
                <div className="space-y-4">
                  {employeeSummary.map((summary) => {
                    const isExpanded = expandedEmployees.has(summary.employeeId);
                    // Usar completeRecords quando disponível para incluir faltas virtuais (dias úteis sem registro) nos totais
                    const recordsForTotals = completeRecordsByEmployee.get(summary.employeeId) || summary.records;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const totalHorasTrabalhadas = recordsForTotals.reduce((s, r) => s + (Number(r.horas_trabalhadas) || 0), 0);
                    // CORREÇÃO: Não incluir horas negativas de dias futuros nem de Feriado/Compensação/Folga no total
                    const totalHorasNegativas = recordsForTotals.reduce((s, r) => {
                      const recordDate = new Date(r.data_registro);
                      recordDate.setHours(0, 0, 0, 0);
                      const isFutureDate = recordDate > today;
                      if (isFutureDate) return s;
                      const dateStr = r.data_registro.split('T')[0];
                      const overrideKey = `${summary.employeeId}-${dateStr}`;
                      const natureValue = dayNatureOverrides[overrideKey] ?? (r as TimeRecord).natureza_dia ?? getDayNatureFromRecord(r);
                      if (isDayNatureNoNegativeHours(natureValue)) return s;
                      return s + (Number(r.horas_negativas) || 0);
                    }, 0);
                    const totalHorasExtras50 = recordsForTotals.reduce((s, r) => s + (Number(r.horas_extras_50) || 0), 0);
                    const totalHorasExtras100 = recordsForTotals.reduce((s, r) => s + (Number(r.horas_extras_100) || 0), 0);
                    const totalHorasNoturnas = recordsForTotals.reduce((s, r) => s + (Number(r.horas_noturnas) || 0), 0);
                    return (
                      <Card key={summary.employeeId} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {summary.employeeName}
                              </CardTitle>
                              {summary.employeeMatricula && (
                                <CardDescription>
                                  Matrícula: {summary.employeeMatricula}
                                </CardDescription>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadTimeRecordPDF(summary)}
                                className="flex items-center gap-2"
                                title="Baixar folha de ponto em PDF"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">PDF</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadTimeRecordCSV(summary)}
                                className="flex items-center gap-2"
                                title="Baixar folha de ponto em CSV"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">CSV</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEmployeeExpanded(summary.employeeId)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatDecimalHoursToHhMm(totalHorasTrabalhadas)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Horas Negativas</p>
                              <p className="text-2xl font-bold text-red-600">
                                {totalHorasNegativas > 0 ? formatDecimalHoursToHhMm(-totalHorasNegativas) : '0h00'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Extras 50%</p>
                              <p className="text-2xl font-bold text-orange-600">
                                {formatDecimalHoursToHhMm(totalHorasExtras50)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Extras 100%</p>
                              <p className="text-2xl font-bold text-purple-600">
                                {formatDecimalHoursToHhMm(totalHorasExtras100)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Horas Noturnas</p>
                              <p className="text-2xl font-bold text-indigo-600">
                                {formatDecimalHoursToHhMm(totalHorasNoturnas)}
                              </p>
                            </div>
                            <EmployeeBankHoursBalanceInline 
                              employeeId={summary.employeeId}
                              companyId={selectedCompany?.id}
                              year={summaryYear ? parseInt(summaryYear) : undefined}
                              month={summaryMonth ? parseInt(summaryMonth) : undefined}
                              startDate={summaryDateRange?.start || filters.startDate}
                              endDate={summaryDateRange?.end || filters.endDate}
                            />
                          </div>

                          {/* Tabela de detalhes quando expandido */}
                          {isExpanded && (
                            <div className="mt-6 border-t pt-4">
                              <h4 className="text-sm font-semibold mb-3">Registros Dia a Dia</h4>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Data</TableHead>
                                      <TableHead>Natureza do Dia</TableHead>
                                      <TableHead>Horas Trabalhadas</TableHead>
                                      <TableHead>Horas Negativas</TableHead>
                                      <TableHead>Extras 50%</TableHead>
                                      <TableHead>Extras 100%</TableHead>
                                      <TableHead>Horas Noturnas</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(completeRecordsByEmployee.get(summary.employeeId) || summary.records)
                                      .sort((a, b) => {
                                        // Ordenar por data (sem problemas de timezone)
                                        const dateA = a.data_registro.split('T')[0];
                                        const dateB = b.data_registro.split('T')[0];
                                        return dateB.localeCompare(dateA);
                                      })
                                      .map((record) => {
                                        const dateStr = record.data_registro.split('T')[0];
                                        const overrideKey = `${summary.employeeId}-${dateStr}`;
                                        // Prioridade: override local (virtual) > valor do banco (registro real) > detecção automática
                                        const natureValue = dayNatureOverrides[overrideKey]
                                          ?? (record as TimeRecord).natureza_dia
                                          ?? getDayNatureFromRecord(record);
                                        const isVirtual = record.id.startsWith('virtual-');
                                        const isRestDay = (record as any).is_dia_folga || (isVirtual && record.id.includes('-dsr'));
                                        const isVacation = isVirtual && record.id.includes('-ferias');
                                        const isMedicalCertificate = isVirtual && record.id.includes('-atestado');
                                        const isCompensation = isVirtual && record.id.includes('-compensacao');
                                        const isFalta = isVirtual && record.id.includes('-falta');
                                        
                                        // Determinar label e cor
                                        let displayLabel = '';
                                        let rowBgColor = '';
                                        if (isVacation) {
                                          displayLabel = 'Férias';
                                          rowBgColor = 'bg-green-50';
                                        } else if (isMedicalCertificate) {
                                          displayLabel = 'Atestado';
                                          rowBgColor = 'bg-yellow-50';
                                        } else if (isCompensation) {
                                          displayLabel = record.observacoes || 'Compensação';
                                          rowBgColor = 'bg-purple-50';
                                        } else if (isFalta) {
                                          displayLabel = 'Falta';
                                          rowBgColor = 'bg-red-50';
                                        } else if (isRestDay && !record.entrada) {
                                          displayLabel = 'DSR';
                                          rowBgColor = 'bg-blue-50';
                                        }
                                        
                                        const effectiveNatureLabel = getDayNatureLabel(natureValue);
                                        const hasNatureLabel = !!displayLabel; // dia com natureza especial (DSR, Férias, etc.)
                                        return (
                                        <TableRow key={record.id} className={rowBgColor}>
                                          <TableCell>
                                            {formatDateOnly(record.data_registro)}
                                          </TableCell>
                                          <TableCell>
                                            {canEditPage('/rh/time-records*') ? (
                                              <Select
                                                value={natureValue}
                                                onValueChange={async (value) => {
                                                  if (isVirtual) {
                                                    try {
                                                      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
                                                      const { data: existing } = await EntityService.list<{ id: string }>({
                                                        schema: 'rh',
                                                        table: 'time_record_day_nature_override',
                                                        companyId: selectedCompany.id,
                                                        filters: { employee_id: summary.employeeId, data_registro: dateStr },
                                                        pageSize: 1
                                                      });
                                                      if (existing?.length > 0) {
                                                        await EntityService.update({
                                                          schema: 'rh',
                                                          table: 'time_record_day_nature_override',
                                                          companyId: selectedCompany.id,
                                                          id: existing[0].id,
                                                          data: { natureza_dia: value }
                                                        });
                                                      } else {
                                                        await EntityService.create({
                                                          schema: 'rh',
                                                          table: 'time_record_day_nature_override',
                                                          companyId: selectedCompany.id,
                                                          data: {
                                                            employee_id: summary.employeeId,
                                                            company_id: selectedCompany.id,
                                                            data_registro: dateStr,
                                                            natureza_dia: value
                                                          }
                                                        });
                                                      }
                                                      setDayNatureOverrides((prev) => ({ ...prev, [overrideKey]: value }));
                                                    } catch (err) {
                                                      console.error('Erro ao salvar natureza do dia (virtual):', err);
                                                      toast.error('Não foi possível salvar a natureza do dia');
                                                    }
                                                    return;
                                                  }
                                                  try {
                                                    await updateRecord.mutateAsync({
                                                      id: record.id,
                                                      data: { natureza_dia: value }
                                                    });
                                                    setDayNatureOverrides((prev) => {
                                                      const next = { ...prev };
                                                      delete next[overrideKey];
                                                      return next;
                                                    });
                                                    queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
                                                  } catch (err) {
                                                    console.error('Erro ao salvar natureza do dia:', err);
                                                    toast.error('Não foi possível salvar a natureza do dia');
                                                  }
                                                }}
                                              >
                                                <SelectTrigger className="h-8 w-[140px]">
                                                  <SelectValue>{getDayNatureLabel(natureValue)}</SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {DAY_NATURE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                      {opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            ) : (
                                              <span className="text-sm">{getDayNatureLabel(natureValue)}</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {hasNatureLabel ? (
                                              <span className="text-muted-foreground italic">{effectiveNatureLabel}</span>
                                            ) : (
                                              <span className="font-medium">
                                                {formatDecimalHoursToHhMm(record.horas_trabalhadas ?? 0)}
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {(() => {
                                              // Feriado, Compensação e Folga não exibem horas negativas
                                              if (isDayNatureNoNegativeHours(natureValue)) {
                                                return <span className="text-muted-foreground">-</span>;
                                              }
                                              // CORREÇÃO: Não mostrar horas negativas para dias futuros
                                              const recordDate = new Date(record.data_registro);
                                              const today = new Date();
                                              today.setHours(0, 0, 0, 0);
                                              const isFutureDate = recordDate > today;
                                              
                                              // Se for falta em dia futuro, não mostrar horas negativas
                                              if (isFalta && isFutureDate) {
                                                return <span className="text-muted-foreground">-</span>;
                                              }
                                              
                                              // Se for falta em dia passado/hoje, mostrar horas negativas
                                              if (isFalta) {
                                                return (
                                                  <span className="text-red-600 font-medium">
                                                    {formatDecimalHoursToHhMm(-(record.horas_negativas || 0))}
                                                  </span>
                                                );
                                              }
                                              
                                              // Atestado de comparecimento pode ter horas negativas líquidas (ex.: -4h39)
                                              if (isMedicalCertificate && record.horas_negativas && record.horas_negativas > 0 && !isFutureDate) {
                                                return (
                                                  <span className="text-red-600 font-medium">
                                                    {formatDecimalHoursToHhMm(-record.horas_negativas)}
                                                  </span>
                                                );
                                              }
                                              // Se não for falta mas tem displayLabel (DSR, Férias, etc)
                                              if (displayLabel) {
                                                return <span className="text-muted-foreground">-</span>;
                                              }
                                              
                                              // Se tem horas negativas e não é dia futuro, mostrar
                                              if (record.horas_negativas && record.horas_negativas > 0 && !isFutureDate) {
                                                return (
                                                  <span className="text-red-600 font-medium">
                                                    {formatDecimalHoursToHhMm(-record.horas_negativas)}
                                                  </span>
                                                );
                                              }
                                              
                                              // Caso padrão
                                              return <span className="text-muted-foreground">0h00</span>;
                                            })()}
                                          </TableCell>
                                          <TableCell>
                                            {displayLabel ? (
                                              <span className="text-muted-foreground">-</span>
                                            ) : record.horas_extras_50 && record.horas_extras_50 > 0 ? (
                                              <span className="text-orange-600 font-medium">
                                                +{formatDecimalHoursToHhMm(record.horas_extras_50)}
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0h00</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {displayLabel ? (
                                              <span className="text-muted-foreground">-</span>
                                            ) : record.horas_extras_100 && record.horas_extras_100 > 0 ? (
                                              <span className="text-purple-600 font-medium">
                                                +{formatDecimalHoursToHhMm(record.horas_extras_100)}
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0h00</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {displayLabel ? (
                                              <span className="text-muted-foreground">-</span>
                                            ) : record.horas_noturnas && record.horas_noturnas > 0 ? (
                                              <span className="text-indigo-600 font-medium">
                                                +{formatDecimalHoursToHhMm(record.horas_noturnas)}
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0h00</span>
                                            )}
                                          </TableCell>
                                            <TableCell>
                                            {isVirtual ? (
                                              <Badge className={
                                                isVacation ? 'bg-green-100 text-green-800' :
                                                isMedicalCertificate ? 'bg-yellow-100 text-yellow-800' :
                                                isCompensation ? 'bg-purple-100 text-purple-800' :
                                                isFalta ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                              }>
                                                {effectiveNatureLabel}
                                              </Badge>
                                            ) : isDayNatureNoNegativeHours(natureValue) ? (
                                              <Badge className={
                                                natureValue === 'feriado' ? 'bg-pink-100 text-pink-800' :
                                                natureValue === 'folga' ? 'bg-sky-100 text-sky-800' :
                                                'bg-purple-100 text-purple-800'
                                              }>
                                                {effectiveNatureLabel}
                                              </Badge>
                                            ) : (
                                              <Badge className={getStatusColor(record.status || '')}>
                                                {getStatusLabel(record.status || '')}
                                              </Badge>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                      })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum registro encontrado</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Não há registros de ponto para {summaryMonth && summaryYear 
                      ? new Date(parseInt(summaryYear), parseInt(summaryMonth) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                      : 'o período selecionado'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Registro de Ponto' :
          modalMode === 'edit' ? 'Editar Registro de Ponto' :
          'Visualizar Registro de Ponto'
        }
        loading={createRecord.isPending || updateRecord.isPending}
        size="lg"
        submitLabel={modalMode === 'create' ? 'Criar Registro' : 'Salvar Alterações'}
      >
        {modalMode === 'view' ? (
          <div className="space-y-4">
            <TimeRecordForm
              timeRecord={selectedRecord}
              onSubmit={handleModalSubmit}
              mode={modalMode}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Batidas do dia</label>
              <div className="rounded-md border p-3 space-y-2">
                {(eventsData?.events || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma batida registrada.</p>
                ) : (
                  (eventsData?.events || []).map((ev) => {
                    const mapHref = ev.latitude && ev.longitude
                      ? `https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`
                      : ev.endereco
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.endereco || '')}`
                        : undefined;
                    const photo = ev.photos && ev.photos.length > 0 ? ev.photos[0] : undefined;
                    return (
                      <div key={ev.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {ev.event_type}
                          </span>
                          <span className="text-sm font-mono">
                            {new Date(ev.event_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {mapHref ? (
                            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              Ver localização
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem localização</span>
                          )}
                          {photo ? (
                            <a href={photo.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              Ver foto
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem foto</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <TimeRecordForm
            timeRecord={selectedRecord}
            onSubmit={handleModalSubmit}
            mode={modalMode}
          />
        )}
      </FormModal>

      {/* Modal de visualização de foto */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogTitle className="sr-only">Foto do Registro de Ponto</DialogTitle>
          <DialogDescription className="sr-only">Visualização ampliada da foto capturada durante o registro de ponto</DialogDescription>
          {selectedPhotoUrl && (
            <PhotoModalImage
              photoUrl={selectedPhotoUrl}
              extractPhotoPath={extractPhotoPath}
              generateSignedUrl={generateSignedUrl}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <TimeRecordsImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={selectedCompany?.id || ''}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
    </RequirePage>
  );
}

// Componente para exibir saldo mensal do banco de horas
interface EmployeeBankHoursBalanceProps {
  employeeId: string;
  companyId?: string;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}

function EmployeeBankHoursBalanceInline({ 
  employeeId, 
  companyId, 
  year,
  month,
  startDate, 
  endDate 
}: EmployeeBankHoursBalanceProps) {
  // Determinar ano e mês: priorizar props diretas, depois extrair de endDate
  const finalYear = year || (endDate ? new Date(endDate).getFullYear() : new Date().getFullYear());
  const finalMonth = month || (endDate ? new Date(endDate).getMonth() + 1 : new Date().getMonth() + 1);

  console.log('[EmployeeBankHoursBalanceInline] 🎯 Componente renderizado:', { 
    employeeId, 
    companyId, 
    year: finalYear, 
    month: finalMonth,
    startDate, 
    endDate 
  });

  const monthlyBankHoursBalance = useQuery({
    queryKey: ['employee-bank-hours-balance', employeeId, companyId, finalYear, finalMonth],
    queryFn: async () => {
      if (!employeeId || !companyId) {
        console.log('[EmployeeBankHoursBalanceInline] ⚠️ Dados faltando:', { employeeId, companyId });
        return 0;
      }

      try {
        console.log('[EmployeeBankHoursBalanceInline] 🔍 Calculando saldo usando função SQL:', { 
          employeeId, 
          companyId, 
          year: finalYear, 
          month: finalMonth 
        });
        
        // Usar função SQL para calcular saldo mensal
        const { data, error } = await (supabase as any).rpc('get_monthly_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId,
          p_year: finalYear,
          p_month: finalMonth
        });

        if (error) {
          console.error('[EmployeeBankHoursBalanceInline] ❌ Erro ao calcular saldo:', error);
          return 0;
        }

        // A função retorna um DECIMAL diretamente, não um array
        // Mas pode estar vindo como string ou número
        let finalBalance = 0;
        if (typeof data === 'number') {
          finalBalance = data;
        } else if (typeof data === 'string') {
          finalBalance = parseFloat(data) || 0;
        } else if (Array.isArray(data) && data.length > 0) {
          // Se vier como array (caso raro), pegar o primeiro valor
          finalBalance = Number(data[0]) || 0;
        }

        console.log('[EmployeeBankHoursBalanceInline] 💰 Saldo calculado:', {
          finalBalance,
          rawData: data,
          dataType: typeof data,
          isArray: Array.isArray(data),
          year: finalYear,
          month: finalMonth,
          employeeId
        });
        
        return Math.round(finalBalance * 100) / 100;
      } catch (error) {
        console.error('[EmployeeBankHoursBalanceInline] ❌ Erro ao calcular saldo:', error);
        return 0;
      }
    },
    enabled: !!employeeId && !!companyId && !!finalYear && !!finalMonth,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false
  });

  // Sempre renderizar o componente, mesmo se não houver dados
  const balance = monthlyBankHoursBalance.data ?? 0;
  const isLoading = monthlyBankHoursBalance.isLoading;
  const hasError = monthlyBankHoursBalance.isError;

  console.log('[EmployeeBankHoursBalanceInline] 🎨 Renderizando componente:', { balance, isLoading, hasError, employeeId, companyId });

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Saldo Banco de Horas</p>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : hasError ? (
        <p className="text-2xl font-bold text-red-600">Erro</p>
      ) : (
        <p className={`text-2xl font-bold ${
          balance > 0 ? 'text-green-600' :
          balance < 0 ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {balance >= 0 ? `+${formatDecimalHoursToHhMm(balance)}` : formatDecimalHoursToHhMm(balance)}
        </p>
      )}
    </div>
  );
}
