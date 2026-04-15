import { api } from './client';

// --- Auth ---

export interface MeResponse {
  type: string;
  value: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<void>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<MeResponse[]>('/auth/me'),
};

// --- Customers ---

export interface CustomerResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  document?: string;
  address?: string;
  notes?: string;
}

export interface CustomerRequest {
  name: string;
  phone: string;
  email?: string;
  document?: string;
  address?: string;
  notes?: string;
}

export const customersApi = {
  list: () => api.get<CustomerResponse[]>('/customers'),
  create: (data: CustomerRequest) => api.post<void>('/customers', data),
  update: (id: string, data: CustomerRequest) => api.put<void>(`/customers/${id}`, data),
  delete: (id: string) => api.delete<void>(`/customers/${id}`),
};

// --- Vehicles ---

export interface VehicleResponse {
  id: string;
  customerId: string;
  customerName: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  engine?: string;
  chassis?: string;
  color?: string;
  mileage?: number;
  notes?: string;
}

export interface VehicleRequest {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  engine?: string;
  chassis?: string;
  color?: string;
  mileage?: number;
  notes?: string;
}

export const vehiclesApi = {
  list: () => api.get<VehicleResponse[]>('/vehicles'),
  create: (data: VehicleRequest) => api.post<void>('/vehicles', data),
  update: (id: string, data: VehicleRequest) => api.put<void>(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete<void>(`/vehicles/${id}`),
};

// --- Payment methods ---

export interface PaymentMethodResponse {
  code: string;
  label: string;
  info: string;
}

export const paymentMethodsApi = {
  list: () => api.get<PaymentMethodResponse[]>('/payment-methods'),
};

// --- Budgets ---

export type BudgetStatus = 'draft' | 'issued' | 'approved' | 'refused' | 'finalized' | 'canceled';
export type BudgetItemType = 'part' | 'service';

export interface BudgetItemRequest {
  itemType: BudgetItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface BudgetRequest {
  customerId: string;
  vehicleId: string;
  paymentMethodCode?: string;
  status: BudgetStatus;
  discountAmount?: number;
  partsWarranty?: string;
  laborWarranty?: string;
  entryDate: string;
  validUntil?: string;
  completedAt?: string;
  notes?: string;
  items: BudgetItemRequest[];
}

export interface BudgetItemResponse {
  id: string;
  itemType: BudgetItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

export interface BudgetResponse {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleDisplay: string;
  paymentMethodCode?: string;
  paymentMethodLabel?: string;
  status: BudgetStatus;
  subtotalParts: number;
  subtotalServices: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  partsWarranty?: string;
  laborWarranty?: string;
  entryDate: string;
  validUntil?: string;
  completedAt?: string;
  notes?: string;
  items: BudgetItemResponse[];
}

export const budgetsApi = {
  list: () => api.get<BudgetResponse[]>('/budgets'),
  create: (data: BudgetRequest) => api.post<void>('/budgets', data),
  update: (id: string, data: BudgetRequest) => api.put<void>(`/budgets/${id}`, data),
  delete: (id: string) => api.delete<void>(`/budgets/${id}`),
};

// --- Expenses ---

export interface ExpenseResponse {
  id: string;
  description: string;
  amount: number;
  date: string;
  categories: string[];
  tagCodes: string[];
  createdByUserId: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  date: string;
  categoryId?: number;
  tagCodes?: string[];
}

export interface UpdateExpenseRequest extends CreateExpenseRequest {
  id: string;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  tags?: string[];
  noCategory?: boolean;
}

export const expensesApi = {
  list: (filters?: ExpenseFilters) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters?.noCategory) params.set('noCategory', 'true');
    const qs = params.size > 0 ? `?${params}` : '';
    return api.get<ExpenseResponse[]>(`/expenses${qs}`);
  },
  create: (data: CreateExpenseRequest) => api.post<ExpenseResponse>('/expenses', data),
  update: (id: string, data: CreateExpenseRequest) =>
    api.put<ExpenseResponse>(`/expenses/${id}`, data),
  delete: (id: string) => api.delete<void>(`/expenses/${id}`),
};

// --- Categories ---

export interface CategoryTag {
  code: string;
  expenseCategoryId: string;
}

export interface ExpenseCategoryResponse {
  id: string; // UUID
  label: string;
  description?: string;
  tags: CategoryTag[];
}

export const categoriesApi = {
  list: () => api.get<ExpenseCategoryResponse[]>('/expenses/categories'),
  create: (label: string, description: string | undefined, tags: string[]) =>
    api.post<ExpenseCategoryResponse>('/expenses/categories', { label, description, tags }),
  update: (id: string, label: string, description?: string) =>
    api.put<ExpenseCategoryResponse>(`/expenses/categories/${id}`, { label, description }),
  delete: (id: string) => api.delete<void>(`/expenses/categories/${id}`),
  addTag: (categoryId: string, code: string) =>
    api.post<void>(`/expenses/categories/${categoryId}/tags`, { code }),
};

// --- Tags ---

export interface ExpenseTagResponse {
  code: string;
  categoryLabel: string;
}

export const tagsApi = {
  list: () => api.get<ExpenseTagResponse[]>('/expenses/tags'),
  update: (code: string, newCode: string) =>
    api.put<void>(`/expenses/tags/${code}`, { newCode }),
  delete: (code: string) => api.delete<void>(`/expenses/tags/${code}`),
};

// --- Summary ---

export interface MonthlyTotalResponse {
  year: number;
  month: number;
  total: number;
}

export interface CategoryTotalResponse {
  category: string;
  total: number;
}

export const summaryApi = {
  monthly: () => api.get<MonthlyTotalResponse[]>('/summary/monthly'),
  byCategory: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year !== undefined) params.set('year', String(year));
    if (month !== undefined) params.set('month', String(month));
    const qs = params.size > 0 ? `?${params}` : '';
    return api.get<CategoryTotalResponse[]>(`/summary/categories${qs}`);
  },
};
