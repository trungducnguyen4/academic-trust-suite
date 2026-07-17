import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

import Profile from "@/features/Profile";

describe("Profile authentication guard", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.useAuth.mockReset();
  });

  it("shows a loading state without reading a null user", () => {
    mocks.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      applyProfileToSession: vi.fn(),
    });

    render(<Profile />);

    expect(screen.getByText("Đang tải hồ sơ...")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects an unauthenticated visitor without throwing", async () => {
    mocks.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      applyProfileToSession: vi.fn(),
    });

    const { container } = render(<Profile />);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });
});
