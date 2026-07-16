import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

describe("shared UI foundation", () => {
  it("renders a page heading, description and action", () => {
    const onClick = vi.fn();
    render(
      <PageHeader
        title="Ngân hàng câu hỏi"
        description="Quản lý các phiên bản câu hỏi."
        actions={[{ label: "Tạo câu hỏi", onClick }]}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ngân hàng câu hỏi");
    fireEvent.click(screen.getByRole("button", { name: "Tạo câu hỏi" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders an actionable empty state", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Chưa có bài thi"
        description="Tạo bài thi đầu tiên để bắt đầu."
        action={{ label: "Tạo bài thi", onClick }}
      />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Chưa có bài thi");
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài thi" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
