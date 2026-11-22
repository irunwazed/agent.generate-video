// KIT TOOLS: the file / console access a tool gets from scripts/kit-run.mjs (keeps src/kit free of Node imports).
export type ToolIO = {
  /** write a text file; path relative to the repo root, folders created */
  write(path: string, text: string): void;
  log(...a: unknown[]): void;
};
