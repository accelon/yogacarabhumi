#!/usr/bin/env bun
/**
 * §五.2 基數重算：T1579（本論）自身的科判，哪些「還沒有 j 窗」、但首行能在 CBETA 論本裡
 * **逐字唯一命中**（＝可補成細窗）。上一輪那個 1,588 是口算值、未入正典，本腳本就是來取代它的。
 *
 * 兩段式（第一段零搜尋、秒級；第二段才吃引擎）：
 *   第一段＝全集（只認標題行 kpD 定義，正典硬規則）× 已發窗（`spans-j-verified.tsv` lib=T1579
 *           且 jstart/jend 非空——空的照 `build-ybh.ts:431 hasWin` 的準則等於沒窗）× 首行有没有漢字
 *   第二段＝對「無窗且有首行」者走**產品碼路**判唯一命中：
 *           `hanChars`（`accelon26/han.ts:22`，`\p{Script=Han}` 帶 u flag，含㲉 U+3C89 與擴充 B）取字，
 *           `SearchSession` 在 taisho.adb 的 `書＝瑜伽師地論` VA 區間內搜（**只用引擎檢索、不抽全文**，
 *           輸出只記頁欄 id 與命中數，不落一行大正原文）
 *
 * 用法：
 *   bun run link-audit/tools/count-t1579-window-baseline.ts                ← 只跑第一段
 *   bun run link-audit/tools/count-t1579-window-baseline.ts --search       ← 兩段都跑（全量）
 *   bun run ... --search --limit=300 --seedstep=97                        ← 抽樣校時（等距抽樣，非隨機）
 */
import fs from 'node:fs';
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';
import { hanChars } from 'D:/2026/adb-converter/ts/src/accelon26/han.ts';

const ROOT = 'D:/2026/yogacarabhumi-dila';
const RAW = ROOT + '/raw';   // 語料 md 自 2026-11-15 起在 raw/（根目錄只留 README／索引／_sidebar／index.html）
const SPANS = 'D:/2026/_scratch-ybh/spans-j-verified.tsv';
const DO_SEARCH = process.argv.includes('--search');
const limitArg = /--limit=(\d+)/.exec(process.argv.join(' '));
const LIMIT = limitArg ? +limitArg[1]! : 0;
const OUT = 'D:/2026/yogacarabhumi-dila/link-audit/data/t1579-window-baseline.csv';

/* ── 1. 全集：T1579 各卷的 kpD 標題行定義 ＋ 該科判的「首行」 ── */
interface Kepan { base: string; vol: number; kp: string; head: string; firstLine: string; han: string; hasWin: boolean; winMode: string; winPage: string }
const kepans: Kepan[] = [];
const files = fs.readdirSync(RAW).filter((f) => /^T1579-\d+\.md$/.test(f))
  .sort((a, b) => +(/-(\d+)\.md/.exec(a)![1]!) - +(/-(\d+)\.md/.exec(b)![1]!));

// 已發窗的座標表（build-ybh.ts:160-168 的 `spans`：鍵＝`${base}#${kp}`）
const win = new Map<string, { js: string; je: string; page: string; mode: string }>();
for (const r of fs.readFileSync(SPANS, 'utf8').split('\n').slice(1)) {
  const c = r.split('\t');
  if (c.length < 6 || !c[2]) continue;
  if (c[0] !== 'T1579') continue;                                  // 本輪只算論文側自己（lib=T1579）
  win.set(`${c[1]}#${c[2]}`, { js: c[4] ?? '', je: c[5] ?? '', page: c[3] ?? '', mode: c[6] ?? '' });
}

