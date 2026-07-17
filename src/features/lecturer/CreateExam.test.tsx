import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getCourses: vi.fn(),
  listQuestionTopics: vi.fn(),
  listQuestions: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/common/BackToDashboardButton", () => ({
  BackToDashboardButton: () => <button type="button">Back</button>,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  default: {
    getCourses: mocks.getCourses,
    listQuestionTopics: mocks.listQuestionTopics,
    listQuestions: mocks.listQuestions,
    createExam: vi.fn(),
    standardizeExamDocument: vi.fn(),
    generateQuestions: vi.fn(),
  },
  unwrapPaginatedData: (response: any) =>
    Array.isArray(response) ? response : response?.data || [],
}));

import CreateExam from "@/features/lecturer/CreateExam";

describe("CreateExam course preselection", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.getCourses.mockReset();
    mocks.listQuestionTopics.mockReset();
    mocks.listQuestions.mockReset();
    mocks.getCourses.mockResolvedValue({
      data: [
        { id: "course-1", code: "CLS001", name: "Academic Writing" },
        { id: "course-2", code: "CLS002", name: "Research Methods" },
      ],
    });
    mocks.listQuestionTopics.mockResolvedValue({ data: [] });
    mocks.listQuestions.mockResolvedValue({ data: [], pagination: { totalPages: 1 } });
    window.history.pushState({}, "", "/lecturer/exams/create");
  });

  it("preselects a valid course from the courseId query parameter", async () => {
    window.history.pushState(
      {},
      "",
      "/lecturer/exams/create?courseId=course-1",
    );

    render(<CreateExam />);

    expect(await screen.findByText("CLS001 - Academic Writing")).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.listQuestionTopics).toHaveBeenCalledWith({
        courseId: "course-1",
        limit: 100,
      }),
    );
  });

  it("ignores an invalid courseId query parameter", async () => {
    window.history.pushState(
      {},
      "",
      "/lecturer/exams/create?courseId=missing-course",
    );

    render(<CreateExam />);

    await screen.findByText("Basic Information");
    expect(screen.queryByText("CLS001 - Academic Writing")).not.toBeInTheDocument();
    expect(mocks.listQuestionTopics).not.toHaveBeenCalled();
  });
});
