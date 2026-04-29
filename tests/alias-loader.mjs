import fs from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const candidateSuffixes = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const serverOnlyStubUrl = pathToFileURL(path.join(projectRoot, "tests", "server-only-stub.mjs")).href;

function resolveAliasTarget(specifier) {
  const requestedPath = path.join(sourceRoot, specifier.slice(2));

  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  for (const suffix of candidateSuffixes) {
    const candidatePath = `${requestedPath}${suffix}`;
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      shortCircuit: true,
      url: serverOnlyStubUrl,
    };
  }

  if (specifier.startsWith("@/")) {
    const resolvedPath = resolveAliasTarget(specifier);

    if (!resolvedPath) {
      throw new Error(`Could not resolve test alias: ${specifier}`);
    }

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href,
    };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await fs.promises.readFile(new URL(url), "utf8");

    return {
      format: "module",
      shortCircuit: true,
      source: stripTypeScriptTypes(source),
    };
  }

  return nextLoad(url, context);
}