for (const f of files) {
  const base = f.replace(/\.md$/, '');
  const vol = +(/-(\d+)\.md/.exec(f)![1]!);
  const lines = fs.readFileSync(`${RAW}/${f}`, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let pending: { kp: string; head: string } | null = null;
  for (const ln of lines) {
    const hd = /^#{1,6}\s+(.*?)\s*\^(kpD\d+-\d+)\s*$/.exec(ln);    // 只認標題行定義（正典硬規則，引用行不算）
    if (hd) {
      if (pending) kepans.push({ base, vol, kp: pending.kp, head: pending.head, firstLine: '', han: '', hasWin: false, winMode: '', winPage: '' });
      pending = { kp: hd[2]!, head: hd[1]! };
      continue;
    }
    if (!pending) continue;
    const t = ln.trim();
    if (!t || /^《/.test(t) || /^\[\^/.test(t) || /^>\|^/.test(t)) continue;   // 跨書引用行／腳註行不是正文首行
    const w = win.get(`${base}#${pending.kp}`);
    const hasWin = !!w && w.js !== '' && w.je !== '';                          // build-ybh.ts:431 hasWin 同準則
    kepans.push({ base, vol, kp: pending.kp, head: pending.head, firstLine: t, han: hanChars(t).join(''), hasWin, winMode: w?.mode ?? '', winPage: w?.page ?? '' });
    pending = null;
  }
  if (pending) kepans.push({ base, vol, kp: pending.kp, head: pending.head, firstLine: '', han: '', hasWin: false, winMode: '', winPage: '' });
}
const lastOfVol = new Map<string, Kepan>();
for (const k of kepans) lastOfVol.set(k.base, k);

const tot = kepans.length;
const withWin = kepans.filter((k) => k.hasWin).length;
const noWin = kepans.filter((k) => !k.hasWin);
const noWinHan = noWin.filter((k) => k.han.length >= 4);            // 少于 4 字不足以判唯一（大正一頁動輒重複）
const noWinShort = noWin.filter((k) => k.han.length > 0 && k.han.length < 4);
const noWinEmpty = noWin.filter((k) => k.han.length === 0);
console.log(`【第一段：免搜尋的帳】T1579 主卷 ${files.length} 檔、kpD 標題行定義 ${tot} 條`);
console.log(`  已有 j 窗（發射端 hasWin）        ${withWin}`);
console.log(`  無 j 窗                          ${noWin.length}　＝可補窗的母體`);
console.log(`    ├─ 首行漢字 ≥4 字（可送搜）      ${noWinHan.length}　← 第二段在這批裡判唯一命中`);
console.log(`    ├─ 首行漢字 1–3 字（過短）       ${noWinShort.length}`);
console.log(`    └─ 無正文首行（純標題／表列）     ${noWinEmpty.length}`);
const modeSplit = new Map<string, number>();
for (const k of noWin) { const m = k.winMode === '' ? '(不在表內)' : `${k.winMode}(窗空)`; modeSplit.set(m, (modeSplit.get(m) ?? 0) + 1); }
console.log('  無窗者的來源模式：', [...modeSplit].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${n}`).join('、'));

/* ── 2. 引擎判唯一命中 ── */
interface Verdict { k: Kepan; hits: number; page: string; K: number }
let verdicts: Verdict[] = [];
if (DO_SEARCH) {
  const { SearchSession } = await import('D:/2026/adb-converter/ts/src/accelon26/search.ts');
  const rd = await AdbReader.open(new SyncIO('D:/accelon3/taisho.adb'));
  const s = new SearchSession(rd); await s.init();
  const tags = rd.containers.get('tags')!;
  const pageVas: number[] = await rd.decodeBlockList('tags', tags.names.indexOf('頁'));
  const ids: string[] = ((await rd.attributeValues('頁.id'))?.values ?? []).map(String);
  const si = tags.names.indexOf('書');
  let lo = -1, hi = Infinity;
  if (si >= 0) {
    const sVas: number[] = await rd.decodeBlockList('tags', si);
    const names = await rd.cachedStrings('書');
    const at = names.findIndex((n) => String(n).includes('瑜伽師地論'));
    if (at >= 0) { lo = sVas[at]!; hi = at + 1 < sVas.length ? sVas[at + 1]! : Infinity; }
  }
  console.log(`\n【第二段：引擎檢索】書區 [${lo},${hi})＝瑜伽師地論；母體 ${noWinHan.length}${LIMIT ? `，等距抽 ${LIMIT}` : ''}`);
  const step = LIMIT && LIMIT < noWinHan.length ? noWinHan.length / LIMIT : 1;
  const picked = step === 1 ? noWinHan : Array.from({ length: LIMIT }, (_, i) => noWinHan[Math.floor(i * step)]!);
  const pageOf = (va: number) => { let a = 0, b = pageVas.length - 1, at = -1; while (a <= b) { const m = (a + b) >> 1; if (pageVas[m]! <= va) { at = m; a = m + 1; } else b = m - 1; } return at < 0 ? '' : ids[at] ?? ''; };
  /**
   * 唯一命中判定＝沿用 `span-build.ts:40-53` 那條**已上線過的連寫階梯**（10→7→5 個漢字），
   * 不另設固定長度——固定 25 字會因異體字／缺字形把真命中打成假「零命中」，那是量尺問題不是資料問題。
   * 回傳書區內不同 VA 數＋實際收口的階梯長度。
   */
  const probe = async (han: string): Promise<{ hits: number; K: number }> => {
    for (const K of [10, 7, 5]) {
      if (han.length < K) continue;
      const vas = [...new Set(((await s.search(han.slice(0, K), 500)).hits as { va: number }[]).map((h) => h.va))].filter((v) => v >= lo && v < hi);
      if (vas.length) return { hits: vas.length, K };
    }
    const short = Math.min(han.length, 10);                     // 首行本身不足 5 字：直接拿全句試一次
    if (short >= 4) {
      const vas = [...new Set(((await s.search(han.slice(0, short), 500)).hits as { va: number }[]).map((h) => h.va))].filter((v) => v >= lo && v < hi);
      if (vas.length) return { hits: vas.length, K: short };
    }
    return { hits: 0, K: 0 };
  };
  /**
   * 鄰近兜底（`span-build.ts:54-67` 同款）：末兩片段 ≤60 VA 鄰近。這條比連寫寬，
   * **必須單獨做正控**——若它在已驗窗那批上也會指錯頁，那救回來的數就不能全信。
   */
  const prox = async (han: string): Promise<{ n: number; va: number }> => {
    const F = han.match(/.{1,6}/g)?.filter((x) => x.length >= 4) ?? [];
    if (F.length < 2) return { n: 0, va: -1 };
    const anchor = F[F.length - 1]!, prev = F[F.length - 2]!;
    const ar = await s.search(anchor, 400), pr = await s.search(prev, 400);
    const pvas = (pr.hits as { va: number }[]).map((h) => h.va);
    const outs = (ar.hits as { va: number }[]).filter((h) => h.va >= lo && h.va < hi && pvas.some((p) => p <= h.va && p >= h.va - 60));
    return { n: outs.length, va: outs[0]?.va ?? -1 };
  };
  const t0 = Date.now();
  let i = 0;
  const byLen = new Map<number, number>();

  /**
   * **正控**：先拿「已經有窗、且經 `span-filter.ts` 逐條 `renderEmbed` 驗過窗首六漢字」的那批當標尺，
   * 用同一支 probe 去量，看能不能還原出同一頁。還原率低＝我這把尺壞（不是資料缺）。
   */
  const ctrlArg = /--control=(\d+)/.exec(process.argv.join(' '));
  const CN = ctrlArg ? +ctrlArg[1]! : 120;
  const haveWin = kepans.filter((k) => k.hasWin && k.han.length >= 4);
  const cstep = CN < haveWin.length ? haveWin.length / CN : 1;
  const cPick = Array.from({ length: Math.min(CN, haveWin.length) }, (_, n) => haveWin[Math.floor(n * cstep)]!);
  let cHit = 0, cUniq = 0, cPageOK = 0, cMiss = 0, pUniq = 0, pPageOK = 0;
  for (const k of cPick) {
    const r = await probe(k.han);
    if (r.hits > 0) cHit++;
    if (r.hits === 1) {
      cUniq++;
      const one = await s.search(k.han.slice(0, r.K), 500);
      const p = pageOf((one.hits as { va: number }[]).find((h) => h.va >= lo && h.va < hi)!.va);
      if (p === k.winPage) cPageOK++;
    } else if (r.hits === 0) {                       // 連寫搜不到 → 正控也走一次鄰近兜底，量這條寬尺的可信度
      cMiss++;
      const q = await prox(k.han);
      if (q.n === 1) { pUniq++; if (pageOf(q.va) === k.winPage) pPageOK++; }
    }
  }
  console.log(`  正控（已發窗、已逐條驗過）等距 ${cPick.length} 條：有命中 ${cHit}（${(100 * cHit / cPick.length).toFixed(1)}%）、唯一命中 ${cUniq}（${(100 * cUniq / cPick.length).toFixed(1)}%）、唯一且**還原出同一頁** ${cPageOK}（${(100 * cPageOK / cPick.length).toFixed(1)}%）`);
  console.log(`  ⇒ 這把尺的天花板就是這個數；下方candidates 的命中率要跟它比，不能跟 100% 比。`);
  console.log(`  鄰近兜底單獨正控：連寫漏的 ${cMiss} 條走鄰近 → 唯一 ${pUniq} 條，其中**還原出同一頁** ${pPageOK} 條${pUniq ? `（${(100 * pPageOK / pUniq).toFixed(1)}% 對、${pUniq - pPageOK} 條指到別頁）` : ''}`);

  for (const k of picked) {
    const r = await probe(k.han);
    verdicts.push({ k, hits: r.hits, page: '', K: r.K });
    // 取頁欄時**必須再濾一次書區**：probe() 的計數有濾，但這裡是「重搜一次拿落點」，
    // 不濾的話同一句在別部論書（例冊16《顯揚聖教論》）也出現時那筆 VA 更小、會排在 hits[0]，
    // 頁欄就記到錯册去了（實測徵兆：明細裡出現 `16p695a`／`9p638b` 這種非冊 30 的頁欄）。
    // ⇒ 本腳本自己引入的錯（`span-build.ts:103` 的 hits 本來已濾過，沒有這一層），
    //   由 spotcheck-t1579-baseline.ts 抽檢抓出；正控只驗命中數與頁一致性，抓不到這種「取錯筆」。
    if (r.hits === 1) {
      const vas = (await s.search(k.han.slice(0, r.K), 500)).hits as { va: number }[];
      const inRange = vas.find((h) => h.va >= lo && h.va < hi);
      if (inRange) verdicts[verdicts.length - 1]!.page = pageOf(inRange.va);
    }
    byLen.set(r.K, (byLen.get(r.K) ?? 0) + 1);
    if (++i % 200 === 0) process.stdout.write(`\r  ${i}/${picked.length}（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
  }
  if (picked.length >= 200) console.log('');
  const uniq = verdicts.filter((v) => v.hits === 1).length;
  const multi = verdicts.filter((v) => v.hits > 1).length;
  const zero = verdicts.filter((v) => v.hits === 0).length;
  console.log(`  ${step === 1 ? '全量' : '抽樣'} ${verdicts.length} 條：唯一命中 ${uniq}、多命中 ${multi}、零命中 ${zero}`);
  console.log(`  ⇒ 唯一命中佔 ${((uniq / verdicts.length) * 100).toFixed(1)}%｜收口階梯長度：${[...byLen].sort((a, b) => b[0] - a[0]).map(([K, n]) => (K ? `${K}字 ${n}` : '未命中 ' + n)).join('、')}`);

  /**
   * 依「窗為什麼是空的」分桶——兩族意義相反，混在一起報會誤導：
   *   `I`（插值）＝從未命中、借鄰居頁欄兜底 → 搜不到是預設表現
   *   `demote`／`T-demoted`／`N-demoted`＝**曾經有窗、被 `span-filter.ts` 判「窗首六漢字 ≠ 引文」主動剝掉**
   *     → 這族若現在被我搜出「唯一命中」，是兩把尺打架，必須逐條人工複核才敢補，不能直接計入可補基數
   */
  const bucket = new Map<string, { n: number; uniq: number; multi: number; zero: number }>();
  for (const v of verdicts) {
    const grp = v.k.winMode === 'I' ? 'I 插值（從未命中）' : /demote/.test(v.k.winMode) ? `${v.k.winMode}（曾被剝窗）` : v.k.winMode || '(不在表內)';
    const o = bucket.get(grp) ?? { n: 0, uniq: 0, multi: 0, zero: 0 };
    o.n++; if (v.hits === 1) o.uniq++; else if (v.hits > 1) o.multi++; else o.zero++;
    bucket.set(grp, o);
  }
  console.log('  依窗空原因分桶（兩族意義相反，不可混報）：');
  for (const [g, o] of [...bucket].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`    ${g.padEnd(22)} n=${String(o.n).padStart(5)}  唯一 ${String(o.uniq).padStart(4)}（${(100 * o.uniq / o.n).toFixed(1)}%）  多命中 ${String(o.multi).padStart(4)}  零命中 ${String(o.zero).padStart(5)}（${(100 * o.zero / o.n).toFixed(1)}%）`);
  }
  if (step !== 1) console.log(`  （等距抽樣 → 推估全量可補 ≈ ${Math.round(uniq / verdicts.length * noWinHan.length)} 條，這只是外推，不是實數）`);

  const rows = ['base,卷,kpD,科判標題,送搜首行（本區 md 原文前 40 字）,已有窗,窗空原因,首行漢字數,命中數,收口長度,命中頁欄,判語'];
  for (const v of verdicts) {
    const j = v.hits === 1 ? '可補（連寫唯一）' : v.hits > 1 ? '需消歧（多命中）' : '不可補（連寫搜不到）';
    const qq = (s: string) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
    rows.push([v.k.base, v.k.vol, v.k.kp, qq(v.k.head), qq(v.k.firstLine.slice(0, 40)), '否', v.k.winMode || '(不在表內)',
      v.k.han.length, v.hits, v.K, v.page, j].join(','));
  }
  fs.writeFileSync(OUT, '\uFEFF' + rows.join('\r\n') + '\r\n', 'utf8');
  console.log('  明細 → ' + OUT);

  /**
   * **量尺邊界補測**：連寫階梯（10/7/5）搜不到的那批，再走一次 `span-build.ts:54-67` 的
   * 「末兩片段鄰近」兜底路（anchor 片段命中、且前一片段落在它 ≤60 VA 內）。
   * 不補這一把就會把「連寫搜不到」誤講成「逐字不可引」，那是量尺問題不是資料問題。
   */
  const zeros = verdicts.filter((v) => v.hits === 0);
  let zRescued = 0, zMulti = 0;
  for (const v of zeros) {
    const r = await prox(v.k.han);
    if (r.n === 1) { zRescued++; v.hits = 1; v.K = -1; v.page = pageOf(r.va); }
    else if (r.n > 1) { zMulti++; v.hits = r.n; }
  }
  console.log(`  零命中 ${zeros.length} 條走鄰近兜底後：救回唯一命中 ${zRescued}、多命中 ${zMulti}、仍零命中 ${zeros.length - zRescued - zMulti}`);
  const uniq2 = verdicts.filter((v) => v.hits === 1).length;
  console.log(`  ⇒ 兩把尺合计的**可補基數上界**＝唯一命中 ${uniq2} 條（連寫唯一 ${uniq2 - zRescued} ＋ 鄰近新增 ${zRescued}）；多命中那一筆筆要靠卷內單調序消歧，不計入本基數`);
  const bucket2 = new Map<string, { n: number; uniq: number; multi: number; zero: number }>();
  for (const v of verdicts) {
    const grp = v.k.winMode === 'I' ? 'I 插值（從未命中）' : /demote/.test(v.k.winMode) ? `${v.k.winMode}（曾被剝窗）` : v.k.winMode || '(不在表內)';
    const o = bucket2.get(grp) ?? { n: 0, uniq: 0, multi: 0, zero: 0 };
    o.n++; if (v.hits === 1) o.uniq++; else if (v.hits > 1) o.multi++; else o.zero++;
    bucket2.set(grp, o);
  }
  console.log('  兜底後重新分桶（這才是能拿去排工數的表）：');
  for (const [g, o] of [...bucket2].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`    ${g.padEnd(22)} n=${String(o.n).padStart(5)}  可補（唯一） ${String(o.uniq).padStart(4)}（${(100 * o.uniq / o.n).toFixed(1)}%）  需消歧 ${String(o.multi).padStart(4)}  搜不到 ${String(o.zero).padStart(5)}（${(100 * o.zero / o.n).toFixed(1)}%）`);
  }
  const rows2 = ['base,卷,kpD,科判標題,送搜首行（本區 md 原文前 40 字）,已有窗,窗空原因,首行漢字數,命中數,收口長度,命中頁欄,判語'];
  /** 排給人為複核用：可補排前面、卷內依序，含逗號的欄一律加引號（Excel 直開） */
  const rank = (v: Verdict) => (v.hits === 1 ? (v.K === -1 ? 1 : 0) : v.hits > 1 ? 2 : 3);
  const q = (s: string) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  let dupHan = 0; const seen = new Map<string, number>();
  for (const v of verdicts) if (v.hits === 1) seen.set(v.k.han.slice(0, 25), (seen.get(v.k.han.slice(0, 25)) ?? 0) + 1);
  for (const [, n] of seen) if (n > 1) dupHan += n;
  for (const v of [...verdicts].sort((a, b) => rank(a) - rank(b) || a.k.vol - b.k.vol || a.k.kp.localeCompare(b.k.kp))) {
    const j = v.hits === 1 ? (v.K === -1 ? '可補（鄰近兜底）' : '可補（連寫唯一）') : v.hits > 1 ? '需消歧（多命中）' : '不可補（兩把尺都搜不到）';
    rows2.push([v.k.base, v.k.vol, v.k.kp, q(v.k.head), q(v.k.firstLine.slice(0, 40)), '否', v.k.winMode || '(不在表內)',
      v.k.han.length, v.hits, v.K, v.page, j].join(','));
  }
  console.log(`  覆核用提示：可補那批裡有 **${dupHan} 條共用同一首 25 字**（同文重複掛在不同科判節點上）——`);
  console.log(`  這些不是錯，但它們會全部指向同一個窗，發射後一排會出現重複按鈕；是否收攏（同窗只留首枚）請比照 build-ybh.ts:226 展示端去重的既有做法裁決。`);
  fs.writeFileSync(OUT.replace('.csv', '-both.csv'), '\uFEFF' + rows2.join('\r\n') + '\r\n', 'utf8');
  console.log('  兩把尺合體明細 → ' + OUT.replace('.csv', '-both.csv'));
} else {
  console.log('\n（未加 --search：第二段跳過。先確認第一段的母體再決定全量搜尋。）');
}

/* 卷級分布（免搜尋就有） */
const perVol = new Map<number, { tot: number; win: number; cand: number }>();
for (const k of kepans) {
  const o = perVol.get(k.vol) ?? { tot: 0, win: 0, cand: 0 };
  o.tot++; if (k.hasWin) o.win++; else if (k.han.length >= 4) o.cand++;
  perVol.set(k.vol, o);
}
const top = [...perVol].sort((a, b) => b[1].cand - a[1].cand).slice(0, 10);
console.log('  可候選最集中的十卷：', top.map(([v, o]) => `卷${v} ${o.cand}/${o.tot}`).join('、'));
