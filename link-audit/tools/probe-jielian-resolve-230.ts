/**
 * 重現耀悟法師 2026-11-15 UID 230「《略纂》这些链接都失效」。
 * 走產品實際碼路：渲染端 `<節聯 n="…">` → link.ts linkToNode → page-text.ts anchorVa。
 * 逐條量已部署 ybh.adb 裡 節聯 目標能不能解析出 VA。
 */
import fs from 'node:fs';
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';
import { anchorVa } from 'D:/2026/adb-converter/ts/src/accelon26/page-text.ts';

const ADB = process.argv[2] ?? 'D:/accelon3/ybh.adb';
const rd = await AdbReader.open(new SyncIO(ADB));
console.log(`庫 ${ADB}｜${rd.header.dbcname}｜dbname=${rd.header.dbname}`);

const XML = 'D:/2026/_scratch-ybh/ybh/ybh.xml';
const src = fs.readFileSync(XML, 'utf8');

// 按標籤分成「族」統計：同 n= 值只量一次，再乘上出現次數
const counts = new Map<string, number>();
for (const m of src.matchAll(/<節聯 n="([^"]+)"/g)) counts.set(m[1]!, (counts.get(m[1]!) ?? 0) + 1);

const famOf = (a: string) => (a.match(/^(T\d+|PXJ-H|X\d+|CT\d+|Yo-[A-Z]+)/)?.[1] ?? a.split('-')[0]!);
type Agg = { kinds: number; refs: number; okKinds: number; okRefs: number; sample: string[] };
const agg = new Map<string, Agg>();

for (const [anchor, n] of counts) {
  const fam = famOf(anchor);
  const a = agg.get(fam) ?? { kinds: 0, refs: 0, okKinds: 0, okRefs: 0, sample: [] };
  const va = await anchorVa(rd as any, anchor);
  a.kinds++; a.refs += n;
  if (va != null) {
    a.okKinds++; a.okRefs += n;
    if (a.sample.length < 3) a.sample.push(`${anchor} → va ${va}`);
  } else if (a.sample.length < 3) a.sample.push(`${anchor} → null`);
  agg.set(fam, a);
}

const rows = [...agg.entries()].sort((x, y) => y[1].refs - x[1].refs);
console.log(`\n節聯 ${counts.size} 種 / ${[...counts.values()].reduce((s, v) => s + v, 0)} 條；逐族解析結果：`);
console.log('系列      種類     引用    解析成功種   成功條   失敗條   例');
for (const [fam, a] of rows) {
  console.log(
    `${fam.padEnd(9)} ${String(a.kinds).padStart(6)} ${String(a.refs).padStart(8)} ${String(a.okKinds).padStart(11)} ${String(a.okRefs).padStart(9)} ${String(a.refs - a.okRefs).padStart(9)}   ${a.sample.join(' ｜ ')}`);
}
const totK = rows.reduce((s, r) => s + r[1].kinds, 0), totR = rows.reduce((s, r) => s + r[1].refs, 0);
const okK = rows.reduce((s, r) => s + r[1].okKinds, 0), okR = rows.reduce((s, r) => s + r[1].okRefs, 0);
console.log(`\n合計 ${totK} 種 / ${totR} 條 → 成功 ${okK} 種 / ${okR} 條，失敗 ${totK - okK} 種 / ${totR - okR} 條`);
