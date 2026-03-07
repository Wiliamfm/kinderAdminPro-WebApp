function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatFileTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padTwo(date.getMonth() + 1);
  const day = padTwo(date.getDate());
  const hour = padTwo(date.getHours());
  const minute = padTwo(date.getMinutes());

  return `${year}${month}${day}_${hour}${minute}`;
}

export function downloadBlobFile(fileName: string, blob: Blob): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('La descarga de archivos solo está disponible en el navegador.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
