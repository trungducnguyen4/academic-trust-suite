type NumericInputOptions = {
  min?: number;
  max?: number;
  integer?: boolean;
};

const INTEGER_PATTERN = /^-?\d+$/;
const DECIMAL_PATTERN = /^-?(?:\d+|\d*\.\d+)$/;

const hasValidNumberFormat = (rawValue: string, integer: boolean) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return true;
  return integer ? INTEGER_PATTERN.test(trimmed) : DECIMAL_PATTERN.test(trimmed);
};

const getMinError = (min: number) => {
  if (min === 0) return "Value must be 0 or greater";
  return `Value must be ${min} or greater`;
};

export const getNumericInputError = (
  rawValue: string,
  options: NumericInputOptions = {},
): string | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const integer = options.integer ?? true;
  if (!hasValidNumberFormat(trimmed, integer)) {
    return "Please enter a valid number";
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return "Please enter a valid number";
  }

  if (typeof options.min === "number" && parsed < options.min) {
    return getMinError(options.min);
  }

  if (typeof options.max === "number" && parsed > options.max) {
    return `Value must be ${options.max} or less`;
  }

  return null;
};

export const sanitizeNumericInput = (
  rawValue: string,
  _options: NumericInputOptions = {},
): string => rawValue;

export const parseNumericInput = (
  rawValue: string,
  options: NumericInputOptions = {},
): number | undefined => {
  const trimmed = rawValue.trim();
  if (!trimmed) return undefined;

  const error = getNumericInputError(trimmed, options);
  if (error) return undefined;

  return Number(trimmed);
};

export const parseNumericInputOr = (
  rawValue: string,
  fallback: number,
  options: NumericInputOptions = {},
): number => {
  const parsed = parseNumericInput(rawValue, options);
  return parsed === undefined ? fallback : parsed;
};
