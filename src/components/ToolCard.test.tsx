import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { ToolCard } from "./ToolCard";
import { tools } from "../lib/tools";
it("links users to working PDF and local reading tools", () => {
  render(
    <MemoryRouter>
      <ToolCard tool={tools[0]} />
      <ToolCard tool={tools[7]} />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: /PDF to PNG/ })).toHaveAttribute(
    "href",
    "/tools/pdf-to-png",
  );
  expect(
    screen.getByRole("link", { name: /OCR & text extraction/ }),
  ).toHaveAttribute("href", "/studio?tool=ocr");
  expect(screen.queryByText("Soon")).not.toBeInTheDocument();
});
