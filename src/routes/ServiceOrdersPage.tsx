import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, PrinterIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { serviceOrdersApi, type ServiceOrderResponse } from '@/api/endpoints';
import { EditServiceOrderDialog } from '@/components/EditServiceOrderDialog';
import { NewServiceOrderDialog } from '@/components/NewServiceOrderDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusLabels: Record<string, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  finalized: 'Finalizada',
  canceled: 'Cancelada',
};

const statusFilterLabels: Record<'all' | ServiceOrderResponse['status'], string> = {
  all: 'Todos',
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
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceOrderResponse['status']>('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [plateFilter, setPlateFilter] = useState('');
  const [entryDateFrom, setEntryDateFrom] = useState('');
  const [entryDateTo, setEntryDateTo] = useState('');

  const { data: serviceOrders, isLoading, isError } = useQuery({
    queryKey: ['service-orders'],
    queryFn: serviceOrdersApi.list,
  });

  const hasInvalidDateRange = Boolean(entryDateFrom && entryDateTo && entryDateFrom > entryDateTo);

  function normalizeText(value: string) {
    return value.trim().toLocaleLowerCase('pt-BR');
  }

  function getVehiclePlate(serviceOrder: ServiceOrderResponse) {
    return serviceOrder.vehicleDisplay.split(' - ')[0] ?? '';
  }

  const filteredServiceOrders = (serviceOrders ?? []).filter((serviceOrder) => {
    if (statusFilter !== 'all' && serviceOrder.status !== statusFilter) {
      return false;
    }

    if (customerFilter && !normalizeText(serviceOrder.customerName).includes(normalizeText(customerFilter))) {
      return false;
    }

    if (plateFilter && !normalizeText(getVehiclePlate(serviceOrder)).includes(normalizeText(plateFilter))) {
      return false;
    }

    if (hasInvalidDateRange) {
      return false;
    }

    const entryDate = serviceOrder.entryDate.slice(0, 10);

    if (entryDateFrom && entryDate < entryDateFrom) {
      return false;
    }

    if (entryDateTo && entryDate > entryDateTo) {
      return false;
    }

    return true;
  });

  function clearFilters() {
    setStatusFilter('all');
    setCustomerFilter('');
    setPlateFilter('');
    setEntryDateFrom('');
    setEntryDateTo('');
  }

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

      <div className="rounded-md border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pesquisa</h2>
            <p className="text-sm text-muted-foreground">Filtre por status, cliente, placa e intervalo de entrada.</p>
          </div>
          <Button type="button" variant="outline" onClick={clearFilters}>Limpar filtros</Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="service-order-plate-filter">Placa</Label>
            <Input
              id="service-order-plate-filter"
              value={plateFilter}
              onChange={(event) => setPlateFilter(event.target.value.toUpperCase())}
              placeholder="ABC1D23"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="service-order-customer-filter">Cliente</Label>
            <Input
              id="service-order-customer-filter"
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue>{statusFilterLabels[statusFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Aberta</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="finalized">Finalizada</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="service-order-entry-from">Entrada de</Label>
            <Input
              id="service-order-entry-from"
              type="date"
              value={entryDateFrom}
              onChange={(event) => setEntryDateFrom(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="service-order-entry-to">Entrada até</Label>
            <Input
              id="service-order-entry-to"
              type="date"
              value={entryDateTo}
              onChange={(event) => setEntryDateTo(event.target.value)}
            />
          </div>
        </div>

        {hasInvalidDateRange && (
          <p className="mt-3 text-sm text-red-500">A data inicial não pode ser maior que a data final.</p>
        )}
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
                <TableHead>Entrada</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServiceOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    {hasInvalidDateRange
                      ? 'Corrija o intervalo de datas para pesquisar.'
                      : 'Nenhuma ordem de serviço encontrada.'}
                  </TableCell>
                </TableRow>
              )}

              {filteredServiceOrders.map((serviceOrder) => (
                <TableRow key={serviceOrder.id}>
                  <TableCell className="font-medium">{serviceOrder.budgetNumber}</TableCell>
                  <TableCell>{serviceOrder.customerName}</TableCell>
                  <TableCell>{serviceOrder.vehicleDisplay}</TableCell>
                  <TableCell>{statusLabels[serviceOrder.status] ?? serviceOrder.status}</TableCell>
                  <TableCell>{budgetStatusLabels[serviceOrder.budgetStatus] ?? serviceOrder.budgetStatus}</TableCell>
                  <TableCell>{dateFormatter.format(new Date(serviceOrder.entryDate))}</TableCell>
                  <TableCell>{serviceOrder.closedAt ? dateFormatter.format(new Date(serviceOrder.closedAt)) : '-'}</TableCell>
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