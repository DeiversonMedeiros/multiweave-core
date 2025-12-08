import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO GENÉRICO PARA ACESSO A QUALQUER ENTIDADE
// =====================================================

export interface EntityFilters {
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface EntityListParams {
  schema: string;
  table: string;
  companyId: string;
  filters?: EntityFilters;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  skipCompanyFilter?: boolean;
}

export interface EntityListResult<T = any> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface EntityRPCParams {
  schema: string;
  functionName: string;
  params?: Record<string, any>;
}

export const EntityService = {
  /**
   * Lista dados de qualquer entidade usando a função genérica
   */
  list: async <T = any>(params: EntityListParams): Promise<EntityListResult<T>> => {
    console.log('🔍 [DEBUG] EntityService.list - chamado com params:', params);
    
    const {
      schema,
      table,
      companyId,
      filters = {},
      page = 1,
      pageSize = 100,
      orderBy = 'id',
      orderDirection = 'DESC',
      skipCompanyFilter = false
    } = params;

    const offset = (page - 1) * pageSize;

    console.log('🔍 [DEBUG] EntityService.list - filters originais:', filters);
    console.log('🔍 [DEBUG] EntityService.list - page:', page, 'pageSize:', pageSize, 'offset:', offset);

    // Limpar filtros que têm valor "all" e remover parâmetros de paginação dos filtros
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      // Pular parâmetros de paginação que não devem ir para os filtros SQL
      if (key === 'limit' || key === 'offset' || key === 'page' || key === 'pageSize') {
        console.log('🔍 [DEBUG] EntityService.list - Removendo parâmetro de paginação:', key, '=', value);
        return acc;
      }
      
      if (value && value !== 'all') {
        acc[key] = value;
        console.log('🔍 [DEBUG] EntityService.list - Mantendo filtro:', key, '=', value);
      } else {
        console.log('🔍 [DEBUG] EntityService.list - Ignorando filtro (vazio ou all):', key, '=', value);
      }
      return acc;
    }, {} as Record<string, any>);

    console.log('🔍 [DEBUG] EntityService.list - cleanFilters:', cleanFilters);

    const rpcParams = {
      schema_name: schema,
      table_name: table,
      company_id_param: skipCompanyFilter ? null : companyId,
      filters: cleanFilters,
      limit_param: pageSize,
      offset_param: offset,
      order_by: orderBy,
      order_direction: orderDirection
    };

    console.log('🔍 [DEBUG] EntityService.list - rpcParams:', rpcParams);
    console.log('🔍 [DEBUG] EntityService.list - rpcParams JSON:', JSON.stringify(rpcParams, null, 2));

    console.log('📡 [EntityService.list] Chamando RPC get_entity_data com:', {
      schema: rpcParams.schema_name,
      table: rpcParams.table_name,
      companyId: rpcParams.company_id_param,
      filtersCount: Object.keys(rpcParams.filters).length
    });

    const { data, error } = await (supabase as any).rpc('get_entity_data', rpcParams);

    console.log('📥 [EntityService.list] Resposta RPC recebida:', {
      hasData: !!data,
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataLength: data?.length,
      firstItem: data?.[0] ? { id: data[0].id, hasCompanyId: !!data[0].company_id } : null,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorHint: error?.hint
    });

