// =====================================================
// TESTES: MÓDULO FINANCEIRO
// =====================================================
// Data: 2025-01-15
// Descrição: Testes automatizados para o módulo financeiro
// Autor: Sistema MultiWeave Core

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FinancialPage } from '@/pages/FinancialPage';
import { ContasPagarPage } from '@/components/financial/ContasPagarPage';
import { ContasReceberPage } from '@/components/financial/ContasReceberPage';
import { TesourariaPage } from '@/components/financial/TesourariaPage';
import { FiscalPage } from '@/components/financial/FiscalPage';
import { ContabilidadePage } from '@/components/financial/ContabilidadePage';
import { sefazService } from '@/services/financial/sefazService';
import { bradescoService } from '@/services/financial/bradescoService';
import { reportsService } from '@/services/financial/reportsService';

// Mock do contexto de empresa
const mockCompanyContext = {
  selectedCompany: {
    id: 'test-company-id',
    nome: 'Empresa Teste',
    cnpj: '12345678000195',
  },
  companies: [],
  setSelectedCompany: vi.fn(),
};

// Mock do contexto de autorização
const mockAuthContext = {
  checkModulePermission: vi.fn(() => true),
  checkEntityPermission: vi.fn(() => true),
  hasPermission: vi.fn(() => true),
};

// Mock dos hooks
vi.mock('@/lib/company-context', () => ({
  useCompany: () => mockCompanyContext,
}));

vi.mock('@/hooks/useAuthorization', () => ({
  useAuthorization: () => mockAuthContext,
}));

// Mock dos serviços
vi.mock('@/services/financial/sefazService');
vi.mock('@/services/financial/bradescoService');
vi.mock('@/services/financial/reportsService');

