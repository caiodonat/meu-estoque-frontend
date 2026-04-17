import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { summaryApi, expensesApi, type ExpenseResponse } from '@/api/endpoints';
import { FinancialCalendarCard } from '@/components/FinancialCalendarCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const RANKING_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16', '#64748b',
];

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
function monthEnd(year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${last}`;
}

type ActiveFilter =
  | { type: 'none' }
  | { type: 'category'; value: string }
  | { type: 'day'; value: number };

type RankedCategoryRow = {
  category: string;
  total: number;
  share: number;
  placeholderKey?: string;
};

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({ type: 'none' });

  function prevMonth() {
    setActiveFilter({ type: 'none' });
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setActiveFilter({ type: 'none' });
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const { data: monthly = [] } = useQuery({
    queryKey: ['summary', 'monthly'],
    queryFn: summaryApi.monthly,
  });

  const { data: byCategory = [] } = useQuery({
    queryKey: ['summary', 'byCategory', year, month],
    queryFn: () => summaryApi.byCategory(year, month),
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', 'dashboard', year, month],
    queryFn: () => expensesApi.list({
      startDate: monthStart(year, month),
      endDate: monthEnd(year, month),
    }),
  });

  const expenseList = expenses as ExpenseResponse[];

  // ---- derived ----
  const monthTotal = expenseList.reduce((s, e) => s + e.amount, 0);
  const noTagCount = expenseList.filter(e => !e.tagCodes?.length).length;

  // evolution — compact inline bars
  const evolutionData = [...monthly]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .slice(-6)
    .map(m => ({
      label: `${MONTH_NAMES[m.month - 1].slice(0, 3)}/${String(m.year).slice(2)}`,
      total: m.total,
      current: m.year === year && m.month === month,
    }));

  const categoryTotals = (byCategory as { category: string; total: number }[])
    .filter(category => category.total > 0)
    .toSorted((left, right) => right.total - left.total);

  const topCategoryData = categoryTotals
    .slice(0, 9)
    .map(category => ({
      ...category,
      share: monthTotal > 0 ? category.total / monthTotal : 0,
    }));

  const hiddenCategoryTotal = categoryTotals
    .slice(9)
    .reduce((sum, category) => sum + category.total, 0);

  const rankedCategoryData: RankedCategoryRow[] = [
    ...topCategoryData,
    ...(hiddenCategoryTotal > 0
      ? [{
          category: 'Outras categorias',
          total: hiddenCategoryTotal,
          share: monthTotal > 0 ? hiddenCategoryTotal / monthTotal : 0,
        }]
      : []),
  ];

  const displayedCategoryData: RankedCategoryRow[] = [
    ...rankedCategoryData,
    ...Array.from({ length: Math.max(0, 10 - rankedCategoryData.length) }, (_, index) => ({
      category: '—',
      total: 0,
      share: 0,
      placeholderKey: `placeholder-${index}`,
    })),
  ];

  const maxCategoryTotal = rankedCategoryData[0]?.total ?? 0;
  const filteredExpenses = expenseList.filter((expense) => {
    if (activeFilter.type === 'none') return true;
    if (activeFilter.type === 'category') return expense.categories?.includes(activeFilter.value) ?? false;
    if (activeFilter.type === 'day') return parseInt(expense.date.slice(8, 10), 10) === activeFilter.value;
    return true;
  });
  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  function getFilterTitle() {
    if (activeFilter.type === 'category') return `Despesas da categoria ${activeFilter.value}`;
    if (activeFilter.type === 'day') return `Despesas do dia ${String(activeFilter.value).padStart(2, '0')} de ${MONTH_NAMES[month - 1]}`;
    return `Despesas de ${MONTH_NAMES[month - 1]} ${year}`;
  }

  function getFilterMeta() {
    if (activeFilter.type === 'category') return `${filteredExpenses.length} ${filteredExpenses.length === 1 ? 'lançamento' : 'lançamentos'} — total: ${formatBRL(filteredTotal)}`;
    if (activeFilter.type === 'day') return `${filteredExpenses.length} ${filteredExpenses.length === 1 ? 'lançamento' : 'lançamentos'} — total: ${formatBRL(filteredTotal)}`;
    return `total: ${formatBRL(monthTotal)}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold flex-1">Dashboard</h1>
        <div className="flex items-center gap-2">
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

      {/* summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="h-full">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Total do mês</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold tabular-nums">{formatBRL(monthTotal)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Despesas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{expenseList.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Sem categoria</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{noTagCount}</p></CardContent>
        </Card>
      </div>

      {/* evolution — subtle inline strip */}
      {evolutionData.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-2">Evolução — últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={evolutionData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatBRL(Number(v))} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                {evolutionData.map((entry, i) => (
                  <Cell key={i} fill={entry.current ? '#6366f1' : '#c7d2fe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* category pie + calendar side by side */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        {/* by category */}
        <div className="h-full w-full min-w-0">
          <Card className="h-full w-full min-w-0">
            <CardHeader>
              <CardTitle className="text-sm">Top 10 categorias de gastos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {displayedCategoryData.map((category, index) => {
                  const width = maxCategoryTotal > 0 ? (category.total / maxCategoryTotal) * 100 : 0;
                  const isSelected = activeFilter.type === 'category' && activeFilter.value === category.category;
                  const isAggregatedRow = category.category === 'Outras categorias';
                  const isPlaceholderRow = category.category === '—';

                  return (
                    <div key={category.placeholderKey ?? category.category} className="space-y-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAggregatedRow || isPlaceholderRow) return;
                          setActiveFilter(isSelected ? { type: 'none' } : { type: 'category', value: category.category });
                        }}
                        className="flex w-full items-start justify-between gap-3 min-w-0 rounded-md text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-pressed={isSelected}
                        disabled={isAggregatedRow || isPlaceholderRow}
                      >
                        <div className="min-w-0 flex flex-1 items-start gap-2">
                          <span className="pt-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate text-sm font-medium">{category.category}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isPlaceholderRow
                                ? '—'
                                : `${formatPercent(category.share)} do total do mês${isAggregatedRow ? ' (agregado)' : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{isPlaceholderRow ? '—' : formatBRL(category.total)}</p>
                        </div>
                      </button>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${width}%`,
                            backgroundColor: RANKING_COLORS[index % RANKING_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <FinancialCalendarCard
          className="h-full"
          style={{ height: '664px' }}
          year={year}
          month={month}
          expenses={expenseList}
          selectedDay={activeFilter.type === 'day' ? activeFilter.value : null}
          onDaySelect={(day) => setActiveFilter(day === null ? { type: 'none' } : { type: 'day', value: day })}
        />
      </div>

      {/* expense list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {getFilterTitle()}
            <span className="ml-2 text-muted-foreground font-normal">
              — {getFilterMeta()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeFilter.type !== 'none' && (
            <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
              <p className="text-muted-foreground">Resultado filtrado a partir da seleção no Top 10 ou no calendário.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveFilter({ type: 'none' })}>
                Limpar seleção
              </Button>
            </div>
          )}
          {isLoading
            ? <p className="px-4 py-3 text-sm text-muted-foreground">Carregando...</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lançamento</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhuma despesa encontrada para a seleção atual.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredExpenses
                    .toSorted((left, right) => right.date.localeCompare(left.date))
                    .map(e => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(e.date).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="font-medium leading-snug">{e.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {e.tagCodes?.length
                            ? e.tagCodes.map(t => <Badge key={t} variant="outline">{t}</Badge>)
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
