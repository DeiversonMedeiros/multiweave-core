// =====================================================
// SERVIÇO: GERADOR DE ARQUIVOS CNAB
// =====================================================
// Data: 2025-12-12
// Descrição: Geração de arquivos CNAB para remessa bancária
// Autor: Sistema MultiWeave Core
// Módulo: M2 - Contas a Pagar / M4 - Conciliação Bancária

import { LotePagamento, LotePagamentoItem } from '@/integrations/supabase/financial-types';
import { ContaBancaria } from '@/integrations/supabase/financial-types';

export interface CNABConfig {
  banco: string; // Código do banco (ex: '001' para Banco do Brasil)
  agencia: string;
  conta: string;
  digitoConta: string;
  empresaNome: string;
  empresaCnpj: string;
  tipoArquivo: '240' | '400'; // CNAB240 ou CNAB400
  sequencialRemessa: number;
}

export interface CNABHeader {
  codigoBanco: string;
  loteServico: string;
  tipoRegistro: string;
  tipoOperacao: string;
  tipoServico: string;
  formaLancamento: string;
  versaoLayout: string;
  empresaInscricao: string;
  empresaNome: string;
  empresaEndereco: string;
  empresaCidade: string;
  empresaCep: string;
  empresaUf: string;
  dataGeracao: string;
  horaGeracao: string;
  sequencialRemessa: string;
}

export interface CNABDetalhe {
  codigoBanco: string;
  loteServico: string;
  tipoRegistro: string;
  numeroSequencial: string;
  segmento: string;
  tipoMovimento: string;
  codigoInstrucao: string;
  codigoCamaraCompensacao: string;
  codigoBancoFavorecido: string;
  agenciaFavorecido: string;
  digitoAgenciaFavorecido: string;
  contaFavorecido: string;
  digitoContaFavorecido: string;
  nomeFavorecido: string;
  numeroDocumento: string;
  dataVencimento: string;
  tipoMoeda: string;
  quantidadeMoeda: string;
  valorPagamento: string;
  numeroDocumentoAtribuido: string;
  dataRealPagamento: string;
  valorRealPagamento: string;
  outrasInformacoes: string;
  finalidadeDoc: string;
  finalidadeTed: string;
  finalidadeComplementar: string;
  avisoFavorecido: string;
  ocorrencias: string;
}

export interface CNABTrailer {
  codigoBanco: string;
  loteServico: string;
  tipoRegistro: string;
  quantidadeRegistros: string;
  valorTotal: string;
  quantidadeMoeda: string;
  numeroAvisoDebito: string;
}

/**
 * Gerar arquivo CNAB240 (formato mais moderno)
 */
export function gerarCNAB240(
  lote: LotePagamento,
  itens: (LotePagamentoItem & { conta_pagar?: { numero_titulo?: string; data_vencimento?: string; fornecedor_nome?: string } })[],
  contaBancaria: ContaBancaria,
  config: CNABConfig
): string {
  const linhas: string[] = [];

  // Header do Arquivo
  const headerArquivo = gerarHeaderArquivo240(config, contaBancaria);
  linhas.push(headerArquivo);

  // Header do Lote
  const headerLote = gerarHeaderLote240(config, contaBancaria, lote);
  linhas.push(headerLote);

  // Detalhes (Segmento A)
  itens.forEach((item, index) => {
    const detalhe = gerarDetalheSegmentoA240(item, config, index + 1);
    linhas.push(detalhe);
  });

  // Trailer do Lote
  const trailerLote = gerarTrailerLote240(config, itens.length, lote.valor_liquido);
  linhas.push(trailerLote);

  // Trailer do Arquivo
  const trailerArquivo = gerarTrailerArquivo240(config, linhas.length);
  linhas.push(trailerArquivo);

  return linhas.join('\r\n');
}

/**
 * Gerar arquivo CNAB400 (formato mais antigo, ainda usado por alguns bancos)
 */
