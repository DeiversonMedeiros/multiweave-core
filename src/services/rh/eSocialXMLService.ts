import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE GERAÇÃO DE XML eSOCIAL
// =====================================================

export interface ESocialXMLConfig {
  companyId: string;
  cnpj: string;
  companyName: string;
  environment: 'production' | 'testing';
  version: string;
}

export interface ESocialEventData {
  event: ESocialEvent;
  employee?: {
    id: string;
    name: string;
    cpf: string;
    pis: string;
    admissionDate: string;
    position: string;
    department: string;
  };
  company?: {
    id: string;
    cnpj: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export class ESocialXMLService {
  private config: ESocialXMLConfig;

  constructor(config: ESocialXMLConfig) {
    this.config = config;
  }

  // =====================================================
  // GERAÇÃO DE XML POR TIPO DE EVENTO
  // =====================================================

  async generateEventXML(eventData: ESocialEventData): Promise<string> {
    const { event } = eventData;
    
    switch (event.tipo_evento) {
      case 'S-1000':
        return this.generateS1000XML(eventData);
      case 'S-1005':
        return this.generateS1005XML(eventData);
      case 'S-1010':
        return this.generateS1010XML(eventData);
      case 'S-1020':
        return this.generateS1020XML(eventData);
      case 'S-1030':
        return this.generateS1030XML(eventData);
      case 'S-1200':
        return this.generateS1200XML(eventData);
      case 'S-1202':
        return this.generateS1202XML(eventData);
      case 'S-1207':
        return this.generateS1207XML(eventData);
      case 'S-1210':
        return this.generateS1210XML(eventData);
      case 'S-1250':
        return this.generateS1250XML(eventData);
      case 'S-1260':
        return this.generateS1260XML(eventData);
      case 'S-1270':
        return this.generateS1270XML(eventData);
      case 'S-1280':
        return this.generateS1280XML(eventData);
      case 'S-1295':
        return this.generateS1295XML(eventData);
      case 'S-1298':
        return this.generateS1298XML(eventData);
      case 'S-1299':
        return this.generateS1299XML(eventData);
      case 'S-1300':
        return this.generateS1300XML(eventData);
      case 'S-2190':
        return this.generateS2190XML(eventData);
      case 'S-2200':
        return this.generateS2200XML(eventData);
      case 'S-2205':
        return this.generateS2205XML(eventData);
      case 'S-2206':
        return this.generateS2206XML(eventData);
      case 'S-2210':
        return this.generateS2210XML(eventData);
      case 'S-2220':
        return this.generateS2220XML(eventData);
      case 'S-2230':
        return this.generateS2230XML(eventData);
      case 'S-2240':
        return this.generateS2240XML(eventData);
      case 'S-2241':
        return this.generateS2241XML(eventData);
      case 'S-2250':
        return this.generateS2250XML(eventData);
      case 'S-2260':
        return this.generateS2260XML(eventData);
      case 'S-2298':
        return this.generateS2298XML(eventData);
      case 'S-2299':
        return this.generateS2299XML(eventData);
      case 'S-2300':
        return this.generateS2300XML(eventData);
      case 'S-2306':
        return this.generateS2306XML(eventData);
      case 'S-2399':
        return this.generateS2399XML(eventData);
      case 'S-2400':
        return this.generateS2400XML(eventData);
      case 'S-3000':
        return this.generateS3000XML(eventData);
      case 'S-3500':
        return this.generateS3500XML(eventData);
      case 'S-5001':
        return this.generateS5001XML(eventData);
      case 'S-5002':
        return this.generateS5002XML(eventData);
      case 'S-5003':
        return this.generateS5003XML(eventData);
      case 'S-5011':
        return this.generateS5011XML(eventData);
      case 'S-5012':
        return this.generateS5012XML(eventData);
      case 'S-5013':
        return this.generateS5013XML(eventData);
      default:
        throw new Error(`Tipo de evento não suportado: ${event.tipo_evento}`);
    }
  }

  // =====================================================
  // GERAÇÃO DE XML S-1000 - INFORMAÇÕES DO EMPREGADOR
  // =====================================================

  private generateS1000XML(eventData: ESocialEventData): string {
    const { company } = eventData;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/v_S_01_00_00">
  <evtInfoEmpregador Id="ID${this.generateEventId()}">
    <ideEvento>
      <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>${this.config.version}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${company?.cnpj || this.config.cnpj}</nrInsc>
    </ideEmpregador>
    <infoEmpregador>
      <inclusao>
        <idePeriodo>
          <iniValid>${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}</iniValid>
        </idePeriodo>
        <dadosEmpregador>
          <nmRazao>${company?.name || this.config.companyName}</nmRazao>
          <classTrib>99</classTrib>
          <natJurid>2062</natJurid>
          <indCoop>0</indCoop>
          <indConstr>0</indConstr>
          <indDesFolha>0</indDesFolha>
          <indOptRegEletron>1</indOptRegEletron>
          <indEntEd>0</indEntEd>
          <indEtt>0</indEtt>
          <nrRegEtt></nrRegEtt>
          <ideEFR>
            <cnpjEFR>${company?.cnpj || this.config.cnpj}</cnpjEFR>
          </ideEFR>
          <dadosIsencao>
            <ideMinLei>01</ideMinLei>
            <nrCertif>12345678901234567890</nrCertif>
            <dtEmisCertif>${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01</dtEmisCertif>
            <dtVencCertif>${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01</dtVencCertif>
            <nrProtRenov>12345678901234567890</nrProtRenov>
            <dtProtRenov>${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01</dtProtRenov>
            <dtDou>${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01</dtDou>
            <pagDou>1</pagDou>
          </dadosIsencao>
          <infoOrgInternacional>
            <indAcordoIsenMulta>0</indAcordoIsenMulta>
          </infoOrgInternacional>
        </dadosEmpregador>
        <infoCadastro>
          <classTrib>99</classTrib>
          <indCoop>0</indCoop>
          <indConstr>0</indConstr>
          <indDesFolha>0</indDesFolha>
          <indOptRegEletron>1</indOptRegEletron>
          <indEntEd>0</indEntEd>
          <indEtt>0</indEtt>
          <nrRegEtt></nrRegEtt>
          <ideEFR>
            <cnpjEFR>${company?.cnpj || this.config.cnpj}</cnpjEFR>
          </ideEFR>
        </infoCadastro>
      </inclusao>
    </infoEmpregador>
  </evtInfoEmpregador>
</eSocial>`;
  }

  // =====================================================
  // GERAÇÃO DE XML S-1200 - REMUNERAÇÃO RGPS
  // =====================================================

  private generateS1200XML(eventData: ESocialEventData): string {
    const { event, employee } = eventData;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtRemun/v_S_01_00_00">
  <evtRemun Id="ID${this.generateEventId()}">
    <ideEvento>
      <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>${this.config.version}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${this.config.cnpj}</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>${employee?.cpf || '00000000000'}</cpfTrab>
      <nisTrab>${employee?.pis || '00000000000'}</nisTrab>
    </ideTrabalhador>
    <dmDev>
      <ideDmDev>1</ideDmDev>
      <codCateg>101</codCateg>
      <infoPerApur>
        <perApur>${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}</perApur>
        <ideEstabLot>
          <tpInsc>1</tpInsc>
          <nrInsc>${this.config.cnpj}</nrInsc>
          <codLotacao>001</codLotacao>
          <remunPerApur>
            <itensRemun>
              <codRubr>1001</codRubr>
              <ideTabRubr>01</ideTabRubr>
              <qtdRubr>1.0000</qtdRubr>
              <fatorRubr>1.0000</fatorRubr>
              <vrUnit>1000.00</vrUnit>
              <vrRubr>1000.00</vrRubr>
            </itensRemun>
          </remunPerApur>
        </ideEstabLot>
      </infoPerApur>
    </dmDev>
  </evtRemun>
</eSocial>`;
  }

  // =====================================================
  // GERAÇÃO DE XML S-2200 - CADASTRAMENTO INICIAL
  // =====================================================

  private generateS2200XML(eventData: ESocialEventData): string {
    const { event, employee } = eventData;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAdmissao/v_S_01_00_00">
  <evtAdmissao Id="ID${this.generateEventId()}">
    <ideEvento>
      <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>${this.config.version}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${this.config.cnpj}</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>${employee?.cpf || '00000000000'}</cpfTrab>
      <nisTrab>${employee?.pis || '00000000000'}</nisTrab>
      <nmTrab>${employee?.name || 'Nome do Funcionário'}</nmTrab>
      <sexo>M</sexo>
      <racaCor>1</racaCor>
      <estCiv>1</estCiv>
      <grauInstr>08</grauInstr>
      <nmSoc></nmSoc>
      <nascimento>
        <dtNascto>1990-01-01</dtNascto>
        <codMunic>1234567</codMunic>
        <uf>SP</uf>
        <paisNascto>105</paisNascto>
        <paisNac>105</paisNac>
        <nmMae>Nome da Mãe</nmMae>
        <nmPai>Nome do Pai</nmPai>
      </nascimento>
      <endereco>
        <brasil>
          <tpLograd>R</tpLograd>
          <dscLograd>Rua Exemplo</dscLograd>
          <nrLograd>123</nrLograd>
          <complemento></complemento>
          <bairro>Centro</bairro>
          <cep>01234567</cep>
          <codMunic>1234567</codMunic>
          <uf>SP</uf>
        </brasil>
      </endereco>
      <trabEstrangeiro>
        <dtChegada>${employee?.admissionDate || now.toISOString().split('T')[0]}</dtChegada>
        <classTrabEstrang>01</classTrabEstrang>
        <casadoBr>N</casadoBr>
        <filhosBr>N</filhosBr>
      </trabEstrangeiro>
    </ideTrabalhador>
    <infoRegPrelim>
      <cpfTrab>${employee?.cpf || '00000000000'}</cpfTrab>
      <dtNascto>1990-01-01</dtNascto>
      <dtAdm>${employee?.admissionDate || now.toISOString().split('T')[0]}</dtAdm>
      <dtAdm>${employee?.admissionDate || now.toISOString().split('T')[0]}</dtAdm>
    </infoRegPrelim>
    <infoRegPrelim>
      <cpfTrab>${employee?.cpf || '00000000000'}</cpfTrab>
      <dtNascto>1990-01-01</dtNascto>
      <dtAdm>${employee?.admissionDate || now.toISOString().split('T')[0]}</dtAdm>
    </infoRegPrelim>
  </evtAdmissao>
</eSocial>`;
  }

  // =====================================================
  // GERAÇÃO DE XML S-2299 - DESLIGAMENTO
  // =====================================================

  private generateS2299XML(eventData: ESocialEventData): string {
    const { event, employee } = eventData;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtDeslig/v_S_01_00_00">
  <evtDeslig Id="ID${this.generateEventId()}">
    <ideEvento>
      <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>${this.config.version}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${this.config.cnpj}</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>${employee?.cpf || '00000000000'}</cpfTrab>
    </ideTrabalhador>
    <infoDeslig>
      <dtDeslig>${now.toISOString().split('T')[0]}</dtDeslig>
      <mtvDeslig>01</mtvDeslig>
      <dtProj>${now.toISOString().split('T')[0]}</dtProj>
      <observacao>Desligamento por iniciativa do empregador</observacao>
    </infoDeslig>
  </evtDeslig>
</eSocial>`;
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private generateEventId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // =====================================================
  // MÉTODOS STUB PARA OUTROS TIPOS DE EVENTO
  // =====================================================

  private generateS1005XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1005');
  }

  private generateS1010XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1010');
  }

  private generateS1020XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1020');
  }

  private generateS1030XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1030');
  }

  private generateS1202XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1202');
  }

  private generateS1207XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1207');
  }

  private generateS1210XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1210');
  }

