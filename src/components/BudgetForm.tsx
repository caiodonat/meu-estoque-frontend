import { useEffect } from 'react';
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { BudgetRequest, BudgetResponse, BudgetStatus, PaymentMethodResponse, VehicleResponse, CustomerResponse } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const budgetStatuses: Array<{ value: BudgetStatus; label: string }> = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'issued', label: 'Emitido' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'refused', label: 'Recusado' },
  { value: 'finalized', label: 'Finalizado' },
  { value: 'canceled', label: 'Cancelado' },
];

export interface BudgetFormValues {
  customerId: string;
  vehicleId: string;
  paymentMethodCode: string;
  status: BudgetStatus;
  discountAmount: string;
  partsWarranty: string;
  laborWarranty: string;
  entryDate: string;
  validUntil: string;
  completedAt: string;
  notes: string;
  items: Array<{
    itemType: 'part' | 'service';
    description: string;
    quantity: string;
    unitPrice: string;
    notes: string;
  }>;
}

export function defaultBudgetValues(): BudgetFormValues {
  const today = new Date().toISOString().slice(0, 10);

  return {
    customerId: '',
    vehicleId: '',
    paymentMethodCode: '',
    status: 'draft',
    discountAmount: '0',
    partsWarranty: '',
    laborWarranty: '',
    entryDate: today,
    validUntil: '',
    completedAt: '',
    notes: '',
    items: [
      {
        itemType: 'service',
        description: '',
        quantity: '1',
        unitPrice: '0',
        notes: '',
      },
    ],
  };
}

export function budgetToFormValues(budget: BudgetResponse): BudgetFormValues {
  return {
    customerId: budget.customerId,
    vehicleId: budget.vehicleId,
    paymentMethodCode: budget.paymentMethodCode ?? '',
    status: budget.status,
    discountAmount: budget.discountAmount.toString(),
    partsWarranty: budget.partsWarranty ?? '',
    laborWarranty: budget.laborWarranty ?? '',
    entryDate: budget.entryDate.slice(0, 10),
    validUntil: budget.validUntil?.slice(0, 10) ?? '',
    completedAt: budget.completedAt?.slice(0, 10) ?? '',
    notes: budget.notes ?? '',
    items: budget.items.map((item) => ({
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      notes: item.notes ?? '',
    })),
  };
}

function normalizeDecimal(value?: string): number {
  if (!value?.trim()) return 0;
  return Number(value.replace(',', '.'));
}

export function toBudgetPayload(values: BudgetFormValues): BudgetRequest {
  return {
    customerId: values.customerId,
    vehicleId: values.vehicleId,
    paymentMethodCode: values.paymentMethodCode || undefined,
    status: values.status,
    discountAmount: normalizeDecimal(values.discountAmount),
    partsWarranty: values.partsWarranty || undefined,
    laborWarranty: values.laborWarranty || undefined,
    entryDate: new Date(`${values.entryDate}T00:00:00`).toISOString(),
    validUntil: values.validUntil ? new Date(`${values.validUntil}T00:00:00`).toISOString() : undefined,
    completedAt: values.completedAt ? new Date(`${values.completedAt}T00:00:00`).toISOString() : undefined,
    notes: values.notes || undefined,
    items: values.items.map((item) => ({
      itemType: item.itemType,
      description: item.description,
      quantity: normalizeDecimal(item.quantity),
      unitPrice: normalizeDecimal(item.unitPrice),
      notes: item.notes || undefined,
    })),
  };
}

