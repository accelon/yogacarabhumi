#!/usr/bin/env bun
/**
 * 給耀悟法師的「`<br>` 顯示成字面字元」具體位置清單。
 * 每段給四個查得到的坐標：**部 → 卷 → 所屬科判（含標題）→ 大正冊頁欄 → 成品行號**，
 * 行號可直接貼進閱讀器左欄 `#行號` 跳過去。
 *
 * 行取用 `VaPaMapper.lineText(i)`——**adb 的行號是行表，不是文字裡的 `\n`**
 * （把 source 區塊串接再切 '\n' 會得到 1 行，本區踩過兩次）。
 * OPEN／CLOSE 正則與 `count-escaped-cells.ts` 同一份，確保段數可互相对照（275 段）。
 * 用法：bun run link-audit/tools/list-br-tables.ts [輸出CSV]
 */
import fs from 'node:fs';
const el = () => ({ style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, removeAttribute() {}, append() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, after() {}, insertBefore() {} });
const g = globalThis as any;
g.window = { addEventListener() {}, setTimeout: () => 0, location: { href: '' } };
g.document = { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el() };
g.navigator = { userAgent: 'test' }; g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; g.CSS = { highlights: new Map() };
const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { VaPaMapper } = await import('D:/2026/adb-converter/ts/src/accelon26/vapa.ts');
const { renderPageBlocks } = await import('D:/2026/adb-converter/ts/src/accelon26/render_accelon3.ts');

const ADB = 'D:/accelon3/ybh.adb';
const OUT = process.argv[2] ?? 'D:/2026/yogacarabhumi-dila/link-audit/data/br-tables-review.csv';
const rd = await AdbReader.open(new SyncIO(ADB));
const mp = new VaPaMapper(rd); await mp.init();
const N = rd.header.lineCount;
const OPEN = /^\s*<表(?=[\s>])[^>]*>/, CLOSE = /^\s*<\/表>\s*$/;
const SERIES = /n="(T1579|PXJ-H|T1828|T1829|T1580|T2801|T2802|T2259|T1581|T1582|T1583|T1584|T1602|T1604|T1605|T1606|X0794)-(\d+)#(kpD\d+-\d+)"/;
console.log('成品行數', N);

const rows: string[][] = [['序', '部', '卷', '所屬科判', '科判標題', '大正頁欄', '成品行號（<表>起）', '段內行數', '含br格數', '表頭首欄']];
let seq = 0, brTotal = 0, tables = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const li = await mp.lineText(i);
  if (!OPEN.test(li)) continue;
  let j = i;
  while (j + 1 < N && j + 1 < i + 400 && !CLOSE.test(await mp.lineText(j + 1))) j++;
  j++;
  tables++;
  const seg: string[] = [];
  for (let k = i; k <= j && k < N; k++) seg.push(await mp.lineText(k));
  const tb = renderPageBlocks(seg, seg.map((_, k) => i + k), { hardBreaks: true } as any, { depthOf: new Map(), levels: 0 } as any)
    .find((b) => b.kind === 'table')?.table;
  if (!tb) continue;
  const allCells = (tb.head ? [tb.head.cells] : []).concat(tb.rows.map((r: any) => r.cells));
  let brCells = 0;
  for (const row of allCells) for (const c of row) if (/&lt;br&gt;/i.test(c)) brCells++;
  if (!brCells) continue;
  brTotal += brCells;
  /* 往上找最近的科判行，取部／卷／錨與標題（渲染後去標籤） */
  let bu = '', vol = '', anchor = '', head = '';
  for (let k = i - 1; k > Math.max(0, i - 80); k--) {
    const t = await mp.lineText(k);
    const m = SERIES.exec(t);
    if (m) { bu = m[1]!; vol = m[2]!; anchor = `${m[1]}-${m[2]}#${m[3]}`; head = t.replace(/<[^>]*>/g, '').trim().slice(0, 30); break; }
  }
  const pageM = /i="taisho\?(\d+p\d+[a-c])/.exec(seg.join(' '));
  seq++;
  rows.push([String(seq), bu || '(未定)', vol, anchor, head, pageM ? pageM[1]! : '', String(i + 1), String(seg.length), String(brCells),
    (tb.head?.cells?.[0] ?? tb.rows?.[0]?.cells?.[0] ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, 40)]);
  if (seq % 20 === 0) process.stdout.write(`\r  已找出 ${seq} 段（掃到第 ${i} 行，${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}
console.log('');
console.log(`總表格段 ${tables}｜其中含字面 <br> 的段 ${seq}｜受影響格數合计 ${brTotal}`);
const q = (s: string) => (/[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
fs.writeFileSync(OUT, '\uFEFF' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n', 'utf8');
console.log('清單 →', OUT);
