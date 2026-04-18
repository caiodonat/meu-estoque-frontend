import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagPicker } from '@/components/TagPicker';
import {
  positiveEntriesApi,
  positiveEntryCategoriesApi,
  positiveEntryTagsApi,
  serviceOrdersApi,
  type PositiveEntryResponse,
} from '@/api/endpoints';

const schema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  amount: z.string().min(1, 'Valor e obrigatorio'),
  date: z.string().min(1, 'Data e obrigatoria'),
  positiveEntryCategoryId: z.string().min(1, 'Categoria e obrigatoria'),
  serviceOrderId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  entry: PositiveEntryResponse | null;
  onClose: () => void;
}

export function EditPositiveEntryDialog({ entry, onClose }: Props) {
  const open = entry !== null;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['positive-entry-categories'],
    queryFn: positiveEntryCategoriesApi.list,
    enabled: open,
  });
  const { data: tags } = useQuery({
    queryKey: ['positive-entry-tags'],
    queryFn: () => positiveEntryTagsApi.list(false),
    enabled: open,
  });
  const { data: serviceOrders } = useQuery({
    queryKey: ['service-orders'],
    queryFn: serviceOrdersApi.list,
    enabled: open,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!entry) return;

    reset({
      description: entry.description,
      amount: String(entry.amount),
      date: entry.date.slice(0, 10),
      positiveEntryCategoryId: entry.positiveEntryCategoryId,
      serviceOrderId: entry.serviceOrderId,
    });
    setSelectedTags(entry.tagCodes ?? []);
  }, [entry, reset]);

  const selectedCategoryId = watch('positiveEntryCategoryId');
  const selectedCategory = categories?.find((category) => category.id === selectedCategoryId);
  const selectedServiceOrderId = watch('serviceOrderId');
  const selectedServiceOrder = serviceOrders?.find((serviceOrder) => serviceOrder.id === selectedServiceOrderId);
  const filteredTags = tags?.filter((tag) => tag.positiveEntryCategoryId === selectedCategoryId) ?? [];

  const update = useMutation({
    mutationFn: (data: FormData) => {
      const amount = parseFloat(data.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) throw new Error('O valor deve ser maior que zero');
      if (!selectedCategory) throw new Error('Selecione uma categoria de entrada');
      if (selectedCategory.label === 'OS' && !data.serviceOrderId) throw new Error('Selecione uma OS');
      if (selectedCategory.label === 'Avulsa' && selectedTags.length === 0) {
        throw new Error('Informe ao menos uma Tag de Entrada para receita avulsa');
      }

      return positiveEntriesApi.update(entry!.id, {
        description: data.description,
        amount,
        date: data.date,
        positiveEntryCategoryId: selectedCategory.id,
        serviceOrderId: selectedCategory.label === 'OS' ? data.serviceOrderId : undefined,
        tagCodes: selectedTags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positive-entries'] });
      toast.success('Entrada financeira atualizada!');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Entrada Financeira</DialogTitle>
        </DialogHeader>
        <form className="mt-2 space-y-4" onSubmit={handleSubmit((data) => update.mutate(data))}>
          <div className="space-y-1">
            <Label htmlFor="edit-positive-entry-description">Descricao</Label>
            <Input id="edit-positive-entry-description" {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-positive-entry-amount">Valor (R$)</Label>
              <Input id="edit-positive-entry-amount" type="number" step="0.01" min="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-positive-entry-date">Data</Label>
              <Input id="edit-positive-entry-date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Categoria de Entrada</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(value) => {
                setValue('positiveEntryCategoryId', value);
                setValue('serviceOrderId', undefined);
                setSelectedTags((prev) => prev.filter((code) => tags?.some((tag) => tag.code === code && tag.positiveEntryCategoryId === value) ?? false));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma categoria">
                  {selectedCategory?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.positiveEntryCategoryId && <p className="text-sm text-red-500">{errors.positiveEntryCategoryId.message}</p>}
          </div>

          {selectedCategory?.label === 'OS' ? (
            <div className="space-y-1">
              <Label>OS vinculada</Label>
              <Select value={selectedServiceOrderId ?? ''} onValueChange={(value) => setValue('serviceOrderId', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma OS">
                    {selectedServiceOrder ? `${selectedServiceOrder.budgetNumber} - ${selectedServiceOrder.customerName}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {serviceOrders?.map((serviceOrder) => (
                    <SelectItem key={serviceOrder.id} value={serviceOrder.id}>
                      {`${serviceOrder.budgetNumber} - ${serviceOrder.customerName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceOrderId && <p className="text-sm text-red-500">{errors.serviceOrderId.message}</p>}
            </div>
          ) : null}

          <TagPicker allTags={filteredTags} selected={selectedTags} onChange={setSelectedTags} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}