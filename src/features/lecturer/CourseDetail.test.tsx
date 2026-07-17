import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getCourse: vi.fn(),
  getCourses: vi.fn(),
  getCourseEnrollments: vi.fn(),
  getExams: vi.fn(),
  getExamOverview: vi.fn(),
  getExamSubmissions: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "course-1" }),
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => "/lecturer/course/course-1",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  default: {
    getCourse: mocks.getCourse,
    getCourses: mocks.getCourses,
    getCourseEnrollments: mocks.getCourseEnrollments,
    getExams: mocks.getExams,
    getExamOverview: mocks.getExamOverview,
    getExamSubmissions: mocks.getExamSubmissions,
    getStudents: vi.fn(),
    enrollStudent: vi.fn(),
    removeEnrollment: vi.fn(),
  },
  unwrapPaginatedData: (response: any) =>
    Array.isArray(response) ? response : response?.data || [],
}));

import CourseDetail from "@/features/lecturer/CourseDetail";

describe("CourseDetail exam statistics tabs", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.getCourse.mockResolvedValue({
      id: "course-1",
      code: "CLS001",
      name: "Academic Writing",
      academicYear: "2025-2026",
      term: "TERM_1",
    });
    mocks.getCourses.mockResolvedValue({ data: [] });
    mocks.getCourseEnrollments.mockResolvedValue([
      {
        id: "enroll-1",
        joinedAt: "2026-07-01T00:00:00.000Z",
        student: {
          id: "student-1",
          fullName: "Nguyễn Văn A",
          email: "a@example.edu.vn",
          studentId: "SV001",
        },
      },
    ]);
    mocks.getExams.mockResolvedValue({
      data: [
        {
          id: "exam-1",
          title: "Kiểm tra giữa kỳ",
          status: "COMPLETED",
          duration: 60,
          startTime: "2026-07-10T08:00:00.000Z",
          endTime: "2026-07-10T09:00:00.000Z",
          totalPoints: 10,
        },
      ],
    });
    mocks.getExamOverview.mockResolvedValue({
      exam: { id: "exam-1", title: "Kiểm tra giữa kỳ", totalPoints: 10 },
      summary: { totalSubmissions: 1, avgScorePct: 80 },
    });
    mocks.getExamSubmissions.mockResolvedValue({
      data: [
        {
          id: "submission-1",
          status: "FLAGGED",
          score: 8,
          submittedAt: "2026-07-10T08:50:00.000Z",
          student: {
            id: "student-1",
            fullName: "Nguyễn Văn A",
            email: "a@example.edu.vn",
            studentId: "SV001",
          },
        },
      ],
    });
  });

  it("keeps the student tab as the default view", async () => {
    render(<CourseDetail />);

    await waitFor(() =>
      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("tab", { name: "Sinh viên" }),
    ).toHaveAttribute("data-state", "active");
    expect(screen.queryByText("Bài kiểm tra của khóa học")).not.toBeInTheDocument();
  });

  it("shows course exams and per-student statistics in the exam tab", async () => {
    render(<CourseDetail />);

    await waitFor(() =>
      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument(),
    );

    const examTab = screen.getByRole("tab", {
      name: "Bài kiểm tra & thống kê",
    });
    fireEvent.pointerDown(examTab, { button: 0, ctrlKey: false });
    fireEvent.mouseDown(examTab, { button: 0, ctrlKey: false });
    fireEvent.click(examTab);

    expect(await screen.findByText("Bài kiểm tra của khóa học")).toBeInTheDocument();
    expect(screen.getByText("Kiểm tra giữa kỳ")).toBeInTheDocument();
    expect(screen.getAllByText("80%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tín hiệu cần xem xét").length).toBeGreaterThan(0);
    expect(mocks.getExams).toHaveBeenCalledWith({ courseId: "course-1", limit: 100 });
  });
});
