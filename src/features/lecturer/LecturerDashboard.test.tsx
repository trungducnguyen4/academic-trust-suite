import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getExams: vi.fn(),
  listQuestions: vi.fn(),
  getMyCourses: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  default: {
    getExams: mocks.getExams,
    listQuestions: mocks.listQuestions,
    getMyCourses: mocks.getMyCourses,
  },
  unwrapPaginatedData: (response: any) =>
    Array.isArray(response) ? response : response?.data || [],
}));

vi.mock("./attention/AttentionSection", () => ({
  AttentionSection: () => <div data-testid="attention-section" />,
}));

import LecturerDashboard from "@/features/lecturer/LecturerDashboard";

describe("LecturerDashboard question bank panel", () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      user: { fullName: "Lecturer 01" },
    });
    mocks.getExams.mockResolvedValue({ data: [] });
    mocks.getMyCourses.mockResolvedValue([
      { id: "course-1", code: "CLS001", name: "Academic Writing" },
      { id: "course-2", code: "CLS002", name: "Research Methods" },
    ]);
    mocks.listQuestions.mockReset();
  });

  it("shows recent question banks instead of the recent course panel", async () => {
    mocks.listQuestions.mockResolvedValue({
      data: [
        {
          id: "q-1",
          type: "MULTIPLE_CHOICE",
          difficulty: 2,
          updatedAt: "2026-07-10T00:00:00.000Z",
          course: { id: "course-1", code: "CLS001", name: "Academic Writing" },
        },
        {
          id: "q-2",
          type: "ESSAY",
          difficulty: 3,
          updatedAt: "2026-07-12T00:00:00.000Z",
          course: { id: "course-1", code: "CLS001", name: "Academic Writing" },
        },
      ],
    });

    render(<LecturerDashboard />);

    await waitFor(() =>
      expect(
        screen.getByText("Ngân hàng câu hỏi gần đây"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("CLS001")).toBeInTheDocument();
    expect(screen.getByText("Academic Writing")).toBeInTheDocument();
    expect(screen.getByText("Quản lý ngân hàng câu hỏi")).toBeInTheDocument();
    expect(screen.queryByText("Quản lý khóa học")).not.toBeInTheDocument();
  });

  it("shows an empty state when the lecturer has no questions", async () => {
    mocks.listQuestions.mockResolvedValue({ data: [] });

    render(<LecturerDashboard />);

    await waitFor(() =>
      expect(
        screen.getByText("Chưa có câu hỏi trong ngân hàng"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Thêm câu hỏi")).toBeInTheDocument();
  });
});
