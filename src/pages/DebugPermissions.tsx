import { useDebugPermissions } from '@/hooks/useDebugPermissions';

export default function DebugPermissions() {
  const { user, userProfile, modulePermissions, isLoading } = useDebugPermissions();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Debug de Permissões</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Informações do Usuário</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify({
              userId: user?.id,
              email: user?.email,
              userProfile: userProfile
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Permissões de Módulo</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(modulePermissions, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bg-blue-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Teste de Acesso</h2>
        <div className="space-y-2">
          <p>
            <strong>Portal do Colaborador:</strong> 
            <a 
              href="/portal-colaborador" 
              className="ml-2 text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar Portal
            </a>
          </p>
          <p>
            <strong>Teste Portal:</strong> 
            <a 
              href="/test-portal" 
              className="ml-2 text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar Teste
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
