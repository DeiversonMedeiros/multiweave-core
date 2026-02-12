import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO GENÉRICO PARA ACESSO A QUALQUER ENTIDADE
// =====================================================

/**
 * Chama uma função RPC de qualquer schema
 */
export async function callSchemaFunction<T = any>(
  schemaName: string,
  functionName: string,
  params: Record<string, any> = {},
): Promise<T | null> {
  const shouldLogVerbose =
    schemaName === 'rh' &&
    (functionName === 'calculate_training_progress' ||
      functionName === 'create_rest_day_and_deduct_hours' ||
      functionName === 'remove_rest_day_and_revert_deduction');

  // Log antes da chamada
  if (shouldLogVerbose) {
    console.log('[callSchemaFunction] 🚀 ANTES da chamada RPC:', {
      schemaName,
      functionName,
      params,
      paramsStringified: JSON.stringify(params),
      timestamp: new Date().toISOString()
    });
  }
  
  const { data, error } = await (supabase as any).rpc('call_schema_rpc', {
    p_schema_name: schemaName,
    p_function_name: functionName,
    p_params: params,
  });

  if (error) {
    console.error(`[callSchemaFunction] ❌ Erro ao chamar ${schemaName}.${functionName}:`, error);
    throw error;
  }

  // Log detalhado da resposta
  if (shouldLogVerbose) {
    console.log('[callSchemaFunction] 📥 Resposta completa da RPC call_schema_rpc:', {
      schemaName,
      functionName,
      params,
      paramsStringified: JSON.stringify(params),
      data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : null,
      dataResult: data?.result,
      dataResultType: typeof data?.result,
      dataResultString: typeof data?.result === 'string' ? data.result : JSON.stringify(data?.result),
      dataResultFirst200Chars: typeof data?.result === 'string' ? data.result.substring(0, 200) : 'N/A',
      dataError: data?.error,
      error: error,
      errorMessage: error?.message,
      errorCode: error?.code,
      fullResponse: JSON.stringify({ data, error }, null, 2),
      fullDataStringified: JSON.stringify(data, null, 2),
      // Expandir data completo
      dataExpanded: data ? {
        result: data.result,
        resultType: typeof data.result,
        resultLength: typeof data.result === 'string' ? data.result.length : 'N/A',
        error: data.error,
        message: data.message,
        allKeys: Object.keys(data),
        allValues: Object.values(data).map(v => typeof v === 'string' ? v.substring(0, 100) : v)
      } : null
    });
  }

  if (data?.error) {
    // Se a função não existe, não é um erro crítico - apenas logar como warning
    const isFunctionNotFound =
      (data.message?.includes('does not exist') || data.message?.includes('não existe')) &&
      data.sqlstate === '42883'; // SQLSTATE para função não encontrada

    if (shouldLogVerbose) {
      console.error('[callSchemaFunction] 🔍 DEBUG erro na resposta RPC:', {
        schemaName,
        functionName,
        params,
        data,
        isFunctionNotFound,
      });
    }
    
    if (isFunctionNotFound) {
      console.warn(`[callSchemaFunction] ⚠️ Função ${schemaName}.${functionName} não encontrada no banco de dados. Isso pode ser esperado se a funcionalidade ainda não foi implementada.`);
      return null; // Retornar null em vez de lançar erro
    }
    
    console.error(`[callSchemaFunction] ❌ Erro na resposta de ${schemaName}.${functionName}:`, data.error, data.message);
    throw new Error(data.message || `Erro ao chamar ${schemaName}.${functionName}`);
  }

  let result = (data?.result ?? data) as T | null;
  
  // Log detalhado do resultado extraído
  if (schemaName === 'rh' && functionName === 'calculate_training_progress') {
    console.log('[callSchemaFunction] 🔍 Resultado extraído:', {
      schemaName,
      functionName,
      result,
      resultType: typeof result,
      resultStringified: typeof result === 'string' ? result : JSON.stringify(result),
      dataResult: data?.result,
      dataResultType: typeof data?.result,
      usingDataResult: data?.result !== undefined,
      usingData: data?.result === undefined
    });
  }
  
  // Se o resultado é uma string "true" ou "false", converter para boolean
  if (typeof result === 'string' && (result === 'true' || result === 'false')) {
    result = (result === 'true') as T;
  }
  
  return result;
}

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

    // Limpar filtros que têm valor "all" e remover parâmetros de paginação dos filtros
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      // Pular parâmetros de paginação que não devem ir para os filtros SQL
      if (key === 'limit' || key === 'offset' || key === 'page' || key === 'pageSize') {
        return acc;
      }
      
      if (value && value !== 'all') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

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

    console.log('🔍 [EntityService.list] INÍCIO - Preparando chamada RPC:', {
      schema,
      table,
      companyId,
      pageSize,
      offset,
      limit_param: pageSize,
      offset_param: offset,
      filters: cleanFilters,
      rpcParams,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await (supabase as any).rpc('get_entity_data', rpcParams);

    // Log detalhado para cotacao_fornecedores
    if (table === 'cotacao_fornecedores' && schema === 'compras') {
      console.log('🔍 [EntityService.list] Resposta BRUTA da RPC (cotacao_fornecedores):', {
        hasData: !!data,
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataLength: data?.length || 0,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code,
        firstItem: data?.[0] ? JSON.parse(JSON.stringify(data[0])) : null,
        allItems: data ? JSON.parse(JSON.stringify(data)) : null,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('🔍 [EntityService.list] Resposta BRUTA da RPC:', {
        hasData: !!data,
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataLength: data?.length || 0,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code,
        firstItem: data?.[0] ? {
          id: data[0].id,
          hasData: !!data[0].data,
          total_count: data[0].total_count,
          total_countType: typeof data[0].total_count
        } : null,
        timestamp: new Date().toISOString()
      });
    }

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
    
    console.log('🔍 [EntityService.list] Processando resultado:', {
      resultLength: result.length,
      firstItemSample: result[0] ? {
        keys: Object.keys(result[0]),
        hasId: !!result[0].id,
        hasData: !!result[0].data,
        hasTotalCount: !!result[0].total_count,
        total_countValue: result[0].total_count,
        total_countType: typeof result[0].total_count
      } : null,
      timestamp: new Date().toISOString()
    });
    
    // A RPC retorna: { id: text, data: jsonb, total_count: bigint }
    // Precisamos extrair o campo 'data' de cada item
    const totalCount = result.length > 0 ? (Number(result[0]?.total_count) || result.length) : 0;
    const hasMore = offset + pageSize < totalCount;

    console.log('🔍 [EntityService.list] Calculando totalCount e hasMore:', {
      resultLength: result.length,
      firstItemTotalCount: result[0]?.total_count,
      totalCountCalculated: totalCount,
      offset,
      pageSize,
      hasMore,
      timestamp: new Date().toISOString()
    });

    // Mapear dados - a RPC retorna formato {id, data, total_count}
    let mappedData: T[] = [];
    
    if (result.length > 0) {
      if (result[0]?.data) {
        // Formato: [{ id: '...', data: {...jsonb...}, total_count: 123 }, ...]
        // O campo 'data' é um JSONB que precisa ser parseado
        mappedData = result.map((item: any) => {
          // Se data já é um objeto, usar direto; se for string, fazer parse
          if (typeof item.data === 'string') {
            try {
              const parsed = JSON.parse(item.data) as T;
              return parsed;
            } catch (e) {
              console.warn('⚠️ [EntityService.list] Erro ao parsear JSON string:', e);
              return item.data as T;
            }
          }
          // JSONB já vem como objeto do Supabase
          return item.data as T;
        }).filter(Boolean);
      } else if (result[0]?.id && !result[0]?.data) {
        // Formato direto: [{ id: '...', campo1: ..., campo2: ... }, ...]
        mappedData = result as T[];
      } else {
        mappedData = result as T[];
      }
    }

    // Log detalhado para cotacao_fornecedores
    if (table === 'cotacao_fornecedores' && schema === 'compras') {
      console.log('🔍 [EntityService.list] DADOS COMPLETOS cotacao_fornecedores:', JSON.stringify(mappedData, null, 2));
      if (mappedData.length > 0) {
        console.log('🔍 [EntityService.list] Primeiro fornecedor detalhado:', {
          ...(mappedData[0] as any),
          valor_frete_detalhado: {
            valor: (mappedData[0] as any).valor_frete,
            tipo: typeof (mappedData[0] as any).valor_frete,
            isNull: (mappedData[0] as any).valor_frete === null,
            isUndefined: (mappedData[0] as any).valor_frete === undefined
          },
          desconto_percentual_detalhado: {
            valor: (mappedData[0] as any).desconto_percentual,
            tipo: typeof (mappedData[0] as any).desconto_percentual,
            isNull: (mappedData[0] as any).desconto_percentual === null,
            isUndefined: (mappedData[0] as any).desconto_percentual === undefined
          },
          desconto_valor_detalhado: {
            valor: (mappedData[0] as any).desconto_valor,
            tipo: typeof (mappedData[0] as any).desconto_valor,
            isNull: (mappedData[0] as any).desconto_valor === null,
            isUndefined: (mappedData[0] as any).desconto_valor === undefined
          }
        });
      }
    }
    
    console.log('🔍 [EntityService.list] Dados mapeados:', {
      mappedDataLength: mappedData.length,
      sampleFirstItem: mappedData[0] ? {
        keys: Object.keys(mappedData[0] as any),
        hasId: !!(mappedData[0] as any).id,
        hasNome: !!(mappedData[0] as any).nome
      } : null,
      timestamp: new Date().toISOString()
    });

    const finalResult = {
      data: mappedData,
      totalCount,
      hasMore,
      error: null
    };
    
    console.log('✅ [EntityService.list] RESULTADO FINAL:', {
      dataLength: finalResult.data.length,
      totalCount: finalResult.totalCount,
      hasMore: finalResult.hasMore,
      timestamp: new Date().toISOString()
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
    skipCompanyFilter?: boolean;
  }): Promise<T> => {
    const { schema, table, companyId, data, skipCompanyFilter = false } = params;
    
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
      
      // Filtrar campos que não existem na tabela (campos conhecidos que causam problemas)
      // Remover campos que não existem em compras.requisicoes_compra
      if (schema === 'compras' && table === 'requisicoes_compra') {
        // Log para debug se o campo departamento estiver presente
        if ((dataWithoutCompany as any).departamento !== undefined) {
          console.warn('⚠️ Campo "departamento" encontrado no payload de requisição, removendo:', {
            schema,
            table,
            hasDepartamento: (dataWithoutCompany as any).departamento !== undefined,
            allKeys: Object.keys(dataWithoutCompany)
          });
        }
        delete (dataWithoutCompany as any).departamento;
        // service_id pode existir, então não vamos removê-lo sem verificar
      }

      // Converter strings vazias para null em campos opcionais (UUID, TEXT, etc)
      // Isso evita erros ao tentar inserir strings vazias em campos que esperam null
      Object.keys(dataWithoutCompany).forEach(key => {
        const value = (dataWithoutCompany as any)[key];
        // Se for string vazia e o campo terminar com _id (UUID opcional) ou for um campo de texto opcional
        if (typeof value === 'string' && value.trim() === '') {
          if (key.endsWith('_id') || 
              key === 'imagem_url' || 
              key === 'ncm' || 
              key === 'cfop' || 
              key === 'cst' || 
              key === 'classe' ||
              key === 'observacoes' ||
              key === 'condicoes_comerciais' ||
              key === 'condicao_pagamento') {
            (dataWithoutCompany as any)[key] = null;
          }
        }
      });


      // Log detalhado antes de enviar
      console.log('🔍 [EntityService.create] Enviando dados:', {
        schema,
        table,
        companyId,
        skipCompanyFilter,
        dataOriginal: data,
        dataWithoutCompany,
        dataKeys: Object.keys(dataWithoutCompany),
        dataValues: Object.values(dataWithoutCompany)
      });

      const { data: result, error } = await (supabase as any).rpc('create_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: skipCompanyFilter ? null : companyId,
        data_param: dataWithoutCompany
      });

      if (error) {
        console.error(`❌ ERRO ao criar item em ${schema}.${table}:`, error);
        console.error(`❌ Detalhes do erro:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          dataEnviado: dataWithoutCompany,
          dataKeys: Object.keys(dataWithoutCompany)
        });
        throw new Error(error.message || `Erro ao criar item em ${schema}.${table}: ${JSON.stringify(error)}`);
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
    skipCompanyFilter?: boolean;
  }): Promise<T> => {
    const { schema, table, companyId, id, data, skipCompanyFilter = false } = params;
    
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
      // Validar companyId
      if (!companyId || companyId.trim() === '') {
        console.error('❌ [DEBUG] EntityService.update - companyId inválido:', {
          companyId,
          schema,
          table,
          id
        });
        throw new Error('companyId é obrigatório e não pode estar vazio');
      }
      
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
        // IMPORTANTE: Campos UUID (_id) nunca devem ser strings vazias
        if (value === '' || value === null) {
          dataClean[key] = null;
        } else if (typeof value === 'string' && key.endsWith('_id') && value.trim() === '') {
          // Proteção extra: se for um campo _id (UUID) e estiver vazio, garantir null
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
      
      // Log detalhado de todos os campos, especialmente UUIDs
      const detailedData = Object.entries(dataClean).map(([k, v]) => {
        const isUuidField = k.endsWith('_id') || k === 'uuid';
        return {
          key: k,
          value: v,
          type: typeof v,
          isNull: v === null,
          isUndefined: v === undefined,
          isString: typeof v === 'string',
          stringLength: typeof v === 'string' ? v.length : null,
          isEmptyString: typeof v === 'string' && v === '',
          isUuidField: isUuidField,
          valuePreview: typeof v === 'string' ? (v.length > 50 ? v.substring(0, 50) + '...' : v) : v
        };
      });

      console.log('🔍 [DEBUG] EntityService.update - chamando RPC update_entity_data:', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        id_param: id,
        data_keys: Object.keys(dataClean),
        data_count: Object.keys(dataClean).length,
        data_detailed: detailedData,
        full_data: dataClean
      });

      const { data: result, error } = await (supabase as any).rpc('update_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: skipCompanyFilter ? null : companyId,
        id_param: id,
        data_param: dataClean // Supabase converterá automaticamente para JSONB
      });

      if (error) {
        console.error(`❌ Erro ao atualizar item em ${schema}.${table}:`, {
          error,
          error_message: error.message,
          error_details: error.details,
          error_hint: error.hint,
          error_code: error.code,
          data_sent: dataClean,
          schema,
          table,
          id,
          companyId
        });
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
    skipCompanyFilter?: boolean;
  }): Promise<void> => {
    const { schema, table, companyId, id, skipCompanyFilter = false } = params;
    
    // Validar parâmetros obrigatórios
    if (!schema || !table || !id) {
      const errorMsg = `Parâmetros inválidos para delete: schema=${schema}, table=${table}, id=${id}`;
      console.error(`❌ [EntityService.delete] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      const rpcParams: any = {
        schema_name: schema,
        table_name: table,
        id_param: id
      };
      
      // Só adicionar company_id_param se não for para pular o filtro
      // Se skipCompanyFilter for true, não enviar o parâmetro (ou enviar null se a função aceitar)
      if (!skipCompanyFilter && companyId) {
        rpcParams.company_id_param = companyId;
      } else {
        // Para tabelas sem company_id, passar null explicitamente
        rpcParams.company_id_param = null;
      }
      
      console.log('🔍 [EntityService.delete] Chamando RPC delete_entity_data:', {
        schema,
        table,
        id,
        companyId,
        skipCompanyFilter,
        rpcParams
      });
      
      const { data, error } = await (supabase as any).rpc('delete_entity_data', rpcParams);

      if (error) {
        console.error(`❌ [EntityService.delete] Erro ao remover item de ${schema}.${table}:`, {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code,
          params: rpcParams
        });
        throw error;
      }
      
      console.log('✅ [EntityService.delete] Item removido com sucesso:', { schema, table, id, data });
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
