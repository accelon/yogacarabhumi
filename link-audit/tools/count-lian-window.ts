/**
 * 直測：部署中的 ybh.adb 的 `聯.i` 值到底有没有 `#a-b` 窗綴、有幾條、長什麼樣。
 * （母區信 §一之補 說「0 條帶 #a-b」，我方上輪回信 §三 說是對方量測口徑問題——兩造都該被數過。）
 * 用法：bun run link-audit/tools/count-lian-window.ts [adb…]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

for (const f of (process.argv.slice(2).length ? process.argv.slice(2) : ['D:/accelon3/ybh.adb'])) {
  const rd = await AdbReader.open(new SyncIO(f));
  const av = await rd.attributeValues('聯.i');
  if (!av) { console.log(f, '→ 無 聯.i'); continue; }
  const vals = av.values;
  const withHash = vals.filter((v: string) => v.includes('#'));
  const withQ = vals.filter((v: string) => v.includes('?'));
  const pat = new Map<string, number>();
  for (const v of vals) {
    const shape = v.replace(/\d+/g, 'N').replace(/#[^?]*$/, '#窗');
    pat.set(shape, (pat.get(shape) ?? 0) + 1);
  }
  console.log(`\n${f}  dbname=${rd.header.dbname}`);
  console.log(`  聯.i 總數 ${vals.length}   含「?」 ${withQ.length}   含「#」 ${withHash.length}`);
  console.log('  含「#」樣本：', withHash.slice(0, 6).join('  '));
  console.log('  不含「#」樣本：', vals.filter((v: string) => !v.includes('#')).slice(0, 6).join('  '));
  console.log('  形狀排行（前 12）：');
  for (const [s, n] of [...pat].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`    ${n}\t${s}`);
  // 同一個頁欄是否既有帶窗也有不帶窗（若混用，19ccdb8 的對稱性才有意義）
  const bare = new Set(withQ.filter((v: string) => !v.includes('#')).map((v: string) => v.split('?')[1]));
  const win = new Set(withHash.map((v: string) => v.split('?')[1].split('#')[0]));
  let both = 0; for (const p of win) if (bare.has(shorten(p))) both++;
  console.log(`  帶窗頁欄 ${win.size} 種、純頁欄 ${bare.size} 種，兩者同頁（去前導 0 後） ${both} 種`);
}
function shorten(id: string) {
  const m = /^(\d+)[pP]0*(\d+)([a-z]?)$/.exec(id);
  return m ? `${m[1]}p${parseInt(m[2], 10)}${m[3]}` : id;
}