    if (error) {
      console.error('❌ [EntityService.list] Erro da RPC:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Retornar erro estruturado
      console.error(`Erro ao buscar dados de ${schema}.${table}:`, error);
      // Retornar dados vazios em caso de erro para não quebrar a interface
      return {
        data: [],
        totalCount: 0,
        hasMore: false
      };
    }

    const result = data || [];
    
    console.log('📋 [EntityService.list] Processando resposta RPC:', {
      resultLength: result.length,
      firstItemKeys: result[0] ? Object.keys(result[0]) : null,
      firstItemSample: result[0] ? {
        hasId: !!result[0].id,
        hasData: !!result[0].data,
        hasTotalCount: !!result[0].total_count,
        dataType: typeof result[0].data,
        dataIsJsonb: result[0].data && typeof result[0].data === 'object'
      } : null
    });
    
    // A RPC retorna: { id: text, data: jsonb, total_count: bigint }
    // Precisamos extrair o campo 'data' de cada item
    const totalCount = result.length > 0 ? (Number(result[0]?.total_count) || result.length) : 0;
    const hasMore = offset + pageSize < totalCount;

    console.log('📊 [EntityService.list] Estatísticas:', {
      resultLength: result.length,
      totalCount,
      hasMore,
      offset,
      pageSize,
      firstTotalCount: result[0]?.total_count
    });

    // Mapear dados - a RPC retorna formato {id, data, total_count}
    let mappedData: T[] = [];
    
    if (result.length > 0) {
      console.log('🔍 [EntityService.list] Primeiro item da resposta RPC:', {
        hasId: !!result[0]?.id,
        hasData: !!result[0]?.data,
        dataType: typeof result[0]?.data,
        dataIsObject: result[0]?.data && typeof result[0].data === 'object',
        dataKeys: result[0]?.data && typeof result[0].data === 'object' ? Object.keys(result[0].data).slice(0, 10) : null,
        sampleData: result[0]?.data ? JSON.stringify(result[0].data).substring(0, 200) : null
      });
      
      if (result[0]?.data) {
        // Formato: [{ id: '...', data: {...jsonb...}, total_count: 123 }, ...]
        // O campo 'data' é um JSONB que precisa ser parseado
        mappedData = result.map((item: any) => {
          // Se data já é um objeto, usar direto; se for string, fazer parse
          if (typeof item.data === 'string') {
            try {
              const parsed = JSON.parse(item.data) as T;
              console.log('✅ [EntityService.list] Dados parseados de string JSON:', parsed);
              return parsed;
            } catch (e) {
              console.warn('⚠️ [EntityService.list] Erro ao parsear JSON string:', e);
              return item.data as T;
            }
          }
          // JSONB já vem como objeto do Supabase
          const dataObj = item.data as T;
          console.log('✅ [EntityService.list] Dados já como objeto (JSONB):', {
            hasId: !!(dataObj as any)?.id,
            hasCompanyId: !!(dataObj as any)?.company_id,
            keys: Object.keys(dataObj as any || {}).slice(0, 10)
          });
          return dataObj;
        }).filter(Boolean);
        
        console.log('✅ [EntityService.list] Dados extraídos do campo data (JSONB)');
        console.log('📦 [EntityService.list] Primeiro item extraído:', mappedData[0] ? {
          id: mappedData[0]?.['id'],
          hasCompanyId: !!mappedData[0]?.['company_id'],
          keys: Object.keys(mappedData[0] || {}).slice(0, 15),
          codigo: mappedData[0]?.['codigo'],
          nome: mappedData[0]?.['nome']
        } : null);
      } else if (result[0]?.id && !result[0]?.data) {
        // Formato direto: [{ id: '...', campo1: ..., campo2: ... }, ...]
        mappedData = result as T[];
        console.log('✅ [EntityService.list] Dados já no formato direto (sem campo data)');
      } else {
        console.warn('⚠️ [EntityService.list] Formato desconhecido - usando resultado direto:', {
          resultLength: result.length,
          firstItemKeys: result[0] ? Object.keys(result[0]) : null,
          firstItem: result[0]
        });
        mappedData = result as T[];
      }
    }

    console.log('📦 [EntityService.list] Dados finais mapeados:', {
      mappedDataLength: mappedData.length,
      totalCount,
      hasMore,
      sampleItem: mappedData[0] ? {
        id: mappedData[0]?.['id'],
        company_id: mappedData[0]?.['company_id'],
        codigo: mappedData[0]?.['codigo'] || mappedData[0]?.['nome'] || 'N/A',
        allKeys: Object.keys(mappedData[0] || {})
      } : null
    });

    const finalResult = {
      data: mappedData,
      totalCount,
      hasMore,
      error: null
    };

    console.log('🎯 [EntityService.list] RETORNO FINAL:', {
      dataLength: finalResult.data.length,
      totalCount: finalResult.totalCount,
      hasMore: finalResult.hasMore,
      firstItemExists: !!finalResult.data[0],
      firstItemId: finalResult.data[0]?.['id'],
      firstItemCodigo: finalResult.data[0]?.['codigo'] || finalResult.data[0]?.['nome'] || 'N/A'
    });
    
    return finalResult;
  },

  /**
   * Busca um item específico por ID
   * Aceita tanto parâmetros posicionais quanto objeto
   */
  getById: async <T = any>(
    schemaOrParams: string | { schema: string; table: string; id: string; companyId: string },
    table?: string,
    id?: string,
    companyId?: string
  ): Promise<T | null> => {
    let schema: string;
    let tableName: string;
    let itemId: string;
    let companyIdParam: string;

    // Verificar se é objeto ou parâmetros posicionais
    if (typeof schemaOrParams === 'object') {
      schema = schemaOrParams.schema;
      tableName = schemaOrParams.table;
      itemId = schemaOrParams.id;
      companyIdParam = schemaOrParams.companyId;
    } else {
      schema = schemaOrParams;
      tableName = table!;
      itemId = id!;
      companyIdParam = companyId!;
    }

    const result = await EntityService.list<T>({
      schema,
      table: tableName,
      companyId: companyIdParam,
      filters: { id: itemId }
    });

    return result.data.length > 0 ? result.data[0] : null;
  },

