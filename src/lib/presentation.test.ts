import { describe, expect, it } from "vitest";

import {
  formatDateVi,
  formatPercentVi,
  formatScoreVi,
  getUiStatus,
} from "@/lib/presentation";

describe("presentation helpers", () => {
  it("maps backend status values to Vietnamese labels without changing the value", () => {
    expect(getUiStatus("PUBLISHED")).toEqual({ label: "Đã công bố", tone: "info" });
    expect(getUiStatus("FLAGGED")).toEqual({ label: "Cần xem xét", tone: "warning" });
  });

  it("keeps unknown statuses visible", () => {
    expect(getUiStatus("CUSTOM_REVIEW")).toEqual({ label: "CUSTOM_REVIEW", tone: "neutral" });
  });

  it("formats scores and percentages for vi-VN", () => {
    expect(formatScoreVi(8.25)).toBe("8,25/10");
    expect(formatPercentVi(0.725)).toBe("72,5%");
    expect(formatScoreVi(null)).toBe("Chưa chấm");
  });

  it("returns safe labels for missing and invalid dates", () => {
    expect(formatDateVi(null)).toBe("Chưa có");
    expect(formatDateVi("not-a-date")).toBe("Không hợp lệ");
  });
});
