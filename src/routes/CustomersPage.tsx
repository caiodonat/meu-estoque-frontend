import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi, type CustomerResponse } from '@/api/endpoints';
import { EditCustomerDialog } from '@/components/EditCustomerDialog';
import { NewCustomerDialog } from '@/components/NewCustomerDialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CustomerResponse | null>(null);

  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const remove = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente excluído.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDelete(customer: CustomerResponse) {
    if (!confirm(`Excluir "${customer.name}"?`)) return;
    remove.mutate(customer.id);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <NewCustomerDialog />
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}
      {isError && <p className="text-red-500 text-sm">Erro ao carregar clientes.</p>}

      {customers && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}

              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.email ?? '—'}</TableCell>
                  <TableCell>{customer.document ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setEditing(customer)}
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(customer)}
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

      <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />
    </div>
  );
}