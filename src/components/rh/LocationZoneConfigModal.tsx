// =====================================================
// MODAL DE CONFIGURAÇÃO DE ZONA DE LOCALIZAÇÃO
// =====================================================
// Descrição: Modal para criar/editar zonas de localização onde é permitido registrar ponto

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocationZonesService, LocationZone, LocationZoneCreate } from '@/services/rh/locationZonesService';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { LocationZoneMap } from './LocationZoneMap';
import { GeolocationService } from '@/services/geolocationService';
import { MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const locationZoneSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
  latitude: z.number().min(-90).max(90, 'Latitude inválida'),
  longitude: z.number().min(-180).max(180, 'Longitude inválida'),
  raio_metros: z.number().min(10, 'Raio mínimo é 10 metros').max(10000, 'Raio máximo é 10km'),
  ativo: z.boolean().default(true),
});

type LocationZoneFormData = z.infer<typeof locationZoneSchema>;

interface LocationZoneConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone?: LocationZone | null;
  onSuccess?: () => void;
}

export function LocationZoneConfigModal({
  isOpen,
  onClose,
  zone,
  onSuccess
}: LocationZoneConfigModalProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const form = useForm<LocationZoneFormData>({
    resolver: zodResolver(locationZoneSchema),
    defaultValues: {
      nome: zone?.nome || '',
      descricao: zone?.descricao || '',
      latitude: zone?.latitude || 0,
      longitude: zone?.longitude || 0,
      raio_metros: zone?.raio_metros || 100,
      ativo: zone?.ativo ?? true,
    },
  });

  // Resetar form quando zone mudar
  useEffect(() => {
    if (zone) {
      form.reset({
        nome: zone.nome,
        descricao: zone.descricao || '',
        latitude: zone.latitude,
        longitude: zone.longitude,
        raio_metros: zone.raio_metros,
        ativo: zone.ativo,
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
        latitude: 0,
        longitude: 0,
        raio_metros: 100,
        ativo: true,
      });
    }
  }, [zone, form]);

  const createMutation = useMutation({
    mutationFn: async (data: LocationZoneFormData) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      const createData: LocationZoneCreate = {
        company_id: selectedCompany.id,
        nome: data.nome,
        descricao: data.descricao || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        raio_metros: data.raio_metros,
        ativo: data.ativo,
      };

      return await LocationZonesService.create(createData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-zones'] });
      toast({
        title: 'Zona criada',
        description: 'A zona de localização foi criada com sucesso.',
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar zona',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LocationZoneFormData) => {
      if (!selectedCompany?.id || !zone?.id) {
        throw new Error('Empresa ou zona não encontrada');
      }

      return await LocationZonesService.update(zone.id, selectedCompany.id, {
        nome: data.nome,
        descricao: data.descricao || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        raio_metros: data.raio_metros,
        ativo: data.ativo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-zones'] });
      toast({
        title: 'Zona atualizada',
        description: 'A zona de localização foi atualizada com sucesso.',
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar zona',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const handleGetCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const position = await GeolocationService.getCurrentPosition();
      form.setValue('latitude', position.latitude);
      form.setValue('longitude', position.longitude);
    } catch (error: any) {
      toast({
        title: 'Erro ao obter localização',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationSelect = (lat: number, lon: number) => {
    form.setValue('latitude', lat);
    form.setValue('longitude', lon);
  };

  const onSubmit = async (data: LocationZoneFormData) => {
    if (zone) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');
  const raio_metros = form.watch('raio_metros');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {zone ? 'Editar Zona de Localização' : 'Nova Zona de Localização'}
          </DialogTitle>
          <DialogDescription>
            {zone
              ? 'Configure a área onde é permitido registrar ponto'
              : 'Defina uma zona geográfica onde os colaboradores podem registrar ponto'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Campos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Zona *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Escritório Central" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nome identificador da zona
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="raio_metros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raio Permitido (metros) *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={10}
                          max={1000}
                          step={10}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                        <Input
                          type="number"
                          min={10}
                          max={10000}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Distância máxima permitida do ponto central
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição detalhada da zona..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mapa para seleção de localização */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Localização da Zona</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {isLoadingLocation ? 'Buscando...' : 'Usar Minha Localização'}
                </Button>
              </div>

              {latitude !== 0 && longitude !== 0 ? (
                <LocationZoneMap
                  centerLat={latitude}
                  centerLon={longitude}
                  radius={raio_metros}
                  onLocationSelect={handleLocationSelect}
                  editable={true}
                  height="400px"
                />
              ) : (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    Clique no mapa ou use "Usar Minha Localização" para definir o ponto central.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Zona Ativa</FormLabel>
                    <FormDescription>
                      Desative para impedir registros nesta zona
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : zone
                  ? 'Atualizar'
                  : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

