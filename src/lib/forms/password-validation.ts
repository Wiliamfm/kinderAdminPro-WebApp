export function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  return hasUpper && hasLower && hasNumber && hasSymbol;
}
