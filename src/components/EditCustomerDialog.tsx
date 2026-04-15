import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { customersApi, type CustomerRequest, type CustomerResponse } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  document: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  customer: CustomerResponse | null;
  onClose: () => void;
}

function toPayload(data: FormData): CustomerRequest {
  return {
    name: data.name,
    phone: data.phone,
    email: data.email || undefined,
    document: data.document || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
  };
}

export function EditCustomerDialog({ customer, onClose }: Props) {
  const open = customer !== null;
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!customer) return;
    reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      document: customer.document ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    });
  }, [customer, reset]);

  const update = useMutation({
    mutationFn: (data: FormData) => customersApi.update(customer!.id, toPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente atualizado.');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => update.mutate(data))} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="edit-customer-name">Nome</Label>
            <Input id="edit-customer-name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-customer-phone">Telefone</Label>
              <Input id="edit-customer-phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-customer-document">Documento</Label>
              <Input id="edit-customer-document" {...register('document')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-customer-email">E-mail</Label>
            <Input id="edit-customer-email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-customer-address">Endereço</Label>
            <Input id="edit-customer-address" {...register('address')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-customer-notes">Observações</Label>
            <Input id="edit-customer-notes" {...register('notes')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}