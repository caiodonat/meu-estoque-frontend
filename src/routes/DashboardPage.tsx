import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { summaryApi, expensesApi, type ExpenseResponse } from '@/api/endpoints';
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
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const PIE_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6',
  '#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16',
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

function formatBRLCompact(value: number) {
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
function monthEnd(year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${last}`;
}

// group expenses by day-of-month
function byDay(expenses: ExpenseResponse[]): Map<number, ExpenseResponse[]> {
  const map = new Map<number, ExpenseResponse[]>();
  for (const e of expenses) {
    // date string is ISO "YYYY-MM-DD..." — parse day directly to avoid TZ shift
    const day = parseInt(e.date.slice(8, 10), 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return map;
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  function prevMonth() {
    setSelectedDay(null);
    setSelectedCategory(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    setSelectedCategory(null);
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
    .slice(0, 10)
    .map(category => ({
      ...category,
      share: monthTotal > 0 ? category.total / monthTotal : 0,
    }));

  const hiddenCategoryTotal = categoryTotals
    .slice(10)
    .reduce((sum, category) => sum + category.total, 0);

  const maxCategoryTotal = topCategoryData[0]?.total ?? 0;
  const expensesByCategory = expenseList.reduce((map, expense) => {
    for (const category of expense.categories ?? []) {
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(expense);
    }
    return map;
  }, new Map<string, ExpenseResponse[]>());
  const categoryExpenses = selectedCategory !== null ? (expensesByCategory.get(selectedCategory) ?? []) : [];

  // calendar
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const expensesByDay = byDay(expenseList);
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : null;

  const dayExpenses = selectedDay !== null ? (expensesByDay.get(selectedDay) ?? []) : [];

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
        <Card>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 10 categorias de gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topCategoryData.length === 0
              ? <p className="text-sm text-muted-foreground">Sem dados para o mês.</p>
              : (
                <>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Mostrando {topCategoryData.length} de {categoryTotals.length} categorias</span>
                      {hiddenCategoryTotal > 0 ? (
                        <span>Outras categorias: {formatBRL(hiddenCategoryTotal)}</span>
                      ) : null}
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={topCategoryData}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={2}
                          labelLine={false}
                        >
                          {topCategoryData.map((_entry, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatBRL(Number(value ?? 0))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {topCategoryData.map((category, index) => {
                      const width = maxCategoryTotal > 0 ? (category.total / maxCategoryTotal) * 100 : 0;
                      const isSelected = selectedCategory === category.category;

                      return (
                        <div key={category.category} className="space-y-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(isSelected ? null : category.category)}
                            className="flex w-full items-start justify-between gap-3 min-w-0 rounded-md text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-expanded={isSelected}
                          >
                            <div className="min-w-0 flex flex-1 items-start gap-2">
                              <span className="pt-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="truncate text-sm font-medium">{category.category}</span>
                                  <ChevronDownIcon className={[
                                    'size-4 shrink-0 text-muted-foreground transition-transform',
                                    isSelected ? 'rotate-180' : '',
                                  ].join(' ')} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatPercent(category.share)} do total do mês
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold tabular-nums">{formatBRL(category.total)}</p>
                            </div>
                          </button>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${width}%`,
                                backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                          </div>
                          {isSelected && (
                            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                {category.category} {' '}— {formatBRL(categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
                              </p>
                              {categoryExpenses.length === 0
                                ? <p className="text-xs text-muted-foreground">Nenhuma despesa encontrada para esta categoria.</p>
                                : categoryExpenses
                                  .toSorted((left, right) => right.date.localeCompare(left.date))
                                  .map(expense => (
                                    <div key={expense.id} className="flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium">{expense.description}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                          {new Date(expense.date).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        {expense.tagCodes?.map(tag => (
                                          <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">{tag}</Badge>
                                        ))}
                                      </div>
                                      <span className="text-xs font-mono tabular-nums flex-shrink-0">{formatBRL(expense.amount)}</span>
                                    </div>
                                  ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
          </CardContent>
        </Card>

        {/* calendar */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Calendário de gastos</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {/* weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            {/* days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* leading empty cells */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayExps = expensesByDay.get(day);
                const total = dayExps?.reduce((s, e) => s + e.amount, 0) ?? 0;
                const isToday = day === today;
                const isSelected = day === selectedDay;
                const hasExpenses = !!dayExps?.length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={[
                      'relative flex flex-col items-center rounded-md py-1 text-xs transition-colors',
                      'hover:bg-accent',
                      isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
                      isToday && !isSelected ? 'ring-1 ring-primary' : '',
                    ].join(' ')}
                  >
                    <span className="font-medium leading-none">{day}</span>
                    {hasExpenses && (
                      <span className={[
                        'mt-0.5 text-[10px] tabular-nums leading-none',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      ].join(' ')}>
                        {formatBRLCompact(total)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* day detail */}
            {selectedDay !== null && (
              <div className="mt-3 border-t pt-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {selectedDay} de {MONTH_NAMES[month - 1]}
                  {' '}— {formatBRL(dayExpenses.reduce((s, e) => s + e.amount, 0))}
                </p>
                {dayExpenses.length === 0
                  ? <p className="text-xs text-muted-foreground">Nenhuma despesa.</p>
                  : dayExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{e.description}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {e.tagCodes?.map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                        ))}
                      </div>
                      <span className="text-xs font-mono tabular-nums flex-shrink-0">{formatBRL(e.amount)}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* expense list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Despesas de {MONTH_NAMES[month - 1]} {year}
            <span className="ml-2 text-muted-foreground font-normal">
              — total: {formatBRL(monthTotal)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading
            ? <p className="px-4 py-3 text-sm text-muted-foreground">Carregando...</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma despesa neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                  {expenseList.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{e.description}</TableCell>
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
