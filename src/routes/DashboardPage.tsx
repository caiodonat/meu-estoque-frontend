import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { expensesApi, positiveEntriesApi, type ExpenseResponse, type PositiveEntryResponse } from '@/api/endpoints';
import type { FinancialCalendarItem } from '@/components/FinancialCalendarCard';
import { FinancialCalendarCard } from '@/components/FinancialCalendarCard';
import { EditExpenseDialog } from '@/components/EditExpenseDialog';
import { EditPositiveEntryDialog } from '@/components/EditPositiveEntryDialog';
import { NewExpenseDialog } from '@/components/NewExpenseDialog';
import { NewPositiveEntryDialog } from '@/components/NewPositiveEntryDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const RANKING_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];
const ENTRY_RANKING_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];

type MovementMode = 'expenses' | 'entries' | 'combined';
type MovementType = 'expense' | 'entry';

type ActiveFilter =
  | { type: 'none' }
  | { type: 'day'; value: number }
  | { type: 'expense-category'; value: string }
  | { type: 'entry-category'; value: string };

type FinancialMovement = {
  id: string;
  type: MovementType;
  date: string;
  description: string;
  signedAmount: number;
  absoluteAmount: number;
  classification: string;
  origin: string;
  tagCodes: string[];
  summaryItems: string[];
  expense?: ExpenseResponse;
  entry?: PositiveEntryResponse;
};

type RankingRow = {
  label: string;
  total: number;
};