  /**
   * Cria um novo item
   */
  create: async <T = any>(params: {
    schema: string;
    table: string;
    companyId: string;
    data: Partial<T>;
  }): Promise<T> => {
    const { schema, table, companyId, data } = params;
    
    // Validar companyId para schemas não-públicos
    if (schema !== 'public' && !companyId) {
      throw new Error(`companyId é obrigatório para criar itens no schema '${schema}'. Tabela: ${table}`);
    }
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      // Função específica para funcionários
      if (schema === 'rh' && table === 'employees') {
        const employeeData = data as any;
        
        // Converter strings de data para formato DATE (YYYY-MM-DD)
        const formatDate = (dateStr: string | null | undefined): string | null => {
          if (!dateStr) return null;
          if (typeof dateStr === 'string') {
            // Se já está no formato YYYY-MM-DD, retornar como está
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
            // Tentar converter de formato brasileiro DD/MM/YYYY
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            // Tentar converter de Date object
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          return dateStr;
        };
        
        const { data: result, error } = await (supabase as any).rpc('create_employee', {
          company_id_param: companyId,
          nome_param: employeeData.nome,
          cpf_param: employeeData.cpf,
          data_admissao_param: formatDate(employeeData.data_admissao),
          status_param: employeeData.status || 'ativo',
          user_id_param: employeeData.user_id || null,
          matricula_param: employeeData.matricula || null,
          // Dados pessoais básicos
          rg_param: employeeData.rg || null,
          rg_orgao_emissor_param: employeeData.rg_orgao_emissor || null,
          rg_uf_emissao_param: employeeData.rg_uf_emissao || null,
          rg_data_emissao_param: formatDate(employeeData.rg_data_emissao),
          data_nascimento_param: formatDate(employeeData.data_nascimento),
          telefone_param: employeeData.telefone || null,
          email_param: employeeData.email || null,
          sexo_param: employeeData.sexo || null,
          orientacao_sexual_param: employeeData.orientacao_sexual || null,
          // Endereço
          endereco_param: employeeData.endereco || null,
          cidade_param: employeeData.cidade || null,
          estado_param: employeeData.estado || null,
          cep_param: employeeData.cep || null,
          // Dados pessoais adicionais
          estado_civil_param: employeeData.estado_civil || null,
          nacionalidade_param: employeeData.nacionalidade || null,
          naturalidade_param: employeeData.naturalidade || null,
          nome_mae_param: employeeData.nome_mae || null,
          nome_pai_param: employeeData.nome_pai || null,
          // Dados profissionais
          cargo_id_param: employeeData.cargo_id || null,
          departamento_id_param: employeeData.departamento_id || null,
          work_shift_id_param: employeeData.work_shift_id || null,
          cost_center_id_param: employeeData.cost_center_id || null,
          gestor_imediato_id_param: employeeData.gestor_imediato_id || null,
          salario_base_param: employeeData.salario_base || null,
          requer_registro_ponto_param: employeeData.requer_registro_ponto !== undefined ? employeeData.requer_registro_ponto : true,
          tipo_contrato_trabalho_param: employeeData.tipo_contrato_trabalho || null,
          vinculo_periculosidade_param: employeeData.vinculo_periculosidade || false,
          vinculo_insalubridade_param: employeeData.vinculo_insalubridade || false,
          grau_insalubridade_param: employeeData.grau_insalubridade || null,
          // Documentos pessoais - Título de Eleitor
          titulo_eleitor_param: employeeData.titulo_eleitor || null,
          titulo_eleitor_zona_param: employeeData.titulo_eleitor_zona || null,
          titulo_eleitor_secao_param: employeeData.titulo_eleitor_secao || null,
          // Documentos pessoais - CTPS
          ctps_param: employeeData.ctps || null,
          ctps_serie_param: employeeData.ctps_serie || null,
          ctps_uf_param: employeeData.ctps_uf || null,
          ctps_data_emissao_param: formatDate(employeeData.ctps_data_emissao),
          // Documentos pessoais - CNH
          cnh_numero_param: employeeData.cnh_numero || null,
          cnh_validade_param: formatDate(employeeData.cnh_validade),
          cnh_categoria_param: employeeData.cnh_categoria || null,
          // Documentos pessoais - Outros
            certidao_nascimento_param: employeeData.certidao_nascimento || null,
            certidao_casamento_numero_param: employeeData.certidao_casamento_numero || null,
          certidao_casamento_data_param: formatDate(employeeData.certidao_casamento_data),
          certidao_uniao_estavel_numero_param: employeeData.certidao_uniao_estavel_numero || null,
          certidao_uniao_estavel_data_param: formatDate(employeeData.certidao_uniao_estavel_data),
          pis_pasep_param: employeeData.pis_pasep || null,
          certificado_reservista_param: employeeData.certificado_reservista || null,
          comprovante_endereco_param: employeeData.comprovante_endereco || null,
          foto_funcionario_param: employeeData.foto_funcionario || null,
          escolaridade_param: employeeData.escolaridade || null,
          cartao_sus_param: employeeData.cartao_sus || null,
          registros_profissionais_param: employeeData.registros_profissionais || null,
          outros_vinculos_empregaticios_param: employeeData.outros_vinculos_empregaticios || false,
          detalhes_outros_vinculos_param: employeeData.detalhes_outros_vinculos || null,
          // Deficiência
          possui_deficiencia_param: employeeData.possui_deficiencia || false,
          deficiencia_tipo_id_param: employeeData.deficiencia_tipo_id || null,
          deficiencia_grau_param: employeeData.deficiencia_grau || null,
          deficiencia_laudo_url_param: employeeData.deficiencia_laudo_url || null,
          // RNE
          rne_numero_param: employeeData.rne_numero || null,
          rne_orgao_param: employeeData.rne_orgao || null,
          rne_data_expedicao_param: formatDate(employeeData.rne_data_expedicao),
          // Dados bancários
          banco_nome_param: employeeData.banco_nome || null,
          banco_agencia_param: employeeData.banco_agencia || null,
          banco_conta_param: employeeData.banco_conta || null,
          banco_tipo_conta_param: employeeData.banco_tipo_conta || null,
          banco_pix_param: employeeData.banco_pix || null
        });

        if (error) {
          console.error(`Erro ao criar funcionário:`, error);
          throw error;
        }

        return result as T;
      }

      // Para outras tabelas, usar função genérica
      // NÃO incluir company_id no data_param para evitar duplicação
      const dataWithoutCompany = { ...data };
      delete (dataWithoutCompany as any).company_id;

      // Log detalhado para debug
      console.log('🔍 [DEBUG] create_entity_data:', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        data_keys: Object.keys(dataWithoutCompany)
      });
      
      console.log('🔍 [DEBUG] Dados completos sendo enviados:', {
        dataWithoutCompany: dataWithoutCompany,
        dataTypes: Object.entries(dataWithoutCompany).map(([key, value]) => ({
          key,
          value,
          type: typeof value
        }))
      });

      // Log específico para campos que podem causar problemas
      Object.entries(dataWithoutCompany).forEach(([key, value]) => {
        if (value === null) {
          console.log(`🔍 [DEBUG] Campo ${key}: NULL`);
        } else if (value === undefined) {
          console.log(`🔍 [DEBUG] Campo ${key}: UNDEFINED`);
        } else if (typeof value === 'string' && value.trim() === '') {
          console.log(`🔍 [DEBUG] Campo ${key}: STRING VAZIA`);
        } else {
          console.log(`🔍 [DEBUG] Campo ${key}: ${value} (${typeof value})`);
        }
      });

      // Log específico para status
      if ('status' in dataWithoutCompany) {
        console.log('🔍 [DEBUG] Campo status:', {
          value: dataWithoutCompany.status,
          type: typeof dataWithoutCompany.status,
          isString: typeof dataWithoutCompany.status === 'string',
          isValid: ['ativo', 'inativo'].includes(dataWithoutCompany.status as string)
        });
      } else {
        console.log('🔍 [DEBUG] Campo status: NÃO ENCONTRADO');
      }

      // Log específico para solicitado_por
      if ('solicitado_por' in dataWithoutCompany) {
        console.log('🔍 [DEBUG] Campo solicitado_por:', {
          value: dataWithoutCompany.solicitado_por,
          type: typeof dataWithoutCompany.solicitado_por,
          isString: typeof dataWithoutCompany.solicitado_por === 'string',
          length: typeof dataWithoutCompany.solicitado_por === 'string' ? dataWithoutCompany.solicitado_por.length : 'N/A',
          isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(dataWithoutCompany.solicitado_por))
        });
      } else {
        console.log('🔍 [DEBUG] Campo solicitado_por: NÃO ENCONTRADO');
      }

