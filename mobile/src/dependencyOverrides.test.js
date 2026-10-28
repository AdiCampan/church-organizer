const assert = require("assert");
const fs = require("fs");
const path = require("path");
const decodeUriComponent = require("decode-uri-component");
const queryString = require("query-string");
const nodeForge = require("node-forge");
const braces = require("braces");

function installedVersion(moduleName) {
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

  throw new Error(`Could not read the installed version of ${moduleName}`);
}

assert.strictEqual(typeof decodeUriComponent, "function");
assert.strictEqual(installedVersion("decode-uri-component"), "0.5.1");
assert.strictEqual(decodeUriComponent("%25"), "%");
assert.strictEqual(decodeUriComponent("st%C3%A5le"), "ståle");
assert.strictEqual(decodeUriComponent("%"), "%");
assert.strictEqual(decodeUriComponent("%FE%FF"), "\uFFFD\uFFFD");
assert.throws(
  () => decodeUriComponent(1),
  (error) =>
    error instanceof TypeError &&
    error.message.includes("Expected `encodedURI` to be of type `string`"),
);

const parsedQuery = queryString.parse("name=st%C3%A5le&x=%");
assert.strictEqual(parsedQuery.name, "ståle");
assert.strictEqual(parsedQuery.x, "%");
assert.strictEqual(queryString.stringify({ name: "ståle" }), "name=st%C3%A5le");

assert.strictEqual(installedVersion("node-forge"), "1.4.2");
assert.strictEqual(typeof nodeForge.md.sha256.create, "function");

assert.strictEqual(installedVersion("braces"), "3.0.3");
assert.deepStrictEqual(braces("a/{b,c}", { expand: true }), ["a/b", "a/c"]);
