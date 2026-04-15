import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { budgetsApi, type BudgetResponse } from '@/api/endpoints';
import { EditBudgetDialog } from '@/components/EditBudgetDialog';
import { NewBudgetDialog } from '@/components/NewBudgetDialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  issued: 'Emitido',
  approved: 'Aprovado',
  refused: 'Recusado',
  finalized: 'Finalizado',
  canceled: 'Cancelado',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BudgetResponse | null>(null);

  const { data: budgets, isLoading, isError } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.list,
  });

  const remove = useMutation({
    mutationFn: budgetsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento excluído.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDelete(budget: BudgetResponse) {
    if (!confirm(`Excluir orçamento ${budget.number}?`)) return;
    remove.mutate(budget.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Cadastre e mantenha orçamentos com peças e serviços.</p>
        </div>
        <NewBudgetDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-500">Erro ao carregar orçamentos.</p>}

      {budgets && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              )}

              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">{budget.number}</TableCell>
                  <TableCell>{budget.customerName}</TableCell>
                  <TableCell>{budget.vehicleDisplay}</TableCell>
                  <TableCell>{statusLabels[budget.status] ?? budget.status}</TableCell>
                  <TableCell>{dateFormatter.format(new Date(budget.entryDate))}</TableCell>
                  <TableCell>{currencyFormatter.format(budget.totalAmount)}</TableCell>
                  <TableCell>{budget.items.length}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(budget)} title="Editar">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(budget)} title="Excluir">
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

      <EditBudgetDialog budget={editing} onClose={() => setEditing(null)} />
    </div>
  );
}