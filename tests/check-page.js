const fs = require('fs');
const path = require('path');
const assert = require('assert');

const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');

// 1) Haupt-Script extrahieren (letzter <script>-Block)
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
assert.ok(blocks.length >= 1, 'kein <script>-Block gefunden');
const main = blocks[blocks.length - 1];
const Bool = new Function(main + '; return globalThis.Bool;')();

// 2) Logik-Tests (Parser, Auswertung, Wahrheitstabellen, De Morgan, Fehlerfaelle)
const t = Bool.tableFor('(A & B) | !C');
assert.deepStrictEqual(t.vars, ['A', 'B', 'C']);
assert.deepStrictEqual(t.rows.map((r) => r.result), [1, 0, 1, 0, 1, 0, 1, 1]);
assert.strictEqual(Bool.evalAst(Bool.parse('A ^ B'), { A: 1, B: 1 }), 0);
assert.strictEqual(Bool.evalAst(Bool.parse('A ^ B'), { A: 1, B: 0 }), 1);
assert.strictEqual(Bool.evalAst(Bool.parse('!!A'), { A: 1 }), 1);
for (const a of [0, 1]) {
  for (const b of [0, 1]) {
    assert.strictEqual(
      Bool.evalAst(Bool.parse('!(A & B)'), { A: a, B: b }),
      Bool.evalAst(Bool.parse('!A | !B'), { A: a, B: b }),
      'De Morgan verletzt (UND)'
    );
    assert.strictEqual(
      Bool.evalAst(Bool.parse('!(A | B)'), { A: a, B: b }),
      Bool.evalAst(Bool.parse('!A & !B'), { A: a, B: b }),
      'De Morgan verletzt (ODER)'
    );
  }
}
assert.deepStrictEqual(Bool.tableFor('A & !A').rows.map((r) => r.result), [0, 0]);
assert.deepStrictEqual(Bool.tableFor('A | !A').rows.map((r) => r.result), [1, 1]);
assert.throws(() => Bool.tableFor('A &'));
assert.throws(() => Bool.tableFor('(A & B'));
assert.throws(() => Bool.tableFor('A ? B'));
assert.throws(() => Bool.tableFor('A & B & C & D & E'));

// 3) Inhaltliche Presence-Checks (Abschnitte, Darkmode, Buchquelle)
for (const needle of [
  'id="grundlagen"',
  'id="operatoren"',
  'id="tabellen"',
  'id="gesetze"',
  'id="demorgan"',
  'id="schaltalgebra"',
  'id="praxis"',
  'id="interaktiv"',
  'id="quiz"',
  'id="themeToggle"',
  'html[data-theme="dark"]',
  'prefers-color-scheme',
  'Mengenalgebra',
  'Aussagenlogik',
  'Huntington',
  'Lipp',
  'Becker',
]) {
  assert.ok(html.includes(needle), 'fehlt im HTML: ' + needle);
}
const quizCount = (main.match(/q:'/g) || []).length;
assert.ok(quizCount >= 6, 'zu wenig Quiz-Fragen: ' + quizCount);

// 4) HTML-Tag-Balance (einfacher Stack-Check; Script-Inhalte vorher entfernen)
const htmlNoScript = html.replace(/<script>[\s\S]*?<\/script>/g, '');
const VOID = new Set(['meta', 'br', 'img', 'input', 'hr', 'link', 'line', 'circle', 'path', 'source']);
const stack = [];
const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
let m;
while ((m = tagRe.exec(htmlNoScript))) {
  const tag = m[1].toLowerCase();
  if (m[0].startsWith('</')) {
    assert.ok(stack.length > 0 && stack[stack.length - 1] === tag, 'Tag-Mismatch: </' + tag + '>, offen: ' + stack.join(','));
    stack.pop();
  } else if (!m[0].endsWith('/>') && !VOID.has(tag)) {
    stack.push(tag);
  }
}
assert.deepStrictEqual(stack, [], 'nicht geschlossene Tags: ' + stack.join(','));

console.log('✔ Alle CI-Checks bestanden (' + quizCount + ' Quiz-Fragen, ' + blocks.length + ' Script-Bloecke, HTML balanciert)');
