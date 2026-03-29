export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function format(date: Date | string, formatStr?: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (formatStr === 'dd MMMM yyyy') {
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  return formatDate(dateObj.toISOString());
}
