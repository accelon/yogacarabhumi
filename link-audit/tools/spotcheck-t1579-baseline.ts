#!/usr/bin/env bun
/**
 * §五.2 基數的**回原檔抽檢**（換一條我算基數時沒碰過的碼路）：
 *   基數那支只用 `SearchSession` 的 **VA**（數命中、換頁欄）；
 *   這支改走母區 `tools/adb-skill/engine.ts` 的 **行級**路徑（`edgeLine(va)` → `line(n)` 取整行），
 *   再把引擎回傳的那一行與**我方 md 的首行**逐字比對。
 * ⇒ 驗的是「命中落點到底是不是這句話」，不是再驗一次索引（同一個索引換外殼不叫獨立驗證）。
 * 依使用者硬規則：只報行號與相符與否，**不摘大正原文**。
 *
 * 用法：bun run link-audit/tools/spotcheck-t1579-baseline.ts [N]
 */
import fs from 'node:fs';
import { openAdb } from 'D:/2026/adb-converter/ts/tools/adb-skill/engine.ts';
import { hanChars } from 'D:/2026/adb-converter/ts/src/accelon26/han.ts';

const CSV = 'D:/2026/yogacarabhumi-dila/link-audit/data/t1579-window-baseline-both.csv';
const N = +(process.argv[2] ?? 10);
const WANT = process.argv.includes('--near') ? '可補（鄰近兜底）' : '可補（連寫唯一）';

/* ── 讀基數明細（只有標題／首行兩欄可能被引號包住）── */
const lines = fs.readFileSync(CSV, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
const head = lines[0]!.split(',');
const col = (k: string) => head.indexOf(k);
const parse = (l: string): string[] => {
  const out: string[] = []; let i = 0;
  while (i <= l.length) {
    if (l[i] === '"') { let j = i + 1, s = ''; while (j < l.length) { if (l[j] === '"' && l[j + 1] === '"') { s += '"'; j += 2; continue; } if (l[j] === '"') { j++; break; } s += l[j++]; } out.push(s); i = j + 1; if (l[i] === ',') i++; }
    else { let j = i; while (j < l.length && l[j] !== ',') j++; out.push(l.slice(i, j)); i = j + 1; }
    if (i > l.length) break;
  }
  return out;
};
const rows = lines.slice(1).map(parse);
const pool = rows.filter((c) => c[col('判語')] === WANT && (c[col('送搜首行（本區 md 原文前 40 字）')] ?? '').length > 0);
const step = N < pool.length ? pool.length / N : 1;
const picked = Array.from({ length: Math.min(N, pool.length) }, (_, k) => pool[Math.floor(k * step)]!);
console.log(`${WANT} 共 ${pool.length} 條 → 等距抽 ${picked.length} 條，走行級碼路回原檔比對`);

/* ── 行級引擎＋書區（VA 區間沿用同一份事實，但命中落點改由 edgeLine/line 反查）── */
const ta = await openAdb('D:/accelon3/taisho.adb');
const rd = (ta as any).reader ?? null;
let lo = 45128898, hi = 46091786;                       // probe-book-range.ts 實測的瑜伽師地論書區
if (rd) {
  const tags = rd.containers.get('tags')!;
  const si = tags.names.indexOf('書');
  const sVas: number[] = await rd.decodeBlockList('tags', si);
  const names = await rd.cachedStrings('書');
  const at = names.findIndex((n: string) => String(n).includes('瑜伽師地論'));
  if (at >= 0) { lo = sVas[at]!; hi = sVas[at + 1] ?? Infinity; }
}

let agreeIn = 0, agreeText = 0;
for (const c of picked) {
  const [base, kp, head0] = [c[0], c[2], c[3]];
  const first = c[col('送搜首行（本區 md 原文前 40 字）')] ?? '';
  const page0 = c[col('命中頁欄')] ?? '';
  const K0 = +((c[col('收口長度')] ?? '10') || '10');
  const han = hanChars(first).join('');
  // 基數走的是連寫階梯 10→7→5→4，**收口長度記在表裡**；抽檢必須沿用同一個長度，
  // 固定拿 10 字會把「階梯在 5 字收口」的那批搜成 0 命中，那是抽檢的錯、不是基數的錯。
  const K = K0 > 0 ? Math.min(han.length, K0) : Math.min(han.length, 10);
  const res = await ta.search(han.slice(0, K), 50);
  const inRange = res.hits.filter((h) => h.va >= lo && h.va < hi);
  if (inRange.length === 1) agreeIn++;
  // 內容比對：大正一行約 17 字，10 字串**可能跨行**——所以除本行外，再試「本行＋下一行」與「上一行＋本行」。
  // 跨行能对上＝落點正確、只是行邊界切到句子（正是 §五.2 「坑」那條要記 crossPage 的情形）；
  // 三種都對不上才是真的錯命中。比對只報位置，不輸出原文。
  const nl = inRange.length === 1 ? inRange[0]!.line : -1;
  const hL = nl >= 0 ? hanChars(await ta.line(nl)).join('') : '';
  const hN = nl >= 0 ? hanChars(await ta.line(nl + 1).catch(() => '')).join('') : '';
  const hP = nl > 0 ? hanChars(await ta.line(nl - 1).catch(() => '')).join('') : '';
  const needle = han.slice(0, K);
  const where = hL.includes(needle) ? '本行@' + hL.indexOf(needle)
    : (hL + hN).includes(needle) ? '跨下一行@' + (hL + hN).indexOf(needle)
      : (hP + hL).includes(needle) ? '跨上一行@' + (hP + hL).indexOf(needle) : '';
  const ok = !!where;
  if (ok) agreeText++;
  console.log(`  ${base} ${kp}（${head0.slice(0, 14)}）送搜 ${K} 字（表記收口 ${K0}）｜書內命中 ${inRange.length}／全庫 ${res.hits.length}｜基數表頁 ${page0}`
    + `｜行級落點 ${nl >= 0 ? '第 ' + nl + ' 行（本行漢字 ' + hL.length + '）' : '—'}`
    + `｜**回原檔比對 ${ok ? '相符 ' + where : inRange.length === 1 ? '三種拼法都不符' : '無法比對'}**`);
}
console.log(`\n抽檢 ${picked.length} 條：書內唯一 ${agreeIn} 條、行級內容相符 ${agreeText} 條（${(100 * agreeText / picked.length).toFixed(0)}%）`);
console.log('註：全庫命中數通常大於書內命中數——同一句話在别的論書也會出現，故基數只算書區內唯一，這是最後一格的判準。');
