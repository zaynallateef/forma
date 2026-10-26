import { describe, it, expect } from "vitest";
import { detectFormat, parsePages, fitImage, validateFile } from "./validation";
describe("page ranges", () => {
  it("handles all, ranges, duplicates, and intentional order", () => {
    expect(parsePages("", 3)).toEqual([0, 1, 2]);
    expect(parsePages("3, 1-2, 2", 3)).toEqual([2, 0, 1]);
  });
  it.each(["0", "4", "3-1", "x", "1,", "1.5", "-1", "1-1000000"])(
    "rejects invalid range %s",
    (value) => expect(() => parsePages(value, 3)).toThrow(),
  );
  it("rejects empty and oversized documents", () => {
    expect(() => parsePages("", 0)).toThrow();
    expect(() => parsePages("", 151)).toThrow();
  });
});
describe("signatures", () => {
  it("detects actual formats", () => {
    expect(detectFormat(new Uint8Array([37, 80, 68, 70, 45]))).toBe("pdf");
    expect(
      detectFormat(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe("png");
    expect(detectFormat(new Uint8Array([255, 216, 255]))).toBe("jpg");
    expect(detectFormat(new TextEncoder().encode("RIFFxxxxWEBP"))).toBe("webp");
    expect(detectFormat(new TextEncoder().encode("not a pdf"))).toBeNull();
  });
  it("rejects empty and oversized files", async () => {
    await expect(
      validateFile(new File([], "empty.pdf"), false),
    ).rejects.toThrow("empty");
    await expect(
      validateFile(
        { name: "large.pdf", size: 21 * 1024 * 1024 } as File,
        false,
      ),
    ).rejects.toThrow("20 MB");
  });
  it("checks contents instead of trusting names", async () => {
    const file = {
      name: "fake.pdf",
      size: 10,
      slice: () => ({
        arrayBuffer: async () => new TextEncoder().encode("not a pdf").buffer,
      }),
    } as unknown as File;
    await expect(validateFile(file, false)).rejects.toThrow("valid PDF");
  });
});
describe("image layout", () => {
  it("centers and preserves aspect ratio within margins", () => {
    expect(fitImage(200, 100, 600, 800, 50)).toEqual({
      width: 500,
      height: 250,
      x: 50,
      y: 275,
    });
  });
  it("rejects invalid dimensions and impossible margins", () => {
    expect(() => fitImage(0, 100, 600, 800, 50)).toThrow();
    expect(() => fitImage(100, 100, 600, 800, 400)).toThrow();
  });
});
