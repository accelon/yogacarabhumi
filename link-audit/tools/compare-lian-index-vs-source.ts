/**
 * 「屬性索引」與「原始正文」兩端各數一次 `聯 i="taisho?…"`，判別窗綴到底在不在：
 *   索引端 = AdbReader.attributeValues('聯.i')（母區建反鏈索引讀的就是這一路）
 *   正文端 = 解碼 source 容器後正規表達式（我方 verify-all ③ 讀的是這一路）
 * 兩端若不一致，那「19ccdb8 剝窗綴」到底作用在哪一端就要重畫。
 * 用法：bun run link-audit/tools/compare-lian-index-vs-source.ts [adb]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

const FILE = process.argv[2] ?? 'D:/accelon3/ybh.adb';
const rd = await AdbReader.open(new SyncIO(FILE));

/* ── 索引端 ── */
const av = await rd.attributeValues('聯.i');
const iv = av?.values ?? [];
const idxHash = iv.filter((v: string) => v.includes('#'));
console.log(`索引端 attributeValues('聯.i')：${iv.length} 條、不同值 ${new Set(iv).size} 種、含 # ${idxHash.length} 條`
  + (idxHash.length ? `，樣本 ${idxHash.slice(0, 3).join(' ')}` : ''));

/* ── 正文端（與 verify-all.ts:47 同一口徑：source 容器逐塊解碼後串起來）── */
let whole = '';
const blocks = rd.containers.get('source')!.count;
for (let i = 0; i < blocks; i++) whole += await rd.sourceText(i);
const found = [...whole.matchAll(/<聯 i="taisho\?([^"]*)"/g)].map((m) => m[1]!);
const withHash = found.filter((v) => v.includes('#'));
console.log(`正文端 原文 <聯 i="taisho?…">：${found.length} 條、不同值 ${new Set(found).size} 種、含 # ${withHash.length} 條`
  + (withHash.length ? `，樣本 ${withHash.slice(0, 3).join(' ')}` : ''));
const shapes = new Map<string, number>();
for (const v of found) shapes.set(v.replace(/\d+/g, 'N'), (shapes.get(v.replace(/\d+/g, 'N')) ?? 0) + 1);
console.log('正文端形狀排行：', [...shapes].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, c]) => `${s}×${c}`).join('   '));

/* 兩端差集：索引有／正文沒有、正文有／索引沒有 */
const a = new Set(iv.map((v: string) => v.replace('taisho?', '')));
const b = new Set(found);
const onlyIdx = [...a].filter((v) => !b.has(v)).slice(0, 5);
const onlySrc = [...b].filter((v) => !a.has(v)).slice(0, 5);
console.log(`只在索引（前 5）：${onlyIdx.join(' ') || '無'}`);
console.log(`只在正文（前 5）：${onlySrc.join(' ') || '無'}`);

/* 重數對照（不做任何對齊假設）：索引多重集 是否 == 正文去窗後的值 多重集 */
const strip1 = (v: string) => v.split('#')[0];
const norm = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const mi = norm(iv.map((v: string) => strip1(v.replace(/^taisho\?/, ''))));
const ms = norm(found.map(strip1));
let diffPairs = 0, onlyI = 0, onlyS = 0;
for (const [k, n] of mi) { const o = ms.get(k); if (o == null) onlyI += n; else if (o !== n) diffPairs++; }
for (const [k, n] of ms) if (!mi.has(k)) onlyS += n;
console.log(`\n去窗後多重集對照：索引 ${mi.size} 種／正文 ${ms.size} 種；種數相同=${mi.size === ms.size}、逐種計數不同 ${diffPairs} 種、只在索引 ${onlyI} 條、只在正文 ${onlyS} 條`);
console.log(mi.size === ms.size && diffPairs === 0 && onlyI === 0 && onlyS === 0
  ? '  → 判語：索引層的值 == 正文值剝掉 `#a-b` 窗綴（同一条一條計數皆相符）⇒ 窗綴是在**屬性索引層**被剝掉的。'
  : '  → 判語：兩端去窗後仍不等，窗綴不是唯一差異，需再拆。');

/* 順帶：帶窗的條數在兩端各是多少（母區 19ccdb8 那一刀在索引層無綴可剝） */
console.log(`帶窗條數：正文端 ${withHash.length}／索引端 ${idxHash.length}（索引端 0 ⇒ revPageKey 的 split('#') 在索引路徑上是 no-op）`);

