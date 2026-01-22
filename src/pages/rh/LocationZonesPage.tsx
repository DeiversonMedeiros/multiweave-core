// =====================================================
// PÁGINA DE GERENCIAMENTO DE ZONAS DE LOCALIZAÇÃO
// =====================================================
// Descrição: Interface administrativa para criar e gerenciar
//            zonas geográficas onde é permitido registrar ponto

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Map,
  Navigation,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { LocationZoneConfigModal } from '@/components/rh/LocationZoneConfigModal';
import { LocationZoneMap } from '@/components/rh/LocationZoneMap';
import {
  useLocationZones,
  useLocationZone,
  useDeleteLocationZone
} from '@/hooks/rh/useLocationZones';
import { LocationZone } from '@/services/rh/locationZonesService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GeolocationService } from '@/services/geolocationService';

export default function LocationZonesPage() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<LocationZone | null>(null);
  const [viewingZone, setViewingZone] = useState<LocationZone | null>(null);
  const [testingZone, setTestingZone] = useState<LocationZone | null>(null);
  const [testLocation, setTestLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LocationZone | null>(null);

  // Buscar zonas da empresa
  const { data: zones, isLoading, refetch } = useLocationZones();
  const deleteMutation = useDeleteLocationZone();

  const handleAdd = () => {
    setEditingZone(null);
    setIsModalOpen(true);
  };

  const handleEdit = (zone: LocationZone) => {
    setEditingZone(zone);
    setIsModalOpen(true);
  };

  const handleView = (zone: LocationZone) => {
    setViewingZone(zone);
  };

  const handleDelete = (zone: LocationZone) => {
    setDeleteConfirm(zone);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast({
        title: 'Sucesso',
        description: 'Zona excluída com sucesso.',
      });
      setDeleteConfirm(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir zona.',
        variant: 'destructive',
      });
    }
  };

  const handleTestZone = async (zone: LocationZone) => {
    setIsLoadingTest(true);
    setTestLocation(null);
    setTestingZone(zone);

    try {
      const position = await GeolocationService.getCurrentPosition();
      setTestLocation({
        lat: position.latitude,
        lon: position.longitude
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao obter localização',
        description: error.message || 'Não foi possível obter sua localização GPS.',
        variant: 'destructive',
      });
      setIsLoadingTest(false);
    } finally {
      setIsLoadingTest(false);
    }
  };

  const isWithinTestZone = testingZone && testLocation
    ? GeolocationService.isWithinRadius(
        testingZone.latitude,
        testingZone.longitude,
        testLocation.lat,
        testLocation.lon,
        testingZone.raio_metros
      )
    : null;

  const distance = testingZone && testLocation
    ? GeolocationService.calculateDistance(
        testingZone.latitude,
        testingZone.longitude,
        testLocation.lat,
        testLocation.lon
      )
    : null;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary">          </div>
        </div>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/rh/time-records*" action="read">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Zonas de Localização</h1>
            <p className="text-muted-foreground mt-1">
              Configure as áreas geográficas onde é permitido registrar ponto
            </p>
          </div>
          <PermissionGuard page="/rh/location-zones*" action="create">
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Zona
            </Button>
          </PermissionGuard>
        </div>

        {/* Alert se não houver zonas */}
        {zones && zones.length === 0 && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              Nenhuma zona de localização cadastrada. Crie uma zona para permitir
              que funcionários registrem ponto apenas em locais específicos.
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de zonas */}
        {zones && zones.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone) => (
              <Card key={zone.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{zone.nome}</CardTitle>
                      {zone.descricao && (
                        <CardDescription className="mt-1">
                          {zone.descricao}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={zone.ativo ? 'default' : 'secondary'}>
                      {zone.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  {/* Informações da zona */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>
                        {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Raio permitido: <strong>{(zone.raio_metros / 1000).toFixed(2)} km</strong>
                    </div>
                  </div>

                  {/* Preview do mapa (pequeno) */}
                  <div className="h-32 rounded-lg overflow-hidden border">
                    <LocationZoneMap
                      centerLat={zone.latitude}
                      centerLon={zone.longitude}
                      radius={zone.raio_metros}
                      height="128px"
                      editable={false}
                    />
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(zone)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestZone(zone)}
                      className="flex-1"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Testar
                    </Button>
                    <PermissionGuard page="/rh/location-zones*" action="edit">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(zone)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard page="/rh/location-zones*" action="delete">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(zone)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de criar/editar */}
        <LocationZoneConfigModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingZone(null);
          }}
          zone={editingZone}
          onSuccess={() => {
            refetch();
          }}
        />

        {/* Dialog de visualização */}
        <Dialog open={!!viewingZone} onOpenChange={() => setViewingZone(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingZone?.nome}</DialogTitle>
              <DialogDescription>
                Visualização detalhada da zona de localização
              </DialogDescription>
            </DialogHeader>
            {viewingZone && (
              <div className="space-y-4">
                <LocationZoneMap
                  centerLat={viewingZone.latitude}
                  centerLon={viewingZone.longitude}
                  radius={viewingZone.raio_metros}
                  showCurrentLocation={true}
                  height="400px"
                />
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium">Descrição:</span>{' '}
                    {viewingZone.descricao || 'Sem descrição'}
                  </div>
                  <div>
                    <span className="font-medium">Coordenadas:</span>{' '}
                    {viewingZone.latitude.toFixed(6)}, {viewingZone.longitude.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Raio permitido:</span>{' '}
                    {(viewingZone.raio_metros / 1000).toFixed(2)} km ({viewingZone.raio_metros} m)
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <Badge variant={viewingZone.ativo ? 'default' : 'secondary'}>
                      {viewingZone.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de teste de zona */}
        <Dialog open={!!testingZone} onOpenChange={() => {
          setTestingZone(null);
          setTestLocation(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Testar Zona: {testingZone?.nome}</DialogTitle>
              <DialogDescription>
                Verifique se sua localização atual está dentro da zona permitida
              </DialogDescription>
            </DialogHeader>
            {testingZone && (
              <div className="space-y-4">
                {isLoadingTest ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3">Obtendo localização...</span>
                  </div>
                ) : testLocation ? (
                  <>
                    <LocationZoneMap
                      centerLat={testingZone.latitude}
                      centerLon={testingZone.longitude}
                      radius={testingZone.raio_metros}
                      showCurrentLocation={true}
                      height="400px"
                    />
                    <Alert variant={isWithinTestZone ? 'default' : 'destructive'}>
                      {isWithinTestZone ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Você está dentro da zona permitida!</strong>
                            <br />
                            Distância do centro: {distance ? distance.toFixed(0) : 0} m
                            (máximo permitido: {testingZone.raio_metros} m)
                          </AlertDescription>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Você está fora da zona permitida!</strong>
                            <br />
                            Distância do centro: {distance ? distance.toFixed(0) : 0} m
                            (máximo permitido: {testingZone.raio_metros} m)
                            <br />
                            Você está {distance ? (distance - testingZone.raio_metros).toFixed(0) : 0} m além do limite.
                          </AlertDescription>
                        </>
                      )}
                    </Alert>
                    <div className="flex justify-end">
                      <Button onClick={() => handleTestZone(testingZone)} variant="outline">
                        <Navigation className="h-4 w-4 mr-2" />
                        Testar Novamente
                      </Button>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Não foi possível obter sua localização. Por favor, permita
                      o acesso ao GPS e tente novamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a zona "{deleteConfirm?.nome}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePage>
  );
}

