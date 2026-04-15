import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi, type CustomerRequest } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  document: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

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

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      document: '',
      address: '',
      notes: '',
    },
  });

  const create = useMutation({
    mutationFn: (data: FormData) => customersApi.create(toPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente cadastrado.');
      reset();
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Novo Cliente
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="customer-name">Nome</Label>
            <Input id="customer-name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="customer-phone">Telefone</Label>
              <Input id="customer-phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-document">Documento</Label>
              <Input id="customer-document" {...register('document')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="customer-email">E-mail</Label>
            <Input id="customer-email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="customer-address">Endereço</Label>
            <Input id="customer-address" {...register('address')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="customer-notes">Observações</Label>
            <Input id="customer-notes" {...register('notes')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}