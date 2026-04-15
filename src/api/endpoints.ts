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