export function gerarCNAB400(
  lote: LotePagamento,
  itens: (LotePagamentoItem & { conta_pagar?: { numero_titulo?: string; data_vencimento?: string; fornecedor_nome?: string } })[],
  contaBancaria: ContaBancaria,
  config: CNABConfig
): string {
  const linhas: string[] = [];

  // Header
  const header = gerarHeader400(config, contaBancaria, lote);
  linhas.push(header);

  // Detalhes
  itens.forEach((item, index) => {
    const detalhe = gerarDetalhe400(item, config, index + 1);
    linhas.push(detalhe);
  });

  // Trailer
  const trailer = gerarTrailer400(config, itens.length, lote.valor_liquido);
  linhas.push(trailer);

  return linhas.join('\r\n');
}

/**
 * Gerar Header do Arquivo CNAB240
 */
function gerarHeaderArquivo240(config: CNABConfig, contaBancaria: ContaBancaria): string {
  const hoje = new Date();
  const dataGeracao = formatarDataCNAB(hoje);
  const horaGeracao = formatarHoraCNAB(hoje);

  return [
    '0'.padStart(3, '0'), // 001-003: Código do Banco
    '0000', // 004-007: Lote de Serviço
    '0', // 008: Tipo de Registro
    ''.padEnd(9, ' '), // 009-017: Filler
    '2', // 018: Tipo de Inscrição (2 = CNPJ)
    config.empresaCnpj.replace(/\D/g, '').padStart(14, '0'), // 019-032: CNPJ
    ''.padEnd(20, ' '), // 033-052: Filler
    contaBancaria.agencia.padStart(5, '0'), // 053-057: Agência
    ''.padEnd(1, ' '), // 058: Dígito Agência
    contaBancaria.conta.padStart(12, '0'), // 059-070: Conta
    ''.padEnd(1, ' '), // 071: Dígito Conta
    ''.padEnd(1, ' '), // 072: Filler
    config.empresaNome.substring(0, 30).padEnd(30, ' '), // 073-102: Nome da Empresa
    'BANCO DO BRASIL'.padEnd(30, ' '), // 103-132: Nome do Banco
    ''.padEnd(10, ' '), // 133-142: Filler
    '1', // 143: Código Remessa/Retorno
    dataGeracao, // 144-151: Data de Geração
    horaGeracao, // 152-157: Hora de Geração
    config.sequencialRemessa.toString().padStart(6, '0'), // 158-163: Sequencial de Remessa
    '040', // 164-166: Versão do Layout
    '00000', // 167-171: Densidade
    ''.padEnd(20, ' '), // 172-191: Filler
    ''.padEnd(20, ' '), // 192-211: Filler
    ''.padEnd(29, ' '), // 212-240: Filler
  ].join('');
}

/**
 * Gerar Header do Lote CNAB240
 */
function gerarHeaderLote240(
  config: CNABConfig,
  contaBancaria: ContaBancaria,
  lote: LotePagamento
): string {
  const hoje = new Date();
  const dataGeracao = formatarDataCNAB(hoje);

  return [
    config.banco.padStart(3, '0'), // 001-003: Código do Banco
    '0001', // 004-007: Lote de Serviço
    '1', // 008: Tipo de Registro
    'C', // 009: Tipo de Operação
    '20', // 010-011: Tipo de Serviço
    '00', // 012-013: Forma de Lançamento
    '040', // 014-016: Versão do Layout
    ''.padEnd(1, ' '), // 017: Filler
    '2', // 018: Tipo de Inscrição
    config.empresaCnpj.replace(/\D/g, '').padStart(14, '0'), // 019-032: CNPJ
    ''.padEnd(20, ' '), // 033-052: Filler
    contaBancaria.agencia.padStart(5, '0'), // 053-057: Agência
    ''.padEnd(1, ' '), // 058: Dígito Agência
    contaBancaria.conta.padStart(12, '0'), // 059-070: Conta
    ''.padEnd(1, ' '), // 071: Dígito Conta
    ''.padEnd(1, ' '), // 072: Filler
    config.empresaNome.substring(0, 30).padEnd(30, ' '), // 073-102: Nome da Empresa
    ''.padEnd(40, ' '), // 103-142: Mensagem
    config.empresaCnpj.replace(/\D/g, '').padStart(14, '0'), // 143-156: Logradouro (usando CNPJ como placeholder)
    ''.padEnd(5, ' '), // 157-161: Número
    ''.padEnd(15, ' '), // 162-176: Complemento
    ''.padEnd(15, ' '), // 177-191: Cidade
    ''.padEnd(8, ' '), // 192-199: CEP
    ''.padEnd(2, ' '), // 200-201: Estado
    dataGeracao, // 202-209: Data de Gravação
    lote.valor_liquido.toFixed(2).replace('.', '').padStart(18, '0'), // 210-227: Quantidade de Registros (usando valor como placeholder)
    '000000000000000000', // 228-240: Filler
  ].join('');
}

