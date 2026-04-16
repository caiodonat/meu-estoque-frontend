import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { serviceOrdersApi } from '@/api/endpoints';
import { Button, buttonVariants } from '@/components/ui/button';
import { shopHeader } from '@/config/shopHeader';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

const budgetStatusLabels: Record<string, string> = {
  draft: 'Rascunho',
  issued: 'Emitido',
  approved: 'Aprovado',
  refused: 'Recusado',
  finalized: 'Finalizado',
  canceled: 'Cancelado',
};

const serviceOrderStatusLabels: Record<string, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  finalized: 'Finalizada',
  canceled: 'Cancelada',
};

function getServiceOrderId() {
  if (typeof window === 'undefined') return null;
  return new URL(window.location.href).searchParams.get('id');
}

export default function PrintServiceOrderPage() {
  const serviceOrderId = getServiceOrderId();

  const { data: serviceOrder, isLoading, isError } = useQuery({
    queryKey: ['service-orders', 'print', serviceOrderId],
    queryFn: () => serviceOrdersApi.get(serviceOrderId!),
    enabled: !!serviceOrderId,
  });

  useEffect(() => {
    if (!serviceOrder) return;
    document.title = `OS ${serviceOrder.budgetNumber} - Impressao`;
  }, [serviceOrder]);

  if (!serviceOrderId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6 print:min-h-0 print:p-0">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold">OS nao informada</h1>
          <p className="text-sm text-muted-foreground">Abra a impressao a partir da listagem de ordens de servico.</p>
          <div>
            <Link to="/ordens-servico" className={buttonVariants()}>
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Carregando ordem de servico...</div>;
  }

  if (isError || !serviceOrder) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-red-600">Erro ao carregar os dados de impressao da OS.</div>;
  }

  const { budget } = serviceOrder;

  return (
    <div className="min-h-screen bg-stone-100 print:min-h-0 print:bg-white">
      <div className="mx-auto max-w-5xl p-4 print:max-w-none print:p-0">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm print:hidden">
          <div>
            <h1 className="text-xl font-semibold">Impressao de Ordem de Servico</h1>
            <p className="text-sm text-muted-foreground">Revise o documento e use a impressao do navegador para papel ou PDF.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/ordens-servico" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Voltar
            </Link>
            <Button onClick={() => window.print()}>
              <PrinterIcon className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        <article className="mx-auto w-full max-w-[210mm] bg-white text-slate-900 shadow-sm print:max-w-none print:shadow-none">
          <div className="border-b px-8 py-6 print:px-6 print:py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{shopHeader.name}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{shopHeader.documentTitle}</h1>
                <p className="mt-1 text-sm text-slate-600">Orcamento vigente vinculado ao atendimento.</p>
                {(shopHeader.contact || shopHeader.address || shopHeader.extraLine) && (
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    {shopHeader.contact && <p>{shopHeader.contact}</p>}
                    {shopHeader.address && <p>{shopHeader.address}</p>}
                    {shopHeader.extraLine && <p>{shopHeader.extraLine}</p>}
                  </div>
                )}
              </div>
              <div className="text-right text-sm">
                <p><span className="font-medium">OS:</span> {serviceOrder.budgetNumber}</p>
                <p><span className="font-medium">Status OS:</span> {serviceOrderStatusLabels[serviceOrder.status] ?? serviceOrder.status}</p>
                <p><span className="font-medium">Status orcamento:</span> {budgetStatusLabels[budget.status] ?? budget.status}</p>
                <p><span className="font-medium">Abertura:</span> {dateFormatter.format(new Date(serviceOrder.openedAt))}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-8 py-6 print:grid-cols-2 print:px-6 print:py-5 md:grid-cols-2">
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cliente</h2>
              <div className="space-y-1 text-sm">
                <p className="text-base font-medium text-slate-950">{serviceOrder.customerName}</p>
                <p><span className="font-medium">Codigo:</span> {serviceOrder.customerId}</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Veiculo</h2>
              <div className="space-y-1 text-sm">
                <p className="text-base font-medium text-slate-950">{serviceOrder.vehicleDisplay}</p>
                <p><span className="font-medium">Codigo:</span> {serviceOrder.vehicleId}</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Condicoes</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Forma de pagamento:</span> {budget.paymentMethodLabel ?? 'Nao informada'}</p>
                <p><span className="font-medium">Validade:</span> {budget.validUntil ? dateFormatter.format(new Date(budget.validUntil)) : 'Nao informada'}</p>
                <p><span className="font-medium">Entrada:</span> {dateFormatter.format(new Date(budget.entryDate))}</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Garantias e observacoes</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Garantia de pecas:</span> {budget.partsWarranty || 'Nao informada'}</p>
                <p><span className="font-medium">Garantia de mao de obra:</span> {budget.laborWarranty || 'Nao informada'}</p>
                <p><span className="font-medium">Obs. OS:</span> {serviceOrder.notes || 'Sem observacoes'}</p>
                <p><span className="font-medium">Obs. orcamento:</span> {budget.notes || 'Sem observacoes'}</p>
              </div>
            </section>
          </div>

          <div className="px-8 pb-6 print:px-6 print:pb-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Itens do orcamento</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold">Descricao</th>
                    <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                    <th className="px-3 py-2 text-right font-semibold">Unitario</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.items.map((item) => (
                    <tr key={item.id} className="border-t align-top">
                      <td className="px-3 py-2">{item.itemType === 'part' ? 'Peca' : 'Servico'}</td>
                      <td className="px-3 py-2">
                        <div>{item.description}</div>
                        {item.notes && <div className="mt-1 text-xs text-slate-500">{item.notes}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{currencyFormatter.format(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{currencyFormatter.format(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t px-8 py-6 print:px-6 print:py-5">
            <div className="w-full rounded-lg border bg-slate-50/60 p-4 text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2">
                <span className="text-slate-600">Subtotal pecas</span>
                <span className="text-right tabular-nums">{currencyFormatter.format(budget.subtotalParts)}</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2 border-t pt-2">
                <span className="text-slate-600">Subtotal servicos</span>
                <span className="text-right tabular-nums">{currencyFormatter.format(budget.subtotalServices)}</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2 border-t pt-2">
                <span className="text-slate-600">Subtotal geral</span>
                <span className="text-right tabular-nums">{currencyFormatter.format(budget.subtotal)}</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2 border-t pt-2">
                <span className="text-slate-600">Desconto</span>
                <span className="text-right tabular-nums">{currencyFormatter.format(budget.discountAmount)}</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2 border-t pt-2">
                <span className="text-slate-600">Margem de lucro</span>
                <span className="text-right tabular-nums">{currencyFormatter.format(serviceOrder.profitMargin)}</span>
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="text-right tabular-nums">{currencyFormatter.format(budget.totalAmount)}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}