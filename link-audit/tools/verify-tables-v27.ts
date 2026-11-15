#!/usr/bin/env bun
/**
 * v27 發射後回讀（UID 229「md表格未能显示」的驗收）。
 *
 * 口徑＝產品實際那條碼路，不是我方自寫的正則：
 *   已部署 adb 位元組 → VaPaMapper.lineText 逐行解碼（同 doc-pane 取一頁的那條路）
 *   → 找出 <表>…</表> 區塊 → render_accelon3.renderPageBlocks()
 *   → 看有沒有真的長出 kind==='table' 的版面塊，並記 cols／表頭／列數。
 *   渲染器的規則是「欄數不一致整張拒絕、退回普通文字」（docs/adb/table.md §2），
 *   所以這一支量的就是讀者實際會看到什麼。
 *
 * 用法：bun run link-audit/tools/verify-tables-v27.ts [adb] [審計輸出]
 */
import fs from 'node:fs';

// render_accelon3 在模組載入期會碰 DOM，離線跑要補最小樁（同 verify-fill-v26.ts 的做法）
const el = () => ({ style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, removeAttribute() {}, append() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, after() {}, insertBefore() {} });
const g = globalThis as any;
g.window = { addEventListener() {}, setTimeout: () => 0, location: { href: '' } };
g.document = { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el() };
g.navigator = { userAgent: 'test' }; g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; g.CSS = { highlights: new Map() };

const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { VaPaMapper } = await import('D:/2026/adb-converter/ts/src/accelon26/vapa.ts');
const { renderPageBlocks } = await import('D:/2026/adb-converter/ts/src/accelon26/render_accelon3.ts');

const ADB = process.argv[2] ?? 'D:/accelon3/ybh.adb';
const AUDIT = process.argv[3] ?? 'D:/2026/_scratch-ybh/verify-tables.tsv';
const EMPTY_CTX = { depthOf: new Map<string, number>(), levels: 0 };
const OPEN = /^\s*<表(?=[\s>])[^>]*>/, CLOSE = /^\s*<\/表>\s*$/;

const rd = await AdbReader.open(new SyncIO(ADB));
const mp = new VaPaMapper(rd); await mp.init();
const N = rd.header.lineCount;

// 1) 全掃行解碼（2.8 s／97 萬行），同時留下 <表> 邊界與表格列的絕對行號
const t0 = Date.now();
const text = new Map<number, string>();          // 只留區塊內的行，省記憶體
const opens: number[] = [];
let pipeRows = 0, closeLines = 0;
for (let i = 0; i < N; i++) {
  const s = await mp.lineText(i);
  if (s.trimStart().startsWith('|')) pipeRows++;
  if (OPEN.test(s)) opens.push(i);
  if (CLOSE.test(s)) closeLines++;
}
console.log(`庫 ${ADB}｜${rd.header.dbcname}｜${N} 行｜全掃解碼 ${Date.now() - t0} ms`);
console.log(`行首 <表> ${opens.length}、行 <\/表> ${closeLines}、管線列 ${pipeRows} 行`);

// 2) 逐區塊走渲染器
const rows: string[] = ['開行' + '\t' + '閉行' + '\t' + '內含行' + '\t' + '版面塊' + '\t' + '欄' + '\t' + '表頭' + '\t' + '表身列' + '\t' + '備註'];
let tbl = 0, rej: { i: number; why: string }[] = [], unclosed = 0;
for (const i of opens) {
  let j = -1;
  for (let k = i; k < Math.min(i + 400, N); k++) if (CLOSE.test(await mp.lineText(k))) { j = k; break; }
  if (j < 0) { unclosed++; rej.push({ i, why: '找不到 </表>' }); continue; }
  const seg: string[] = []; for (let k = i; k <= j; k++) seg.push(await mp.lineText(k));
  const blocks = renderPageBlocks(seg, seg.map((_, k) => i + k), { hardBreaks: true } as any, EMPTY_CTX as any);
  const tb = blocks.find((b) => b.kind === 'table')?.table;
  if (tb) {
    tbl++;
    rows.push([i, j, seg.length, 'table', tb.cols, tb.head ? 'Y' : '—', tb.rows.length,
      (tb.head?.cells ?? tb.rows[0]?.cells ?? []).slice(0, 3).map((c) => c.replace(/<[^>]*>/g, '')).join('/')].join('\t'));
  } else {
    rej.push({ i, why: '渲染器退回普通文字（' + blocks.map((b) => b.kind).join(',') + '）' });
    rows.push([i, j, seg.length, blocks[0]?.kind ?? '?', '—', '—', '—', '解析不過'].join('\t'));
  }
}
fs.writeFileSync(AUDIT, rows.join('\n') + '\n', 'utf8');
console.log(`\n走 renderPageBlocks：長出 table ${tbl} 段｜拒絕 ${rej.length} 段（含未閉合 ${unclosed}）`);
for (const b of rej.slice(0, 12)) console.log(`  ✗ 行 ${b.i}：${b.why}`);

// 3) 耀悟法師點名的這一張：《瑜伽師地論》卷11(大正30，333b～c)「七種根本作意及餘四十作意」
let anchor = -1;
for (const i of opens) {
  const s = await mp.lineText(i + 1);
  if (s.includes('七種作意') && s.includes('四十種作意')) { anchor = i; break; }
}
if (anchor < 0) console.log('\n【法師那張表】未找到 <表> 開標籤——FAIL');
else {
  let j = anchor; while (j < N && !CLOSE.test(await mp.lineText(j))) j++;
  const seg: string[] = []; for (let k = anchor; k <= j; k++) seg.push(await mp.lineText(k));
  const blocks = renderPageBlocks(seg, seg.map((_, k) => anchor + k), { hardBreaks: true } as any, EMPTY_CTX as any);
  const tb = blocks.find((b) => b.kind === 'table')?.table;
  console.log(`\n【法師那張表】行 ${anchor}…${j}（${seg.length} 行，含邊界）→ ` +
    (tb ? `table、${tb.cols} 欄、表頭 ${tb.head ? '有' : '無'}、表身 ${tb.rows.length} 列` : '仍是普通文字（FAIL）'));
  if (tb?.head) console.log('  表頭：' + tb.head.cells.map((c) => c.replace(/<[^>]*>/g, '·')).join(' | '));
  if (tb) console.log('  末列：' + tb.rows[tb.rows.length - 1]!.cells.map((c) => c.replace(/<[^>]*>/g, '')).join(' | '));
}
console.log('\n逐段 → ' + AUDIT);
