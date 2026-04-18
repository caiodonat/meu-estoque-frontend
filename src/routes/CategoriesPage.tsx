import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusIcon, PencilIcon, Trash2Icon, XIcon, TagIcon, PowerIcon } from 'lucide-react';
import {
  categoriesApi,
  positiveEntryCategoriesApi,
  positiveEntryTagsApi,
  tagsApi,
} from '@/api/endpoints';
import type {
  ExpenseCategoryResponse,
  PositiveEntryCategoryResponse,
  PositiveEntryTagResponse,
} from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ---- Nova Categoria Dialog ----

function NewCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      categoriesApi.create(label.trim(), description.trim() || undefined, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Categoria criada!');
      closeAndReset();
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });

  function closeAndReset() {
    setOpen(false);
    setLabel('');
    setDescription('');
    setTagInput('');
    setTags([]);
  }

  function addTag() {
    const code = tagInput.trim();
    if (!code || tags.includes(code)) return;
    setTags((prev) => [...prev, code]);
    setTagInput('');
  }

  function removeTag(code: string) {
    setTags((prev) => prev.filter((t) => t !== code));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeAndReset(); else setOpen(true); }}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Nova Categoria
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="cat-label">Nome *</Label>
            <Input
              id="cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Alimentação"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-description">Descrição</Label>
            <Input
              id="cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
            />
          </div>
          <div className="space-y-1">
            <Label>Tags iniciais</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Ex: mercado (Enter para adicionar)"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => removeTag(t)}
                  >
                    {t}
                    <XIcon className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeAndReset}>
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!label.trim() || create.isPending}
            >
              {create.isPending ? 'Salvando...' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Editar Categoria Dialog ----

function EditCategoryDialog({ category }: { category: ExpenseCategoryResponse }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(category.label);
  const [description, setDescription] = useState(category.description ?? '');
  const [tagInput, setTagInput] = useState('');
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: () =>
      categoriesApi.update(category.id, label.trim(), description.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
      setOpen(false);
    },
    onError: () => toast.error('Erro ao atualizar categoria'),
  });

  const addTag = useMutation({
    mutationFn: (code: string) => categoriesApi.addTag(category.id, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setTagInput('');
      toast.success('Tag adicionada!');
    },
    onError: () => toast.error('Erro ao adicionar tag'),
  });

  const deleteTag = useMutation({
    mutationFn: (code: string) => tagsApi.delete(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag removida!');
    },
    onError: () => toast.error('Erro ao remover tag'),
  });

  function handleAddTag() {
    const code = tagInput.trim();
    if (!code) return;
    addTag.mutate(code);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setLabel(category.label);
          setDescription(category.description ?? '');
          setTagInput('');
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <PencilIcon className="w-3.5 h-3.5" />
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="edit-cat-label">Nome *</Label>
            <Input
              id="edit-cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-cat-description">Descrição</Label>
            <Input
              id="edit-cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {/* Tags da categoria */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {category.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {category.tags.map((tag) => (
                  <span
                    key={tag.code}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
                  >
                    <TagIcon className="w-3 h-3 text-muted-foreground" />
                    {tag.code}
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover tag"
                      onClick={() => deleteTag.mutate(tag.code)}
                      disabled={deleteTag.isPending}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada.</p>
            )}

            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Nova tag (Enter para adicionar)"
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || addTag.isPending}
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => update.mutate()}
              disabled={!label.trim() || update.isPending}
            >
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Renomear Tag Dialog ----

function RenameTagDialog({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [newCode, setNewCode] = useState(code);
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: () => tagsApi.update(code, newCode.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag renomeada!');
      setOpen(false);
    },
    onError: () => toast.error('Erro ao renomear tag'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setNewCode(code);
      }}
    >
      <DialogTrigger
        render={
          <button
            className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 group-hover/tag:opacity-100 hover:text-foreground transition-opacity"
            title="Renomear tag"
          >
            <PencilIcon className="w-3 h-3" />
          </button>
        }
      />
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Renomear Tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="tag-newcode">Novo código</Label>
            <Input
              id="tag-newcode"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCode.trim() && newCode.trim() !== code) {
                  update.mutate();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => update.mutate()}
              disabled={!newCode.trim() || newCode.trim() === code || update.isPending}
            >
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const emptyPositiveEntryTagForm = {
  code: '',
  previousCode: null as string | null,
  positiveEntryCategoryId: '',
  isActive: true,
};

function PositiveEntryTagDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  categories,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: typeof emptyPositiveEntryTagForm;
  onFormChange: (form: typeof emptyPositiveEntryTagForm) => void;
  categories: PositiveEntryCategoryResponse[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  const selectedCategory = categories.find((category) => category.id === form.positiveEntryCategoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{form.previousCode ? 'Editar Tag de Entrada' : 'Nova Tag de Entrada'}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="positive-entry-tag-code">Codigo</Label>
            <Input
              id="positive-entry-tag-code"
              value={form.code}
              onChange={(e) => onFormChange({ ...form, code: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Categoria de Entrada</Label>
            <Select
              value={form.positiveEntryCategoryId}
              onValueChange={(value) => onFormChange({ ...form, positiveEntryCategoryId: value ?? '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma categoria">
                  {selectedCategory?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.previousCode && (
            <div className="space-y-1">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.isActive ? 'default' : 'outline'}
                  onClick={() => onFormChange({ ...form, isActive: true })}
                >
                  Ativa
                </Button>
                <Button
                  type="button"
                  variant={!form.isActive ? 'default' : 'outline'}
                  onClick={() => onFormChange({ ...form, isActive: false })}
                >
                  Inativa
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={onSubmit}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Página Principal ----

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [positiveEntryTagDialogOpen, setPositiveEntryTagDialogOpen] = useState(false);
  const [positiveEntryTagForm, setPositiveEntryTagForm] = useState(emptyPositiveEntryTagForm);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
  const { data: positiveEntryCategories = [], isLoading: isPositiveEntryCategoriesLoading } = useQuery({
    queryKey: ['positive-entry-categories'],
    queryFn: positiveEntryCategoriesApi.list,
  });
  const { data: positiveEntryTags = [], isLoading: isPositiveEntryTagsLoading } = useQuery({
    queryKey: ['positive-entry-tags', true],
    queryFn: () => positiveEntryTagsApi.list(true),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Categoria excluída!');
    },
    onError: () => toast.error('Erro ao excluir categoria'),
  });

  const deleteTag = useMutation({
    mutationFn: (code: string) => tagsApi.delete(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag excluída!');
    },
    onError: () => toast.error('Erro ao excluir tag'),
  });

  const savePositiveEntryTag = useMutation({
    mutationFn: async () => {
      const code = positiveEntryTagForm.code.trim();
      if (!code) throw new Error('Informe o nome da Tag de Entrada.');
      if (!positiveEntryTagForm.positiveEntryCategoryId) throw new Error('Selecione a categoria da tag.');

      if (positiveEntryTagForm.previousCode) {
        return positiveEntryTagsApi.update(
          positiveEntryTagForm.previousCode,
          code,
          positiveEntryTagForm.positiveEntryCategoryId,
          positiveEntryTagForm.isActive
        );
      }

      return positiveEntryTagsApi.create(code, positiveEntryTagForm.positiveEntryCategoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positive-entry-tags'] });
      toast.success(positiveEntryTagForm.previousCode ? 'Tag de Entrada atualizada.' : 'Tag de Entrada criada.');
      setPositiveEntryTagDialogOpen(false);
      setPositiveEntryTagForm(emptyPositiveEntryTagForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deactivatePositiveEntryTag = useMutation({
    mutationFn: positiveEntryTagsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positive-entry-tags'] });
      toast.success('Tag de Entrada inativada.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const togglePositiveEntryTagStatus = useMutation({
    mutationFn: (tag: PositiveEntryTagResponse) =>
      positiveEntryTagsApi.update(tag.code, tag.code, tag.positiveEntryCategoryId, !tag.isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positive-entry-tags'] });
      toast.success('Status da Tag de Entrada atualizado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetPositiveEntryTagDialog() {
    setPositiveEntryTagDialogOpen(false);
    setPositiveEntryTagForm(emptyPositiveEntryTagForm);
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie categorias de gastos e a estrutura fixa das categorias de entrada no mesmo lugar.</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Categorias de Gastos</h2>
            <p className="text-sm text-muted-foreground">CRUD completo das categorias usadas nas despesas.</p>
          </div>
          <NewCategoryDialog />
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Carregando categorias de gastos...</p>}

        {!isLoading && categories.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
            Nenhuma categoria cadastrada. Clique em &ldquo;Nova Categoria&rdquo; para começar.
          </div>
        )}

        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{cat.label}</span>
                    {cat.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        - {cat.description}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.tags.length === 0
                      ? 'Sem tags'
                      : `${cat.tags.length} tag${cat.tags.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <EditCategoryDialog category={cat} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Excluir a categoria "${cat.label}"? As tags vinculadas também serão removidas.`)) {
                        deleteCategory.mutate(cat.id);
                      }
                    }}
                    disabled={deleteCategory.isPending}
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {cat.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {cat.tags.map((tag) => (
                    <span
                      key={tag.code}
                      className="group/tag inline-flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      <TagIcon className="w-3 h-3 text-muted-foreground" />
                      <span className="ml-0.5">{tag.code}</span>
                      <RenameTagDialog code={tag.code} />
                      <button
                        className="rounded p-0.5 text-muted-foreground opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity"
                        title="Excluir tag"
                        onClick={() => {
                          if (confirm(`Excluir a tag "${tag.code}"?`)) {
                            deleteTag.mutate(tag.code);
                          }
                        }}
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Categorias de Entrada</h2>
            <p className="text-sm text-muted-foreground">As categorias de entrada são fixas no domínio. Aqui você gerencia as tags ligadas a cada categoria.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPositiveEntryTagForm({
                ...emptyPositiveEntryTagForm,
                positiveEntryCategoryId: positiveEntryCategories[0]?.id ?? '',
              });
              setPositiveEntryTagDialogOpen(true);
            }}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Nova Tag de Entrada
          </Button>
        </div>

        {isPositiveEntryCategoriesLoading ? (
          <p className="text-muted-foreground text-sm">Carregando categorias de entrada...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {positiveEntryCategories.map((category) => {
              const tagsForCategory = positiveEntryTags.filter((tag) => tag.positiveEntryCategoryId === category.id);

              return (
                <div key={category.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.label}</span>
                        <Badge variant="outline">{category.nature}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tagsForCategory.length === 0
                          ? 'Sem tags de entrada vinculadas.'
                          : `${tagsForCategory.length} tag${tagsForCategory.length > 1 ? 's' : ''} vinculada${tagsForCategory.length > 1 ? 's' : ''}.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {tagsForCategory.length > 0 ? tagsForCategory.map((tag) => (
                      <Badge key={tag.code} variant={tag.isActive ? 'secondary' : 'outline'}>
                        {tag.code}
                      </Badge>
                    )) : (
                      <span className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPositiveEntryTagsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando tags de entrada...</TableCell>
                </TableRow>
              )}

              {!isPositiveEntryTagsLoading && positiveEntryTags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhuma Tag de Entrada cadastrada.</TableCell>
                </TableRow>
              )}

              {positiveEntryTags.map((tag) => (
                <TableRow key={tag.code}>
                  <TableCell className="font-medium">{tag.code}</TableCell>
                  <TableCell>{tag.categoryLabel}</TableCell>
                  <TableCell>
                    <Badge variant={tag.isActive ? 'default' : 'outline'}>
                      {tag.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Editar"
                        onClick={() => {
                          setPositiveEntryTagForm({
                            code: tag.code,
                            previousCode: tag.code,
                            positiveEntryCategoryId: tag.positiveEntryCategoryId,
                            isActive: tag.isActive,
                          });
                          setPositiveEntryTagDialogOpen(true);
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title={tag.isActive ? 'Inativar ou ativar' : 'Ativar ou inativar'}
                        onClick={() => togglePositiveEntryTagStatus.mutate(tag)}
                      >
                        <PowerIcon className="h-4 w-4" />
                      </Button>
                      {tag.isActive && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          title="Inativar"
                          onClick={() => {
                            if (!confirm(`Inativar "${tag.code}"?`)) return;
                            deactivatePositiveEntryTag.mutate(tag.code);
                          }}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <PositiveEntryTagDialog
        open={positiveEntryTagDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetPositiveEntryTagDialog();
            return;
          }

          setPositiveEntryTagDialogOpen(true);
        }}
        form={positiveEntryTagForm}
        onFormChange={setPositiveEntryTagForm}
        categories={positiveEntryCategories}
        onSubmit={() => savePositiveEntryTag.mutate()}
        isPending={savePositiveEntryTag.isPending}
      />
    </div>
  );
}
