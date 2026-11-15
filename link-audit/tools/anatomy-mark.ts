#!/usr/bin/env bun
/**
 * 單條解剖：`renderEmbed` 的 mark 漢字數與 je-js 相同、窗首卻不符的那一條——
 * 到底是「窗內含別字」還是「q 起點算錯」。只印我方兩端字串與該頁上下文，不動任何檔。
 * 用法：bun run link-audit/tools/anatomy-mark.ts <base> <kp>
 */
import fs from 'node:fs';
const el = () => ({ style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, removeAttribute() {}, append() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, after() {}, insertBefore() {} });
const g = globalThis as any;
g.window = { addEventListener() {}, setTimeout: () => 0, location: { href: '' } };
g.document = { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el() };
g.navigator = { userAgent: 'test' }; g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; g.CSS = { highlights: new Map() };
const { renderEmbed } = await import('D:/2026/adb-converter/ts/src/accelon26/xref.ts');
const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { pageHanTextOf } = await import('D:/2026/adb-converter/ts/src/accelon26/page-text.ts');
const { hanChars } = await import('D:/2026/adb-converter/ts/src/accelon26/han.ts');

const [BASE, KP] = [process.argv[2] ?? 'T1579-3', process.argv[3] ?? 'kpD09-989'];
const han = (x: string) => hanChars(x.replace(/<[^>]*>/g, '')).join('');
const clean = (x: string) => han(x.replace(/\[\[[^\]]*\]\]/g, '').replace(/\^[A-Za-z0-9_-]+/g, '').replace(/\[[^\]]*\]/g, ''));

// 取我方首行
const lines = fs.readFileSync('D:/2026/yogacarabhumi-dila/raw/' + BASE + '.md', 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
let pending: string | null = null, first = '';
for (const ln of lines) {
  const hd = /^#{1,6}\s+(.*?)\s*\^(kpD\d+-\d+)\s*$/.exec(ln);
  if (hd) { pending = hd[2]!; continue; }
  if (!pending) continue;
  const t = ln.trim();
  if (!t || /^《/.test(t) || /^\[\^/.test(t)) continue;
  if (pending === KP) { first = clean(t); break; }
  pending = null;
}
const rd = await AdbReader.open(new SyncIO('D:/accelon3/taisho.adb'));
const row = (process.env.PAGE ? process.env.PAGE : '30p408c');
const ph = await pageHanTextOf(rd, row);
const q = first.slice(0, 12);
const js = ph.indexOf(q);
console.log(`我方首行（clean 後 ${first.length} 字）= ${JSON.stringify(first)}`);
console.log(`送搜 q（前 12）= ${JSON.stringify(q)}｜頁 ${row} 內 indexOf = ${js}`);
if (js >= 0) {
  const je = js + han(q).length;
  const res = await renderEmbed('taisho', row, '', js + '-' + je, '', false, rd as any);
  const mark = han(/<mark class="xrefHit">([\s\S]*?)<\/mark>/.exec(res.html)?.[1] ?? '');
  console.log(`期望窗 = ${JSON.stringify(q)}（${q.length}）`);
  console.log(`實際 mark = ${JSON.stringify(mark)}（${mark.length}）`);
  console.log(`頁內該位起 40 字 = ${JSON.stringify(ph.slice(js, js + 40))}`);
  console.log(`窗首是否相符 = ${mark.startsWith(q.slice(0, 6))}｜逐位差異 = ${[...mark].map((c, n) => (c !== q[n] ? n + ':' + c + '≠' + (q[n] ?? '∅') : null)).filter(Boolean).slice(0, 6).join(' ') || '無'}`);
}
