import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TagOption {
  code: string;
  categoryLabel: string;
}

interface Props {
  allTags: TagOption[];
  selected: string[];
  onChange: (tags: string[]) => void;
}

export interface TagPickerHandle {
  focus: () => void;
}

export const TagPicker = forwardRef<TagPickerHandle, Props>(function TagPicker({ allTags, selected, onChange }, ref) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  function add(code: string) {
    onChange([...selected, code]);
    setSearch('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function remove(code: string) {
    onChange(selected.filter((t) => t !== code));
  }

  const suggestions = allTags.filter(
    (t) =>
      !selected.includes(t.code) &&
      (search === '' ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        t.categoryLabel.toLowerCase().includes(search.toLowerCase()))
  );

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      add(suggestions[activeIndex].code);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  // scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="space-y-1">
      <Label>Tags</Label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((code) => (
            <Badge key={code} variant="default" className="gap-1">
              {code}
              <button
                type="button"
                onClick={() => remove(code)}
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
          ref={inputRef}
          placeholder="Buscar tag..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleInputKeyDown}
          autoComplete="off"
        />
        {open && (
          <div
            ref={listRef}
            className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto"
          >
            {suggestions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma tag encontrada.</p>
            ) : (
              suggestions.map((t, i) => (
                <button
                  key={t.code}
                  type="button"
                  onMouseDown={() => add(t.code)}
                  className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                  style={i === activeIndex
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }
                    : undefined}
                >
                  <span>{t.code}</span>
                  <span className="text-xs text-muted-foreground">{t.categoryLabel}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});
