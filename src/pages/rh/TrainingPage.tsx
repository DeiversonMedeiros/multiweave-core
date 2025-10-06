import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Plus } from 'lucide-react';

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Treinamentos</h1>
          <p className="text-muted-foreground">
            Gestão de treinamentos e desenvolvimento de funcionários
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Treinamento
        </Button>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Gestão de Treinamentos
          </CardTitle>
          <CardDescription>
            Controle de treinamentos, cursos e desenvolvimento profissional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-muted-foreground mb-4">
              Esta funcionalidade está sendo implementada como parte da Fase 5 do plano de desenvolvimento.
            </p>
            <div className="text-sm text-muted-foreground">
              <p><strong>Funcionalidades planejadas:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Cadastro de treinamentos</li>
                <li>Inscrição de funcionários</li>
                <li>Controle de presença</li>
                <li>Certificações</li>
                <li>Relatórios de treinamento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

