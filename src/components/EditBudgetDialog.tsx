import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { budgetsApi, customersApi, paymentMethodsApi, vehiclesApi, type BudgetResponse } from '@/api/endpoints';
import { BudgetFormFields, budgetToFormValues, toBudgetPayload, type BudgetFormValues } from '@/components/BudgetForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const decimalPattern = /^\d+(?:[.,]\d{1,2})?$/;

const schema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  vehicleId: z.string().min(1, 'Veículo é obrigatório'),
  paymentMethodCode: z.string(),
  status: z.enum(['draft', 'issued', 'approved', 'refused', 'finalized', 'canceled']),
  discountAmount: z.string().refine((value) => decimalPattern.test(value), 'Desconto inválido'),
  partsWarranty: z.string(),
  laborWarranty: z.string(),
  entryDate: z.string().min(1, 'Data de entrada é obrigatória'),
  validUntil: z.string(),
  completedAt: z.string(),
  notes: z.string(),
  items: z.array(z.object({
    itemType: z.enum(['part', 'service']),
    description: z.string().min(1, 'Descrição é obrigatória'),
    quantity: z.string().refine((value) => decimalPattern.test(value) && Number(value.replace(',', '.')) > 0, 'Quantidade inválida'),
    unitPrice: z.string().refine((value) => decimalPattern.test(value) && Number(value.replace(',', '.')) >= 0, 'Valor inválido'),
    notes: z.string(),
  })).min(1, 'Adicione ao menos um item'),
});

interface Props {
  budget: BudgetResponse | null;
  onClose: () => void;
}

export function EditBudgetDialog({ budget, onClose }: Props) {
  const open = budget !== null;
  const queryClient = useQueryClient();
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: paymentMethodsApi.list });
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!budget) return;
    form.reset(budgetToFormValues(budget));
  }, [budget, form]);

  const update = useMutation({
    mutationFn: (values: BudgetFormValues) => budgetsApi.update(budget!.id, toBudgetPayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento atualizado.');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="top-1/2 left-1/2 h-[88vh] w-[92vw] max-w-[88rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl p-0 text-base sm:max-w-[88rem]">
        <div className="flex h-full min-h-0 flex-col p-4 text-base [&_[data-slot=button]]:text-sm [&_[data-slot=input]]:text-base [&_[data-slot=input]]:md:text-base [&_[data-slot=label]]:text-base [&_[data-slot=select-trigger]]:text-base [&_[data-slot=table]]:text-base sm:p-6">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle className="text-xl leading-tight sm:text-2xl">Editar Orçamento</DialogTitle>
          </DialogHeader>
          <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              <BudgetFormFields
                control={form.control}
                register={form.register}
                watch={form.watch}
                setValue={form.setValue}
                errors={form.formState.errors}
                customers={customers}
                vehicles={vehicles}
                paymentMethods={paymentMethods}
              />
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}