      const { data: result, error } = await (supabase as any).rpc('create_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        data_param: dataWithoutCompany
      });

      if (error) {
        console.error(`❌ ERRO ao criar item em ${schema}.${table}:`, error);
        throw error;
      }

      console.log('✅ SUCESSO ao criar item:', result);

      return result as T;
    }

    // Para schema 'public', usar acesso direto
    const { data: result, error } = await (supabase as any)
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao criar item em ${schema}.${table}:`, error);
      throw error;
    }

    return result as T;
  },

  /**
   * Atualiza um item existente
   */
  update: async <T = any>(params: {
    schema: string;
    table: string;
    companyId: string;
    id: string;
    data: Partial<T>;
  }): Promise<T> => {
    const { schema, table, companyId, id, data } = params;
    
    // Validar que data é um objeto válido
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('❌ [DEBUG] EntityService.update - data inválido:', {
        data,
        dataType: typeof data,
        isArray: Array.isArray(data),
        schema,
        table,
        id
      });
      throw new Error('Dados de atualização inválidos: deve ser um objeto');
    }
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      // Remover campos que não devem ser atualizados (para evitar duplicação/erros)
      const dataClean: Record<string, any> = {};
      
      // Copiar apenas campos válidos (não undefined, não campos protegidos)
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        
        // Pular campos protegidos
        if (key === 'company_id' || key === 'id' || key === 'created_at' || key === 'updated_at') {
          return;
        }
        
        // Pular campos undefined (eles não serão enviados de qualquer forma)
        if (value === undefined) {
          return;
        }
        
        // Converter strings vazias para null
        if (value === '') {
          dataClean[key] = null;
        } else {
          dataClean[key] = value;
        }
      });
      
      // Verificar se há campos para atualizar
      if (Object.keys(dataClean).length === 0) {
        console.error('❌ [DEBUG] EntityService.update - Nenhum campo válido para atualizar:', {
          original_data: data,
          dataClean,
          schema,
          table,
          id
        });
        throw new Error('Nenhum campo válido para atualizar após filtragem');
      }
      
      console.log('🔍 [DEBUG] EntityService.update - chamando RPC update_entity_data:', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        id_param: id,
        data_keys: Object.keys(dataClean),
        data_count: Object.keys(dataClean).length,
        data_sample: Object.entries(dataClean).slice(0, 5).map(([k, v]) => ({ key: k, value: v, type: typeof v }))
      });

      const { data: result, error } = await (supabase as any).rpc('update_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        id_param: id,
        data_param: dataClean // Supabase converterá automaticamente para JSONB
      });

      if (error) {
        console.error(`❌ Erro ao atualizar item em ${schema}.${table}:`, error);
        throw error;
      }

      console.log('✅ SUCESSO ao atualizar item:', result);
      return result as T;
    }

    // Para schema 'public', usar acesso direto
    const { data: result, error } = await (supabase as any)
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar item em ${schema}.${table}:`, error);
      throw error;
    }

    return result as T;
  },

  /**
   * Remove um item
   */
  delete: async (params: {
    schema: string;
    table: string;
    companyId: string;
    id: string;
  }): Promise<void> => {
    const { schema, table, companyId, id } = params;
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      const { error } = await (supabase as any).rpc('delete_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        id_param: id
      });

      if (error) {
        console.error(`Erro ao remover item de ${schema}.${table}:`, error);
        throw error;
      }
      return;
    }

    // Para schema 'public', usar acesso direto
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao remover item de ${schema}.${table}:`, error);
      throw error;
    }
  },

  /**
   * Busca com filtros avançados
   */
  search: async <T = any>(
    schema: string,
    table: string,
    companyId: string,
    searchTerm: string,
    additionalFilters: EntityFilters = {}
  ): Promise<T[]> => {
    const result = await EntityService.list<T>({
      schema,
      table,
      companyId,
      filters: {
        ...additionalFilters,
        search: searchTerm
      }
    });

    return result.data;
  },

  /**
   * Cria ou atualiza um item (upsert)
   */
  upsert: async <T = any>(params: {
    schema: string;
    table: string;
    companyId: string;
    data: Partial<T>;
    id?: string;
  }): Promise<T> => {
    const { schema, table, companyId, data, id } = params;

    // Se tiver ID, atualizar; caso contrário, criar
    if (id) {
      return await EntityService.update<T>({
        schema,
        table,
        companyId,
        id,
        data
      });
    }

    return await EntityService.create<T>({
      schema,
      table,
      companyId,
      data
    });
  }
};
