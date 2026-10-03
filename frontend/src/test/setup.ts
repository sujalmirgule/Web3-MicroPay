// Vitest setup
import { afterEach } from "vitest";

afterEach(() => {
  if (typeof window !== "undefined") {
    localStorage.clear();
  }
});
