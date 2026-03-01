export const formatCurrency = (amount: number | string) =>
  `R ${Number(amount || 0).toFixed(2)}`;

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-ZA');

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDateShort = (date: string) =>
  new Date(date).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
