import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PencilIcon, Trash2Icon, FilterIcon, XIcon } from 'lucide-react';
import { expensesApi, tagsApi, categoriesApi, type ExpenseResponse, type ExpenseFilters } from '@/api/endpoints';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NewExpenseDialog } from '@/components/NewExpenseDialog';
import { EditExpenseDialog } from '@/components/EditExpenseDialog';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ExpenseResponse | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [noCategory, setNoCategory] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [appliedFilters, setAppliedFilters] = useState<ExpenseFilters>({});

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: expenses, isLoading, isError } = useQuery({
    queryKey: ['expenses', appliedFilters],
    queryFn: () => expensesApi.list(appliedFilters),
  });

  const remove = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa excluída.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDelete(expense: ExpenseResponse) {
    if (!confirm(`Excluir "${expense.description}"?`)) return;
    remove.mutate(expense.id);
  }

  function toggleTag(code: string) {
    setSelectedTags((prev) =>
      prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]
    );
    setTagSearch('');
    // keep dropdown open so user can keep selecting
    tagInputRef.current?.focus();
  }

  function toggleCategory(tags: string[]) {
    setSelectedTags((prev) => {
      const allSelected = tags.every((t) => prev.includes(t));
      if (allSelected) return prev.filter((t) => !tags.includes(t));
      const toAdd = tags.filter((t) => !prev.includes(t));
      return [...prev, ...toAdd];
    });
    setTagSearch('');
    tagInputRef.current?.focus();
  }

  function removeTag(code: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== code));
  }

  function applyFilters() {
    setAppliedFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      tags: !noCategory && selectedTags.length > 0 ? selectedTags : undefined,
      noCategory: noCategory || undefined,
    });
  }

  function clearFilters() {
    setStartDate('');
    setEndDate('');
    setSelectedTags([]);
    setNoCategory(false);
    setTagSearch('');
    setAppliedFilters({});
  }

  const hasFilters = appliedFilters.startDate || appliedFilters.endDate || (appliedFilters.tags?.length ?? 0) > 0 || appliedFilters.noCategory;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Despesas</h1>
        <NewExpenseDialog />
      </div>

      {/* Filtros */}
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FilterIcon className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="startDate">Período — início</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                  const d = new Date(); d.setDate(1);
                  setStartDate(d.toISOString().slice(0, 10));
                }} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                  início do mês
                </button>
                <button type="button" onClick={() => setStartDate(new Date().toISOString().slice(0, 10))}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                  hoje
                </button>
              </div>
            </div>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="endDate">Período — término</Label>
              <button type="button" onClick={() => setEndDate(new Date().toISOString().slice(0, 10))}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                hoje
              </button>
            </div>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {allTags && allTags.length > 0 && (
          <div className="space-y-1">
            <Label>Tags / Categoria</Label>
            {/* sem categoria toggle */}
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => {
                  setNoCategory((v) => !v);
                  if (!noCategory) setSelectedTags([]);
                }}
                className="focus:outline-none"
              >
                <Badge variant={noCategory ? 'default' : 'outline'} className="cursor-pointer">
                  Sem categoria
                </Badge>
              </button>
            </div>
            {!noCategory && (
              <>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {selectedTags.map((code) => (
                      <Badge key={code} variant="default" className="gap-1">
                        {code}
                        <button
                          type="button"
                          onClick={() => removeTag(code)}
                          className="focus:outline-none hover:opacity-70"
                          aria-label={`Remover tag ${code}`}
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    ref={tagInputRef}
                    placeholder="Buscar tag ou categoria..."
                    value={tagSearch}
                    onChange={(e) => {
                      setTagSearch(e.target.value);
                      setTagDropdownOpen(true);
                    }}
                    onFocus={() => setTagDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
                    autoComplete="off"
                  />
                  {tagDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
                      {/* Categories section */}
                      {allCategories && allCategories
                        .filter((c) =>
                          tagSearch === '' ||
                          c.label.toLowerCase().includes(tagSearch.toLowerCase())
                        )
                        .map((cat) => {
                          const catTags = cat.tags.map((t) => t.code);
                          const allSelected = catTags.length > 0 && catTags.every((t) => selectedTags.includes(t));
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onMouseDown={() => toggleCategory(catTags)}
                              className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                              style={allSelected ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' } : undefined}
                            >
                              <span className="font-medium">{cat.label}</span>
                              <span className="text-xs text-muted-foreground">{catTags.length} tags</span>
                            </button>
                          );
                        })}
                      {/* Divider */}
                      {allCategories && allCategories.some((c) =>
                        tagSearch === '' || c.label.toLowerCase().includes(tagSearch.toLowerCase())
                      ) && (
                        <div className="border-t mx-2 my-0.5" />
                      )}
                      {/* Individual tags */}
                      {allTags
                        .filter(
                          (t) =>
                            tagSearch === '' ||
                            t.code.toLowerCase().includes(tagSearch.toLowerCase()) ||
                            t.categoryLabel.toLowerCase().includes(tagSearch.toLowerCase())
                        )
                        .map((t) => (
                          <button
                            key={t.code}
                            type="button"
                            onMouseDown={() => toggleTag(t.code)}
                            className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                            style={selectedTags.includes(t.code) ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' } : undefined}
                          >
                            <span>{t.code}</span>
                            <span className="text-xs text-muted-foreground">{t.categoryLabel}</span>
                          </button>
                        ))}
                      {allTags.filter(
                        (t) =>
                          tagSearch === '' ||
                          t.code.toLowerCase().includes(tagSearch.toLowerCase()) ||
                          t.categoryLabel.toLowerCase().includes(tagSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma tag encontrada.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={applyFilters}>Filtrar</Button>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>Limpar</Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}
      {isError && <p className="text-red-500 text-sm">Erro ao carregar despesas.</p>}

      {expenses && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categorias</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              )}
              {expenses.map((expense: ExpenseResponse) => (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {expense.categories?.length > 0
                        ? expense.categories.map((cat) => (
                            <Badge key={cat} variant="outline">{cat}</Badge>
                          ))
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatBRL(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setEditing(expense)}
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(expense)}
                        disabled={remove.isPending}
                        title="Excluir"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditExpenseDialog expense={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

