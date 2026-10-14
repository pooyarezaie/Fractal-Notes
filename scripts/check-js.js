/* Syntax validation for site/build JavaScript and inline layout scripts. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
for (const dir of ['assets/js', 'scripts']) {
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.js'))) {
    const file = path.join(dir, name);
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  }
}
const layout = fs.readFileSync('_layouts/default.html', 'utf8');
for (const [index, match] of [...layout.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].entries()) {
  if (/type=|src=/.test(match[1])) continue;
  // The only Liquid in executable inline JS resolves to URL strings.
  new vm.Script(match[2].replace(/\{\{[\s\S]*?\}\}/g, '/'), { filename: `default.html script ${index}` });
}
console.log('JavaScript syntax checks passed (site assets, scripts and inline layout scripts).');
