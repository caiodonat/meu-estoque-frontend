import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { customersApi, vehiclesApi, type VehicleRequest, type VehicleResponse } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const currentYear = new Date().getFullYear() + 1;

const schema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  plate: z.string().min(1, 'Placa é obrigatória'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  year: z.string().refine((value) => !value || (/^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= currentYear), 'Ano inválido'),
  engine: z.string().optional(),
  chassis: z.string().optional(),
  color: z.string().optional(),
  mileage: z.string().refine((value) => !value || /^\d+$/.test(value), 'Quilometragem inválida'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  vehicle: VehicleResponse | null;
  onClose: () => void;
}

function toPayload(data: FormData): VehicleRequest {
  return {
    customerId: data.customerId,
    plate: data.plate,
    brand: data.brand,
    model: data.model,
    year: data.year ? Number(data.year) : undefined,
    engine: data.engine || undefined,
    chassis: data.chassis || undefined,
    color: data.color || undefined,
    mileage: data.mileage ? Number(data.mileage) : undefined,
    notes: data.notes || undefined,
  };
}

export function EditVehicleDialog({ vehicle, onClose }: Props) {
  const open = vehicle !== null;
  const queryClient = useQueryClient();
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const selectedCustomerId = control._formValues.customerId;
  const selectedCustomer = customers?.find((customer) => customer.id === selectedCustomerId);

  useEffect(() => {
    if (!vehicle) return;
    reset({
      customerId: vehicle.customerId,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year?.toString() ?? '',
      engine: vehicle.engine ?? '',
      chassis: vehicle.chassis ?? '',
      color: vehicle.color ?? '',
      mileage: vehicle.mileage?.toString() ?? '',
      notes: vehicle.notes ?? '',
    });
  }, [vehicle, reset]);

  const update = useMutation({
    mutationFn: (data: FormData) => vehiclesApi.update(vehicle!.id, toPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo atualizado.');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => update.mutate(data))} className="mt-2 space-y-4">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isLoadingCustomers ? 'Carregando clientes...' : 'Selecione um cliente'}>
                      {selectedCustomer?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-sm text-red-500">{errors.customerId.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="edit-vehicle-plate">Placa</Label>
              <Input id="edit-vehicle-plate" {...register('plate')} />
              {errors.plate && <p className="text-sm text-red-500">{errors.plate.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-vehicle-brand">Marca</Label>
              <Input id="edit-vehicle-brand" {...register('brand')} />
              {errors.brand && <p className="text-sm text-red-500">{errors.brand.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-vehicle-model">Modelo</Label>
              <Input id="edit-vehicle-model" {...register('model')} />
              {errors.model && <p className="text-sm text-red-500">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-vehicle-year">Ano</Label>
              <Input id="edit-vehicle-year" inputMode="numeric" {...register('year')} />
              {errors.year && <p className="text-sm text-red-500">{errors.year.message}</p>}
            </div>
            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-vehicle-color">Cor</Label>
              <Input id="edit-vehicle-color" {...register('color')} />
            </div>
            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-vehicle-mileage">Quilometragem</Label>
              <Input id="edit-vehicle-mileage" inputMode="numeric" {...register('mileage')} />
              {errors.mileage && <p className="text-sm text-red-500">{errors.mileage.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-vehicle-engine">Motor</Label>
                <Input id="edit-vehicle-engine" {...register('engine')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-vehicle-chassis">Chassi</Label>
                <Input id="edit-vehicle-chassis" {...register('chassis')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-vehicle-notes">Observações</Label>
              <Textarea id="edit-vehicle-notes" rows={4} {...register('notes')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending || isLoadingCustomers}>
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}