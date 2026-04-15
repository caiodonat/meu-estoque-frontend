import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { vehiclesApi, type VehicleResponse } from '@/api/endpoints';
import { EditVehicleDialog } from '@/components/EditVehicleDialog';
import { NewVehicleDialog } from '@/components/NewVehicleDialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VehicleResponse | null>(null);

  const { data: vehicles, isLoading, isError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
  });

  const remove = useMutation({
    mutationFn: vehiclesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo excluído.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDelete(vehicle: VehicleResponse) {
    if (!confirm(`Excluir veículo ${vehicle.plate}?`)) return;
    remove.mutate(vehicle.id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Veículos</h1>
        <NewVehicleDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-500">Erro ao carregar veículos.</p>}

      {vehicles && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Chassi</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum veículo encontrado.
                  </TableCell>
                </TableRow>
              )}

              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.customerName}</TableCell>
                  <TableCell>{vehicle.plate}</TableCell>
                  <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                  <TableCell>{vehicle.year ?? '—'}</TableCell>
                  <TableCell>{vehicle.chassis ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setEditing(vehicle)}
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(vehicle)}
                        title="Excluir"
                      >
                        <Trash2Icon className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditVehicleDialog vehicle={editing} onClose={() => setEditing(null)} />
    </div>
  );
}