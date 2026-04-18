import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagPicker } from '@/components/TagPicker';
import {
  positiveEntriesApi,
  positiveEntryCategoriesApi,
  positiveEntryTagsApi,
  serviceOrdersApi,
  type CreatePositiveEntryRequest,
} from '@/api/endpoints';

const schema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  amount: z.string().min(1, 'Valor e obrigatorio'),
  date: z.string().min(1, 'Data e obrigatoria'),
  positiveEntryCategoryId: z.string().min(1, 'Categoria e obrigatoria'),
  serviceOrderId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function NewPositiveEntryDialog() {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['positive-entry-categories'],
    queryFn: positiveEntryCategoriesApi.list,
    enabled: open,
  });

  const { data: serviceOrders } = useQuery({
    queryKey: ['service-orders'],
    queryFn: serviceOrdersApi.list,
    enabled: open,
  });

  const { data: tags } = useQuery({
    queryKey: ['positive-entry-tags'],
    queryFn: () => positiveEntryTagsApi.list(false),
    enabled: open,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      positiveEntryCategoryId: '',
    },
  });

  const selectedCategoryId = watch('positiveEntryCategoryId');
  const selectedCategory = categories?.find((category) => category.id === selectedCategoryId);
  const selectedServiceOrderId = watch('serviceOrderId');
  const selectedServiceOrder = serviceOrders?.find((serviceOrder) => serviceOrder.id === selectedServiceOrderId);
  const filteredTags = tags?.filter((tag) => tag.positiveEntryCategoryId === selectedCategoryId) ?? [];

  useEffect(() => {
    if (open && !selectedCategoryId && categories?.[0]?.id) {
      setValue('positiveEntryCategoryId', categories[0].id);
    }
  }, [categories, open, selectedCategoryId, setValue]);

  function buildPayload(data: FormData): CreatePositiveEntryRequest {
    const amount = parseFloat(data.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) throw new Error('O valor deve ser maior que zero');
    if (!selectedCategory) throw new Error('Selecione uma categoria de entrada');
    if (selectedCategory.label === 'OS' && !data.serviceOrderId) throw new Error('Selecione uma OS');
    if (selectedCategory.label === 'Avulsa' && selectedTags.length === 0) {
      throw new Error('Informe ao menos uma Tag de Entrada para receita avulsa');
    }

    return {
      description: data.description,
      amount,
      date: data.date,
      positiveEntryCategoryId: selectedCategory.id,
      serviceOrderId: selectedCategory.label === 'OS' ? data.serviceOrderId : undefined,
      tagCodes: selectedTags.length > 0 ? selectedTags : undefined,
    };
  }

  const create = useMutation({
    mutationFn: (data: FormData) => positiveEntriesApi.create(buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positive-entries'] });
      toast.success('Entrada financeira registrada!');
      reset({ date: new Date().toISOString().slice(0, 10), positiveEntryCategoryId: categories?.[0]?.id ?? '' });
      setSelectedTags([]);
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleClose() {
    reset({ date: new Date().toISOString().slice(0, 10), positiveEntryCategoryId: categories?.[0]?.id ?? '' });
    setSelectedTags([]);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="mr-1 h-4 w-4" />
            Nova Entrada
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Entrada Financeira</DialogTitle>
        </DialogHeader>
        <form className="mt-2 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="positive-entry-description">Descricao</Label>
            <Input id="positive-entry-description" {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="positive-entry-amount">Valor (R$)</Label>
              <Input id="positive-entry-amount" type="number" step="0.01" min="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="positive-entry-date">Data</Label>
              <Input id="positive-entry-date" type="date" {...register('date')} />
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
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="button" disabled={create.isPending} onClick={handleSubmit((data) => create.mutate(data))}>
              {create.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}