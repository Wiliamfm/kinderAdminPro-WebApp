export type FieldErrorMap<TField extends string> = Partial<Record<TField, string>>;

export type FieldTouchedMap<TField extends string> = Record<TField, boolean>;

export function createInitialTouchedMap<TField extends string>(
  fields: readonly TField[],
): FieldTouchedMap<TField> {
  return fields.reduce((acc, field) => {
    acc[field] = false;
    return acc;
  }, {} as FieldTouchedMap<TField>);
}

export function touchField<TField extends string>(
  current: FieldTouchedMap<TField>,
  field: TField,
): FieldTouchedMap<TField> {
  if (current[field]) return current;
  return {
    ...current,
    [field]: true,
  };
}

export function touchAllFields<TField extends string>(
  current: FieldTouchedMap<TField>,
): FieldTouchedMap<TField> {
  const next = { ...current };
  for (const key of Object.keys(next) as TField[]) {
    next[key] = true;
  }
  return next;
}

export function hasAnyError<TField extends string>(errors: FieldErrorMap<TField>): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}
