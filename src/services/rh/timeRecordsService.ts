import { supabase } from '@/integrations/supabase/client';
import { 
  TimeRecord, 
  TimeRecordInsert, 
  TimeRecordUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE REGISTROS DE PONTO
// =====================================================

export const TimeRecordsService = {
  // Util: data local no formato YYYY-MM-DD
  _getLocalDateString(date: Date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  /**
   * Lista eventos (batidas) de um registro de ponto específico
   */
  listEvents: async (params: {
    timeRecordId: string;
  }) => {
    console.group('[TimeRecordsService.listEvents]');
    console.log('[TimeRecordsService.listEvents] params:', params);
    const { data, error } = await supabase.rpc('get_entity_data', {
      schema_name: 'rh',
      table_name: 'time_record_events',
      company_id_param: null, // filtro por timeRecordId dispensa companyId aqui
      filters: { time_record_id: params.timeRecordId },
      order_by: 'event_at',
      order_direction: 'ASC',
      limit_param: 500,
      offset_param: 0,
    }) as { data: Array<{ data: any }> | null; error: any };

    if (error) {
      console.error('[TimeRecordsService.listEvents] error:', error);
      console.groupEnd();
      throw error;
    }

    const rows = (data || []).map((r) => r.data);
    console.log('[TimeRecordsService.listEvents] rows:', rows.length);
    console.groupEnd();
    return rows;
  },
  /**
   * Lista registros de ponto com paginação no servidor (otimizado para reduzir egress)
   */
  listPaginated: async (params: {
    companyId: string;
    pageOffset?: number;
    pageLimit?: number;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    managerUserId?: string;
  }): Promise<{ data: TimeRecord[]; totalCount: number }> => {
    const { data, error } = await supabase.rpc('get_time_records_paginated', {
      company_id_param: params.companyId,
      page_offset: params.pageOffset || 0,
      page_limit: params.pageLimit || 50,
      employee_id_filter: params.employeeId || null,
      start_date_filter: params.startDate || null,
      end_date_filter: params.endDate || null,
      status_filter: params.status || null,
      manager_user_id_filter: params.managerUserId || null,
    });

    if (error) {
      console.error('[TimeRecordsService.listPaginated] error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return { data: [], totalCount: 0 };
    }

    // O último registro contém o total_count (todos os registros têm o mesmo valor)
    const totalCount = data[0]?.total_count || 0;

    // Processar dados
    const processedData = data.map((r: any) => {
      // Processar all_photos e all_locations se vierem como string JSON
      let allPhotos = r.all_photos;
      if (typeof allPhotos === 'string') {
        try {
          allPhotos = JSON.parse(allPhotos);
        } catch (e) {
          allPhotos = null;
        }
      }
      
      let allLocations = r.all_locations;
      if (typeof allLocations === 'string') {
        try {
          allLocations = JSON.parse(allLocations);
        } catch (e) {
          allLocations = null;
        }
      }
      
      return {
        ...r,
        horas_trabalhadas: r.horas_trabalhadas != null ? Number(r.horas_trabalhadas) : r.horas_trabalhadas,
        horas_extras: r.horas_extras != null ? Number(r.horas_extras) : r.horas_extras,
        horas_extras_50: r.horas_extras_50 != null ? Number(r.horas_extras_50) : r.horas_extras_50,
        horas_extras_100: r.horas_extras_100 != null ? Number(r.horas_extras_100) : r.horas_extras_100,
        horas_para_banco: r.horas_para_banco != null ? Number(r.horas_para_banco) : r.horas_para_banco,
        horas_para_pagamento: r.horas_para_pagamento != null ? Number(r.horas_para_pagamento) : r.horas_para_pagamento,
        horas_negativas: r.horas_negativas != null ? Number(r.horas_negativas) : r.horas_negativas,
        horas_faltas: r.horas_faltas != null ? Number(r.horas_faltas) : r.horas_faltas,
        is_feriado: r.is_feriado || false,
        is_domingo: r.is_domingo || false,
        is_dia_folga: r.is_dia_folga || false,
        all_photos: allPhotos,
        all_locations: allLocations,
      };
    });

    // Gerar signed URLs para todas as fotos em all_photos
    try {
      for (const rec of processedData) {
        if (rec.all_photos && Array.isArray(rec.all_photos) && rec.all_photos.length > 0) {
          for (let i = 0; i < rec.all_photos.length; i++) {
            const photo = rec.all_photos[i];
            if (!photo || !photo.photo_url) {
              continue;
            }
            
            // Extrair path relativo do photo_url
            const rawUrl: string = photo.photo_url;
            let cleanPath = '';
            
            // Se já é um path relativo (formato: uuid/filename ou /uuid/filename)
            if (!/^https?:\/\//i.test(rawUrl)) {
              // É um path relativo, usar diretamente
              cleanPath = rawUrl.replace(/^\//, '').split('?')[0].trim();
            } else {
              // É uma URL completa, tentar extrair o path
              const objectPublicMatch = rawUrl.match(/\/storage\/v1\/object\/public\/time-record-photos\/(.+?)(?:\?|$)/);
              if (objectPublicMatch) {
                cleanPath = objectPublicMatch[1];
              } else {
                const objectSignMatch = rawUrl.match(/\/storage\/v1\/object\/sign\/time-record-photos\/(.+?)(?:\?|$)/);
                if (objectSignMatch) {
                  cleanPath = objectSignMatch[1];
                } else {
                  // Tentar extrair de URL completa do Supabase
                  const supabaseMatch = rawUrl.match(/time-record-photos[\/](.+?)(?:\?|$)/);
                  if (supabaseMatch) {
                    cleanPath = supabaseMatch[1];
                  } else {
                    // Última tentativa: extrair UUID e nome do arquivo do final da URL
                    try {
                      const urlObj = new URL(rawUrl);
                      const pathParts = urlObj.pathname.split('/');
                      const bucketIndex = pathParts.findIndex(p => p === 'time-record-photos');
                      if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
                        cleanPath = pathParts.slice(bucketIndex + 1).join('/');
                      } else {
                        // Tentar extrair UUID e filename do final
                        const fileMatch = rawUrl.match(/([a-f0-9-]{36})\/([^\/\?]+)$/i);
                        if (fileMatch) {
                          cleanPath = `${fileMatch[1]}/${fileMatch[2]}`;
                        } else {
                          continue;
                        }
                      }
                    } catch {
                      continue;
                    }
                  }
                }
              }
            }
            
            if (!cleanPath) continue;
            
            try {
              // Removido transform do Supabase - usar apenas signed URL sem transformação
              // As imagens já devem estar otimizadas no upload
              const { data: signedFull, error: signFullErr } = await supabase
                .storage
                .from('time-record-photos')
                .createSignedUrl(cleanPath, 3600);
              
              if (!signFullErr && signedFull) {
                rec.all_photos[i] = {
                  ...rec.all_photos[i],
                  signed_full_url: signedFull.signedUrl,
                  // Thumbnail será gerado no frontend quando necessário usando CSS ou canvas
                  signed_thumb_url: signedFull.signedUrl
                };
              }
            } catch (e: any) {
              // Silenciosamente ignorar erros de signed URL
            }
          }
        }
      }
    } catch (e) {
      // Silenciosamente ignorar erros de signed URL
    }

    return {
      data: processedData,
      totalCount: Number(totalCount),
    };
  },
  /**
   * Lista todos os registros de ponto de uma empresa
   * @deprecated Use listPaginated para melhor performance
   */
  list: async (params: { 
    employeeId?: string;
    companyId: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    console.group('[TimeRecordsService.list]');
    console.log('[TimeRecordsService.list] params:', params);
    const { data, error } = await supabase.rpc('get_time_records_simple', {
      company_id_param: params.companyId
    });

    if (error) {
      console.error('Erro ao buscar registros de ponto:', error);
      console.groupEnd();
      throw error;
    }

    // Aplicar filtros no lado do cliente + coerção de tipos numéricos
    let filteredData = (data || []).map((r: any) => {
      // Processar all_photos e all_locations se vierem como string JSON
      let allPhotos = r.all_photos;
      if (typeof allPhotos === 'string') {
        try {
          allPhotos = JSON.parse(allPhotos);
        } catch (e) {
          console.warn('[TimeRecordsService.list] Erro ao parsear all_photos:', e, { all_photos: allPhotos });
          allPhotos = null;
        }
      }
      
      let allLocations = r.all_locations;
      if (typeof allLocations === 'string') {
        try {
          allLocations = JSON.parse(allLocations);
        } catch (e) {
          console.warn('[TimeRecordsService.list] Erro ao parsear all_locations:', e, { all_locations: allLocations });
          allLocations = null;
        }
      }
      
      return {
        ...r,
        // garantir números para evitar quebras de UI (supabase retorna numeric como string)
        horas_trabalhadas: r.horas_trabalhadas != null ? Number(r.horas_trabalhadas) : r.horas_trabalhadas,
        horas_extras: r.horas_extras != null ? Number(r.horas_extras) : r.horas_extras,
        horas_extras_50: r.horas_extras_50 != null ? Number(r.horas_extras_50) : r.horas_extras_50,
        horas_extras_100: r.horas_extras_100 != null ? Number(r.horas_extras_100) : r.horas_extras_100,
        horas_para_banco: r.horas_para_banco != null ? Number(r.horas_para_banco) : r.horas_para_banco,
        horas_para_pagamento: r.horas_para_pagamento != null ? Number(r.horas_para_pagamento) : r.horas_para_pagamento,
        horas_negativas: r.horas_negativas != null ? Number(r.horas_negativas) : r.horas_negativas,
        horas_faltas: r.horas_faltas != null ? Number(r.horas_faltas) : r.horas_faltas,
        is_feriado: r.is_feriado || false,
        is_domingo: r.is_domingo || false,
        is_dia_folga: r.is_dia_folga || false,
        // Processar arrays JSON
        all_photos: allPhotos,
        all_locations: allLocations,
      };
    });
    console.log('[TimeRecordsService.list] rpc:get_time_records_simple -> rows:', filteredData.length);
    
    // LOG DETALHADO: Analisar cada registro retornado pela RPC
    filteredData.forEach((record: any, index: number) => {
      console.group(`[TimeRecordsService.list] 📊 ANÁLISE DETALHADA DO REGISTRO ${index + 1} (ID: ${record.id})`);
      
      // Informações básicas
      console.log('📝 Informações básicas:', {
        id: record.id,
        employee_nome: record.employee_nome,
        data_registro: record.data_registro,
        events_count: record.events_count,
      });
      
      // Análise de all_photos
      const allPhotos = record.all_photos;
      console.log('📸 ANÁLISE DE ALL_PHOTOS:', {
        tipo: typeof allPhotos,
        isArray: Array.isArray(allPhotos),
        length: Array.isArray(allPhotos) ? allPhotos.length : 'N/A',
        isNull: allPhotos === null,
        isUndefined: allPhotos === undefined,
        valor_raw: allPhotos,
        valor_raw_stringified: JSON.stringify(allPhotos, null, 2).substring(0, 500),
        valor_parseado: Array.isArray(allPhotos) ? allPhotos.map((p: any, i: number) => ({
          index: i,
          id: p?.id,
          photo_url: p?.photo_url,
          event_type: p?.event_type,
          event_at: p?.event_at,
          event_id: p?.event_id,
          has_signed_thumb: !!p?.signed_thumb_url,
          has_signed_full: !!p?.signed_full_url,
        })) : 'Não é array',
      });
      
      // DEBUG ESPECIAL: Se all_photos for null/undefined/empty, verificar por que
      if (!allPhotos || (Array.isArray(allPhotos) && allPhotos.length === 0)) {
        console.warn(`⚠️ [TimeRecordsService.list] all_photos está VAZIO para registro ${record.id}`, {
          all_photos_value: allPhotos,
          events_count: record.events_count,
          first_event_photo_url: record.first_event_photo_url,
          tem_eventos: record.events_count > 0,
        });
      }
      
      // Análise de all_locations
      const allLocations = record.all_locations;
      console.log('📍 ANÁLISE DE ALL_LOCATIONS:', {
        tipo: typeof allLocations,
        isArray: Array.isArray(allLocations),
        length: Array.isArray(allLocations) ? allLocations.length : 'N/A',
        isNull: allLocations === null,
        isUndefined: allLocations === undefined,
        valor_raw: allLocations,
        valor_raw_stringified: JSON.stringify(allLocations, null, 2).substring(0, 500),
        valor_parseado: Array.isArray(allLocations) ? allLocations.map((loc: any, i: number) => ({
          index: i,
          id: loc?.id,
          event_type: loc?.event_type,
          event_at: loc?.event_at,
          latitude: loc?.latitude,
          longitude: loc?.longitude,
          endereco: loc?.endereco,
          source: loc?.source,
        })) : 'Não é array',
      });
      
      // DEBUG ESPECIAL: Se all_locations for null/undefined/empty, verificar por que
      if (!allLocations || (Array.isArray(allLocations) && allLocations.length === 0)) {
        console.warn(`⚠️ [TimeRecordsService.list] all_locations está VAZIO para registro ${record.id}`, {
          all_locations_value: allLocations,
          events_count: record.events_count,
          entrada_latitude: record.entrada_latitude,
          entrada_longitude: record.entrada_longitude,
          entrada_endereco: record.entrada_endereco,
          tem_eventos: record.events_count > 0,
        });
      }
      
      // Campos legados
      console.log('📋 Campos legados (para comparação):', {
        first_event_photo_url: record.first_event_photo_url,
        entrada_latitude: record.entrada_latitude,
        entrada_longitude: record.entrada_longitude,
        entrada_endereco: record.entrada_endereco,
        saida_latitude: record.saida_latitude,
        saida_longitude: record.saida_longitude,
      });
      
      // Todos os campos disponíveis
      console.log('🔑 Todos os campos disponíveis:', Object.keys(record));
      
      console.groupEnd();
    });
    
    if (filteredData.length > 0) {
      const s = filteredData[0] as any;
      console.log('[TimeRecordsService.list] rpc sample (primeiro registro resumido):', {
        id: s.id,
        employee_nome: s.employee_nome,
        data_registro: s.data_registro,
        events_count: s.events_count,
        all_photos_count: Array.isArray(s.all_photos) ? s.all_photos.length : 0,
        all_locations_count: Array.isArray(s.all_locations) ? s.all_locations.length : 0,
        all_photos_type: typeof s.all_photos,
        all_locations_type: typeof s.all_locations,
      });
    }

    // Gerar URLs assinadas para thumbnails quando houver foto_url ou first_event_photo_url
    try {
      const baseUrlMatch = (supabase as any)?._storageUrl || '';
      // Processar TODOS os registros que têm fotos (em all_photos, first_event_photo_url ou foto_url)
      const withPhotos = filteredData.filter((r: any) => 
        (r.all_photos && Array.isArray(r.all_photos) && r.all_photos.length > 0) || 
        r.foto_url || 
        r.first_event_photo_url
      );
      console.group('[TimeRecordsService.list] signed thumbs');
      console.log('registros com foto:', withPhotos.length);
      console.log('registros com all_photos:', filteredData.filter((r: any) => r.all_photos && Array.isArray(r.all_photos) && r.all_photos.length > 0).length);
      for (const rec of withPhotos) {
        // Processar foto_url (legado)
        const processPhoto = async (photoField: 'foto_url' | 'first_event_photo_url', thumbField: 'foto_thumb_url' | 'first_event_thumb_url') => {
          const rawUrl: string = (rec as any)[photoField] as string;
          if (!rawUrl) return;
          
          console.log(`[TimeRecordsService.list] processando ${photoField}:`, { id: rec.id, rawUrl });
          
          // Derivar caminho relativo no bucket time-record-photos
          let relativePath = rawUrl;
          // Se for URL completa do Supabase Storage, extrair caminho
          const objectPublicMatch = rawUrl.match(/\/storage\/v1\/object\/public\/time-record-photos\/(.+)/);
          if (objectPublicMatch) {
            relativePath = objectPublicMatch[1];
          } else {
            // Se for URL completa de outro formato, tentar extrair
            const objectMatch = rawUrl.match(/\/storage\/v1\/object\/sign\/time-record-photos\/(.+)/);
            if (objectMatch) {
              relativePath = objectMatch[1];
            } else if (/^https?:\/\//i.test(rawUrl)) {
              // URL completa mas não identificada, tentar extrair caminho após bucket
              const parts = rawUrl.split(/time-record-photos[\/]?/);
              if (parts.length > 1) {
                relativePath = parts[1].replace(/^\//, '');
              }
            }
          }
          
          // Se ainda for URL completa, pode ser que já esteja no formato correto, usar como path relativo
          if (/^https?:\/\//i.test(relativePath)) {
            console.warn(`[TimeRecordsService.list] não conseguiu extrair path de ${photoField}`, { rawUrl, relativePath });
            return;
          }
          
          try {
            const cleanPath = relativePath.replace(/^\//, '').split('?')[0]; // Remove leading slash e query params
            console.log(`[TimeRecordsService.list] gerando signed URL para ${photoField}:`, { id: rec.id, cleanPath });
            
            // Removido transform do Supabase - usar apenas signed URL sem transformação
            // As imagens já devem estar otimizadas no upload
            const { data: signedFull, error: signFullErr } = await supabase
              .storage
              .from('time-record-photos')
              .createSignedUrl(cleanPath, 3600);
            
            if (signFullErr) {
              console.warn(`[TimeRecordsService.list] erro ao gerar signed full url para ${photoField}`, { id: rec.id, cleanPath, signFullErr });
            } else {
              // Usar a mesma URL para thumb e full - thumbnail será gerado no frontend quando necessário
              (rec as any)[thumbField] = signedFull?.signedUrl;
              const fullUrlField = thumbField === 'foto_thumb_url' ? 'foto_full_url' : 'first_event_full_url';
              (rec as any)[fullUrlField] = signedFull?.signedUrl;
            }
            
            if (!signFullErr) {
              console.log(`[TimeRecordsService.list] signed url gerada para ${photoField}`, { id: rec.id, cleanPath, url: (rec as any)[thumbField] });
            }
          } catch (e) {
            console.error(`[TimeRecordsService.list] exceção ao gerar signed url para ${photoField}`, { id: rec.id, relativePath, e });
          }
        };
        
        await processPhoto('foto_url', 'foto_thumb_url');
        await processPhoto('first_event_photo_url', 'first_event_thumb_url');
        
        // Processar TODAS as fotos em all_photos (vindas de time_record_event_photos via RPC)
        if (rec.all_photos && Array.isArray(rec.all_photos) && rec.all_photos.length > 0) {
          console.log(`[TimeRecordsService.list] processando ${rec.all_photos.length} fotos de all_photos para registro ${rec.id}`);
          
          for (let i = 0; i < rec.all_photos.length; i++) {
            const photo = rec.all_photos[i];
            if (!photo || !photo.photo_url) {
              console.warn(`[TimeRecordsService.list] foto ${i} sem photo_url`, { photo });
              continue;
            }
            
            // Extrair path relativo
            const rawUrl: string = photo.photo_url;
            let relativePath = rawUrl;
            
            const objectPublicMatch = rawUrl.match(/\/storage\/v1\/object\/public\/time-record-photos\/(.+)/);
            if (objectPublicMatch) {
              relativePath = objectPublicMatch[1];
            } else {
              const objectMatch = rawUrl.match(/\/storage\/v1\/object\/sign\/time-record-photos\/(.+)/);
              if (objectMatch) {
                relativePath = objectMatch[1];
              } else if (/^https?:\/\//i.test(rawUrl)) {
                const parts = rawUrl.split(/time-record-photos[\/]?/);
                if (parts.length > 1) {
                  relativePath = parts[1].replace(/^\//, '');
                } else {
                  console.warn(`[TimeRecordsService.list] não conseguiu extrair path da foto ${i}`, { rawUrl });
                  continue;
                }
              }
            }
            
            // Se ainda for URL completa, pular
            if (/^https?:\/\//i.test(relativePath)) {
              console.warn(`[TimeRecordsService.list] não conseguiu extrair path da foto ${i} (ainda é URL completa)`, { rawUrl, relativePath });
              continue;
            }
            
            try {
              const cleanPath = relativePath.replace(/^\//, '').split('?')[0];
              console.log(`[TimeRecordsService.list] gerando signed URL para foto ${i} em all_photos:`, { id: rec.id, cleanPath });
              
              // Removido transform do Supabase - usar apenas signed URL sem transformação
              // As imagens já devem estar otimizadas no upload
              const { data: signedFull, error: signFullErr } = await supabase
                .storage
                .from('time-record-photos')
                .createSignedUrl(cleanPath, 3600);
              
              if (!signFullErr && signedFull) {
                rec.all_photos[i] = {
                  ...photo,
                  // Usar a mesma URL para thumb e full - thumbnail será gerado no frontend quando necessário
                  signed_thumb_url: signedFull.signedUrl,
                  signed_full_url: signedFull.signedUrl
                };
              }
              
              if (signFullErr) {
                console.warn(`[TimeRecordsService.list] erro ao gerar signed URL para foto ${i}:`, { 
                  signFullErr: signFullErr?.message,
                  photo 
                });
              } else {
                console.log(`[TimeRecordsService.list] ✅ signed URL gerada para foto ${i} em all_photos`);
              }
            } catch (e: any) {
              console.warn(`[TimeRecordsService.list] exceção ao gerar signed URL para foto ${i} em all_photos:`, { photo, e: e?.message });
            }
          }
        }
      }
      console.groupEnd();
    } catch (e) {
      console.warn('[TimeRecordsService.list] Falha ao gerar signed thumbnails', e);
    }

    console.groupEnd();
    
    if (params.employeeId) {
      filteredData = filteredData.filter(record => record.employee_id === params.employeeId);
    }
    
    if (params.startDate) {
      filteredData = filteredData.filter(record => record.data_registro >= params.startDate);
    }
    
    if (params.endDate) {
      filteredData = filteredData.filter(record => record.data_registro <= params.endDate);
    }
    
    if (params.status) {
      filteredData = filteredData.filter(record => record.status === params.status);
    }

    return filteredData;
  },

  /**
   * Busca um registro de ponto por ID
   */
  getById: async (id: string, companyId: string): Promise<TimeRecord | null> => {
    const { data, error } = await supabase.rpc('get_time_records_simple', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar registro de ponto:', error);
      throw error;
    }

    const record = data?.find((r: TimeRecord) => r.id === id);
    return record || null;
  },

  /**
   * Cria um novo registro de ponto
   */
  create: async (record: TimeRecordInsert): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Atualiza um registro de ponto
   */
  update: async (id: string, record: TimeRecordUpdate): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove um registro de ponto
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('time_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover registro de ponto:', error);
      throw error;
    }
  },

  /**
   * Busca registros de ponto com hora extra pendentes
   */
  getPendingOvertimeRecords: async (companyId: string): Promise<any[]> => {
    const { data, error } = await supabase.rpc('get_pending_overtime_records', {
      p_company_id: companyId
    });

    if (error) {
      console.error('Erro ao buscar registros de hora extra pendentes:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Aprova um registro de ponto
   */
  approve: async (id: string, approvedBy: string): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .update({
        status: 'aprovado',
        aprovado_por: approvedBy,
        aprovado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao aprovar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Aprova um registro de ponto com hora extra usando RPC
   */
  approveOvertime: async (id: string, approvedBy: string, observacoes?: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('approve_time_record', {
      p_time_record_id: id,
      p_approved_by: approvedBy,
      p_observacoes: observacoes || null
    });

    if (error) {
      console.error('Erro ao aprovar registro de hora extra:', error);
      throw error;
    }

    return data as boolean;
  },

  /**
   * Rejeita um registro de ponto com hora extra usando RPC
   */
  rejectOvertime: async (id: string, rejectedBy: string, observacoes: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('reject_time_record', {
      p_time_record_id: id,
      p_rejected_by: rejectedBy,
      p_observacoes: observacoes
    });

    if (error) {
      console.error('Erro ao rejeitar registro de hora extra:', error);
      throw error;
    }

    return data as boolean;
  },

  /**
   * Rejeita um registro de ponto
   */
  reject: async (id: string, reason: string, rejectedBy: string): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .update({
        status: 'rejeitado',
        observacoes: reason,
        aprovado_por: rejectedBy,
        aprovado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao rejeitar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra entrada de um funcionário
   */
  clockIn: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = TimeRecordsService._getLocalDateString(timestamp);
    
    // Verificar se já existe registro para hoje
      const { data: existingRecord } = await supabase
      .from('time_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .single();

    if (existingRecord) {
      // Atualizar entrada
      const { data, error } = await supabase
        .from('time_records')
        .update({ entrada: timestamp.toTimeString().split(' ')[0] })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Criar novo registro
      const { data, error } = await supabase
        .from('time_records')
        .insert({
          employee_id: employeeId,
          data_registro: today,
          entrada: timestamp.toTimeString().split(' ')[0],
          status: 'pendente'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Registra saída de um funcionário
   */
  clockOut: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = TimeRecordsService._getLocalDateString(timestamp);
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ saida: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar saída:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra entrada de almoço
   */
  clockInLunch: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = TimeRecordsService._getLocalDateString(timestamp);
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ entrada_almoco: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar entrada do almoço:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra saída de almoço
   */
  clockOutLunch: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = TimeRecordsService._getLocalDateString(timestamp);
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ saida_almoco: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar saída do almoço:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra primeira entrada de horas extras
   */
  clockInExtra1: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = TimeRecordsService._getLocalDateString(timestamp);
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ entrada_extra1: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar entrada extra 1:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra primeira saída de horas extras
   */
  clockOutExtra1: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = TimeRecordsService._getLocalDateString(timestamp);
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ saida_extra1: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar saída extra 1:', error);
      throw error;
    }

    return data;
  },

};