function parseMoney(value?: string): number {
  const parsed = normalizeDecimal(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function currency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Props {
  control: Control<BudgetFormValues>;
  register: UseFormRegister<BudgetFormValues>;
  watch: UseFormWatch<BudgetFormValues>;
  setValue: UseFormSetValue<BudgetFormValues>;
  errors: FieldErrors<BudgetFormValues>;
  customers?: CustomerResponse[];
  vehicles?: VehicleResponse[];
  paymentMethods?: PaymentMethodResponse[];
}

export function BudgetFormFields({ control, register, watch, setValue, errors, customers, vehicles, paymentMethods }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedCustomerId = watch('customerId');
  const filteredVehicles = (vehicles ?? []).filter((vehicle) => vehicle.customerId === selectedCustomerId);
  const selectedVehicleId = watch('vehicleId');
  const selectedCustomer = customers?.find((customer) => customer.id === selectedCustomerId);
  const selectedVehicle = filteredVehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const selectedPaymentMethodCode = watch('paymentMethodCode');
  const selectedPaymentMethod = paymentMethods?.find((method) => method.code === selectedPaymentMethodCode);
  const selectedStatus = budgetStatuses.find((status) => status.value === watch('status'));

  useEffect(() => {
    if (selectedVehicleId && !filteredVehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setValue('vehicleId', '');
    }
  }, [filteredVehicles, selectedVehicleId, setValue]);

  const items = watch('items') ?? [];
  const discountAmount = parseMoney(watch('discountAmount'));
  const totals = items.reduce(
    (acc, item) => {
      const lineTotal = parseMoney(item.quantity) * parseMoney(item.unitPrice);

      if (item.itemType === 'part') acc.parts += lineTotal;
      if (item.itemType === 'service') acc.services += lineTotal;

      return acc;
    },
    { parts: 0, services: 0 },
  );
  const subtotal = totals.parts + totals.services;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 lg:col-span-2">
          <Label>Cliente</Label>
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue('vehicleId', '');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um cliente">
                    {selectedCustomer?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.customerId && <p className="text-sm text-red-500">{errors.customerId.message}</p>}
        </div>

        <div className="space-y-1 lg:col-span-2">
          <Label>Veículo</Label>
          <Controller
            name="vehicleId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedCustomerId ? 'Selecione um veículo' : 'Escolha primeiro o cliente'}>
                    {selectedVehicle ? `${selectedVehicle.plate} - ${selectedVehicle.brand} ${selectedVehicle.model}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.brand} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.vehicleId && <p className="text-sm text-red-500">{errors.vehicleId.message}</p>}
          {selectedCustomerId && filteredVehicles.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado para este cliente.</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>Status</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedStatus?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {budgetStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1">
          <Label>Forma de pagamento</Label>
          <Controller
            name="paymentMethodCode"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || '__none__'}
                onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Opcional">
                    {selectedPaymentMethod?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem forma de pagamento</SelectItem>
                  {paymentMethods?.map((method) => (
                    <SelectItem key={method.code} value={method.code}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-entry-date">Data de entrada</Label>
          <Input id="budget-entry-date" type="date" {...register('entryDate')} />
          {errors.entryDate && <p className="text-sm text-red-500">{errors.entryDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-valid-until">Validade</Label>
          <Input id="budget-valid-until" type="date" {...register('validUntil')} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="budget-completed-at">Data de finalização</Label>
          <Input id="budget-completed-at" type="date" {...register('completedAt')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-discount-amount">Desconto</Label>
          <Input id="budget-discount-amount" inputMode="decimal" {...register('discountAmount')} />
          {errors.discountAmount && <p className="text-sm text-red-500">{errors.discountAmount.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-parts-warranty">Garantia peças</Label>
          <Input id="budget-parts-warranty" {...register('partsWarranty')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-labor-warranty">Garantia mão de obra</Label>
          <Input id="budget-labor-warranty" {...register('laborWarranty')} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="budget-notes">Observações</Label>
        <Input id="budget-notes" {...register('notes')} />
      </div>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Itens</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ itemType: 'service', description: '', quantity: '1', unitPrice: '0', notes: '' })}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            Adicionar item
          </Button>
        </div>

        <div className="min-w-0 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Valor unitário</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Controller
                      name={`items.${index}.itemType`}
                      control={control}
                      render={({ field: itemField }) => (
                        <Select value={itemField.value} onValueChange={itemField.onChange}>
                          <SelectTrigger className="w-full min-w-24">
                            <SelectValue>
                              {itemField.value === 'part' ? 'Peça' : 'Serviço'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="part">Peça</SelectItem>
                            <SelectItem value="service">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Input {...register(`items.${index}.description`)} />
                    {errors.items?.[index]?.description && <p className="text-xs text-red-500">{errors.items[index]?.description?.message}</p>}
                  </TableCell>
                  <TableCell>
                    <Input inputMode="decimal" {...register(`items.${index}.quantity`)} />
                    {errors.items?.[index]?.quantity && <p className="text-xs text-red-500">{errors.items[index]?.quantity?.message}</p>}
                  </TableCell>
                  <TableCell>
                    <Input inputMode="decimal" {...register(`items.${index}.unitPrice`)} />
                    {errors.items?.[index]?.unitPrice && <p className="text-xs text-red-500">{errors.items[index]?.unitPrice?.message}</p>}
                  </TableCell>
                  <TableCell>
                    <Input {...register(`items.${index}.notes`)} />
                  </TableCell>
                  <TableCell>
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2Icon className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {typeof errors.items?.message === 'string' && <p className="text-sm text-red-500">{errors.items.message}</p>}
      </div>

      <div className="grid gap-3 rounded-md border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Subtotal peças</p>
          <p className="font-medium">{currency(totals.parts)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Subtotal serviços</p>
          <p className="font-medium">{currency(totals.services)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="font-medium">{currency(subtotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold">{currency(total)}</p>
        </div>
      </div>
    </div>
  );
}