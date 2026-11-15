#!/usr/bin/env bun
/**
 * §五.2 施工：把基數裡「可排工」那 483 條（可補・連寫唯一且收口 ≥7 字）算成逐字 j 窗，
 * 寫回 `spans-j-verified.tsv`（lib=T1579、目前 jstart/jend 為空的那批），供 build-ybh 發射 `<聯 #a-b>`＋`<嵌 j>`。
 *
 * 沿用 `span-refine-k.ts` 的既有閘門，不另造標準：
 *   ① 頁內定位用產品 `pageHanTextOf`＋`hanChars`（大正一行約 17 字，10 字串本來就會跨行）；
 *   ② 跨頁時**鉗到頁尾發半句**並記 crossPage（比照 span-refine-k:167-173 的既有行為）；
 *   ③ 收的條件＝必須過 `renderEmbed`：`<mark class="xrefHit">` 的漢字數 **必等於** `je-js`
 *      且窗首相符——**沒過驗證的一律不動原值**，只記審計。
 *   ④ 首見原檔先備份 `*.pre-fill.tsv`（原地改寫前的既定保護）。
 *
 * 用法：
 *   bun run link-audit/tools/span-fill-t1579.ts --dry            ← 只算不寫，出審計
 *   bun run link-audit/tools/span-fill-t1579.ts                  ← 寫回 spans-j-verified.tsv
 *   bun run link-audit/tools/span-fill-t1579.ts --bucket=62      ← 改灌「唯一但僅 4–5 字」那批
 */
import fs from 'node:fs';
const el = () => ({
  style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '',
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  setAttribute() {}, removeAttribute() {}, append() {}, appendChild() {}, remove() {},
  addEventListener() {}, removeEventListener() {}, querySelector() { return null; },
  querySelectorAll() { return []; }, after() {}, insertBefore() {},
});
const g = globalThis as any;
g.window = { addEventListener() {}, setTimeout: () => 0, location: { href: '' } };
g.document = { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el() };
g.navigator = { userAgent: 'test' };
g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
g.CSS = { highlights: new Map() };
const { renderEmbed } = await import('D:/2026/adb-converter/ts/src/accelon26/xref.ts');
const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { pageHanTextOf } = await import('D:/2026/adb-converter/ts/src/accelon26/page-text.ts');
const { hanChars } = await import('D:/2026/adb-converter/ts/src/accelon26/han.ts');

const V = 'D:/2026/yogacarabhumi-dila/raw', SCR = 'D:/2026/_scratch-ybh';
const TSV = SCR + '/spans-j-verified.tsv';
const BASE = 'D:/2026/yogacarabhumi-dila/link-audit/data/t1579-window-baseline-both.csv';
const DRY = process.argv.includes('--dry');
const BUCKET = (/--bucket=(\d+)/.exec(process.argv.join(' '))?.[1] ?? '483') as string;
const NL = String.fromCharCode(10);
const TAB = String.fromCharCode(9);
const AUDIT = SCR + '/t1579-fill-' + BUCKET + (DRY ? '-dry' : '') + '-audit.tsv';

const han = (x: string) => hanChars(x.replace(/<[^>]*>/g, '')).join('');
const clean = (x: string) => han(x.replace(/\[\[[^\]]*\]\]/g, '').replace(/\^[A-Za-z0-9_-]+/g, '').replace(/\[[^\]]*\]/g, ''));

