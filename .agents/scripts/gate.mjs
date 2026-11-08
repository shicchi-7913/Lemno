import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { spawnSync } from "node:child_process";

const task = process.argv[2];
const tasks = new Set(["lint", "format", "test", "arch", "typecheck", "build"]);

if (!tasks.has(task) || !process.env.CLAUDE_PROJECT_DIR) {
  console.error("[gate] Invalid task or missing CLAUDE_PROJECT_DIR");
  process.exit(2);
}

const root = resolve(process.env.CLAUDE_PROJECT_DIR);
let failed = false;

const codeExt = /\.(?:jsx?|tsx?|mjs|cjs|mts|cts)$/i;
const formatExt = /\.(?:jsx?|tsx?|mjs|cjs|mts|cts|jsonc?|css|scss|md|ya?ml)$/i;
const testExts = ["ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts"];
const testName = /(?:\.test|_test)\.(?:tsx?|jsx?|mjs|cjs|mts|cts)$/i;

// feedback-gate のシェル引用済みファイル一覧を安全に分割する。
function shellWords(input) {
  const words = [];
  let word = "";
  let quote = "";
  let started = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote === "'") {
      if (ch === "'") quote = "";
      else word += ch;
    } else if (quote === '"') {
      if (ch === '"') {
        quote = "";
      } else if (ch === "\\" && i + 1 < input.length) {
        const next = input[i + 1];
        if ('"\\$`'.includes(next)) {
          word += next;
          i++;
        } else {
          word += ch;
        }
      } else {
        word += ch;
      }
    } else if (/\s/.test(ch)) {
      if (started) words.push(word);
      word = "";
      started = false;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (ch === "\\") {
      word += input[++i] ?? "";
      started = true;
    } else {
      word += ch;
      started = true;
    }
  }

  if (quote) throw new Error("Unclosed quote in CLAUDE_GATE_FILES");
  if (started) words.push(word);

  return words;
}

function inside(path) {
  const rel = relative(root, path);
  return rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel);
}

function projectFor(path) {
  if (!inside(path)) return null;

  const parts = relative(root, path).split(sep);
  const [kind] = parts;

  if (kind !== "frontend" || parts.length < 2) {
    return null;
  }

  const dir = join(root, kind);
  if (!existsSync(join(dir, "package.json"))) return null;

  return { kind, dir };
}

function isFile(path) {
  try {
    return statSync(path).isFile() && inside(realpathSync(path));
  } catch {
    return false;
  }
}

function display(path) {
  return relative(root, path);
}

const changed = [...new Set(
  shellWords(process.env.CLAUDE_GATE_FILES ?? "")
    .map(path => resolve(root, path))
    .filter(path => inside(path) && projectFor(path))
)];

const files = changed.filter(isFile);
const projects = [...new Map(
  changed.map(path => {
    const p = projectFor(path);
    return [p.dir, p];
  })
).values()];

const manifests = new Map();

function manifest(dir) {
  if (!manifests.has(dir)) {
    manifests.set(
      dir,
      JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
    );
  }
  return manifests.get(dir);
}

function hasDependency(pkg, name) {
  return [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ].some(field => Object.hasOwn(pkg[field] ?? {}, name));
}

function parentPackages(file) {
  const result = [];

  for (let dir = dirname(file); inside(dir); dir = dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) {
      result.push({ dir, pkg: manifest(dir) });
    }
    if (dir === root) break;
  }

  return result;
}

function packageWithTool(file, tool) {
  return parentPackages(file)
    .find(({ pkg }) => hasDependency(pkg, tool))?.dir;
}

// 失敗時だけツールの出力を表示する。
// 成功時は固定メッセージのみ。
function run(label, cwd, command, args, note) {
  const result = spawnSync(
    "mise",
    ["-C", cwd, "exec", "--", command, ...args],
    {
      cwd,
      encoding: "utf8",
      timeout: 600_000,
      maxBuffer: 8 * 1024 * 1024,
    }
  );

  if (result.status === 0 && !result.error) {
    console.log(`[${label}] OK - ${note}`);
    return;
  }

  failed = true;
  console.log(`[${label}] FAIL - ${note}`);

  const output = [
    result.stdout,
    result.stderr,
    result.error?.message,
    result.signal ? `Signal: ${result.signal}` : "",
  ].filter(Boolean).join("\n").trim();

  console.log(output || `Exit code: ${result.status}`);
}

