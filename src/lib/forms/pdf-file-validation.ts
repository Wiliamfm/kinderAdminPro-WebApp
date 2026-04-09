export type ValidatePdfFileOptions = {
  maxSizeBytes: number;
  maxSizeMessage: string;
  required?: boolean;
  requiredMessage?: string;
};

export function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

export function validatePdfFile(
  file: File | null,
  options: ValidatePdfFileOptions,
): string | undefined {
  if (!file) {
    if (!options.required) return undefined;
    return options.requiredMessage ?? 'Debes seleccionar un archivo PDF.';
  }

  if (!isPdfFile(file)) {
    return 'Solo se permiten archivos PDF';
  }

  if (file.size > options.maxSizeBytes) {
    return options.maxSizeMessage;
  }

  return undefined;
}
