import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { expensesApi, type ExpenseResponse } from '@/api/endpoints';
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

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

function byDay(expenses: ExpenseResponse[]): Map<number, ExpenseResponse[]> {
  const map = new Map<number, ExpenseResponse[]>();
  for (const e of expenses) {
    const day = parseInt(e.date.slice(8, 10), 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return map;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  function prevMonth() {
    setSelectedDay(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', 'calendar', year, month],
    queryFn: () => expensesApi.list({
      startDate: monthStart(year, month),
      endDate: monthEnd(year, month),
    }),
  });

  const expenseList = expenses as ExpenseResponse[];
  const monthTotal = expenseList.reduce((s, e) => s + e.amount, 0);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const expensesByDay = byDay(expenseList);
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : null;

  const dayExpenses = selectedDay !== null ? (expensesByDay.get(selectedDay) ?? []) : [];

  // build week rows
  const totalCells = firstWeekday + daysInMonth;
  const weekCount = Math.ceil(totalCells / 7);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold flex-1">Calendário</h1>
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

      {/* calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {MONTH_NAMES[month - 1]} {year}
            <span className="ml-2 text-muted-foreground font-normal">
              — {formatBRL(monthTotal)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* weekday headers */}
          <div className="grid grid-cols-7 divide-x divide-border border-b pb-1 mb-0.5">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* week rows with separators */}
          {(() => {
            const rows = [];
            for (let w = 0; w < weekCount; w++) {
              const isLastRow = w === weekCount - 1;
              const cells = [];
              for (let col = 0; col < 7; col++) {
                const cellIndex = w * 7 + col;
                const day = cellIndex - firstWeekday + 1;
                if (day < 1 || day > daysInMonth) {
                  cells.push(<div key={`e-${cellIndex}`} className="min-h-[72px]" />);
                } else {
                  const dayExps = expensesByDay.get(day);
                  const total = dayExps?.reduce((s, e) => s + e.amount, 0) ?? 0;
                  const isToday = day === today;
                  const isSelected = day === selectedDay;
                  const hasExpenses = !!dayExps?.length;
                  cells.push(
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={[
                        'relative flex flex-col items-start w-full min-h-[72px] p-1.5 text-xs transition-colors',
                        'hover:bg-accent',
                        isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
                        isToday && !isSelected ? 'ring-1 ring-inset ring-primary' : '',
                      ].join(' ')}
                    >
                      <span className="font-semibold text-sm leading-none mb-1">{day}</span>
                      {hasExpenses && (
                        <span className={[
                          'text-[11px] tabular-nums leading-snug',
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                        ].join(' ')}>
                          {formatBRLCompact(total)}
                        </span>
                      )}
                      {hasExpenses && (
                        <span className={[
                          'text-[10px] leading-none mt-0.5',
                          isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground/60',
                        ].join(' ')}>
                          {dayExps!.length} {dayExps!.length === 1 ? 'despesa' : 'despesas'}
                        </span>
                      )}
                    </button>
                  );
                }
              }
              rows.push(
                <div
                  key={`week-${w}`}
                  className={['grid grid-cols-7 divide-x divide-border', !isLastRow ? 'border-b border-border/40' : ''].join(' ')}
                >
                  {cells}
                </div>
              );
            }
            return rows;
          })()}

          {/* day detail */}
          {selectedDay !== null && (
            <div className="mt-4 border-t pt-3 space-y-1.5">
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

      {/* expense table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Despesas de {MONTH_NAMES[month - 1]} {year}
            <span className="ml-2 text-muted-foreground font-normal">
              — {expenseList.length} {expenseList.length === 1 ? 'despesa' : 'despesas'}
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
