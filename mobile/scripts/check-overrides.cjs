const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function packageVersion(moduleName) {
  let directory = path.dirname(require.resolve(moduleName));
  const root = path.parse(directory).root;

  while (directory !== root) {
    const manifestPath = path.join(directory, "package.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.name === moduleName) {
        return manifest.version;
      }
    }
    directory = path.dirname(directory);
  }

  fail(`Could not read the installed version of ${moduleName}`);
}

function interopDefault(moduleExports) {
  return moduleExports && moduleExports.__esModule
    ? moduleExports
    : { default: moduleExports };
}

const imageSizeVersion = packageVersion("image-size");
if (!imageSizeVersion.startsWith("2.")) {
  fail(`Expected image-size 2.x, found ${imageSizeVersion}`);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const dimensions = interopDefault(require("image-size")).default(png);
if (
  !dimensions ||
  typeof dimensions.width !== "number" ||
  typeof dimensions.height !== "number"
) {
  fail(
    `image-size did not return { width, height }, got ${JSON.stringify(dimensions)}`,
  );
}

const uuidVersion = packageVersion("uuid");
if (uuidVersion !== "11.1.1") {
  fail(`Expected uuid 11.1.1, found ${uuidVersion}`);
}

const uuid = require("uuid");
if (typeof uuid.v4 !== "function") {
  fail("uuid.v4 is not a function");
}

const generatedId = uuid.v4();
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generatedId)) {
  fail(`uuid.v4() returned an unexpected value: ${generatedId}`);
}

const sprintfJs = require("sprintf-js");
if (typeof sprintfJs.sprintf !== "function") {
  fail("sprintf-js did not export sprintf");
}

const postcss = require("postcss");
if (typeof postcss !== "function") {
  fail("postcss did not export a function");
}

console.log("Override checks passed");
console.log(
  `image-size ${imageSizeVersion} -> ${dimensions.width}x${dimensions.height}`,
);
console.log(`uuid ${uuidVersion} -> ${generatedId}`);
console.log(`sprintf-js ${packageVersion("sprintf-js")}`);
console.log(`postcss ${packageVersion("postcss")}`);
