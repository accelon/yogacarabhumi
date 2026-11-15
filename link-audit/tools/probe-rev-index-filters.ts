/**
 * 反鏈索引「逐閘門計數」直測——把「索引收不收得到這顆庫的聯」拆成母區建索引時同一串過濾器，
 * 一關一關報數量，避免再用「count=0」這種混合結果去猜原因。
 *
 * 對照母區 19ccdb8 的真實碼路（唯讀，不改母區）：
 *   xref.ts:359 ensureReverse()
 *     ├─ xref.ts:342 reverseSources()   每一個開著的庫，主庫優先、dbname 去重
 *     ├─ xref.ts:378 有 `xrev` 容器 → addReverseFromXrev()；否則 → addReverseFrom()
 *     └─ xref.ts:402 addReverseFrom()
 *          ├─ 409 idx = await anchorIndex(r)            （page-text.ts:30）
 *          ├─ 410 if (!idx) return;                     ← 閘門 A：沒有 `頁.id` 就整庫 0 條
 *          ├─ 411 av  = await r.attributeValues('聯.i')
 *          ├─ 412 if (!av || !av.pointers) return;      ← 閘門 B：沒有 `聯.i` 屬性表就整庫 0 條
 *          └─ 433 for (k of av.values)
 *               ├─ 436 if (val.indexOf('?') <= 0) continue;              ← 閘門 C：i 值不含 db?
 *               ├─ 440 if (idx.tags[tagOf(ptr)] !== '聯') continue;      ← 閘門 D：指標 tag 不是「聯」
 *               └─ 443 if (idx.lianVas[inst] == null) continue;          ← 閘門 E：實例序對不上 tags/聯
 *          473 outIndex.set(revPageKey(db, anchor), …)  ＋ 478 revPageWholeKey 整頁鍵
 *
 * 用法：bun run link-audit/tools/probe-rev-index-filters.ts [adb…]（不給參數就跑 D:\accelon3 三顆對照）
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['D:/accelon3/ybh.adb', 'D:/accelon3/fuyan-反鏈版.adb', 'D:/accelon3/taisho.adb'];

/* ── 母區鍵函數的獨立重寫（page-text.ts:66 shortPageId／:83 revPageKey／:89 revPageWholeKey）──
   刻意不 import，避免「用同一支碼驗同一支碼」；兩邊若對同一批字串算出不同鍵，本腳本會報 MISMATCH。*/
const shortMine = (id: string): string => {
  const m = /^(\d+)[pP]0*(\d+)([a-z]?)$/.exec(id);
  if (!m) return id;
  const short = `${m[1]}p${parseInt(m[2], 10)}${m[3]}`;
  return short === id ? id : short;
};
const revKeyMine = (db: string, a: string) => db + '?' + shortMine(a.split('#')[0]);
const revWholeMine = (db: string, a: string) => db + '?' + shortMine(a.split('#')[0].replace(/[a-z]$/, ''));

let theirs: { shortPageId: (s: string) => string; revPageKey: (d: string, a: string) => string; revPageWholeKey: (d: string, a: string) => string } | null = null;
try {
  theirs = await import('D:/2026/adb-converter/ts/src/accelon26/page-text.ts');
} catch (e) {
  console.log('（母區 page-text.ts 載入失敗，只報我方重寫鍵：' + String((e as Error).message).slice(0, 80) + '）');
}

const tagOf = (ptr: number) => (ptr >>> 24) & 0xff;
const instOf = (ptr: number) => (ptr & 0xffffff) - 1;

