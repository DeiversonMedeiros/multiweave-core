import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { TimeRecord } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeRecords } from '@/hooks/rh/useTimeRecords';
import { useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { RequireEntity } from '@/components/RequireAuth';
import { TimeRecordForm } from '@/components/rh/TimeRecordForm';
import { useTimeRecordEvents } from '@/hooks/rh/useTimeRecordEvents';
import { formatDateOnly } from '@/lib/utils';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function TimeRecordsPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  // Estado para controlar quais cards têm endereços expandidos
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const { data: eventsData } = useTimeRecordEvents(selectedRecord?.id || undefined);

  // Hooks usando função específica para registros de ponto
  const { data: records = [], isLoading, error } = useTimeRecords({
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status,
    employeeId: filters.employeeId
  });

  // Debug logs: acompanhar dados recebidos e campos de localização/foto
  useEffect(() => {
    console.group('[TimeRecordsPageNew] records fetch');
    console.log('records.length:', records?.length || 0);
    if (records && records.length > 0) {
      const sample = records[0] as any;
      console.log('sample record fields:', {
        id: sample.id,
        data_registro: sample.data_registro,
        employee_nome: sample.employee_nome,
        // Localização
        entrada_latitude: sample.entrada_latitude,
        entrada_longitude: sample.entrada_longitude,
        entrada_endereco: sample.entrada_endereco,
        latitude: sample.latitude,
        longitude: sample.longitude,
        endereco: sample.endereco,
        all_locations: sample.all_locations,
        all_locations_type: typeof sample.all_locations,
        // Foto
        foto_url: sample.foto_url,
        first_event_photo_url: sample.first_event_photo_url,
        all_photos: sample.all_photos,
        all_photos_type: typeof sample.all_photos,
        localizacao_type: sample.localizacao_type,
      });
      
      // Log detalhado de all_photos se existir
      if (sample.all_photos) {
        console.log('all_photos detalhado:', {
          isArray: Array.isArray(sample.all_photos),
          length: Array.isArray(sample.all_photos) ? sample.all_photos.length : 'not array',
          content: sample.all_photos
        });
      }
      
      // Log detalhado de all_locations se existir
      if (sample.all_locations) {
        console.log('all_locations detalhado:', {
          isArray: Array.isArray(sample.all_locations),
          length: Array.isArray(sample.all_locations) ? sample.all_locations.length : 'not array',
          content: sample.all_locations
        });
      }
    }
    console.groupEnd();
  }, [records]);
  const createRecord = useCreateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const updateRecord = useUpdateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const deleteRecord = useDeleteEntity('rh', 'time_records', selectedCompany?.id || '');

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
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
        await deleteRecord.mutateAsync(record.id);
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
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
          updatedEntity: data
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

  const calculateTotalHours = (record: TimeRecord) => {
    if (!record.entrada || !record.saida) return '--:--';
    
    const entrada = new Date(`2000-01-01T${record.entrada}`);
    const saida = new Date(`2000-01-01T${record.saida}`);
    
    // Subtrair tempo de almoço se existir
    let almocoTime = 0;
    if (record.entrada_almoco && record.saida_almoco) {
      const entradaAlmoco = new Date(`2000-01-01T${record.entrada_almoco}`);
      const saidaAlmoco = new Date(`2000-01-01T${record.saida_almoco}`);
      almocoTime = saidaAlmoco.getTime() - entradaAlmoco.getTime();
    }
    
    const totalMs = saida.getTime() - entrada.getTime() - almocoTime;
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getLocationForRecord = (record: TimeRecord) => {
    // PRIORIDADE: all_locations (vindas de time_record_events via RPC) > campos diretos (entrada_latitude, etc.)
    console.group(`[TimeRecordsPageNew] 📍 PROCESSANDO LOCALIZAÇÕES PARA REGISTRO ${record.id}`);
    
    let allLocations = (record as any).all_locations;
    console.log('[TimeRecordsPageNew] all_locations RAW (antes do parse):', {
      tipo: typeof allLocations,
      valor: allLocations,
      isArray: Array.isArray(allLocations),
      length: Array.isArray(allLocations) ? allLocations.length : 'N/A',
    });
    
    if (typeof allLocations === 'string') {
      try {
        allLocations = JSON.parse(allLocations);
        console.log('[TimeRecordsPageNew] ✅ all_locations parseado com sucesso:', {
          tipo: typeof allLocations,
          isArray: Array.isArray(allLocations),
          length: Array.isArray(allLocations) ? allLocations.length : 'N/A',
        });
      } catch (e) {
        console.error('[TimeRecordsPageNew] ❌ Erro ao parsear all_locations:', e, { all_locations: allLocations });
        allLocations = null;
      }
    }
    
    // PRIORIDADE 1: Buscar localização da ENTRADA em all_locations (vindas de time_record_events)
    if (allLocations && Array.isArray(allLocations) && allLocations.length > 0) {
      console.log('[TimeRecordsPageNew] Detalhes das localizações:', allLocations.map((loc: any, i: number) => ({
        index: i,
        id: loc?.id,
        event_type: loc?.event_type,
        event_at: loc?.event_at,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        endereco: loc?.endereco,
        source: loc?.source,
      })));
      
      // Buscar primeiro evento do tipo 'entrada'
      const entradaLocation = allLocations.find((loc: any) => loc.event_type === 'entrada');
      
      if (entradaLocation) {
        console.log(`[TimeRecordsPageNew] ✅ usando localização de ENTRADA de all_locations para registro ${record.id}:`, {
          event_type: entradaLocation.event_type,
          latitude: entradaLocation.latitude,
          longitude: entradaLocation.longitude,
          endereco: entradaLocation.endereco,
        });
        console.groupEnd();
        return {
          latitude: entradaLocation.latitude,
          longitude: entradaLocation.longitude,
          endereco: entradaLocation.endereco,
          hasCoords: Boolean(entradaLocation.latitude && entradaLocation.longitude),
          hasAddress: Boolean(entradaLocation.endereco),
        };
      }
      
      // Se não encontrar entrada, usar primeira localização disponível
      const firstLocation = allLocations[0];
      if (firstLocation && (firstLocation.latitude || firstLocation.longitude || firstLocation.endereco)) {
        console.log(`[TimeRecordsPageNew] ⚠️ usando primeira localização de all_locations (não é entrada) para registro ${record.id}:`, {
          event_type: firstLocation.event_type,
          latitude: firstLocation.latitude,
          longitude: firstLocation.longitude,
          endereco: firstLocation.endereco,
        });
        console.groupEnd();
        return {
          latitude: firstLocation.latitude,
          longitude: firstLocation.longitude,
          endereco: firstLocation.endereco,
          hasCoords: Boolean(firstLocation.latitude && firstLocation.longitude),
          hasAddress: Boolean(firstLocation.endereco),
        };
      }
    }
    
    // PRIORIDADE 2: Fallback para campos diretos (entrada_latitude, entrada_longitude, entrada_endereco)
    const lat = record.entrada_latitude || (record as any).latitude;
    const lng = record.entrada_longitude || (record as any).longitude;
    const addr = record.entrada_endereco || (record as any).endereco || record.endereco;
    
    if (lat || lng || addr) {
      console.log(`[TimeRecordsPageNew] ⚠️ usando campos diretos de localização (fallback) para registro ${record.id}:`, {
        latitude: lat,
        longitude: lng,
        endereco: addr,
      });
    } else {
      console.warn(`[TimeRecordsPageNew] ❌ NENHUMA localização encontrada para registro ${record.id}`, {
        all_locations: (record as any).all_locations,
        all_locations_type: typeof (record as any).all_locations,
        entrada_latitude: record.entrada_latitude,
        entrada_longitude: record.entrada_longitude,
        entrada_endereco: record.entrada_endereco,
      });
    }
    
    console.groupEnd();
    return {
      latitude: lat,
      longitude: lng,
      endereco: addr,
      hasCoords: Boolean(lat && lng),
      hasAddress: Boolean(addr),
    };
  };

  const resetFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Filtrar dados por busca
  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.employee_nome?.toLowerCase().includes(search) ||
      record.employee_matricula?.toLowerCase().includes(search) ||
      record.observacoes?.toLowerCase().includes(search)
    );
  });

  // Colunas e actions removidas - agora usamos visualização em cards

  if (error) {
    return (
      <RequireEntity entityName="time_records" action="read">
        <div className="p-6">
          <div className="text-red-500">Erro ao carregar registros de ponto: {error.message}</div>
        </div>
      </RequireEntity>
    );
  }

  return (
    <RequireEntity entityName="time_records" action="read">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <label className="text-sm font-medium">&nbsp;</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCsv}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Registros em Cards */}
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
                const location = getLocationForRecord(record);
                const mapHref = location.hasCoords
                  ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                  : location.hasAddress
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.endereco || '')}`
                    : undefined;
                
                // Processar fotos - buscar de múltiplas fontes
                // PRIORIDADE: all_photos (vindas de time_record_event_photos via RPC) > first_event_photo_url > foto_url
                console.group(`[TimeRecordsPageNew] 🖼️ PROCESSANDO FOTOS PARA REGISTRO ${record.id}`);
                
                let allPhotos = (record as any).all_photos;
                console.log('[TimeRecordsPageNew] all_photos RAW (antes do parse):', {
                  tipo: typeof allPhotos,
                  valor: allPhotos,
                  isArray: Array.isArray(allPhotos),
                  length: Array.isArray(allPhotos) ? allPhotos.length : 'N/A',
                });
                
                if (typeof allPhotos === 'string') {
                  try {
                    allPhotos = JSON.parse(allPhotos);
                    console.log('[TimeRecordsPageNew] ✅ all_photos parseado com sucesso:', {
                      tipo: typeof allPhotos,
                      isArray: Array.isArray(allPhotos),
                      length: Array.isArray(allPhotos) ? allPhotos.length : 'N/A',
                    });
                  } catch (e) {
                    console.error('[TimeRecordsPageNew] ❌ Erro ao parsear all_photos:', e, { all_photos: allPhotos });
                    allPhotos = null;
                  }
                }
                
                let photos: Array<any> = [];
                
                // PRIORIDADE 1: Usar all_photos se disponível (vem de time_record_event_photos)
                if (allPhotos && Array.isArray(allPhotos) && allPhotos.length > 0) {
                  photos = allPhotos;
                  console.log(`[TimeRecordsPageNew] ✅ usando ${photos.length} foto(s) de all_photos para registro ${record.id}`);
                  console.log('[TimeRecordsPageNew] Detalhes das fotos:', photos.map((p: any, i: number) => ({
                    index: i,
                    id: p?.id,
                    photo_url: p?.photo_url,
                    event_type: p?.event_type,
                    event_at: p?.event_at,
                    has_signed_thumb: !!p?.signed_thumb_url,
                    has_signed_full: !!p?.signed_full_url,
                  })));
                } else {
                  // PRIORIDADE 2: Fallback para first_event_photo_url (primeira foto do primeiro evento)
                  const fallbackPhotoUrl = record.first_event_photo_url || (record as any).foto_url || record.foto_url;
                  if (fallbackPhotoUrl) {
                    photos = [{
                      photo_url: fallbackPhotoUrl,
                      signed_thumb_url: (record as any).first_event_thumb_url || (record as any).foto_thumb_url,
                      signed_full_url: (record as any).first_event_full_url || (record as any).foto_full_url,
                    }];
                    console.log(`[TimeRecordsPageNew] ⚠️ usando fallback first_event_photo_url para registro ${record.id}`);
                  } else {
                    console.warn(`[TimeRecordsPageNew] ❌ NENHUMA foto encontrada para registro ${record.id}`, {
                      all_photos: (record as any).all_photos,
                      all_photos_type: typeof (record as any).all_photos,
                      first_event_photo_url: record.first_event_photo_url,
                      foto_url: (record as any).foto_url,
                    });
                  }
                }
                
                const firstPhoto = photos.length > 0 ? photos[0] : null;
                const hasMultiplePhotos = photos.length > 1;
                
                console.log('[TimeRecordsPageNew] 📊 RESUMO FINAL DAS FOTOS:', {
                  total_fotos: photos.length,
                  tem_multiplas: hasMultiplePhotos,
                  primeira_foto: firstPhoto ? {
                    photo_url: firstPhoto.photo_url,
                    event_type: firstPhoto.event_type,
                    has_signed_thumb: !!firstPhoto.signed_thumb_url,
                    has_signed_full: !!firstPhoto.signed_full_url,
                  } : null,
                  fonte: allPhotos && Array.isArray(allPhotos) ? 'all_photos array' : 'fallback fields',
                });
                
                console.groupEnd();

                // Helper para obter URL da foto
                const getPhotoUrl = (photo: any) => {
                  if (!photo || !photo.photo_url) return '';
                  
                  // Priorizar signed URLs se disponível
                  if (photo.signed_thumb_url) return photo.signed_thumb_url;
                  if (photo.signed_full_url) return photo.signed_full_url;
                  
                  // Se já é uma URL completa HTTP/HTTPS, retornar como está
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
                  return `${supabaseUrl}/storage/v1/object/public/time-record-photos/${cleanPath}`;
                };

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
                          {canEditEntity && (
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
                          {canDeleteEntity && (
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
                          {formatTime(record.entrada)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Início Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Fim Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock4 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada_extra1)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida_extra1)}
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
                        {/* Horas Extras - Mostrar separadamente se disponível */}
                        {((record.horas_extras_50 && record.horas_extras_50 > 0) || 
                          (record.horas_extras_100 && record.horas_extras_100 > 0)) ? (
                          <div className="flex items-center gap-2 text-sm">
                            {record.horas_extras_50 && record.horas_extras_50 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 50%:</span>
                                <span className="font-medium text-blue-600">
                                  +{record.horas_extras_50.toFixed(1)}h
                                </span>
                                <span className="text-xs text-gray-400">(Banco)</span>
                              </div>
                            )}
                            {record.horas_extras_100 && record.horas_extras_100 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 100%:</span>
                                <span className="font-medium text-orange-600">
                                  +{record.horas_extras_100.toFixed(1)}h
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
                              +{Number(record.horas_extras).toFixed(1)}h
                            </span>
                          </div>
                        ) : null}
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
                                        <div className="text-gray-900 font-medium max-w-full break-words">
                                          {locAddr.trim() || (locHasCoords ? `${locLat}, ${locLng}` : 'Sem endereço')}
                                        </div>
                                        <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                          {locHasCoords && (
                                            <span className="font-mono text-xs">
                                              ({locLat}, {locLng})
                                            </span>
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
                            if (location.hasAddress || location.hasCoords) {
                              return (
                                <div>
                                  <div className="text-gray-900 font-medium max-w-full break-words" title={location.endereco || ''}>
                                    {location.endereco?.trim() || (location.hasCoords ? `${location.latitude}, ${location.longitude}` : 'Endereço não informado')}
                                  </div>
                                  <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                    {location.hasCoords && (
                                      <span className="font-mono text-xs">
                                        ({location.latitude}, {location.longitude})
                                      </span>
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
                            return (
                              <img
                                key={photo.id || photo.event_id || idx}
                                src={photoUrl}
                                alt={`Foto ${idx + 1} de ${record.employee_nome}`}
                                className="h-20 w-auto rounded border object-cover cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                                onClick={() => {
                                  const fullUrl = photo.signed_full_url || photo.photo_url || photoUrl;
                                  setSelectedPhotoUrl(fullUrl);
                                  setPhotoModalOpen(true);
                                }}
                                onError={(e) => {
                                  console.error('[TimeRecordsPageNew] Erro ao carregar foto na galeria:', {
                                    photoUrl,
                                    photo
                                  });
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                            {new Date(ev.event_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
            <div className="relative w-full h-full flex items-center justify-center bg-black/90 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoUrl}
                alt="Foto do registro de ponto"
                className="max-w-full max-h-[90vh] object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('[TimeRecordsPageNew] Erro ao carregar foto no modal', { selectedPhotoUrl });
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </RequireEntity>
  );
}