/**
 * Gerar Detalhe Segmento A CNAB240
 */
function gerarDetalheSegmentoA240(
  item: LotePagamentoItem & { conta_pagar?: { numero_titulo?: string; data_vencimento?: string; fornecedor_nome?: string } },
  config: CNABConfig,
  sequencial: number
): string {
  // Usar dados da conta a pagar se disponível, senão usar valores padrão
  const contaPagar = item.conta_pagar;
  const numeroDocumento = contaPagar?.numero_titulo || `TIT-${item.id.substring(0, 8)}`;
  const dataVencimento = contaPagar?.data_vencimento || new Date().toISOString().split('T')[0];
  const dataPagamento = new Date().toISOString().split('T')[0];
  const nomeFavorecido = contaPagar?.fornecedor_nome || 'FAVORECIDO';

  return [
    config.banco.padStart(3, '0'), // 001-003: Código do Banco
    '0001', // 004-007: Lote de Serviço
    '3', // 008: Tipo de Registro
    sequencial.toString().padStart(5, '0'), // 009-013: Número Sequencial
    'A', // 014: Código Segmento
    '00', // 015-016: Tipo de Movimento
    '000', // 017-019: Código da Instrução
    '000', // 020-022: Código da Câmara
    '000', // 023-025: Código do Banco Favorecido
    ''.padStart(5, '0'), // 026-030: Agência Favorecido
    ' ', // 031: Dígito Agência
    ''.padStart(12, '0'), // 032-043: Conta Favorecido
    ' ', // 044: Dígito Conta
    ' ', // 045: Dígito Agência/Conta
    nomeFavorecido.substring(0, 30).padEnd(30, ' '), // 046-075: Nome do Favorecido
    numeroDocumento.substring(0, 20).padEnd(20, ' '), // 076-095: Número do Documento
    formatarDataCNAB(new Date(dataVencimento)), // 096-103: Data de Vencimento
    'BRL', // 104-106: Tipo de Moeda
    '00000000000000000000', // 107-126: Quantidade de Moeda
    item.valor_liquido.toFixed(2).replace('.', '').padStart(15, '0'), // 127-141: Valor do Pagamento
    numeroDocumento.substring(0, 20).padEnd(20, ' '), // 142-161: Número do Documento Atribuído
    formatarDataCNAB(new Date(dataPagamento)), // 162-169: Data Real do Pagamento
    item.valor_liquido.toFixed(2).replace('.', '').padStart(15, '0'), // 170-184: Valor Real do Pagamento
    ''.padEnd(40, ' '), // 185-224: Outras Informações
    '01', // 225-226: Finalidade do DOC/TED
    ''.padEnd(2, ' '), // 227-228: Filler
    '0', // 229: Aviso ao Favorecido
    ''.padEnd(11, ' '), // 230-240: Ocorrências
  ].join('');
}

/**
 * Gerar Trailer do Lote CNAB240
 */
