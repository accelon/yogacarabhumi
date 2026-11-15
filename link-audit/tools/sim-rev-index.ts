/**
 * 反鏈索引「拆掉早退閘門後會怎樣」的離線模擬——不改母區一行碼，只把母區 xref.ts:402 addReverseFrom()
 * 的建索引碼路在 Bun 端重寫一份，差別只有兩個可開關：
 *
 *   閘門 A（xref.ts:410 `if (!idx) return;`）      —— ybh 無 `頁.id` → anchorIndex 回 null → 整庫早退
 *   閘門 473（revPageKey 剝 `#a-b` 窗綴）＝母區 19ccdb8 已修
 *
 * 四種組合跑一遍，看哪一種能解釋實機量到的 `__revPerf.n`（exe=2403／HTML 新 session=0）：
 *   ① A 關、窗綴不剝（＝19ccdb8 之前的母區）
 *   ② A 關、窗綴剝（＝19ccdb8 之後的母區，實機現況）
 *   ③ A 開、窗綴不剝
 *   ④ A 開、窗綴剝（＝本區提議的最小修復）
 * 再對 `taisho?30p279a`（母區信裡點名的那一欄）做查表側 reverseItemsForPage 的同款分組，
 * 報「一排幾顆按鈕／抽屜幾筆」，讓母區改完有數字可对，不用再來一轮实机盲测。
 *
 * 用法：bun run link-audit/tools/sim-rev-index.ts
 */
import fs from 'node:fs';
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

const YBH = 'D:/accelon3/ybh.adb';
const TAISHO = 'D:/accelon3/taisho.adb';
const REVLIB = 'D:/accelon3/fuyan-反鏈版.adb';
const OUT = 'D:/2026/yogacarabhumi-dila/link-audit/data/rev-index-sim.csv';

const shortPageId = (id: string): string => {
  const m = /^(\d+)[pP]0*(\d+)([a-z]?)$/.exec(id);
  if (!m) return id;
  const s = `${m[1]}p${parseInt(m[2], 10)}${m[3]}`;
  return s === id ? id : s;
};
const keyOf = (db: string, anchor: string, stripWindow: boolean) =>
  db + '?' + shortPageId(stripWindow ? anchor.split('#')[0] : anchor);
const wholeKeyOf = (db: string, anchor: string, stripWindow: boolean) =>
  db + '?' + shortPageId((stripWindow ? anchor.split('#')[0] : anchor).replace(/[a-z]$/, ''));

interface Ent { src: string; db: string; va: number; pageId: string; tq: string; targetPage: string }

/** 讀一顆庫的 `聯.i`，回傳「若不被閘門 A 攔下」會進索引的條目（含 ybh 無 `頁.id` 的情況）。 */
async function readLian(file: string): Promise<{ dbname: string; hasAnchorIndex: boolean; ents: Ent[]; noQ: number }> {
  const rd = await AdbReader.open(new SyncIO(file));
  const pageAv = await rd.attributeValues('頁.id').catch(() => null);
  const av = await rd.attributeValues('聯.i').catch(() => null);
  const out: Ent[] = [];
  let noQ = 0;
  if (av?.pointers) {
    const ptr = av.pointers as Int32Array;
    const tagNames: string[] = rd.containers.get('tags')?.names ?? [];
    const lianTag = tagNames[(ptr[0] >>> 24) & 0xff];
    const lianIdxT = tagNames.indexOf('聯');
    // 母區 page-text.ts:51 `lianVas = decodeBlockList('tags', 「聯」)`；xref.ts:442 用實例序取 VA
    const lianVas: number[] = lianIdxT < 0 ? [] : await rd.decodeBlockList('tags', lianIdxT);
    const avq = await rd.attributeValues('聯.q').catch(() => null);
    const qByInst = new Map<number, string>();
    if (avq?.pointers) {
      const p2 = avq.pointers as Int32Array;
      for (let k = 0; k < avq.values.length; k++) if (tagNames[(p2[k] >>> 24) & 0xff] === lianTag) qByInst.set((p2[k] & 0xffffff) - 1, avq.values[k]);
    }
    let gateE = 0;
    for (let k = 0; k < av.values.length; k++) {
      const val = av.values[k];
      const q = val.indexOf('?');
      if (q <= 0) { noQ++; continue; }
      if (tagNames[(ptr[k] >>> 24) & 0xff] !== '聯') continue;
      const inst = (ptr[k] & 0xffffff) - 1;
      const va = lianVas[inst];
      if (va == null) { gateE++; continue; }          // ← xref.ts:443 閘門 E
      if (inst === (ptr[0] & 0xffffff) - 1) console.log(`  ${rd.header.dbname}：first inst=${inst} va=${va} lianVas.len=${lianVas.length}`);
      out.push({ src: rd.header.dbname, db: val.slice(0, q), va, pageId: '', tq: qByInst.get(inst) ?? '', targetPage: val.slice(q + 1) });
    }
    if (gateE) console.log(`  ${rd.header.dbname}：閘門 E 丟掉 ${gateE} 條`);
  }
  return { dbname: rd.header.dbname, hasAnchorIndex: !!(pageAv && pageAv.pointers && (rd.containers.get('tags')?.names ?? []).includes('頁')), ents: out, noQ };
}

