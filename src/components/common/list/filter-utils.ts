import {
  DateRangeValue,
  FilterChip,
  FilterDefinition,
  FilterValues,
  NumberRangeValue,
  TextFilterValue,
} from "./filter-types";

const isTextValue = (value: unknown): value is string =>
  typeof value === "string";

const isTextFilterValue = (value: unknown): value is TextFilterValue => {
  return (
    !!value &&
    typeof value === "object" &&
    "value" in value &&
    "operator" in value
  );
};

const isNumberRangeValue = (value: unknown): value is NumberRangeValue => {
  return (
    !!value && typeof value === "object" && ("min" in value || "max" in value)
  );
};

const isDateRangeValue = (value: unknown): value is DateRangeValue => {
  return (
    !!value && typeof value === "object" && ("from" in value || "to" in value)
  );
};

export const getActiveFilterCount = (
  filters: FilterValues,
  definitions: FilterDefinition[],
) => {
  return definitions.reduce((count, definition) => {
    const value = filters[definition.key];

    if (definition.type === "text") {
      return isTextFilterValue(value) && value.value.trim() ? count + 1 : count;
    }

    if (definition.type === "select") {
      return isTextValue(value) && value && value !== "all" ? count + 1 : count;
    }

    if (definition.type === "multi-select") {
      return Array.isArray(value) && value.length > 0 ? count + 1 : count;
    }

    if (definition.type === "boolean") {
      return typeof value === "boolean" ? count + 1 : count;
    }

    if (definition.type === "number-range") {
      return isNumberRangeValue(value) &&
        (value.min !== undefined || value.max !== undefined)
        ? count + 1
        : count;
    }

    if (definition.type === "date-range") {
      return isDateRangeValue(value) && (value.from || value.to)
        ? count + 1
        : count;
    }

    return count;
  }, 0);
};

const formatDateInput = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getFilterChips = (
  filters: FilterValues,
  definitions: FilterDefinition[],
): FilterChip[] => {
  return definitions.flatMap((definition) => {
    const value = filters[definition.key];

    if (definition.type === "text") {
      if (!isTextFilterValue(value) || !value.value.trim()) return [];
      const prefix =
        value.operator === "startsWith"
          ? "Starts with"
          : value.operator === "equals"
            ? "Is"
            : "Contains";
      return [
        {
          key: definition.key,
          label: definition.label,
          valueLabel: `${prefix} ${value.value.trim()}`,
        },
      ];
    }

    if (definition.type === "select") {
      if (!isTextValue(value) || value === "all") return [];
      const option = definition.options.find((item) => item.value === value);
      return [
        {
          key: definition.key,
          label: definition.label,
          valueLabel: option?.label || value,
        },
      ];
    }

    if (definition.type === "multi-select") {
      if (!Array.isArray(value) || value.length === 0) return [];
      const labels = value
        .map(
          (item) =>
            definition.options.find((option) => option.value === item)?.label ||
            item,
        )
        .join(", ");
      return [
        {
          key: definition.key,
          label: definition.label,
          valueLabel: labels,
        },
      ];
    }

    if (definition.type === "boolean") {
      if (typeof value !== "boolean") return [];
      return [
        {
          key: definition.key,
          label: definition.label,
          valueLabel: value
            ? definition.trueLabel || "Yes"
            : definition.falseLabel || "No",
        },
      ];
    }

    if (definition.type === "number-range") {
      if (
        !isNumberRangeValue(value) ||
        (value.min === undefined && value.max === undefined)
      )
        return [];
      const min = value.min !== undefined ? value.min : "Any";
      const max = value.max !== undefined ? value.max : "Any";
      return [
        {
          key: definition.key,
          label: definition.label,
          valueLabel: `${min} - ${max}`,
        },
      ];
    }

    if (definition.type === "date-range") {
      if (!isDateRangeValue(value) || (!value.from && !value.to)) return [];
      const from = formatDateInput(value.from) || "Any";
      const to = formatDateInput(value.to) || "Any";
      return [
        {
          key: definition.key,
          label: definition.label,
          valueLabel: `${from} - ${to}`,
        },
      ];
    }

    return [];
  });
};
