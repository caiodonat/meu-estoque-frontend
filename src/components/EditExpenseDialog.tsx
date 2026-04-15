import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { expensesApi, tagsApi, type ExpenseResponse } from '@/api/endpoints';
import { TagPicker } from '@/components/TagPicker';

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  expense: ExpenseResponse | null;
  onClose: () => void;
}

export function EditExpenseDialog({ expense, onClose }: Props) {
  const queryClient = useQueryClient();
  const open = expense !== null;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (expense) {
      reset({
        description: expense.description,
        amount: String(expense.amount),
        date: expense.date.slice(0, 10),
      });
      setSelectedTags(expense.tagCodes ?? []);
    }
  }, [expense, reset]);

  const update = useMutation({
    mutationFn: (data: FormData) => {
      const amount = parseFloat(data.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) throw new Error('O valor deve ser maior que zero');
      return expensesApi.update(expense!.id, {
        description: data.description,
        amount,
        date: data.date,
        tagCodes: selectedTags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa atualizada!');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="edit-description">Descrição</Label>
            <Input id="edit-description" {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input id="edit-amount" type="number" step="0.01" min="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-date">Data</Label>
              <Input id="edit-date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
            </div>
          </div>

          <TagPicker
            allTags={tags ?? []}
            selected={selectedTags}
            onChange={setSelectedTags}
          />

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
