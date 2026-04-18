import type { CSSProperties } from 'react';
import { Card } from '@/components/ui/card';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatBRLCompact(value: number) {
  const absoluteValue = Math.abs(value);
  const prefix = value < 0 ? '-' : '';

  if (absoluteValue >= 1000) return `${prefix}R$${(absoluteValue / 1000).toFixed(1)}k`;
  return `${prefix}${absoluteValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
}

function formatDayMobileSummary(value: number) {
  const absoluteValue = Math.abs(value);
  const prefix = value < 0 ? '-' : '';

  if (absoluteValue >= 1000) return `${prefix}${(absoluteValue / 1000).toFixed(1)}k`;
  return `${prefix}${Math.round(absoluteValue).toLocaleString('pt-BR')}`;
}

export interface FinancialCalendarItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  summaryItems?: string[];
}

function getDaySummaryItems(items: FinancialCalendarItem[]): string[] {
  const explicitItems = Array.from(new Set(items.flatMap((item) => item.summaryItems ?? []).filter(Boolean)));
  if (explicitItems.length > 0) return explicitItems;

  return Array.from(new Set(items.map((item) => item.description).filter(Boolean)));
}

function byDay(items: FinancialCalendarItem[]): Map<number, FinancialCalendarItem[]> {
  const map = new Map<number, FinancialCalendarItem[]>();

  for (const item of items) {
    const day = parseInt(item.date.slice(8, 10), 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(item);
  }

  return map;
}

interface Props {
  year: number;
  month: number;
  items: FinancialCalendarItem[];
  className?: string;
  style?: CSSProperties;
  title?: string;
  selectedDay?: number | null;
  onDaySelect?: (day: number | null) => void;
}

export function FinancialCalendarCard({
  year,
  month,
  items,
  className,
  style,
  title = 'Calendário financeiro',
  selectedDay = null,
  onDaySelect,
}: Props) {
  const now = new Date();

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const itemsByDay = byDay(items);
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : null;
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);
  const desktopCalendarGridStyle: CSSProperties = {
    gridTemplateRows: `auto repeat(${weekCount}, minmax(0, 1fr))`,
  };

  return (
    <Card className={['h-full w-full min-w-0 pb-0', className].filter(Boolean).join(' ')} style={style}>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col px-4 pb-4">
        <div className="shrink-0 pb-4">
          <h3 className="font-heading text-sm font-medium leading-snug">{title}</h3>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden xl:overflow-x-auto">
          <div
            className="grid h-full min-h-0 min-w-0 gap-0 xl:min-w-[28rem]"
            style={desktopCalendarGridStyle}
          >
            <div className="mb-0.5 grid grid-cols-7 divide-x divide-border border-b pb-1">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-1 text-center text-[10px] font-medium text-muted-foreground sm:text-xs">{weekday}</div>
              ))}
            </div>

            {Array.from({ length: weekCount }, (_, weekIndex) => {
              const isLastRow = weekIndex === weekCount - 1;

              return (
                <div
                  key={`week-${weekIndex}`}
                  className={[
                    'grid h-full min-h-0 grid-cols-7 divide-x divide-border',
                    !isLastRow ? 'border-b border-border/40' : '',
                  ].join(' ')}
                >
                  {Array.from({ length: 7 }, (_, columnIndex) => {
                    const cellIndex = weekIndex * 7 + columnIndex;
                    const day = cellIndex - firstWeekday + 1;

                    if (day < 1 || day > daysInMonth) {
                      return <div key={`empty-${cellIndex}`} className="h-full min-h-[56px] sm:min-h-[72px] lg:min-h-0" />;
                    }

                    const dayItems = itemsByDay.get(day);
                    const total = dayItems?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
                    const isToday = day === today;
                    const isSelected = day === selectedDay;
                    const hasItems = Boolean(dayItems?.length);
                    const daySummaryItems = dayItems ? getDaySummaryItems(dayItems) : [];
                    const visibleSummaryItems = daySummaryItems.slice(0, 3);
                    const hiddenSummaryCount = Math.max(0, daySummaryItems.length - visibleSummaryItems.length);
                    const amountToneClass = total > 0
                      ? (isSelected ? 'text-primary-foreground/80' : 'text-emerald-700')
                      : total < 0
                        ? (isSelected ? 'text-primary-foreground/80' : 'text-rose-700')
                        : (isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground');

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onDaySelect?.(isSelected ? null : day)}
                        className={[
                          'relative flex h-full min-h-[56px] w-full flex-col items-start p-1 text-xs transition-colors sm:min-h-[72px] sm:p-1.5 lg:min-h-0',
                          'hover:bg-accent',
                          isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
                          isToday && !isSelected ? 'ring-1 ring-inset ring-primary' : '',
                        ].join(' ')}
                      >
                        <div className="flex h-full w-full flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold leading-none sm:text-sm">{day}</span>
                            {hasItems && (
                              <>
                                <span className={[
                                  'text-[10px] tabular-nums leading-none sm:hidden',
                                  amountToneClass,
                                ].join(' ')}>
                                  {formatDayMobileSummary(total)}
                                </span>
                                <span className={[
                                  'hidden text-[11px] tabular-nums leading-snug sm:inline',
                                  amountToneClass,
                                ].join(' ')}>
                                  {formatBRLCompact(total)}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="mt-1 flex w-full flex-1 flex-col items-end gap-1 overflow-hidden text-right">
                            {hasItems && (
                              visibleSummaryItems.map((item) => (
                                <span
                                  key={item}
                                  className={[
                                    'max-w-full truncate text-[10px] leading-tight',
                                    isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground/80',
                                  ].join(' ')}
                                >
                                  {item}
                                </span>
                              ))
                            )}
                            {hiddenSummaryCount > 0 && (
                              <span className={[
                                'max-w-full truncate text-[10px] leading-tight',
                                isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground/70',
                              ].join(' ')}>
                                +{hiddenSummaryCount} {hiddenSummaryCount === 1 ? 'item' : 'itens'}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}