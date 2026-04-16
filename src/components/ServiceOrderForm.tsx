import { Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import type { BudgetResponse, CustomerResponse, ServiceOrderDetailResponse, ServiceOrderRequest, ServiceOrderStatus, VehicleResponse } from '@/api/endpoints';
import { BudgetFormFields, budgetToFormValues, defaultBudgetValues, toBudgetPayload, type BudgetFormValues } from '@/components/BudgetForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const serviceOrderStatuses: Array<{ value: ServiceOrderStatus; label: string }> = [
  { value: 'open', label: 'Aberta' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'finalized', label: 'Finalizada' },
  { value: 'canceled', label: 'Cancelada' },
];

export interface ServiceOrderFormValues extends BudgetFormValues {
  serviceOrderStatus: ServiceOrderStatus;
  serviceOrderEntryDate: string;
  serviceOrderNotes: string;
}

export function defaultServiceOrderValues(): ServiceOrderFormValues {
  const budgetDefaults = defaultBudgetValues();

  return {
    ...budgetDefaults,
    serviceOrderStatus: 'open',
    serviceOrderEntryDate: budgetDefaults.createdAt,
    serviceOrderNotes: '',
  };
}

export function serviceOrderToFormValues(serviceOrder: ServiceOrderDetailResponse): ServiceOrderFormValues {
  return {
    ...budgetToFormValues(serviceOrder.budget),
    serviceOrderStatus: serviceOrder.status,
    serviceOrderEntryDate: serviceOrder.entryDate.slice(0, 10),
    serviceOrderNotes: serviceOrder.notes ?? '',
  };
}

export function toServiceOrderPayload(values: ServiceOrderFormValues, budgetId: string): ServiceOrderRequest {
  return {
    budgetId,
    status: values.serviceOrderStatus,
    entryDate: new Date(`${values.serviceOrderEntryDate}T00:00:00`).toISOString(),
    notes: values.serviceOrderNotes || undefined,
  };
}

export function toServiceOrderBudgetPayload(values: ServiceOrderFormValues) {
  return toBudgetPayload(values);
}

interface Props {
  control: Control<ServiceOrderFormValues>;
  register: UseFormRegister<ServiceOrderFormValues>;
  watch: UseFormWatch<ServiceOrderFormValues>;
  setValue: UseFormSetValue<ServiceOrderFormValues>;
  errors: FieldErrors<ServiceOrderFormValues>;
  customers?: CustomerResponse[];
  vehicles?: VehicleResponse[];
  existingBudget?: BudgetResponse;
  existingClosedAt?: string;
}

export function ServiceOrderFormFields({
  control,
  register,
  watch,
  setValue,
  errors,
  customers,
  vehicles,
  existingBudget,
  existingClosedAt,
}: Props) {
  const selectedStatus = serviceOrderStatuses.find((status) => status.value === watch('serviceOrderStatus'));
  const closedAtValue = existingClosedAt
    ? existingClosedAt.slice(0, 10)
    : watch('serviceOrderStatus') === 'finalized' || watch('serviceOrderStatus') === 'canceled'
      ? new Date().toISOString().slice(0, 10)
      : '';

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="text-lg font-semibold">Ordem de Serviço</h2>
          <p className="text-sm text-muted-foreground">
            {existingBudget
              ? `Orçamento vigente ${existingBudget.number} embutido na OS.`
              : 'Cadastre a OS e preencha o orçamento na mesma tela.'}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Status da OS</Label>
            <Controller
              name="serviceOrderStatus"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectedStatus?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOrderStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="service-order-entry-date">Data de entrada</Label>
            <Input id="service-order-entry-date" type="date" disabled {...register('serviceOrderEntryDate')} />
            {errors.serviceOrderEntryDate && <p className="text-sm text-red-500">{errors.serviceOrderEntryDate.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="service-order-closed-at">Data de fechamento</Label>
            <Input
              id="service-order-closed-at"
              type="date"
              disabled
              value={closedAtValue}
              readOnly
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="service-order-notes">Observações da OS</Label>
          <Input id="service-order-notes" {...register('serviceOrderNotes')} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="text-lg font-semibold">Orçamento</h2>
          <p className="text-sm text-muted-foreground">Seção comercial da ordem de serviço.</p>
        </div>

        <BudgetFormFields
          control={control as unknown as Control<BudgetFormValues>}
          register={register}
          watch={watch as unknown as UseFormWatch<BudgetFormValues>}
          setValue={setValue as unknown as UseFormSetValue<BudgetFormValues>}
          errors={errors}
          customers={customers}
          vehicles={vehicles}
          lockCreatedAt
        />
      </div>
    </div>
  );
}