  private generateS1250XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1250');
  }

  private generateS1260XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1260');
  }

  private generateS1270XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1270');
  }

  private generateS1280XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1280');
  }

  private generateS1295XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1295');
  }

  private generateS1298XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1298');
  }

  private generateS1299XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1299');
  }

  private generateS1300XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-1300');
  }

  private generateS2190XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2190');
  }

  private generateS2205XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2205');
  }

  private generateS2206XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2206');
  }

  private generateS2210XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2210');
  }

  private generateS2220XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2220');
  }

  private generateS2230XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2230');
  }

  private generateS2240XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2240');
  }

  private generateS2241XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2241');
  }

  private generateS2250XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2250');
  }

  private generateS2260XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2260');
  }

  private generateS2298XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2298');
  }

  private generateS2300XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2300');
  }

  private generateS2306XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2306');
  }

  private generateS2399XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2399');
  }

  private generateS2400XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-2400');
  }

  private generateS3000XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-3000');
  }

  private generateS3500XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-3500');
  }

  private generateS5001XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-5001');
  }

  private generateS5002XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-5002');
  }

  private generateS5003XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-5003');
  }

  private generateS5011XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-5011');
  }

  private generateS5012XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-5012');
  }

  private generateS5013XML(eventData: ESocialEventData): string {
    return this.generateBasicXML(eventData, 'S-5013');
  }

  private generateBasicXML(eventData: ESocialEventData, eventType: string): string {
    const { event } = eventData;
    const now = new Date();

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evt${eventType.replace('-', '')}/v_S_01_00_00">
  <evt${eventType.replace('-', '')} Id="ID${this.generateEventId()}">
    <ideEvento>
      <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>${this.config.version}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${this.config.cnpj}</nrInsc>
    </ideEmpregador>
    <info${eventType.replace('-', '')}>
      <inclusao>
        <ide${eventType.replace('-', '')}>
          <cod${eventType.replace('-', '')}>001</cod${eventType.replace('-', '')}>
        </ide${eventType.replace('-', '')}>
        <dados${eventType.replace('-', '')}>
          <desc${eventType.replace('-', '')}>${event.descricao || `Evento ${eventType}`}</desc${eventType.replace('-', '')}>
        </dados${eventType.replace('-', '')}>
      </inclusao>
    </info${eventType.replace('-', '')}>
  </evt${eventType.replace('-', '')}>
</eSocial>`;
  }

  // =====================================================
  // VALIDAÇÃO DE XML
  // =====================================================

  async validateXML(xml: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validação básica de estrutura XML
      if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
        errors.push('Declaração XML inválida');
      }

      if (!xml.includes('<eSocial')) {
        errors.push('Elemento raiz eSocial não encontrado');
      }

      if (!xml.includes('</eSocial>')) {
        errors.push('Elemento raiz eSocial não fechado corretamente');
      }

      // Validação de namespace
      if (!xml.includes('xmlns="http://www.esocial.gov.br/schema/evt/')) {
        errors.push('Namespace eSocial inválido');
      }

      // Validação de elementos obrigatórios
      if (!xml.includes('<ideEvento>')) {
        errors.push('Elemento ideEvento obrigatório não encontrado');
      }

      if (!xml.includes('<ideEmpregador>')) {
        errors.push('Elemento ideEmpregador obrigatório não encontrado');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Erro na validação do XML: ' + (error as Error).message]
      };
    }
  }

  // =====================================================
  // GERAÇÃO DE LOTE XML
  // =====================================================

  async generateBatchXML(events: ESocialEventData[]): Promise<string> {
    const batchId = this.generateEventId();
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    let batchXML = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/evtLote/v_S_01_00_00">
  <evtLote Id="ID${batchId}">
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${this.config.cnpj}</nrInsc>
    </ideEmpregador>
    <ideTransmissor>
      <tpInsc>1</tpInsc>
      <nrInsc>${this.config.cnpj}</nrInsc>
    </ideTransmissor>
    <eventos>`;

    for (const eventData of events) {
      const eventXML = await this.generateEventXML(eventData);
      // Remove a declaração XML e o elemento raiz para incluir no lote
      const cleanXML = eventXML
        .replace('<?xml version="1.0" encoding="UTF-8"?>', '')
        .replace(/<eSocial[^>]*>/, '')
        .replace('</eSocial>', '');
      
      batchXML += cleanXML;
    }

    batchXML += `
    </eventos>
  </evtLote>
</eSocial>`;

    return batchXML;
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let xmlServiceInstance: ESocialXMLService | null = null;

export function getESocialXMLService(config?: ESocialXMLConfig): ESocialXMLService {
  if (!xmlServiceInstance && config) {
    xmlServiceInstance = new ESocialXMLService(config);
  }
  
  if (!xmlServiceInstance) {
    throw new Error('ESocialXMLService não foi inicializado. Forneça a configuração.');
  }
  
  return xmlServiceInstance;
}

export function initializeESocialXMLService(config: ESocialXMLConfig): ESocialXMLService {
  xmlServiceInstance = new ESocialXMLService(config);
  return xmlServiceInstance;
}
