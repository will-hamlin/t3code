import { expect, it } from "vite-plus/test";
import { displayText } from "./displayText";

it("shows entry names while keeping web URLs and surrounding prose intact", () => {
  expect(displayText("Open C:\\Users\\sample\\workspace\\notes.md, then src/ui/app.tsx.")).toBe(
    "Open notes.md, then app.tsx.",
  );
  expect(displayText("Read /home/sample/project/README.md and ~/config/settings.json")).toBe(
    "Read README.md and settings.json",
  );
  expect(displayText("1/2 and a/b")).toBe("1/2 and a/b");
  expect(displayText("https://example.com/docs/setup")).toBe("https://example.com/docs/setup");
  expect(displayText("file:///home/sample/project/test.ts")).toBe("test.ts");
});
