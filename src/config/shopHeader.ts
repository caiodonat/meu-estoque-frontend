export const shopHeader = {
  name: import.meta.env.VITE_SHOP_NAME?.trim() || 'OficinaDigital',
  contact: import.meta.env.VITE_SHOP_CONTACT?.trim() || '',
  address: import.meta.env.VITE_SHOP_ADDRESS?.trim() || '',
  extraLine: import.meta.env.VITE_SHOP_EXTRA?.trim() || '',
  documentTitle: import.meta.env.VITE_SHOP_PRINT_TITLE?.trim() || 'Ordem de Serviço',
};
