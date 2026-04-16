import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, PrinterIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { serviceOrdersApi, type ServiceOrderResponse } from '@/api/endpoints';
import { EditServiceOrderDialog } from '@/components/EditServiceOrderDialog';
import { NewServiceOrderDialog } from '@/components/NewServiceOrderDialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusLabels: Record<string, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  finalized: 'Finalizada',
  canceled: 'Cancelada',
};

const budgetStatusLabels: Record<string, string> = {
  draft: 'Rascunho',
  issued: 'Emitido',
  approved: 'Aprovado',
  refused: 'Recusado',
  finalized: 'Finalizado',
  canceled: 'Cancelado',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

export default function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ServiceOrderResponse | null>(null);

  const { data: serviceOrders, isLoading, isError } = useQuery({
    queryKey: ['service-orders'],
    queryFn: serviceOrdersApi.list,
  });

  const remove = useMutation({
    mutationFn: async (serviceOrder: ServiceOrderResponse) => serviceOrdersApi.delete(serviceOrder.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Ordem de serviço excluída.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDelete(serviceOrder: ServiceOrderResponse) {
    if (!confirm(`Excluir a ordem de serviço do orçamento ${serviceOrder.budgetNumber}?`)) return;
    remove.mutate(serviceOrder);
  }

  function handlePrint(serviceOrder: ServiceOrderResponse) {
    const url = `/ordens-servico/impressao?id=${serviceOrder.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">Fluxo principal de atendimento com orçamento embutido.</p>
        </div>
        <NewServiceOrderDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-500">Erro ao carregar ordens de serviço.</p>}

      {serviceOrders && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orçamento vigente</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Status OS</TableHead>
                <TableHead>Status orçamento</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhuma ordem de serviço encontrada.
                  </TableCell>
                </TableRow>
              )}

              {serviceOrders.map((serviceOrder) => (
                <TableRow key={serviceOrder.id}>
                  <TableCell className="font-medium">{serviceOrder.budgetNumber}</TableCell>
                  <TableCell>{serviceOrder.customerName}</TableCell>
                  <TableCell>{serviceOrder.vehicleDisplay}</TableCell>
                  <TableCell>{statusLabels[serviceOrder.status] ?? serviceOrder.status}</TableCell>
                  <TableCell>{budgetStatusLabels[serviceOrder.budgetStatus] ?? serviceOrder.budgetStatus}</TableCell>
                  <TableCell>{dateFormatter.format(new Date(serviceOrder.openedAt))}</TableCell>
                  <TableCell>{currencyFormatter.format(serviceOrder.profitMargin)}</TableCell>
                  <TableCell>{currencyFormatter.format(serviceOrder.budgetTotalAmount)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => handlePrint(serviceOrder)} title="Imprimir">
                        <PrinterIcon className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(serviceOrder)} title="Editar">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(serviceOrder)} title="Excluir">
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditServiceOrderDialog serviceOrder={editing} onClose={() => setEditing(null)} />
    </div>
  );
}