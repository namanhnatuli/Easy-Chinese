import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const loaderUrl = pathToFileURL(path.join(projectRoot, "tests", "alias-loader.mjs")).href;

register(loaderUrl, import.meta.url);
