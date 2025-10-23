import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Clock,
  Calendar,
  Users
} from 'lucide-react';
import { WorkShift } from '@/integrations/supabase/rh-types';

interface WorkShiftTableProps {
  workShifts: WorkShift[];
  onView: (workShift: WorkShift) => void;
  onEdit: (workShift: WorkShift) => void;
  onDelete: (workShift: WorkShift) => void;
  isLoading?: boolean;
}

export function WorkShiftTable({ 
  workShifts, 
  onView, 
  onEdit, 
  onDelete, 
  isLoading = false 
}: WorkShiftTableProps) {
  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM
  };

  const getScaleTypeLabel = (tipo: string) => {
    const scaleTypes = {
      'fixa': 'Escala Fixa',
      'flexivel_6x1': 'Flexível 6x1',
      'flexivel_5x2': 'Flexível 5x2',
      'flexivel_4x3': 'Flexível 4x3',
      'escala_12x36': '12x36',
      'escala_24x48': '24x48',
      'personalizada': 'Personalizada'
    };
    return scaleTypes[tipo as keyof typeof scaleTypes] || tipo;
  };

  const getScaleTypeVariant = (tipo: string) => {
    const variants = {
      'fixa': 'default',
      'flexivel_6x1': 'secondary',
      'flexivel_5x2': 'secondary',
      'flexivel_4x3': 'secondary',
      'escala_12x36': 'destructive',
      'escala_24x48': 'destructive',
      'personalizada': 'outline'
    };
    return variants[tipo as keyof typeof variants] as any || 'default';
  };

  const getWeekDaysLabel = (dias: number[]) => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias.map(dia => dayNames[dia] || dia).join(', ');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Carregando turnos...</p>
      </div>
    );
  }

  if (workShifts.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum turno encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome da Escala</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Dias da Semana</TableHead>
            <TableHead>Tipo de Escala</TableHead>
            <TableHead>Dias Trabalho/Folga</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workShifts.map((workShift) => (
            <TableRow key={workShift.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{workShift.nome}</div>
                  {workShift.codigo && (
                    <div className="text-sm text-muted-foreground">
                      {workShift.codigo}
                    </div>
                  )}
                  {workShift.template_escala && (
                    <Badge variant="outline" className="mt-1">
                      Template
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(workShift.hora_inicio)} - {formatTime(workShift.hora_fim)}
                  </div>
                  {workShift.intervalo_inicio && workShift.intervalo_fim && (
                    <div className="text-muted-foreground text-xs">
                      Intervalo: {formatTime(workShift.intervalo_inicio)} - {formatTime(workShift.intervalo_fim)}
                    </div>
                  )}
                  <div className="text-muted-foreground text-xs">
                    {workShift.horas_diarias}h/dia
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm">
                  {workShift.dias_semana.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getWeekDaysLabel(workShift.dias_semana)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Flexível</span>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <Badge variant={getScaleTypeVariant(workShift.tipo_escala)}>
                  {getScaleTypeLabel(workShift.tipo_escala)}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {workShift.dias_trabalho}D / {workShift.dias_folga}F
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Ciclo: {workShift.ciclo_dias} dias
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant={workShift.status === 'ativo' ? 'default' : 'secondary'}>
                  {workShift.status}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(workShift)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(workShift)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(workShift)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

