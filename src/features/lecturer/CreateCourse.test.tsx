import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useAuth: vi.fn(),
  getCourses: vi.fn(),
  getExams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/admin/AdminPageShell", () => ({
  AdminPageShell: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock("@/components/common/DataPagination", () => ({
  DataPagination: () => <div data-testid="pagination" />,
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
    getExams: mocks.getExams,
    getStudents: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn(),
    enrollStudent: vi.fn(),
    importEnrollments: vi.fn(),
    searchTrainingSystemStudents: vi.fn(),
    importTrainingSystemEnrollments: vi.fn(),
  },
  unwrapPaginatedData: (response: any) =>
    Array.isArray(response) ? response : response?.data || [],
}));

import CreateCourse from "@/features/lecturer/CreateCourse";

const courses = [
  {
    id: "course-1",
    code: "CLS001",
    name: "Academic Writing",
    academicYear: "2025-2026",
    term: "TERM_1",
    credits: 3,
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    _count: { enrollments: 12, exams: 2 },
  },
  {
    id: "course-2",
    code: "CLS002",
    name: "Research Methods",
    academicYear: "2025-2026",
    term: "TERM_2",
    credits: 2,
    status: "draft",
    createdAt: "2026-07-02T00:00:00.000Z",
    _count: { enrollments: 8, exams: 0 },
  },
];

describe("CreateCourse expandable course exams", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.getExams.mockReset();
    mocks.useAuth.mockReturnValue({
      user: { fullName: "Lecturer 01", email: "lecturer@example.edu.vn" },
    });
    mocks.getCourses.mockResolvedValue({ data: courses });
  });

  it("does not load course exams before a course is expanded", async () => {
    render(<CreateCourse />);

    await screen.findByText("CLS001");

    expect(mocks.getExams).not.toHaveBeenCalled();
  });

  it("loads and shows exams only for the expanded course", async () => {
    mocks.getExams.mockResolvedValueOnce({
      data: [
        {
          id: "exam-1",
          title: "Midterm integrity review",
          status: "PUBLISHED",
          duration: 60,
          startTime: "2026-07-10T08:00:00.000Z",
          endTime: "2026-07-10T09:00:00.000Z",
          _count: { submissions: 0 },
          course: { id: "course-1", code: "CLS001", name: "Academic Writing" },
        },
      ],
    });

    render(<CreateCourse />);

    await screen.findByText("CLS001");
    fireEvent.click(screen.getByRole("button", { name: /CLS001/ }));

    await waitFor(() =>
      expect(mocks.getExams).toHaveBeenCalledWith({
        courseId: "course-1",
        limit: 100,
      }),
    );
    expect(await screen.findByText("Midterm integrity review")).toBeInTheDocument();
    expect(screen.queryByText("Research Methods final")).not.toBeInTheDocument();
  });

  it("shows an empty state when the expanded course has no exams", async () => {
    mocks.getExams.mockResolvedValueOnce({ data: [] });

    render(<CreateCourse />);

    await screen.findByText("CLS002");
    fireEvent.click(screen.getByRole("button", { name: /CLS002/ }));

    expect(
      await screen.findByText("Khóa học này chưa có bài kiểm tra."),
    ).toBeInTheDocument();
  });

  it("shows an error state and retries loading course exams", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.getExams
      .mockRejectedValueOnce(new Error("Network failed"))
      .mockResolvedValueOnce({
        data: [
          {
            id: "exam-2",
            title: "Retry loaded exam",
            status: "COMPLETED",
            duration: 45,
            _count: { submissions: 3 },
          },
        ],
      });

    render(<CreateCourse />);

    await screen.findByText("CLS001");
    fireEvent.click(screen.getByRole("button", { name: /CLS001/ }));

    expect(
      await screen.findByText("Không tải được bài kiểm tra của khóa học này."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Retry loaded exam")).toBeInTheDocument();
    expect(mocks.getExams).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("keeps row navigation separate from expand and nested actions", async () => {
    mocks.getExams.mockResolvedValueOnce({
      data: [
        {
          id: "exam-1",
          title: "Published exam",
          status: "PUBLISHED",
          duration: 60,
          _count: { submissions: 1 },
        },
      ],
    });

    render(<CreateCourse />);

    const courseCode = await screen.findByText("CLS001");
    const courseRow = courseCode.closest('[role="link"]');
    expect(courseRow).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /CLS001/ }));
    expect(mocks.push).not.toHaveBeenCalled();

    await screen.findByText("Published exam");
    fireEvent.click(screen.getByRole("button", { name: "Xem trước" }));
    expect(mocks.push).toHaveBeenCalledWith("/lecturer/exam/exam-1/preview");

    mocks.push.mockClear();
    fireEvent.click(within(courseRow as HTMLElement).getByText("CLS001"));
    expect(mocks.push).toHaveBeenCalledWith("/lecturer/course/course-1");
  });
});
