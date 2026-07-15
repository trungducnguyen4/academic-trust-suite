"use client";

import type { SortOrder } from "./SortButton";

export interface SortableItem {
  [key: string]: any;
}

/**
 * Generic sort utility function
 * @param items Array of items to sort
 * @param field Field name to sort by (supports nested fields like "user.name")
 * @param order "asc" or "desc"
 * @returns Sorted array
 */
export function sortItems<T extends SortableItem>(
  items: T[],
  field: string,
  order: SortOrder
): T[] {
  if (!items || items.length === 0) return items;

  const sorted = [...items].sort((a, b) => {
    const aValue = getNestedValue(a, field);
    const bValue = getNestedValue(b, field);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === "asc" ? 1 : -1;
    if (bValue == null) return order === "asc" ? -1 : 1;

    const comparison = compareValues(aValue, bValue);

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}

function compareValues(aValue: unknown, bValue: unknown): number {
  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  if (aValue instanceof Date && bValue instanceof Date) {
    return aValue.getTime() - bValue.getTime();
  }

  if (typeof aValue === "string" && typeof bValue === "string") {
    const aDate = parseDate(aValue);
    const bDate = parseDate(bValue);
    if (aDate && bDate) {
      return aDate.getTime() - bDate.getTime();
    }

    return aValue.localeCompare(bValue, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
}

/**
 * Get nested object value using dot notation
 * @param obj Object to get value from
 * @param path Dot notation path (e.g., "user.name")
 * @returns The value or undefined
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, prop) => current?.[prop], obj);
}

/**
 * Try to parse a string as a date
 */
function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  // Check if it looks like an ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Create a sort comparator function
 */
export function createSortComparator<T extends SortableItem>(
  field: string,
  order: SortOrder
) {
  return (a: T, b: T) => {
    const aValue = getNestedValue(a, field);
    const bValue = getNestedValue(b, field);

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === "asc" ? 1 : -1;
    if (bValue == null) return order === "asc" ? -1 : 1;

    const comparison = compareValues(aValue, bValue);

    return order === "asc" ? comparison : -comparison;
  };
}

