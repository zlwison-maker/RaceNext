import { deepEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const miniprogramRoot = resolve(repositoryRoot, "miniprogram");

test("miniprogram relative module imports do not include explicit .ts extensions", () => {
  const violations: string[] = [];

  for (const filePath of findTypeScriptFiles(miniprogramRoot)) {
    const source = readFileSync(filePath, "utf8");
    const relativeTypeScriptPath = /["'](\.{1,2}\/[^"']+\.ts)["']/g;
    for (const match of source.matchAll(relativeTypeScriptPath)) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`${relative(repositoryRoot, filePath)}:${line} ${match[1]}`);
    }
  }

  deepEqual(violations, []);
});

function findTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return findTypeScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  });
}
