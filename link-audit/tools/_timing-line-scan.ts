const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { VaPaMapper } = await import('D:/2026/adb-converter/ts/src/accelon26/vapa.ts');
const rd = await AdbReader.open(new SyncIO(process.argv[2] ?? 'D:/accelon3/ybh.adb'));
const mp = new VaPaMapper(rd); await mp.init();
const t0 = Date.now(); let hits = 0; let rows = 0; const N = rd.header.lineCount;
for (let i = 0; i < N; i++) {
  const s = await mp.lineText(i);
  if (s.startsWith('<表>')) hits++;
  if (s.trimStart().startsWith('|')) rows++;
}
console.log(`全掃 ${N} 行 lineText：${Date.now() - t0} ms｜<表> 開標籤行 ${hits}｜管線行列 ${rows}`);