function gerarTrailerLote240(
  config: CNABConfig,
  quantidadeRegistros: number,
  valorTotal: number
): string {
  return [
    config.banco.padStart(3, '0'), // 001-003: Código do Banco
    '0001', // 004-007: Lote de Serviço
    '5', // 008: Tipo de Registro
    ''.padEnd(9, ' '), // 009-017: Filler
    quantidadeRegistros.toString().padStart(6, '0'), // 018-023: Quantidade de Registros
    valorTotal.toFixed(2).replace('.', '').padStart(18, '0'), // 024-041: Valor Total
    '00000000000000000000', // 042-059: Quantidade de Moeda
    ''.padEnd(171, ' '), // 060-230: Filler
    ''.padEnd(10, ' '), // 231-240: Ocorrências
  ].join('');
}

/**
 * Gerar Trailer do Arquivo CNAB240
 */
function gerarTrailerArquivo240(config: CNABConfig, totalLinhas: number): string {
  return [
    config.banco.padStart(3, '0'), // 001-003: Código do Banco
    '9999', // 004-007: Lote de Serviço
    '9', // 008: Tipo de Registro
    ''.padEnd(9, ' '), // 009-017: Filler
    totalLinhas.toString().padStart(6, '0'), // 018-023: Quantidade de Lotes
    (totalLinhas - 2).toString().padStart(6, '0'), // 024-029: Quantidade de Registros
    ''.padEnd(211, ' '), // 030-240: Filler
  ].join('');
}

/**
 * Gerar Header CNAB400
 */
function gerarHeader400(
  config: CNABConfig,
  contaBancaria: ContaBancaria,
  lote: LotePagamento
): string {
  const hoje = new Date();
  const dataGeracao = formatarDataCNAB400(hoje);

  return [
    '0', // 001: Tipo de Registro
    '1', // 002: Tipo de Operação
    'REMESSA', // 003-009: Identificação
    '01', // 010-011: Identificação do Tipo de Serviço
    ''.padEnd(15, ' '), // 012-026: Complemento
    config.empresaNome.substring(0, 20).padEnd(20, ' '), // 027-046: Nome da Empresa
    config.banco.padStart(3, '0'), // 047-049: Código do Banco
    'BANCO DO BRASIL'.padEnd(15, ' '), // 050-064: Nome do Banco
    dataGeracao, // 065-070: Data de Geração
    ''.padEnd(8, ' '), // 071-078: Filler
    '2', // 079: Identificação do Sistema
    config.sequencialRemessa.toString().padStart(7, '0'), // 080-086: Número Sequencial
    ''.padEnd(287, ' '), // 087-394: Filler
    '000001', // 395-400: Número Sequencial do Registro
  ].join('');
}

/**
 * Gerar Detalhe CNAB400
 */
function gerarDetalhe400(
  item: LotePagamentoItem & { conta_pagar?: { numero_titulo?: string; data_vencimento?: string; fornecedor_nome?: string } },
  config: CNABConfig,
  sequencial: number
): string {
  const contaPagar = item.conta_pagar;
  const numeroDocumento = contaPagar?.numero_titulo || `TIT-${item.id.substring(0, 8)}`;
  const dataVencimento = contaPagar?.data_vencimento || new Date().toISOString().split('T')[0];
  const dataPagamento = new Date().toISOString().split('T')[0];

  return [
    '1', // 001: Tipo de Registro
    '02', // 002-003: Tipo de Inscrição
    config.empresaCnpj.replace(/\D/g, '').padStart(14, '0'), // 004-017: CNPJ
    ''.padStart(4, '0'), // 018-021: Agência
    ''.padStart(1, ' '), // 022: Dígito Agência
    ''.padStart(8, '0'), // 023-030: Conta
    ''.padStart(1, ' '), // 031: Dígito Conta
    ''.padEnd(17, ' '), // 032-048: Filler
    numeroDocumento.substring(0, 25).padEnd(25, ' '), // 049-073: Número do Documento
    item.valor_liquido.toFixed(2).replace('.', '').padStart(13, '0'), // 074-086: Valor do Pagamento
    ''.padStart(3, '0'), // 087-089: Banco Favorecido
    ''.padStart(5, '0'), // 090-094: Agência Favorecido
    ' ', // 095: Dígito Agência
    ''.padStart(12, '0'), // 096-107: Conta Favorecido
    ' ', // 108: Dígito Conta
    ''.padEnd(30, ' '), // 109-138: Nome do Favorecido
    formatarDataCNAB400(new Date(dataVencimento)), // 139-144: Data de Vencimento
    formatarDataCNAB400(new Date(dataPagamento)), // 145-150: Data de Pagamento
    ''.padEnd(40, ' '), // 151-190: Observações
    ''.padEnd(8, ' '), // 191-198: Filler
    sequencial.toString().padStart(6, '0'), // 199-204: Número Sequencial
  ].join('');
}