for (const f of FILES) {
  console.log('\n══════════ ' + f);
  let rd: any;
  try {
    rd = await AdbReader.open(new SyncIO(f));
  } catch (e) {
    console.log('  開庫失敗：' + String((e as Error).message).slice(0, 120));
    continue;
  }
  const h = rd.header;
  const names: string[] = [...rd.containers.keys()];
  console.log(`  dbname=${h.dbname}  lineCount=${h.lineCount}  xrev=${names.includes('xrev')}`);

  /* 閘門 A：anchorIndex() 的前三件必要條件，逐件報（page-text.ts:33-37） */
  const pageAv = await rd.attributeValues('頁.id').catch(() => null);
  const tagsC = rd.containers.get('tags');
  const tagNames: string[] = tagsC?.names ?? [];
  console.log(`  A1 attributeValues('頁.id') = ${pageAv ? pageAv.values.length + ' 值' : 'null'}   A2 containers.tags = ${tagsC ? '有' : '無'}   A3 tags 裡有「頁」= ${tagNames.includes('頁')}`);

  /* 閘門 B：`聯.i` 屬性表 */
  const av = await rd.attributeValues('聯.i').catch(() => null);
  const lianI = av?.values.length ?? 0;
  console.log(`  B \`聯.i\` 值數 = ${lianI}   pointers = ${av?.pointers ? 'Int32Array(' + (av.pointers as any).length + ')' : String(av && av.pointers)}`);
  const lianIdx = tagNames.indexOf('聯');
  const lianVas: number[] = lianIdx < 0 ? [] : await rd.decodeBlockList('tags', lianIdx);
  console.log(`  tags「聯」下標 = ${lianIdx}   decodeBlockList('tags',聯).length = ${lianVas.length}`);

  if (!av || !av.pointers || !pageAv) {
    console.log('  → 早退：母區 xref.ts:410／:412 會直接 return，這顆庫對反鏈索引貢獻 0 條。');
    continue;
  }

  /* 逐條走母區 433-443 的過濾器 */
  let cNoQ = 0, cWrongTag = 0, cVaNull = 0, kept = 0;
  const wrongTagNames = new Map<string, number>();
  const windowed = new Set<string>();
  const keys = new Map<string, number>();
  const wholeKeys = new Set<string>();
  const mismatch: string[] = [];
  const ptr = av.pointers as Int32Array;
  for (let k = 0; k < av.values.length; k++) {
    const val = av.values[k];
    const q = val.indexOf('?');
    if (q <= 0) { cNoQ++; continue; }
    const db = val.slice(0, q);
    const anchor = val.slice(q + 1);
    if (/#/.test(anchor)) windowed.add(val);
    const tn = tagNames[tagOf(ptr[k])] ?? `#${tagOf(ptr[k])}`;
    if (tn !== '聯') { cWrongTag++; wrongTagNames.set(tn, (wrongTagNames.get(tn) ?? 0) + 1); continue; }
    if (lianVas[instOf(ptr[k])] == null) { cVaNull++; continue; }
    kept++;
    keys.set(revKeyMine(db, anchor), (keys.get(revKeyMine(db, anchor)) ?? 0) + 1);
    wholeKeys.add(revWholeMine(db, anchor));
    if (theirs && k < 200000) {
      const a = theirs.revPageKey(db, anchor), b = revKeyMine(db, anchor);
      const c = theirs.revPageWholeKey(db, anchor), d = revWholeMine(db, anchor);
      if (a !== b || c !== d) { if (mismatch.length < 5) mismatch.push(`${val} → 母區 ${a}/${c}｜我方 ${b}/${d}`); }
    }
  }
  console.log(`  C i 值不含「?」被丟 = ${cNoQ}`);
  console.log(`  D 指標 tag 不是「聯」被丟 = ${cWrongTag}${wrongTagNames.size ? '  ' + [...wrongTagNames].map(([t, n]) => `${t}:${n}`).join(' ') : ''}`);
  console.log(`  E lianVas[inst] 空被丟 = ${cVaNull}`);
  console.log(`  ✔ 進索引 = ${kept} 條   不同頁欄鍵 = ${keys.size}   不同整頁鍵 = ${wholeKeys.size}   帶 #窗綴的 i 值 = ${windowed.size} 種`);
  if (theirs) console.log('  兩邊鍵實作對照 = ' + (mismatch.length ? 'MISMATCH ' + mismatch.join(' ; ') : '一致（逐條比對無差異）'));

  /* 抽一個母區信裡點名的座標，看索引側到底有沒有這顆鍵 */
  for (const probe of ['taisho?30p279a', 'taisho?30p279a#34-40']) {
    const [pdb, pang] = [probe.slice(0, probe.indexOf('?')), probe.slice(probe.indexOf('?') + 1)];
    console.log(`  查表鍵 ${probe} → 索引有此鍵 = ${keys.has(revKeyMine(pdb, pang)) ? '是' : '否'}（該鍵條數 ${keys.get(revKeyMine(pdb, pang)) ?? 0}）`);
  }
}
