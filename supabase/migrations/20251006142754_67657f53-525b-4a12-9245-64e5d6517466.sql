-- Criar schema financeiro
CREATE SCHEMA IF NOT EXISTS financeiro;

-- Criar ENUMs
CREATE TYPE financeiro.payment_status AS ENUM ('pendente', 'aprovado', 'pago', 'cancelado');
CREATE TYPE financeiro.receivable_status AS ENUM ('pendente', 'recebido', 'cancelado');
CREATE TYPE financeiro.transaction_type AS ENUM ('pagamento', 'recebimento', 'transferencia');
CREATE TYPE financeiro.sefaz_status AS ENUM ('autorizada', 'rejeitada', 'cancelada', 'pendente');

-- Tabela: bank_accounts
CREATE TABLE financeiro.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  banco TEXT NOT NULL,
  agencia TEXT NOT NULL,
  conta TEXT NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(15,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: accounts_payable
CREATE TABLE financeiro.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  status financeiro.payment_status NOT NULL DEFAULT 'pendente',
  centro_custo_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  classe_financeira TEXT,
  xml_url TEXT,
  sefaz_status financeiro.sefaz_status,
  pagamento_antecipado BOOLEAN NOT NULL DEFAULT false,
  banco_conta_id UUID REFERENCES financeiro.bank_accounts(id) ON DELETE SET NULL,
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: accounts_receivable
CREATE TABLE financeiro.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  status financeiro.receivable_status NOT NULL DEFAULT 'pendente',
  centro_custo_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  banco_conta_id UUID REFERENCES financeiro.bank_accounts(id) ON DELETE SET NULL,
  data_recebimento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: transactions
CREATE TABLE financeiro.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo financeiro.transaction_type NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL,
  origem UUID REFERENCES financeiro.bank_accounts(id) ON DELETE SET NULL,
  destino UUID REFERENCES financeiro.bank_accounts(id) ON DELETE SET NULL,
  conciliado BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT,
  payable_id UUID REFERENCES financeiro.accounts_payable(id) ON DELETE SET NULL,
  receivable_id UUID REFERENCES financeiro.accounts_receivable(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: cashflow
CREATE TABLE financeiro.cashflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  entradas DECIMAL(15,2) NOT NULL DEFAULT 0,
  saidas DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_final DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, competencia)
);

-- Criar índices
CREATE INDEX idx_bank_accounts_company ON financeiro.bank_accounts(company_id);
CREATE INDEX idx_accounts_payable_company_status ON financeiro.accounts_payable(company_id, status);
CREATE INDEX idx_accounts_payable_vencimento ON financeiro.accounts_payable(vencimento);
CREATE INDEX idx_accounts_receivable_company_status ON financeiro.accounts_receivable(company_id, status);
CREATE INDEX idx_accounts_receivable_vencimento ON financeiro.accounts_receivable(vencimento);
CREATE INDEX idx_transactions_company_data ON financeiro.transactions(company_id, data);
CREATE INDEX idx_cashflow_company_competencia ON financeiro.cashflow(company_id, competencia);

-- Funções de atualização de timestamps
CREATE OR REPLACE FUNCTION financeiro.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON financeiro.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON financeiro.accounts_payable
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON financeiro.accounts_receivable
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON financeiro.transactions
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

CREATE TRIGGER update_cashflow_updated_at BEFORE UPDATE ON financeiro.cashflow
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

-- RLS Policies
ALTER TABLE financeiro.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.cashflow ENABLE ROW LEVEL SECURITY;

-- Policies para bank_accounts
CREATE POLICY "Users can view bank accounts of their companies" ON financeiro.bank_accounts
    FOR SELECT USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage bank accounts of their companies" ON financeiro.bank_accounts
    FOR ALL USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Admins can manage all bank accounts" ON financeiro.bank_accounts
    FOR ALL USING (is_admin(auth.uid()));

-- Policies para accounts_payable
CREATE POLICY "Users can view accounts payable of their companies" ON financeiro.accounts_payable
    FOR SELECT USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage accounts payable of their companies" ON financeiro.accounts_payable
    FOR ALL USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Admins can manage all accounts payable" ON financeiro.accounts_payable
    FOR ALL USING (is_admin(auth.uid()));

-- Policies para accounts_receivable
CREATE POLICY "Users can view accounts receivable of their companies" ON financeiro.accounts_receivable
    FOR SELECT USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage accounts receivable of their companies" ON financeiro.accounts_receivable
    FOR ALL USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Admins can manage all accounts receivable" ON financeiro.accounts_receivable
    FOR ALL USING (is_admin(auth.uid()));

-- Policies para transactions
CREATE POLICY "Users can view transactions of their companies" ON financeiro.transactions
    FOR SELECT USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage transactions of their companies" ON financeiro.transactions
    FOR ALL USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Admins can manage all transactions" ON financeiro.transactions
    FOR ALL USING (is_admin(auth.uid()));

-- Policies para cashflow
CREATE POLICY "Users can view cashflow of their companies" ON financeiro.cashflow
    FOR SELECT USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage cashflow of their companies" ON financeiro.cashflow
    FOR ALL USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Admins can manage all cashflow" ON financeiro.cashflow
    FOR ALL USING (is_admin(auth.uid()));