interface Props {
  initialMode?: MovementMode;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatSignedBRL(value: number) {
  const absolute = Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return value < 0 ? `- ${absolute}` : absolute;
}

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${last}`;
}

function buildExpenseMovements(expenses: ExpenseResponse[]): FinancialMovement[] {
  return expenses.map((expense) => {
    const classification = expense.categories?.[0] ?? 'Sem categoria';
    const summaryItems = expense.categories?.length
      ? expense.categories
      : expense.tagCodes?.length
        ? expense.tagCodes
        : [expense.description];

    return {
      id: expense.id,
      type: 'expense',
      date: expense.date,
      description: expense.description,
      signedAmount: -expense.amount,
      absoluteAmount: expense.amount,
      classification,
      origin: classification,
      tagCodes: expense.tagCodes ?? [],
      summaryItems,
      expense,
    };
  });
}

function buildEntryMovements(entries: PositiveEntryResponse[]): FinancialMovement[] {
  return entries
    .filter((entry) => !entry.isDeleted)
    .map((entry) => ({
      id: entry.id,
      type: 'entry',
      date: entry.date,
      description: entry.description,
      signedAmount: entry.amount,
      absoluteAmount: entry.amount,
      classification: entry.positiveEntryCategoryLabel,
      origin: entry.serviceOrderBudgetNumber ? `OS ${entry.serviceOrderBudgetNumber}` : 'Avulsa',
      tagCodes: entry.tagCodes,
      summaryItems: entry.tagCodes.length > 0 ? entry.tagCodes : [entry.positiveEntryCategoryLabel],
      entry,
    }));
}

function sortMovements(movements: FinancialMovement[]) {
  return movements.toSorted((left, right) => {
    const byDate = right.date.localeCompare(left.date);
    if (byDate !== 0) return byDate;
    return right.id.localeCompare(left.id);
  });
}

function aggregateRankings(movements: FinancialMovement[], type: MovementType): RankingRow[] {
  const totals = new Map<string, number>();

  for (const movement of movements) {
    if (movement.type !== type) continue;
    const current = totals.get(movement.classification) ?? 0;
    totals.set(movement.classification, current + movement.absoluteAmount);
  }

  return Array.from(totals.entries())
    .map(([label, total]) => ({ label, total }))
    .toSorted((left, right) => right.total - left.total);
}

function getPageTitle(mode: MovementMode) {
  if (mode === 'expenses') return 'Movimentações Financeiras — Gastos';
  if (mode === 'entries') return 'Movimentações Financeiras — Entradas';
  return 'Movimentações Financeiras';
}

function getPageDescription(mode: MovementMode) {
  if (mode === 'expenses') return 'Visualize os gastos do mês com calendário, ranking e ações rápidas.';
  if (mode === 'entries') return 'Visualize as entradas do mês com calendário, ranking e ações rápidas.';
  return 'Acompanhe entradas, gastos e saldo em uma única visão operacional.';
}

function getListTitle(mode: MovementMode, activeFilter: ActiveFilter, year: number, month: number) {
  if (activeFilter.type === 'expense-category') return `Gastos na categoria ${activeFilter.value}`;
  if (activeFilter.type === 'entry-category') return `Entradas na categoria ${activeFilter.value}`;
  if (activeFilter.type === 'day') return `Movimentações do dia ${String(activeFilter.value).padStart(2, '0')} de ${MONTH_NAMES[month - 1]}`;
  if (mode === 'expenses') return `Gastos de ${MONTH_NAMES[month - 1]} ${year}`;
  if (mode === 'entries') return `Entradas de ${MONTH_NAMES[month - 1]} ${year}`;
  return `Movimentações de ${MONTH_NAMES[month - 1]} ${year}`;
}

function RankingCard({
  title,
  rows,
  selectedValue,
  emptyMessage,
  onToggle,
  colorPalette,
}: {
  title: string;
  rows: RankingRow[];
  selectedValue: string | null;
  emptyMessage: string;
  onToggle: (value: string) => void;
  colorPalette: string[];
}) {
  const maxTotal = rows[0]?.total ?? 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}

        {rows.map((row, index) => {
          const width = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
          const isSelected = selectedValue === row.label;

          return (
            <button
              key={row.label}
              type="button"
              onClick={() => onToggle(row.label)}
              className={[
                'flex w-full flex-col gap-1.5 rounded-lg border border-transparent p-2 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'hover:bg-muted/40',
                isSelected ? 'border-primary/35 bg-accent shadow-sm ring-1 ring-inset ring-primary/25' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={['text-xs font-medium tabular-nums', isSelected ? 'text-primary' : 'text-muted-foreground'].join(' ')}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate text-sm font-medium">{row.label}</span>
                  </div>
                </div>
                <span className={['text-sm font-semibold tabular-nums', isSelected ? 'text-primary' : ''].join(' ')}>
                  {formatBRL(row.total)}
                </span>
              </div>
              <div className={['h-2 w-full overflow-hidden rounded-full', isSelected ? 'bg-primary/15' : 'bg-muted'].join(' ')}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: colorPalette[index % colorPalette.length],
                  }}
                />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage({ initialMode = 'combined' }: Props) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState<MovementMode>(initialMode);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({ type: 'none' });
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [editingEntry, setEditingEntry] = useState<PositiveEntryResponse | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setActiveFilter({ type: 'none' });
  }, [initialMode]);

  function prevMonth() {
    setActiveFilter({ type: 'none' });
    if (month === 1) {
      setYear((current) => current - 1);
      setMonth(12);
      return;
    }

    setMonth((current) => current - 1);
  }

  function nextMonth() {
    setActiveFilter({ type: 'none' });
    if (month === 12) {
      setYear((current) => current + 1);
      setMonth(1);
      return;
    }

    setMonth((current) => current + 1);
  }

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', 'dashboard', year, month],
    queryFn: () => expensesApi.list({
      startDate: monthStart(year, month),
      endDate: monthEnd(year, month),
    }),
  });

  const { data: positiveEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['positive-entries', 'dashboard', year, month],
    queryFn: () => positiveEntriesApi.list({
      startDate: monthStart(year, month),
      endDate: monthEnd(year, month),
    }),
  });

  const deleteExpense = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Gasto excluído.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteEntry = useMutation({
    mutationFn: positiveEntriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positive-entries'] });
      toast.success('Entrada excluída.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const expenseMovements = useMemo(() => buildExpenseMovements(expenses as ExpenseResponse[]), [expenses]);
  const entryMovements = useMemo(() => buildEntryMovements(positiveEntries as PositiveEntryResponse[]), [positiveEntries]);

  const visibleMovements = useMemo(() => {
    if (mode === 'expenses') return expenseMovements;
    if (mode === 'entries') return entryMovements;
    return sortMovements([...expenseMovements, ...entryMovements]);
  }, [entryMovements, expenseMovements, mode]);

  const monthExpenseTotal = useMemo(
    () => expenseMovements.reduce((sum, movement) => sum + movement.absoluteAmount, 0),
    [expenseMovements]
  );
  const monthEntryTotal = useMemo(
    () => entryMovements.reduce((sum, movement) => sum + movement.absoluteAmount, 0),
    [entryMovements]
  );
  const monthBalance = monthEntryTotal - monthExpenseTotal;

  const expenseRanking = useMemo(() => aggregateRankings(expenseMovements, 'expense').slice(0, 6), [expenseMovements]);
  const entryRanking = useMemo(() => aggregateRankings(entryMovements, 'entry').slice(0, 6), [entryMovements]);

  const filteredMovements = useMemo(() => {
    return visibleMovements.filter((movement) => {
      if (activeFilter.type === 'none') return true;
      if (activeFilter.type === 'day') return parseInt(movement.date.slice(8, 10), 10) === activeFilter.value;
      if (activeFilter.type === 'expense-category') return movement.type === 'expense' && movement.classification === activeFilter.value;
      if (activeFilter.type === 'entry-category') return movement.type === 'entry' && movement.classification === activeFilter.value;
      return true;
    });
  }, [activeFilter, visibleMovements]);

  const calendarItems = useMemo<FinancialCalendarItem[]>(() => {
    const sourceMovements = mode === 'expenses'
      ? expenseMovements
      : mode === 'entries'
        ? entryMovements
        : sortMovements([...expenseMovements, ...entryMovements]);

    return sourceMovements.map((movement) => ({
      id: movement.id,
      date: movement.date,
      amount: movement.signedAmount,
      description: movement.description,
      summaryItems: movement.summaryItems,
    }));
  }, [entryMovements, expenseMovements, mode]);

  const loading = expensesLoading || entriesLoading;
  const filteredNetTotal = filteredMovements.reduce((sum, movement) => sum + movement.signedAmount, 0);

  function toggleExpenseCategory(value: string) {
    setActiveFilter((current) => current.type === 'expense-category' && current.value === value
      ? { type: 'none' }
      : { type: 'expense-category', value });
  }

  function toggleEntryCategory(value: string) {
    setActiveFilter((current) => current.type === 'entry-category' && current.value === value
      ? { type: 'none' }
      : { type: 'entry-category', value });
  }

  function handleDelete(movement: FinancialMovement) {
    if (!confirm(`Excluir "${movement.description}"?`)) return;

    if (movement.type === 'expense' && movement.expense) {
      deleteExpense.mutate(movement.expense.id);
      return;
    }

    if (movement.type === 'entry' && movement.entry) {
      deleteEntry.mutate(movement.entry.id);
    }
  }

  const selectedExpenseCategory = activeFilter.type === 'expense-category' ? activeFilter.value : null;
  const selectedEntryCategory = activeFilter.type === 'entry-category' ? activeFilter.value : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl font-semibold">{getPageTitle(mode)}</h1>
            <p className="text-sm text-muted-foreground">{getPageDescription(mode)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={mode === 'combined' ? 'default' : 'outline'} onClick={() => { setMode('combined'); setActiveFilter({ type: 'none' }); }}>
              Consolidado
            </Button>
            <Button size="sm" variant={mode === 'expenses' ? 'default' : 'outline'} onClick={() => { setMode('expenses'); setActiveFilter({ type: 'none' }); }}>
              Gastos
            </Button>
            <Button size="sm" variant={mode === 'entries' ? 'default' : 'outline'} onClick={() => { setMode('entries'); setActiveFilter({ type: 'none' }); }}>
              Entradas
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode !== 'entries' && <NewExpenseDialog />}
          {mode !== 'expenses' && <NewPositiveEntryDialog />}
          <div className="ml-0 flex items-center gap-2 lg:ml-4">
            <Button size="icon-sm" variant="outline" onClick={prevMonth}>
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button size="icon-sm" variant="outline" onClick={nextMonth}>
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="sm:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">Resumo do mês</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 pt-0">
          <div className="min-w-0 rounded-lg bg-emerald-50 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-700/80">Entradas</p>
            <p className="mt-1 truncate text-base font-bold tabular-nums text-emerald-700">{formatBRL(monthEntryTotal)}</p>
          </div>
          <div className="min-w-0 rounded-lg bg-rose-50 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-rose-700/80">Gastos</p>
            <p className="mt-1 truncate text-base font-bold tabular-nums text-rose-700">{formatBRL(monthExpenseTotal)}</p>
          </div>
          <div className="min-w-0 rounded-lg bg-slate-100 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">Saldo</p>
            <p className={[
              'mt-1 truncate text-base font-bold tabular-nums',
              monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700',
            ].join(' ')}>
              {formatSignedBRL(monthBalance)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="hidden gap-4 sm:grid sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Entradas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatBRL(monthEntryTotal)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Gastos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-rose-700 tabular-nums">{formatBRL(monthExpenseTotal)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent>
            <p className={['text-2xl font-bold tabular-nums', monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
              {formatSignedBRL(monthBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid grid-cols-1 gap-4">
          {mode === 'combined' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RankingCard
                title="Top categorias de gastos"
                rows={expenseRanking}
                selectedValue={selectedExpenseCategory}
                emptyMessage="Nenhum gasto no período."
                onToggle={toggleExpenseCategory}
                colorPalette={RANKING_COLORS}
              />
              <RankingCard
                title="Top categorias de entradas"
                rows={entryRanking}
                selectedValue={selectedEntryCategory}
                emptyMessage="Nenhuma entrada no período."
                onToggle={toggleEntryCategory}
                colorPalette={ENTRY_RANKING_COLORS}
              />
            </div>
          ) : mode === 'expenses' ? (
            <RankingCard
              title="Top categorias de gastos"
              rows={expenseRanking}
              selectedValue={selectedExpenseCategory}
              emptyMessage="Nenhum gasto no período."
              onToggle={toggleExpenseCategory}
              colorPalette={RANKING_COLORS}
            />
          ) : (
            <RankingCard
              title="Top categorias de entradas"
              rows={entryRanking}
              selectedValue={selectedEntryCategory}
              emptyMessage="Nenhuma entrada no período."
              onToggle={toggleEntryCategory}
              colorPalette={ENTRY_RANKING_COLORS}
            />
          )}
        </div>

        <FinancialCalendarCard
          year={year}
          month={month}
          items={calendarItems}
          title={mode === 'combined' ? 'Calendário do saldo diário' : mode === 'expenses' ? 'Calendário de gastos' : 'Calendário de entradas'}
          selectedDay={activeFilter.type === 'day' ? activeFilter.value : null}
          onDaySelect={(day) => setActiveFilter(day === null ? { type: 'none' } : { type: 'day', value: day })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {getListTitle(mode, activeFilter, year, month)}
            <span className="ml-2 text-muted-foreground font-normal">— resultado: {formatSignedBRL(filteredNetTotal)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeFilter.type !== 'none' && (
            <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
              <p className="text-muted-foreground">Resultado filtrado a partir do ranking ou do calendário.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveFilter({ type: 'none' })}>
                Limpar seleção
              </Button>
            </div>
          )}

          {loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma movimentação encontrada para a seleção atual.
                    </TableCell>
                  </TableRow>
                )}

                {filteredMovements.map((movement) => (
                  <TableRow key={`${movement.type}-${movement.id}`}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(movement.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={movement.type === 'expense' ? 'destructive' : 'default'}>
                            {movement.type === 'expense' ? 'Gasto' : 'Entrada'}
                          </Badge>
                          <p className="font-medium leading-snug">{movement.description}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{movement.origin}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.classification}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {movement.tagCodes.length > 0
                          ? movement.tagCodes.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className={['text-right font-mono', movement.type === 'expense' ? 'text-rose-700' : 'text-emerald-700'].join(' ')}>
                      {formatSignedBRL(movement.signedAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            if (movement.type === 'expense' && movement.expense) {
                              setEditingExpense(movement.expense);
                              return;
                            }

                            if (movement.type === 'entry' && movement.entry) {
                              setEditingEntry(movement.entry);
                            }
                          }}
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(movement)}
                          title="Excluir"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditExpenseDialog expense={editingExpense} onClose={() => setEditingExpense(null)} />
      <EditPositiveEntryDialog entry={editingEntry} onClose={() => setEditingEntry(null)} />
    </div>
  );
}