const libs = [await readLian(YBH), await readLian(REVLIB), await readLian(TAISHO)];
const rows: string[] = ['場景,閘門A(ybh無頁id是否早退),是否剝窗綴,過閘門的庫,索引條目n,不同鍵數,查帶窗30p279a#34-40,整頁鍵,查純頁30p279a'];

for (const gateA of [true, false]) {           // gateA=true ＝母區現行「無 anchorIndex 就整庫丟掉」
  for (const strip of [false, true]) {         // strip=true ＝母區 19ccdb8 的 revPageKey
    const idx = new Map<string, Ent[]>();
    const passed: string[] = [];
    let n = 0;
    for (const L of libs) {
      if (gateA && !L.hasAnchorIndex) continue;   // ← xref.ts:410 `if (!idx) return;`
      if (!L.ents.length) continue;               // ← xref.ts:412（taisho 本身沒有 聯.i，兩邊都一樣）
      passed.push(`${L.dbname}(${L.ents.length})`);
      for (const e of L.ents) {
        n++;
        const k = keyOf(e.db, e.targetPage, strip);
        const wk = wholeKeyOf(e.db, e.targetPage, strip);
        (idx.get(k) ?? idx.set(k, []).get(k)!).push(e);
        if (wk !== k) (idx.get(wk) ?? idx.set(wk, []).get(wk)!).push(e);
      }
    }
    // 查表側照實機傳進來的字串：e2e 量到 `__revBar.pageId = "30p279a#34-40"`（渲染端把帶窗原文交給 reverseItemsForPage）
    const probeWin = '30p279a#34-40';
    const col = (idx.get(keyOf('taisho', probeWin, strip)) ?? []).length;
    const whole = (idx.get(wholeKeyOf('taisho', probeWin, strip)) ?? []).length;
    const bareCol = (idx.get(keyOf('taisho', '30p279a', strip)) ?? []).length;
    const scene = `閘門A=${gateA ? '關(母區現行)' : '開(提議修復)'} 剝窗綴=${strip ? '是(19ccdb8)' : '否(修前)'}`;
    console.log(`${scene} → 過閘門的庫 [${passed.join(', ') || '無'}]  n=${n}  鍵數=${idx.size}  查帶窗 30p279a#34-40=${col}  整頁=${whole}  （查純頁 30p279a=${bareCol}）`);
    rows.push([`閘門A${gateA ? '關' : '開'}·窗綴${strip ? '剝' : '不剝'}`, gateA, strip, passed.join('+') || '(none)', n, idx.size, col, whole, bareCol].join(','));
  }
}

/* 場景④的明細：ybh 的聯按「被哪一欄引用」統計，供母區核對「一排／抽屜」該出現幾筆 */
const perPage = new Map<string, number>();
for (const e of libs[0].ents) {
  const k = keyOf(e.db, e.targetPage, true);
  perPage.set(k, (perPage.get(k) ?? 0) + 1);
}
const top = [...perPage].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('\nybh 聯的目標頁欄排行（前 15）：');
for (const [k, v] of top) console.log(`  ${k}\t${v}`);
console.log(`  … 共 ${perPage.size} 個不同頁欄鍵，ybh 聯總數 ${libs[0].ents.length}`);

/* 整頁鍵（去 a/b/c）＋ UI 閾值觸發面（R7：一排 >40 只列 20；抽屜 200/頁） */
const perWhole = new Map<string, number>();
for (const e of libs[0].ents) {
  const wk = wholeKeyOf(e.db, e.targetPage, true);
  perWhole.set(wk, (perWhole.get(wk) ?? 0) + 1);
}
const vals = [...perPage.values()];
const wvals = [...perWhole.values()];
const cnt = (xs: number[], lo: number) => xs.filter((v) => v > lo).length;
console.log(`\n欄級鍵 ${perPage.size} 個：>20 條 ${cnt(vals, 20)} 個、>40 條 ${cnt(vals, 40)} 個（觸發「一排只列 20」）、>200 條 ${cnt(vals, 200)} 個（觸發抽屜分頁）`);
console.log(`整頁鍵 ${perWhole.size} 個：>20 條 ${cnt(wvals, 20)} 個、>40 條 ${cnt(wvals, 40)} 個、>200 條 ${cnt(wvals, 200)} 個，最大 ${Math.max(...wvals)}`);
console.log(`對照 taisho 全庫頁欄 238,278 種 → 有 ybh 反鏈的欄佔 ${(perPage.size / 238278 * 100).toFixed(2)}%`);

fs.writeFileSync(OUT, '\uFEFF' + rows.join('\r\n') + '\r\n', 'utf8');
console.log('\n汇总表 → ' + OUT);
