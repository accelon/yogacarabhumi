/** 量 275 段 <表> 裡面有多少格帶著「被 esc 成實體的標籤／符號」——決定要不要另開正文取捨單。 */
import fs from 'node:fs';
const el = () => ({ style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, removeAttribute() {}, append() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, after() {}, insertBefore() {} });
const g = globalThis as any;
g.window = { addEventListener() {}, setTimeout: () => 0, location: { href: '' } };
g.document = { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el() };
g.navigator = { userAgent: 'test' }; g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; g.CSS = { highlights: new Map() };
const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { VaPaMapper } = await import('D:/2026/adb-converter/ts/src/accelon26/vapa.ts');
const { renderPageBlocks } = await import('D:/2026/adb-converter/ts/src/accelon26/render_accelon3.ts');

const rd = await AdbReader.open(new SyncIO(process.argv[2] ?? 'D:/2026/_scratch-ybh/ybh/ybh.adb'));
const mp = new VaPaMapper(rd); await mp.init();
const N = rd.header.lineCount;
const OPEN = /^\s*<表(?=[\s>])[^>]*>/, CLOSE = /^\s*<\/表>\s*$/;
const kinds = new Map<string, number>();
let cells = 0, escaped = 0, tables = 0;
for (let i = 0; i < N; i++) {
  if (!OPEN.test(await mp.lineText(i))) continue;
  let j = i; while (j + 1 < N && j + 1 < i + 400 && !CLOSE.test(await mp.lineText(j + 1))) j++;
  j++;                                     // 把 </表> 那一行也納入（渲染器要看到收標籤才認區塊）
  const seg: string[] = []; for (let k = i; k <= j; k++) seg.push(await mp.lineText(k));
  const tb = renderPageBlocks(seg, seg.map((_, k) => i + k), { hardBreaks: true } as any, { depthOf: new Map(), levels: 0 } as any).find((b) => b.kind === 'table')?.table;
  if (!tb) continue;
  tables++;
  const all = (tb.head ? [tb.head.cells] : []).concat(tb.rows.map((r) => r.cells));
  for (const row of all) for (const c of row) {
    cells++;
    const ms = c.match(/&lt;[^&]*&gt;|&amp;/g);
    if (!ms) continue;
    escaped++;
    for (const m of ms) kinds.set(m.replace(/&lt;|&gt;/g, (x) => x === '&lt;' ? '<' : '>'), (kinds.get(m.replace(/&lt;|&gt;/g, (x) => x === '&lt;' ? '<' : '>')) ?? 0) + 1);
  }
}
console.log(`${tables} 段表格、共 ${cells} 格；含「被跳脫的標籤／&amp; 實體」的格 ${escaped} 格`);
console.log('型別：' + [...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
