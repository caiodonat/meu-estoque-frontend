import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusIcon, CalendarIcon } from 'lucide-react';
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
import { tagsApi, expensesApi, type CreateExpenseRequest } from '@/api/endpoints';
import { TagPicker, type TagPickerHandle } from '@/components/TagPicker';

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
});

type FormData = z.infer<typeof schema>;

export function NewExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const descriptionRef = useRef<HTMLInputElement | null>(null);

  const [dateParts, setDateParts] = useState(() => {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const nativeDateRef = useRef<HTMLInputElement>(null);
  const tagPickerRef = useRef<TagPickerHandle>(null);

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
    enabled: open,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
    },
  });

  function buildDateString(parts: { day: number; month: number; year: number }) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }

  function updateDatePart(part: 'day' | 'month' | 'year', value: number) {
    setDateParts(prev => {
      const next = { ...prev, [part]: value };
      setValue('date', buildDateString(next));
      return next;
    });
  }

  function resetDateToToday() {
    const now = new Date();
    const parts = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
    setDateParts(parts);
    setValue('date', buildDateString(parts));
  }

  function handleDayKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') { e.preventDefault(); tagPickerRef.current?.focus(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); monthRef.current?.focus(); monthRef.current?.select(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); updateDatePart('day', dateParts.day < 31 ? dateParts.day + 1 : 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); updateDatePart('day', dateParts.day > 1 ? dateParts.day - 1 : 31); }
  }
  function handleMonthKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') { e.preventDefault(); tagPickerRef.current?.focus(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); dayRef.current?.focus(); dayRef.current?.select(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); yearRef.current?.focus(); yearRef.current?.select(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); updateDatePart('month', dateParts.month < 12 ? dateParts.month + 1 : 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); updateDatePart('month', dateParts.month > 1 ? dateParts.month - 1 : 12); }
  }
  function handleYearKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') { e.preventDefault(); tagPickerRef.current?.focus(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); monthRef.current?.focus(); monthRef.current?.select(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); updateDatePart('year', dateParts.year + 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); updateDatePart('year', dateParts.year - 1); }
  }

  function handleDayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    const v = parseInt(raw);
    if (!isNaN(v) && v >= 1 && v <= 31) {
      updateDatePart('day', v);
      if (raw.length === 2) { monthRef.current?.focus(); monthRef.current?.select(); }
    }
  }
  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    const v = parseInt(raw);
    if (!isNaN(v) && v >= 1 && v <= 12) {
      updateDatePart('month', v);
      if (raw.length === 2) { yearRef.current?.focus(); yearRef.current?.select(); }
    }
  }
  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(-4);
    const v = parseInt(raw);
    if (!isNaN(v) && v >= 2000 && v <= 2100) updateDatePart('year', v);
  }

  // registration with ref forwarding so we can focus description
  const { ref: descRef, ...descRest } = register('description');

  function buildPayload(data: FormData): CreateExpenseRequest {
    const amount = parseFloat(data.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) throw new Error('O valor deve ser maior que zero');
    return {
      description: data.description,
      amount,
      date: data.date,
      tagCodes: selectedTags.length > 0 ? selectedTags : undefined,
    };
  }

  const create = useMutation({
    mutationFn: (data: FormData) => expensesApi.create(buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa registrada!');
      reset();
      resetDateToToday();
      setSelectedTags([]);
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createAndContinue = useMutation({
    mutationFn: (data: FormData) => expensesApi.create(buildPayload(data)),
    onSuccess: (_result, data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa registrada!');
      // keep date, clear description/amount/tags
      reset({ description: '', amount: '', date: data.date });
      setSelectedTags([]);
      setTimeout(() => descriptionRef.current?.focus(), 50);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleClose() {
    reset();
    resetDateToToday();
    setSelectedTags([]);
    setOpen(false);
  }

  const isPending = create.isPending || createAndContinue.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Nova Despesa
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...descRest}
              ref={(el) => {
                descRef(el);
                descriptionRef.current = el;
              }}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <div className="flex items-center gap-0.5 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-within:ring-1 focus-within:ring-ring">
                <input
                  ref={dayRef}
                  type="text"
                  inputMode="numeric"
                  value={String(dateParts.day).padStart(2, '0')}
                  onChange={handleDayChange}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleDayKeyDown}
                  className="w-6 text-center outline-none bg-transparent"
                  maxLength={2}
                />
                <span className="text-muted-foreground select-none">/</span>
                <input
                  ref={monthRef}
                  type="text"
                  inputMode="numeric"
                  tabIndex={-1}
                  value={String(dateParts.month).padStart(2, '0')}
                  onChange={handleMonthChange}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleMonthKeyDown}
                  className="w-6 text-center outline-none bg-transparent"
                  maxLength={2}
                />
                <span className="text-muted-foreground select-none">/</span>
                <input
                  ref={yearRef}
                  type="text"
                  inputMode="numeric"
                  tabIndex={-1}
                  value={String(dateParts.year)}
                  onChange={handleYearChange}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleYearKeyDown}
                  className="w-12 text-center outline-none bg-transparent"
                  maxLength={4}
                />
                <input
                  ref={nativeDateRef}
                  type="date"
                  tabIndex={-1}
                  value={buildDateString(dateParts)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    const parts = { day: d, month: m, year: y };
                    setDateParts(parts);
                    setValue('date', buildDateString(parts));
                  }}
                  className="sr-only"
                  aria-hidden
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => nativeDateRef.current?.showPicker()}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Abrir calendário"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
            </div>
          </div>

          <TagPicker
            ref={tagPickerRef}
            allTags={tags ?? []}
            selected={selectedTags}
            onChange={setSelectedTags}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={handleSubmit((d) => createAndContinue.mutate(d))}
            >
              {createAndContinue.isPending ? 'Salvando...' : 'Salvar e continuar'}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleSubmit((d) => create.mutate(d))}
            >
              {create.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
