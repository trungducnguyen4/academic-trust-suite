"use client";

export type TextFilterOperator = "contains" | "startsWith" | "equals";

export type ListFilterOption = {
  label: string;
  value: string;
  description?: string;
};

export type TextFilterValue = {
  value: string;
  operator: TextFilterOperator;
};

export type NumberRangeValue = {
  min?: number;
  max?: number;
};

export type DateRangeValue = {
  from?: string;
  to?: string;
};

export type FilterValue =
  | string
  | string[]
  | boolean
  | TextFilterValue
  | NumberRangeValue
  | DateRangeValue
  | null
  | undefined;

export type FilterValues = Record<string, FilterValue>;

export type FilterDefinition =
  | {
      key: string;
      label: string;
      type: "text";
      placeholder?: string;
      operators?: TextFilterOperator[];
      defaultOperator?: TextFilterOperator;
    }
  | {
      key: string;
      label: string;
      type: "select";
      placeholder?: string;
      options: ListFilterOption[];
      allowAll?: boolean;
      allLabel?: string;
    }
  | {
      key: string;
      label: string;
      type: "multi-select";
      options: ListFilterOption[];
      searchable?: boolean;
    }
  | {
      key: string;
      label: string;
      type: "boolean";
      trueLabel?: string;
      falseLabel?: string;
    }
  | {
      key: string;
      label: string;
      type: "number-range";
      min?: number;
      max?: number;
      step?: number;
      showSlider?: boolean;
    }
  | {
      key: string;
      label: string;
      type: "date-range";
      showTime?: boolean;
    };

export type FilterChip = {
  key: string;
  label: string;
  valueLabel: string;
};

