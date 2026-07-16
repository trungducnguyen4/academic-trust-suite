import { describe, expect, it } from "vitest";

import { THEME_OPTIONS, THEME_PROVIDER_OPTIONS } from "@/lib/theme";

describe("theme configuration", () => {
  it("supports light, dark and system modes", () => {
    expect(THEME_OPTIONS).toEqual(["light", "dark", "system"]);
  });

  it("follows the operating system by default", () => {
    expect(THEME_PROVIDER_OPTIONS).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
    });
  });
});
