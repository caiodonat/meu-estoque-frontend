import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { budgetsApi, customersApi, serviceOrdersApi, vehiclesApi } from '@/api/endpoints';
import { budgetItemsSchema } from '@/components/BudgetForm';
import { defaultServiceOrderValues, ServiceOrderFormFields, toServiceOrderBudgetPayload, toServiceOrderPayload, type ServiceOrderFormValues } from '@/components/ServiceOrderForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const schema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  vehicleId: z.string().min(1, 'Veículo é obrigatório'),
  paymentMethodCode: z.string(),
  status: z.enum(['draft', 'issued', 'approved', 'refused', 'finalized', 'canceled']),
  partsWarranty: z.string(),
  laborWarranty: z.string(),
  createdAt: z.string().min(1, 'Data de criação é obrigatória'),
  notes: z.string(),
  items: budgetItemsSchema,
  serviceOrderStatus: z.enum(['open', 'in_progress', 'finalized', 'canceled']),
  serviceOrderEntryDate: z.string().min(1, 'Data de entrada é obrigatória'),
  serviceOrderNotes: z.string(),
});

export function NewServiceOrderDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });
  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultServiceOrderValues(),
  });

  const create = useMutation({
    mutationFn: async (values: ServiceOrderFormValues) => {
      let budgetId: string | undefined;

      try {
        const createdBudget = await budgetsApi.create(toServiceOrderBudgetPayload(values));
        budgetId = createdBudget.id;
        await serviceOrdersApi.create(toServiceOrderPayload(values, budgetId));
      } catch (error) {
        if (budgetId) {
          try {
            await budgetsApi.delete(budgetId);
          } catch {
            // Best-effort rollback for the orphan budget.
          }
        }

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço cadastrada.');
      form.reset(defaultServiceOrderValues());
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="mr-1 h-4 w-4" />
            Nova OS
          </Button>
        }
      />
      <DialogContent className="top-1/2 left-1/2 h-[88vh] w-[92vw] max-w-[88rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl p-0 text-base sm:max-w-[88rem]">
        <div className="flex h-full min-h-0 flex-col p-4 text-base [&_[data-slot=button]]:text-sm [&_[data-slot=input]]:text-base [&_[data-slot=input]]:md:text-base [&_[data-slot=label]]:text-base [&_[data-slot=select-trigger]]:text-base [&_[data-slot=table]]:text-base sm:p-6">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle className="text-xl leading-tight sm:text-2xl">Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              <ServiceOrderFormFields
                control={form.control}
                register={form.register}
                watch={form.watch}
                setValue={form.setValue}
                errors={form.formState.errors}
                customers={customers}
                vehicles={vehicles}
              />
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Salvando...' : 'Salvar OS'}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}