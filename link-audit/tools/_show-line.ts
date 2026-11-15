const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');
const { VaPaMapper } = await import('D:/2026/adb-converter/ts/src/accelon26/vapa.ts');
const rd = await AdbReader.open(new SyncIO(process.argv[2]!));
const mp = new VaPaMapper(rd); await mp.init();
for (const n of process.argv.slice(3)) console.log(`${n}: ${await mp.lineText(+n)}`);