function skip(label, reason) {
  console.log(`[${label}] SKIP - ${reason}`);
}

// 変更ファイル単位の ESLint / Prettier
function checkFiles(tool) {
  const labelTask = tool === "eslint" ? "lint" : "format";
  const eligible = files.filter(file =>
    tool === "eslint"
      ? codeExt.test(file)
      : formatExt.test(file) && !lstatSync(file).isSymbolicLink()
  );

  const groups = new Map();

  for (const file of eligible) {
    const label = `${projectFor(file).kind}-${labelTask}`;
    const dir = packageWithTool(file, tool);

    if (!dir) {
      skip(label, `${tool} is not configured: ${display(file)}`);
      continue;
    }

    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(file);
  }

  if (!eligible.length) {
    for (const p of projects) skip(`${p.kind}-${labelTask}`, "no target files");
  }

  for (const [dir, paths] of groups) {
    const label = `${projectFor(paths[0]).kind}-${labelTask}`;
    const bin = join(dir, "node_modules", ".bin", tool);

    const args = tool === "eslint"
      ? ["--", ...paths]
      : ["--check", "--", ...paths];

    run(label, dir, bin, args, `${paths.length} file(s)`);
  }
}

// 同階層にある *_test / *.test のみ検出する。
function siblingTests() {
  const tests = new Set();

  for (const file of files.filter(f => codeExt.test(f))) {
    if (testName.test(basename(file))) {
      tests.add(file);
      continue;
    }

    const stem = basename(file, extname(file));

    for (const suffix of ["_test", ".test"]) {
      for (const ext of testExts) {
        const test = join(dirname(file), `${stem}${suffix}.${ext}`);
        if (isFile(test)) tests.add(test);
      }
    }
  }

  return [...tests].sort();
}

function testRunner(file) {
  for (const { dir, pkg } of parentPackages(file)) {
    if (hasDependency(pkg, "vitest")) return { dir, tool: "vitest" };
    if (hasDependency(pkg, "jest")) return { dir, tool: "jest" };

    if (Object.values(pkg.scripts ?? {}).some(
      value => typeof value === "string" && /\bnode\s+--test\b/.test(value)
    )) {
      return { dir, tool: "node" };
    }
  }

  return null;
}

function checkTests() {
  const tests = siblingTests();
  const groups = new Map();

  if (!tests.length) {
    for (const p of projects) skip(`${p.kind}-test`, "no sibling tests");
    return;
  }

  for (const file of tests) {
    const runner = testRunner(file);
    const label = `${projectFor(file).kind}-test`;

    if (!runner) {
      failed = true;
      console.log(`[${label}] FAIL - no test runner: ${display(file)}`);
      continue;
    }

    const key = `${runner.dir}\0${runner.tool}`;
    if (!groups.has(key)) groups.set(key, { ...runner, files: [] });
    groups.get(key).files.push(file);
  }

  for (const { dir, tool, files: paths } of groups.values()) {
    const label = `${projectFor(paths[0]).kind}-test`;

    const command = tool === "node"
      ? "node"
      : join(dir, "node_modules", ".bin", tool);

    const args = tool === "vitest"
      ? ["run", "--", ...paths]
      : tool === "jest"
        ? [
            "--runInBand",
            "--watch=false",
            "--watchAll=false",
            "--runTestsByPath",
            "--",
            ...paths,
          ]
        : ["--test", "--", ...paths];

    run(
      label,
      dir,
      command,
      args,
      paths.map(display).join(", ")
    );
  }
}

// プロジェクト全体の arch:check / typecheck / build
function checkProjects(script, labelTask = task) {
  for (const p of projects) {
    const label = `${p.kind}-${labelTask}`;
    const pkg = manifest(p.dir);

    if (!Object.hasOwn(pkg.scripts ?? {}, script)) {
      skip(label, `${script} is not defined: ${display(p.dir)}`);
      continue;
    }

    run(label, p.dir, "pnpm", ["run", script], display(p.dir));
  }
}

switch (task) {
  case "lint":
    checkFiles("eslint");
    checkProjects("styles:lint", "styles-lint");
    break;
  case "format":
    checkFiles("prettier");
    break;
  case "test":
    checkTests();
    break;
  case "arch":
    checkProjects("arch:check");
    break;
  case "typecheck":
    checkProjects("typecheck");
    break;
  case "build":
    checkProjects("build");
    break;
}

process.exitCode = failed ? 1 : 0;