/* ── 1. 選定要灌的行（判語＝可補・連寫唯一，收口長度依分桶）── */
const blines = fs.readFileSync(BASE, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
const bh = blines[0]!.split(',');
const bc = (k: string) => bh.indexOf(k);
const parseCsv = (l: string): string[] => {
  const out: string[] = []; let i = 0;
  while (i <= l.length) {
    if (l[i] === '"') { let j = i + 1, s = ''; while (j < l.length) { if (l[j] === '"' && l[j + 1] === '"') { s += '"'; j += 2; continue; } if (l[j] === '"') { j++; break; } s += l[j++]; } out.push(s); i = j + 1; if (l[i] === ',') i++; }
    else { let j = i; while (j < l.length && l[j] !== ',') j++; out.push(l.slice(i, j)); i = j + 1; }
    if (i > l.length) break;
  }
  return out;
};
const wantK = BUCKET === '62' ? (k: number) => k >= 4 && k <= 6 : (k: number) => k >= 7;
const todo = new Map<string, { page: string; head: string }>();
for (const l of blines.slice(1)) {
  const c = parseCsv(l);
  if (c[bc('判語')] !== '可補（連寫唯一）') continue;
  if (!wantK(+(c[bc('收口長度')] ?? '0'))) continue;
  todo.set(c[0] + '#' + c[2], { page: c[bc('命中頁欄')] ?? '', head: c[3] ?? '' });
}
console.log(`分桶 ${BUCKET}：選定 ${todo.size} 條`);

/* ── 2. 重取各卷首行（與基數同一支解析，避免口徑漂移）── */
const firstOf = new Map<string, string>();
{
  const files = fs.readdirSync(V).filter((f) => /^T1579-\d+\.md$/.test(f)).sort((a, b) => +(/-(\d+)\.md/.exec(a)![1]!) - +(/-(\d+)\.md/.exec(b)![1]!));
  for (const f of files) {
    const base = f.replace(/\.md$/, '');
    const lines = fs.readFileSync(V + '/' + f, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, NL).split(NL);
    let pending: string | null = null;
    for (const ln of lines) {
      const hd = /^#{1,6}\s+(.*?)\s*\^(kpD\d+-\d+)\s*$/.exec(ln);
      if (hd) { pending = hd[2]!; continue; }
      if (!pending) continue;
      const t = ln.trim();
      if (!t || /^《/.test(t) || /^\[\^/.test(t)) continue;
      // **口徑必須與基數腳本一致**（`count-t1579-window-baseline.ts` 用的是「整行去標籤取漢字」）。
      // 之前這裡沿用 span-refine-k 的表格 cell 過濾規則，同一條 `| … |` 行基數算 23 字、這裡丟成「無首行」，
      // 屬於腳本自己造成的口徑漂移，不是資料缺——兩支腳本對同一條給不同判定，發射數就不可信。
      // **口徑必須與基數腳本逐字一致**：基數取「整行去標籤後的漢字」（表格行也是整串併起來搜），
      // 而實測證明該整串在 CBETA 裡唯一命中——那些表格格內文字本來就是連續經文。
      // 若在這裡改成「取最長格」，等於對同一條用兩把不同的尺，發射數就不可信（本腳本第一版就犯過）。
      const qd = t;
      if (qd) { if (todo.has(base + '#' + pending)) firstOf.set(base + '#' + pending, clean(qd)); pending = null; }
    }
  }
}
console.log(`取到首行 ${firstOf.size} 條（缺者＝解析口徑不同，會記「無首行」）`);

/* ── 3. 逐條定位＋驗證 ── */
const rd = await AdbReader.open(new SyncIO('D:/accelon3/taisho.adb'));
/* 頁欄順序表：命中 VA 落在 a 欄、句子卻跨進 b／c 欄時，只在 a 欄 indexOf 必然失敗
   （實測 14 條「頁內定位失敗」就是這種）。所以落點要連鄰頁一起試。 */
const tagsT = rd.containers.get('tags')!;
const pageVasT = await rd.decodeBlockList('tags', tagsT.names.indexOf('頁'));
const pageIdsT: string[] = ((await rd.attributeValues('頁.id'))?.values ?? []).map(String);
const posOfPage = new Map<string, number>();
pageIdsT.forEach((p, n) => { if (!posOfPage.has(p)) posOfPage.set(p, n); });
const neighborPages = (p: string): string[] => {
  const n = posOfPage.get(p);
  if (n == null) return [p];
  return [p, pageIdsT[n + 1] ?? '', pageIdsT[n + 2] ?? ''].filter(Boolean);
};
const pageCache = new Map<string, string>();
const phOf = async (p: string) => { let v = pageCache.get(p); if (v === undefined) { v = await pageHanTextOf(rd, p); pageCache.set(p, v); } return v; };
const audit: string[] = ['卷檔#科判' + TAB + '科判標題' + TAB + '舊頁欄' + TAB + '新窗' + TAB + '牒文' + TAB + 'mark漢字' + TAB + '判定'];
let pass = 0, failPos = 0, failMark = 0, noFirst = 0, cross = 0;
const fills = new Map<string, { page: string; js: string; je: string }>();
const t0 = Date.now();
let i = 0;
for (const [key, meta] of todo) {
  i++;
  const [base, kp] = key.split('#');
  const f = firstOf.get(key) ?? '';
  if (!f || f.length < 4) { noFirst++; audit.push([key, meta.head, '', '', f, '', '無首行／過短→不動'].join(TAB)); continue; }
  if (!meta.page) { failPos++; audit.push([key, meta.head, '', '', f.slice(0, 24), '', '基數表無頁欄→不動'].join(TAB)); continue; }
  // 依序試：整句 → 24 → 18 → 14 → 10 → 8 個漢字（與 span-refine-k 同一組階梯），
  // 每種長度都在「命中頁＋後續兩欄」上試（跨欄的句子才找得到）。
  const cands = neighborPages(meta.page);
  const pages = cands.map(async (p) => [p, await phOf(p)] as const);
  let picked: { q: string; js: number; je: number; cross: boolean; page: string } | null = null;
  for (const L of [f.length, 24, 18, 14, 10, 8]) {
    if (L < 8 || L > f.length) continue;
    const q0 = f.slice(0, L);
    for (const [pg, ph] of await Promise.all(pages)) {
      let js = ph.indexOf(q0);
      let q = q0, isCross = false;
      if (js < 0) {                                  // 跨頁：前 8 字在本頁且本頁剩 ≥6 字 → 鉗到頁尾發半句
        const hp = ph.indexOf(f.slice(0, 8));
        if (hp < 0 || ph.length - hp < 6) continue;
        js = hp; q = f.slice(0, Math.min(f.length, ph.length - hp)); isCross = true;
      }
      const je = Math.min(js + han(q).length, ph.length);
      if (je <= js) continue;
      picked = { q, js, je, cross: isCross, page: pg };
      break;
    }
    if (picked) break;
  }
  if (!picked) { failPos++; audit.push([key, meta.head, meta.page, '', f.slice(0, 24), '', '頁內定位失敗（含鄰頁）→不動'].join(TAB)); continue; }
  const { q, js, je, cross: xc, page: usePage } = picked;
  if (xc) cross++;
  const res = await renderEmbed('taisho', usePage, '', js + '-' + je, '', false, rd as any);
  const mark = han(/<mark class="xrefHit">([\s\S]*?)<\/mark>/.exec(res.html)?.[1] ?? '');
  if (mark.length !== je - js || !mark.startsWith(q.slice(0, Math.min(6, q.length)))) {
    failMark++;
    audit.push([key, meta.head, meta.page, usePage + '#' + js + '-' + je, q.slice(0, 24), String(mark.length),
      'renderEmbed 未過（mark ' + mark.length + ' vs ' + (je - js) + '）→不動'].join(TAB));
    continue;
  }
  pass++;
  fills.set(key, { page: usePage, js: String(js), je: String(je) });
  audit.push([key, meta.head, meta.page, usePage + '#' + js + '-' + je, q.slice(0, 24), String(mark.length),
    '過閘→發射' + (xc ? '（跨頁鉗尾）' : '') + (usePage !== meta.page ? '（落鄰頁 ' + usePage + '）' : '')].join(TAB));
  if (i % 100 === 0) process.stdout.write(`\r  ${i}/${todo.size}（${((Date.now() - t0) / 1000).toFixed(0)}s）過閘 ${pass}`);
}
if (todo.size >= 100) console.log('');
console.log(`定位／驗證：過閘 ${pass}、頁內定位失敗 ${failPos}、renderEmbed 未過 ${failMark}、無首行 ${noFirst}（其中跨頁鉗尾 ${cross}）`);
fs.writeFileSync(AUDIT, '' + audit.join(NL) + NL, 'utf8');
console.log('逐條審計 → ' + AUDIT);

/* ── 4. 寫回 spans-j-verified.tsv（過閘者填 page/jstart/jend，mode 記 VF）── */
if (DRY) { console.log('（--dry：未寫回 ' + TSV + '）'); process.exit(0); }
if (!fs.existsSync(TSV + '.pre-fill.tsv')) fs.copyFileSync(TSV, TSV + '.pre-fill.tsv');
const src = fs.readFileSync(TSV, 'utf8').split(NL);
let changed = 0;
const out = src.map((l, n) => {
  if (n === 0 || !l.trim()) return l;
  const c = l.split(TAB);
  if (c.length < 6 || c[0] !== 'T1579') return l;
  const hit = fills.get(c[1] + '#' + c[2]);
  if (!hit) return l;
  c[3] = hit.page; c[4] = hit.js; c[5] = hit.je; c[6] = 'VF';
  changed++;
  return c.join(TAB);
});
fs.writeFileSync(TSV, out.join(NL), 'utf8');
console.log(`已寫回 ${TSV}：改 ${changed} 列（原檔備份 ${TSV}.pre-fill.tsv）｜應灌 ${pass} 條`);
if (changed !== pass) console.log('⚠ 寫回列數與過閘數不等——有過閘行在 TSV 裡找不到對應列，請查審計。');
