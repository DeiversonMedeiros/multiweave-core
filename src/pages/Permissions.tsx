import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Permissions() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a página de perfis com a aba de permissões
    navigate('/cadastros/perfis?tab=permissoes', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecionando para a página de perfis...</p>
      </div>
    </div>
  );
}

