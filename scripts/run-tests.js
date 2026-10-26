const ts = require('typescript');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const assert = require('assert');

// 1. Minimal Jest-compatible assertions for standalone test execution
if (!global.describe) {
  global.describe = (name, fn) => {
    console.log(`\nSuite: ${name}`);
    fn();
  };
}
if (!global.test) {
  global.test = (name, fn) => {
    try {
      fn();
      console.log(`  ✓ ${name}`);
    } catch (e) {
      console.error(`  ✗ ${name}`, e);
      process.exitCode = 1;
    }
  };
}
if (!global.expect) {
  global.expect = (val) => ({
    toBe: (expected) => assert.strictEqual(val, expected),
    toContain: (sub) => assert.ok(val.includes(sub)),
    not: {
      toContain: (sub) => assert.ok(!val.includes(sub)),
    },
  });
}

// 2. Register TypeScript loader
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: 'react-jsx',
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

// 3. Register @/ path alias
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// 4. Execute the test file
const testFiles = process.argv.slice(2);
const filesToRun = testFiles.length > 0 ? testFiles : ['tests/security.test.ts', 'tests/seo.test.ts'];

for (const tf of filesToRun) {
  const fullPath = path.resolve(process.cwd(), tf);
  console.log(`\n>>> Running test: ${path.relative(process.cwd(), fullPath)}`);
  require(fullPath);
}

