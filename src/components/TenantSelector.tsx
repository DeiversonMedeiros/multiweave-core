import React, { useState } from 'react';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Building2, 
  ChevronDown, 
  Users, 
  Shield, 
  Check,
  AlertCircle
} from 'lucide-react';

export const TenantSelector: React.FC = () => {
  const {
    currentCompany,
    userCompanies,
    isMultiTenant,
    canSwitchCompany,
    loading,
    switchCompany
  } = useMultiTenancy();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const handleCompanyChange = async (companyId: string) => {
    const company = userCompanies.find(c => c.id === companyId);
    if (company) {
      const success = await switchCompany(company);
      if (success) {
        setIsOpen(false);
        setSelectedCompanyId('');
        // Recarregar a página para atualizar todos os dados com a nova empresa
        window.location.reload();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!isMultiTenant) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {currentCompany?.nome_fantasia || 'Nenhuma empresa'}
        </span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentCompany?.nome_fantasia || 'Selecionar Empresa'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecionar Empresa
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Escolha a empresa que deseja acessar:
          </div>
          
          <div className="space-y-2">
            {userCompanies.map(company => (
              <Card 
                key={company.id}
                className={`cursor-pointer transition-colors ${
                  currentCompany?.id === company.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleCompanyChange(company.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{company.nome_fantasia}</h3>
                        {currentCompany?.id === company.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {company.razao_social}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {company.cnpj}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {company.ativo ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inativa
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {userCompanies.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma empresa encontrada para este usuário.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente compacto para header
export const TenantSelectorCompact: React.FC = () => {
  const { currentCompany, isMultiTenant, loading } = useMultiTenancy();

  if (loading) {
    return (
      <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
    );
  }

  if (!isMultiTenant) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <Building2 className="h-3 w-3" />
        <span className="truncate max-w-32">
          {currentCompany?.nome_fantasia || 'N/A'}
        </span>
      </div>
    );
  }

  return (
    <TenantSelector />
  );
};

// Componente para exibir informações da empresa atual
export const CurrentTenantInfo: React.FC = () => {
  const { currentCompany, isMultiTenant, userCompanies } = useMultiTenancy();

  if (!currentCompany) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma empresa selecionada
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Empresa Atual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-medium">{currentCompany.nome_fantasia}</h3>
          <p className="text-sm text-muted-foreground">
            {currentCompany.razao_social}
          </p>
        </div>
        
        <div className="text-sm space-y-1">
          <div>
            <span className="font-medium">CNPJ:</span> {currentCompany.cnpj}
          </div>
          {currentCompany.inscricao_estadual && (
            <div>
              <span className="font-medium">IE:</span> {currentCompany.inscricao_estadual}
            </div>
          )}
        </div>

        {isMultiTenant && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Você tem acesso a {userCompanies.length} empresa(s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

