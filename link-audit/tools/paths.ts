/**
 * 路徑单一来源（2026-11-15 新增，為了讓 ybh maintainer 的 agent 能在自己的環境跑整套流水線）。
 *
 * 背景：本區 124 支工具裡有 92 支把絕對路徑寫死（`D:/2026/_scratch-ybh`、`D:/accelon3`…），
 * 而且打包與驗收直接 import 母區 `adb-converter/ts/src/` 的模組。換環境就跑不動，
 * 報錯還不難看（`Cannot find module`），但对使用者来说是「你給的步驟在我這裡不能用」。
 *
 * 規則：**新程式一律從這裡取路徑**，不要再各自寫字串常數。
 * 每個值都可以用環境變數覆寫，**預設值等於本機現有佈局**（所以本機行為逐字不变）。
 *
 *   YBH_HOME       原料倉根（含 raw/ 與 link-audit/）
 *   YBH_SCRATCH    建置中繼檔與大輸出（spans-*.tsv、ybh/、各探針輸出）
 *   ACCELON_SRC    adb-converter 的 ts/src（打包器與 reader 模組）
 *   ACCELON_ADB    成品 adb 的部署目錄（讀者的書庫資料夾）
 *
 * 用法：
 *   import { P } from './paths.ts';
 *   const adb = `${P.accelonAdb}/ybh.adb`;
 */
import fs from 'node:fs';
import path from 'node:path';

const env = (k: string, d: string): string => (process.env[k] && process.env[k]!.trim()) || d;

/** 本倉根：從本檔位置推回（<root>/link-audit/tools/paths.ts → <root>），不依賴當前工作目錄 */
const REPO_FROM_FILE = path.resolve(import.meta.dirname, '..', '..');

export const P = {
    /** 原料倉根（raw/ 與 link-audit/ 的上一层） */
    home: env('YBH_HOME', REPO_FROM_FILE),
    /** 建置中繼與大輸出目錄 */
    scratch: env('YBH_SCRATCH', 'D:/2026/_scratch-ybh'),
    /** adb-converter 的 ts/src（authorAdb、AdbReader、renderEmbed 等） */
    accelonSrc: env('ACCELON_SRC', 'D:/2026/adb-converter/ts/src'),
    /** 成品 adb 的部署目錄 */
    accelonAdb: env('ACCELON_ADB', 'D:/accelon3'),
    /** 大正藏底座（跨庫連結的目標庫） */
    taisho: env('TAISHO_ADB', 'D:/accelon3/taisho.adb'),
    /** 原料 md 目錄（2026-11-15 起在 raw/） */
    raw: () => path.join(env('YBH_HOME', REPO_FROM_FILE), 'raw'),
    /** 產出與清單目錄（入版控的那批） */
    data: () => path.join(env('YBH_HOME', REPO_FROM_FILE), 'link-audit', 'data'),
    /** 建置／驗收紀錄目錄 */
    out: () => path.join(env('YBH_HOME', REPO_FROM_FILE), 'link-audit', 'out'),
    /** 本機成品備份目錄（gitignored，48MB 級，不入版控） */
    backups: () => path.join(env('YBH_HOME', REPO_FROM_FILE), 'out'),
    /** 打包器與 reader 模組的實際檔名 */
    modules: () => ({
        authorAdb: path.join(P.accelonSrc, 'adbauthor.ts'),
        xmlEntities: path.join(P.accelonSrc, 'xml-entities.ts'),
        adb: path.join(P.accelonSrc, 'accelon26', 'adb.ts'),
        vapa: path.join(P.accelonSrc, 'accelon26', 'vapa.ts'),
        pageText: path.join(P.accelonSrc, 'accelon26', 'page-text.ts'),
        tableBlock: path.join(P.accelonSrc, 'accelon26', 'table-block.ts'),
    }),
};

/** 環境体检：缺什麼直接列出來。給别人的 agent 第一件跑的就是這個。 */
export function selfCheck() {
    const need: [string, string, boolean][] = [
        ['原料目錄 raw/', P.raw(), true],
        ['中繼目錄 scratch', P.scratch, false],
        ['成品部署目錄', P.accelonAdb, true],
        ['大正藏 taisho.adb', P.taisho, true],
        ['打包器 adbauthor.ts', P.modules().authorAdb, true],
        ['reader adb.ts', P.modules().adb, true],
        ['table-block.ts（<表> 驗證要用）', P.modules().tableBlock, true],
    ];
    const missing: string[] = [];
    const rows = need.map(([label, p, must]) => {
        const ok = fs.existsSync(p);
        if (!ok && must) missing.push(label);
        return { label, path: p, exists: ok, required: must };
    });
    let rawCount = 0;
    try { rawCount = fs.readdirSync(P.raw()).filter((f) => f.endsWith('.md')).length; } catch { /* 目錄不存在 */ }
    return {
        bun: process.versions.bun ?? '(不是 bun 環境？)',
        node: process.versions.node,
        platform: `${process.platform}/${process.arch}`,
        rawMdCount: rawCount,
        items: rows,
        missing,
        /** 給 maintainer 回報環境用：整份 JSON 貼進信裡即可，不含任何憑證 */
        asText: () => JSON.stringify({
            bun: process.versions.bun, node: process.versions.node,
            platform: `${process.platform}/${process.arch}`, rawMdCount, missing,
            items: rows.map((r) => `${r.exists ? 'OK  ' : '缺'} ${r.label} → ${r.path}`),
        }, null, 1),
    };
}
