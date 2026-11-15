#!/usr/bin/env bun
/**
 * v26 發射後回讀：**從已部署的 adb 位元組**把這 468 條新窗挖出來，逐條走產品自己的 `renderEmbed`，
 * 比對「mark 漢字序列」是否就是我方 md 首行的開頭——過閘是在**資料表**上驗的，
 * 這一支驗的是**發射之後的东西有沒有走樣**（§④ 的既定紀律：段落 ref 必從已部署位元組回讀）。
 *
 * 用法：bun run link-audit/tools/verify-fill-v26.ts [adb] [审计输出]
 */
import fs from 'node:fs';
const el = () => ({ style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, removeAttribute() {}, append() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, after() {}, insertBefore() {} });
const g = globalThis as any;
g.window = { addEventListener() {}, setTimeout: () => 0, location: { href: '' } };
g.document = { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el() };
g.navigator = { userAgent: 'test' }; g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; g.CSS = { highlights: new Map() };
const { renderEmbed } = await import('D:/2026/adb-converter/ts/src/accelon26/xref.ts');
const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { hanChars } = await import('D:/2026/adb-converter/ts/src/accelon26/han.ts');

const ADB = process.argv[2] ?? 'D:/accelon3/ybh.adb';
const AUDIT = process.argv[3] ?? 'D:/2026/_scratch-ybh/verify-fill-v26.tsv';
const han = (x: string) => hanChars(x.replace(/<[^>]*>/g, '')).join('');
const clean = (x: string) => han(x.replace(/\[\[[^\]]*\]\]/g, '').replace(/\^[A-Za-z0-9_-]+/g, '').replace(/\[[^\]]*\]/g, ''));

/* 1. 已發射清單（過閘者）＝審計檔裡判定含「過閘→發射」的行 */
const filled = new Map<string, { page: string; js: string; je: string }>();
for (const l of fs.readFileSync('D:/2026/_scratch-ybh/t1579-fill-483-audit.tsv', 'utf8').split('\n').slice(1)) {
  const c = l.split(String.fromCharCode(9));
  if (c.length < 7 || !/過閘→發射/.test(c[6]!)) continue;
  const [key, , , win] = [c[0], c[1], c[2], c[3]];
  const m = /^(.+)#(\d+)-(\d+)$/.exec(win ?? '');
  if (!m || !key) continue;
  filled.set(key, { page: m[1]!, js: m[2]!, je: m[3]! });
}
console.log(`審計檔認定已發射 ${filled.size} 條`);

/* 2. 我方 md 首行（口徑同前：整行去標籤取漢字） */
const firstOf = new Map<string, string>();
{
  const files = fs.readdirSync('D:/2026/yogacarabhumi-dila/raw').filter((f) => /^T1579-\d+\.md$/.test(f));
  for (const f of files) {
    const base = f.replace(/\.md$/, '');
    const lines = fs.readFileSync('D:/2026/yogacarabhumi-dila/' + f, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    let pending: string | null = null;
    for (const ln of lines) {
      const hd = /^#{1,6}\s+(.*?)\s*\^(kpD\d+-\d+)\s*$/.exec(ln);
      if (hd) { pending = hd[2]!; continue; }
      if (!pending) continue;
      const t = ln.trim();
      if (!t || /^《/.test(t) || /^\[\^/.test(t)) continue;
      if (pending && filled.has(base + '#' + pending)) firstOf.set(base + '#' + pending, clean(t));
      pending = null;
    }
  }
}

/* 3. 從已部署 adb 的**正文位元組**回讀 <嵌>，逐條 renderEmbed */
const rd = await AdbReader.open(new SyncIO(ADB));
let blocks = rd.containers.get('source')!.count;
let whole = '';
for (let b = 0; b < blocks; b++) whole += await rd.sourceText(b);
const shipped = new Map<string, { page: string; j: string }>();
for (const m of whole.matchAll(/<嵌 i="taisho\?([^"]+)" j="([^"]+)"[^>]*\/>/g)) shipped.set(m[1] + '@' + m[2], { page: m[1]!, j: m[2]! });
console.log(`已部署 adb 裡的 CBETA 嵌窗共 ${shipped.size} 種（頁欄@窗）`);

const taisho = await AdbReader.open(new SyncIO('D:/accelon3/taisho.adb'));
const rows: string[] = ['鍵' + String.fromCharCode(9) + '窗' + String.fromCharCode(9) + 'mark漢字' + String.fromCharCode(9) + '期望起首' + String.fromCharCode(9) + '判定'];
let ok = 0, bad = 0, notFound = 0;
for (const [key, w] of filled) {
  const f = firstOf.get(key) ?? '';
  const win = w.js + '-' + w.je;
  if (!shipped.has(w.page + '@' + win)) { notFound++; rows.push([key, win, '', '', '未在已部署 adb 中找到該窗'].join(String.fromCharCode(9))); continue; }
  const res = await renderEmbed('taisho', w.page, '', win, '', false, taisho as any);
  const mark = han(/<mark class="xrefHit">([\s\S]*?)<\/mark>/.exec(res.html)?.[1] ?? '');
  const want = f.slice(0, Math.min(12, f.length));
  const good = mark.length === +w.je - +w.js && mark.startsWith(want.slice(0, 6));
  if (good) ok++; else bad++;
  rows.push([key, w.page + '#' + win, String(mark.length), want, (good ? '相符' : '不誤差=' + mark.slice(0, 10))].join(String.fromCharCode(9)));
}
console.log(`\n回讀已部署位元組＋renderEmbed：相符 ${ok}、不相符 ${bad}、窗未落庫 ${notFound}（共 ${filled.size}）`);
fs.writeFileSync(AUDIT, rows.join('\n') + '\n', 'utf8');
console.log('逐條 → ' + AUDIT);
console.log(bad === 0 && notFound === 0 ? '⇒ 發射未走樣：468 條在成品 adb 裡逐條可還原' : '⇒ 有偏差，見審計');