/**
 * Gerar Trailer CNAB400
 */
function gerarTrailer400(
  config: CNABConfig,
  quantidadeRegistros: number,
  valorTotal: number
): string {
  return [
    '9', // 001: Tipo de Registro
    ''.padEnd(393, ' '), // 002-394: Filler
    quantidadeRegistros.toString().padStart(6, '0'), // 395-400: Número Sequencial
  ].join('');
}

/**
 * Formatar data para CNAB240 (DDMMAAAA)
 */
function formatarDataCNAB(data: Date): string {
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  const ano = data.getFullYear().toString();
  return `${dia}${mes}${ano}`;
}

/**
 * Formatar hora para CNAB240 (HHMMSS)
 */
function formatarHoraCNAB(data: Date): string {
  const hora = data.getHours().toString().padStart(2, '0');
  const minuto = data.getMinutes().toString().padStart(2, '0');
  const segundo = data.getSeconds().toString().padStart(2, '0');
  return `${hora}${minuto}${segundo}`;
}

/**
 * Formatar data para CNAB400 (DDMMAA)
 */
function formatarDataCNAB400(data: Date): string {
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  const ano = data.getFullYear().toString().substring(2);
  return `${dia}${mes}${ano}`;
}

/**
 * Gerar arquivo OFX para remessa (formato alternativo)
 */
export function gerarOFXRemessa(
  lote: LotePagamento,
  itens: (LotePagamentoItem & { conta_pagar?: { numero_titulo?: string; data_vencimento?: string; fornecedor_nome?: string } })[],
  contaBancaria: ContaBancaria
): string {
  const hoje = new Date();
  const dataGeracao = hoje.toISOString().split('T')[0].replace(/-/g, '');
  const horaGeracao = hoje.toTimeString().substring(0, 8).replace(/:/g, '');

  const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>${dataGeracao}${horaGeracao}</DTSERVER>
<LANGUAGE>POR</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM>
<BANKID>${contaBancaria.banco_codigo}</BANKID>
<ACCTID>${contaBancaria.conta}</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<STMTRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM>
<BANKID>${contaBancaria.banco_codigo}</BANKID>
<ACCTID>${contaBancaria.conta}</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dataGeracao}</DTSTART>
<DTEND>${dataGeracao}</DTEND>
${itens.map((item, index) => {
  const contaPagar = item.conta_pagar;
  const dataVencimento = (contaPagar?.data_vencimento || new Date().toISOString().split('T')[0]).replace(/-/g, '');
  const nomeFavorecido = contaPagar?.fornecedor_nome || 'FAVORECIDO';
  return `<STMTTRN>
<TRNTYPE>PAYMENT</TRNTYPE>
<DTPOSTED>${dataVencimento}</DTPOSTED>
<TRNAMT>-${item.valor_liquido.toFixed(2)}</TRNAMT>
<FITID>${lote.numero_lote}-${index + 1}</FITID>
<NAME>${nomeFavorecido.substring(0, 32)}</NAME>
<MEMO>${item.observacoes || `Pagamento Lote ${lote.numero_lote}`}</MEMO>
</STMTTRN>`;
}).join('\n')}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00</BALAMT>
<DTASOF>${dataGeracao}</DTASOF>
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  return ofxContent;
}

/**
 * Download arquivo gerado
 */
export function downloadArquivo(conteudo: string, nomeArquivo: string, tipo: 'cnab' | 'ofx'): void {
  const blob = new Blob([conteudo], { 
    type: tipo === 'cnab' ? 'text/plain' : 'application/x-ofx' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