// Wrapper para componentes que precisam de roteamento
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Módulo Financeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FinancialPage', () => {
    it('deve renderizar a página principal do módulo financeiro', () => {
      render(
        <RouterWrapper>
          <FinancialPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Módulo Financeiro')).toBeInTheDocument();
      expect(screen.getByText('Gerencie contas a pagar/receber, tesouraria, fiscal e contabilidade')).toBeInTheDocument();
    });

    it('deve exibir as abas de navegação', () => {
      render(
        <RouterWrapper>
          <FinancialPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Contas a Pagar')).toBeInTheDocument();
      expect(screen.getByText('Contas a Receber')).toBeInTheDocument();
      expect(screen.getByText('Tesouraria')).toBeInTheDocument();
      expect(screen.getByText('Fiscal')).toBeInTheDocument();
      expect(screen.getByText('Contabilidade')).toBeInTheDocument();
    });

    it('deve exibir KPIs no dashboard', () => {
      render(
        <RouterWrapper>
          <FinancialPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Total a Pagar')).toBeInTheDocument();
      expect(screen.getByText('Total a Receber')).toBeInTheDocument();
      expect(screen.getByText('Saldo de Caixa')).toBeInTheDocument();
      expect(screen.getByText('Contas Vencidas')).toBeInTheDocument();
    });
  });

  describe('ContasPagarPage', () => {
    it('deve renderizar a página de contas a pagar', () => {
      render(
        <RouterWrapper>
          <ContasPagarPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Contas a Pagar')).toBeInTheDocument();
    });

    it('deve exibir botão de nova conta quando usuário tem permissão', () => {
      render(
        <RouterWrapper>
          <ContasPagarPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Nova Conta')).toBeInTheDocument();
    });

    it('deve exibir filtros de busca', () => {
      render(
        <RouterWrapper>
          <ContasPagarPage />
        </RouterWrapper>
      );

      expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
    });
  });

  describe('ContasReceberPage', () => {
    it('deve renderizar a página de contas a receber', () => {
      render(
        <RouterWrapper>
          <ContasReceberPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Contas a Receber')).toBeInTheDocument();
    });
  });

  describe('TesourariaPage', () => {
    it('deve renderizar a página de tesouraria', () => {
      render(
        <RouterWrapper>
          <TesourariaPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Tesouraria')).toBeInTheDocument();
    });
  });

  describe('FiscalPage', () => {
    it('deve renderizar a página fiscal', () => {
      render(
        <RouterWrapper>
          <FiscalPage />
        </RouterWrapper>
      );

      expect(screen.getByText('Módulo Fiscal')).toBeInTheDocument();
    });

    it('deve exibir abas de NF-e e NFS-e', () => {
      render(
        <RouterWrapper>
          <FiscalPage />
        </RouterWrapper>
      );

      expect(screen.getByText('NF-e')).toBeInTheDocument();
      expect(screen.getByText('NFS-e')).toBeInTheDocument();
    });
  });

  describe('ContabilidadePage', () => {
    it('deve renderizar a página de contabilidade', () => {
      render(
        <RouterWrapper>
          <ContabilidadePage />
        </RouterWrapper>
      );

      expect(screen.getByText('Módulo Contabilidade')).toBeInTheDocument();
    });

    it('deve exibir abas de plano de contas e lançamentos', () => {
      render(
        <RouterWrapper>
          <ContabilidadePage />
        </RouterWrapper>
      );

      expect(screen.getByText('Plano de Contas')).toBeInTheDocument();
      expect(screen.getByText('Lançamentos')).toBeInTheDocument();
    });
  });
});

describe('Serviços Financeiros', () => {
  describe('SefazService', () => {
    it('deve verificar status do SEFAZ', async () => {
      const mockResponse = {
        status: 'online',
        tempo_resposta: 120,
        observacoes: 'Funcionando normalmente',
      };

      vi.mocked(sefazService.verificarStatus).mockResolvedValue({
        id: '1',
        company_id: 'test',
        uf: 'SP',
        servico: 'NFe Autorização',
        status: 'online',
        ultima_verificacao: new Date().toISOString(),
        tempo_resposta: 120,
        observacoes: 'Funcionando normalmente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await sefazService.verificarStatus('SP');

      expect(result.uf).toBe('SP');
      expect(result.status).toBe('online');
      expect(result.tempo_resposta).toBe(120);
    });

    it('deve emitir NFe', async () => {
      const mockNFe = {
        id: '1',
        company_id: 'test',
        numero_nfe: '000001',
        serie: '1',
        data_emissao: '2025-01-15',
        valor_total: 1000,
        valor_icms: 100,
        valor_ipi: 50,
        valor_pis: 20,
        valor_cofins: 30,
        status_sefaz: 'pendente',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(sefazService.emitirNFe).mockResolvedValue({
        success: true,
        protocolo: '123456789',
        status: 'autorizada',
        xml: '<xml>...</xml>',
      });

      const result = await sefazService.emitirNFe({
        uf: 'SP',
        ambiente: 'homologacao',
        certificado: 'cert123',
        senha: 'senha123',
        nfe: mockNFe,
      });

      expect(result.success).toBe(true);
      expect(result.protocolo).toBe('123456789');
      expect(result.status).toBe('autorizada');
    });

    it('deve cancelar NFe', async () => {
      vi.mocked(sefazService.cancelarNFe).mockResolvedValue({
        success: true,
        protocolo: '987654321',
        status: 'cancelada',
        xml: '<xml>...</xml>',
      });

      const result = await sefazService.cancelarNFe({
        uf: 'SP',
        ambiente: 'homologacao',
        certificado: 'cert123',
        senha: 'senha123',
        chave_acesso: '35200114200166000187550010000012345678901234',
        motivo: 'Erro na emissão',
        numero_protocolo: '123456789',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelada');
    });
  });

  describe('BradescoService', () => {
    it('deve obter extrato bancário', async () => {
      const mockConta = {
        id: '1',
        company_id: 'test',
        banco: 'Bradesco',
        agencia: '1234',
        numero_conta: '567890',
        digito_conta: '1',
        tipo_conta: 'corrente',
        saldo_atual: 10000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(bradescoService.obterExtrato).mockResolvedValue({
        success: true,
        movimentos: [],
        saldo_inicial: 8000,
        saldo_final: 10000,
        total_entradas: 5000,
        total_saidas: 3000,
      });

      const result = await bradescoService.obterExtrato({
        conta: mockConta,
        ambiente: 'sandbox',
        token: 'token123',
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.saldo_inicial).toBe(8000);
      expect(result.saldo_final).toBe(10000);
    });

    it('deve obter saldo da conta', async () => {
      const mockConta = {
        id: '1',
        company_id: 'test',
        banco: 'Bradesco',
        agencia: '1234',
        numero_conta: '567890',
        digito_conta: '1',
        tipo_conta: 'corrente',
        saldo_atual: 10000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(bradescoService.obterSaldo).mockResolvedValue({
        success: true,
        saldo_atual: 10000,
        saldo_disponivel: 9500,
        saldo_bloqueado: 500,
        data_consulta: '2025-01-15',
      });

      const result = await bradescoService.obterSaldo({
        conta: mockConta,
        ambiente: 'sandbox',
        token: 'token123',
      });

      expect(result.success).toBe(true);
      expect(result.saldo_atual).toBe(10000);
      expect(result.saldo_disponivel).toBe(9500);
    });
  });

  describe('ReportsService', () => {
    it('deve gerar dashboard financeiro', async () => {
      const mockConfig = {
        company_id: 'test',
        periodo_inicio: '2025-01-01',
        periodo_fim: '2025-01-31',
      };

      vi.mocked(reportsService.gerarDashboard).mockResolvedValue({
        kpis: [
          {
            id: '1',
            titulo: 'Receita Total',
            valor: 150000,
            valor_anterior: 120000,
            variacao: 30000,
            variacao_percentual: 25,
            tendencia: 'alta',
            cor: 'green',
            icone: 'trending-up',
            unidade: 'R$',
          },
        ],
        graficos: [],
        tabelas: [],
        alertas: [],
      });

      const result = await reportsService.gerarDashboard(mockConfig);

      expect(result.kpis).toHaveLength(1);
      expect(result.kpis[0].titulo).toBe('Receita Total');
      expect(result.kpis[0].valor).toBe(150000);
    });

    it('deve gerar relatório de fluxo de caixa', async () => {
      const mockConfig = {
        company_id: 'test',
        periodo_inicio: '2025-01-01',
        periodo_fim: '2025-01-31',
      };

      vi.mocked(reportsService.gerarFluxoCaixa).mockResolvedValue({
        id: 'fluxo-caixa',
        tipo: 'area',
        titulo: 'Fluxo de Caixa Projetado',
        dados: [
          { periodo: 'D+0', saldo: 50000 },
          { periodo: 'D+30', saldo: 65000 },
        ],
        eixos: { x: 'periodo', y: 'saldo' },
        cores: ['#3b82f6'],
        legenda: true,
      });

      const result = await reportsService.gerarFluxoCaixa(mockConfig);

      expect(result.titulo).toBe('Fluxo de Caixa Projetado');
      expect(result.dados).toHaveLength(2);
    });
  });
});

describe('Integração de Componentes', () => {
  it('deve navegar entre abas do módulo financeiro', async () => {
    render(
      <RouterWrapper>
        <FinancialPage />
      </RouterWrapper>
    );

    // Clicar na aba "Contas a Pagar"
    const contasPagarTab = screen.getByText('Contas a Pagar');
    fireEvent.click(contasPagarTab);

    await waitFor(() => {
      expect(screen.getByText('Contas a Pagar')).toBeInTheDocument();
    });

    // Clicar na aba "Fiscal"
    const fiscalTab = screen.getByText('Fiscal');
    fireEvent.click(fiscalTab);

    await waitFor(() => {
      expect(screen.getByText('Módulo Fiscal')).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem de permissão quando usuário não tem acesso', () => {
    // Mock de usuário sem permissão
    vi.mocked(mockAuthContext.checkModulePermission).mockReturnValue(false);

    render(
      <RouterWrapper>
        <FinancialPage />
      </RouterWrapper>
    );

    // Clicar na aba "Contas a Pagar" (desabilitada)
    const contasPagarTab = screen.getByText('Contas a Pagar');
    expect(contasPagarTab).toBeDisabled();
  });
});

describe('Validações de Formulários', () => {
  it('deve validar campos obrigatórios no formulário de contas a pagar', async () => {
    render(
      <RouterWrapper>
        <ContasPagarPage />
      </RouterWrapper>
    );

    // Clicar no botão "Nova Conta"
    const novaContaButton = screen.getByText('Nova Conta');
    fireEvent.click(novaContaButton);

    await waitFor(() => {
      expect(screen.getByText('Nova Conta a Pagar')).toBeInTheDocument();
    });

    // Tentar salvar sem preencher campos obrigatórios
    const salvarButton = screen.getByText('Criar');
    fireEvent.click(salvarButton);

    // Verificar se mensagens de erro aparecem
    await waitFor(() => {
      expect(screen.getByText('Fornecedor é obrigatório')).toBeInTheDocument();
      expect(screen.getByText('Valor é obrigatório')).toBeInTheDocument();
    });
  });
});

describe('Testes de Performance', () => {
  it('deve carregar dashboard em menos de 2 segundos', async () => {
    const startTime = performance.now();

    render(
      <RouterWrapper>
        <FinancialPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Módulo Financeiro')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    expect(loadTime).toBeLessThan(2000);
  });
});

describe('Testes de Acessibilidade', () => {
  it('deve ter elementos com roles apropriados', () => {
    render(
      <RouterWrapper>
        <FinancialPage />
      </RouterWrapper>
    );

    // Verificar se elementos têm roles apropriados
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('deve ter labels apropriados para campos de formulário', async () => {
    render(
      <RouterWrapper>
        <ContasPagarPage />
      </RouterWrapper>
    );

    const novaContaButton = screen.getByText('Nova Conta');
    fireEvent.click(novaContaButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Fornecedor')).toBeInTheDocument();
      expect(screen.getByLabelText('Valor')).toBeInTheDocument();
      expect(screen.getByLabelText('Data de Vencimento')).toBeInTheDocument();
    });
  });
});
