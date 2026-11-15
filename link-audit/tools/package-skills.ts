#!/usr/bin/env bun
/**
 * skill 打包器：把 skills/<name>/SKILL.md 打成可安裝的 <name>.skill（zip），並產生官網清單
 * 用的 manifest（沿用官網既有 `www/adb/manifest.json`／`www/releases.json` 的欄位形狀）。
 *
 * 為什麼要自己寫 zip 而不用 shell zip：**確定性**。同一份來源重複打包必須得到相同 sha256，
 * 否則清單上的雜湊每次都在變，維護者無從判斷「到底改沒改」，官網分享也就失去意義。
 * 做法：條目按路徑排序、固定 DOS 時間戳（取自 參數或 1980-01-01，不用 now）、不含多餘欄位。
 *
 * 交付前的四道檢查（跑不過就不准發布）：
 *   ① 解壓後 `<name>/SKILL.md` 存在、frontmatter 可解析、`name` 與目錄名一致
 *   ② `description` 非空（它是被找到與被選中的唯一依據）
 *   ③ 掃描無憑證與個資樣式（email、IP、password/token、客戶名稱＋信箱同現）
 *   ④ zip 條目路徑不含絕對路徑或 `..`（防路徑穿越）
 *
 * 用法：
 *   bun run link-audit/tools/package-skills.ts                       # 全部打包＋驗證
 *   bun run link-audit/tools/package-skills.ts --out <dir> --stamp <ISO>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { P } from './paths.ts';

const SKILLS = path.join(P.home, 'link-audit', 'skills');
const argOf = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : ''; };
const OUT = argOf('--out') || path.join(P.out(), 'skills-dist');
const STAMP = argOf('--stamp') || '1980-01-01T00:00:00Z';   // 固定值→同來源同 sha

const zipTime = (iso: string) => {
    const d = new Date(iso);
    return { dosTime: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
        dosDate: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
};

/* 极简 store-method ZIP（不壓縮：SKILL.md 是小文字檔，用 store 換可重現性與可檢查性） */
function buildZip(entries: { name: string; data: Buffer }[], stampIso: string): Buffer {
    const { dosTime, dosDate } = zipTime(stampIso);
    const chunks: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;
    for (const e of entries) {
        const name = Buffer.from(e.name, 'utf8');
        const crc = crc32(e.data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
        local.writeUInt16LE(0, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
        local.writeUInt32LE(crc, 14); local.writeUInt32LE(e.data.length, 18); local.writeUInt32LE(e.data.length, 22);
        local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
        chunks.push(local, name, e.data);
        const cen = Buffer.alloc(46);
        cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6);
        cen.writeUInt16LE(0, 8); cen.writeUInt16LE(0, 10); cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14);
        cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(e.data.length, 20); cen.writeUInt32LE(e.data.length, 24);
        cen.writeUInt16LE(name.length, 28); cen.writeUInt16LE(0, 30); cen.writeUInt16LE(0, 32);
        cen.writeUInt16LE(0, 34); cen.writeUInt16LE(0, 36); cen.writeUInt32LE(0, 38); cen.writeUInt32LE(offset, 42);
        central.push(cen, name);
        offset += local.length + name.length + e.data.length;
    }
    const body = Buffer.concat(chunks);
    const cen = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(cen.length, 12); end.writeUInt32LE(body.length, 16); end.writeUInt16LE(0, 20);
    return Buffer.concat([body, cen, end]);
}
let crcTable: number[] | null = null;
function crc32(buf: Buffer): number {
    if (!crcTable) {
        crcTable = [];
        for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; }
    }
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function frontmatter(t: string): Record<string, string> | null {
    if (!t.startsWith('---\n')) return null;
    const end = t.indexOf('\n---', 4);
    if (end < 0) return null;
    const out: Record<string, string> = {};
    for (const line of t.slice(4, end).split('\n')) {
        const m = /^([a-zA-Z-]+):\s*(.*)$/.exec(line.trim());
        if (m) out[m[1]!] = m[2]!;
    }
    return out;
}

const SECRET = [
    { re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, why: '電子郵件地址（可能属客戶個資；官網分享＝公開出版）' },
    { re: /\b\d{1,3}(\.\d{1,3}){3}\b/, why: 'IP 位址' },
    { re: /password|passwd|授權碼|token|secret/i, why: '疑似憑證字樣' },
    { re: /[A-Za-z]:[\\\/]{1,2}(Users|home)[\\\/]/i, why: '個人家目錄絕對路徑' },
];

fs.mkdirSync(OUT, { recursive: true });
const dirs = fs.readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const manifest: any[] = [];
let fail = 0;
for (const name of dirs) {
    const src = path.join(SKILLS, name, 'SKILL.md');
    if (!fs.existsSync(src)) { console.log(`跳過 ${name}（沒有 SKILL.md）`); continue; }
    const text = fs.readFileSync(src, 'utf8');
    const fm = frontmatter(text);
    const errs: string[] = [];
    if (!fm) errs.push('frontmatter 無法解析（必須以 --- 開頭的一塊）');
    else {
        if (fm.name !== name) errs.push(`name 欄 ${JSON.stringify(fm.name)} 與目錄名 ${JSON.stringify(name)} 不一致`);
        if (!fm.description || fm.description.length < 20) errs.push('description 空缺或過短（它是被找到與被選中的唯一依據）');
        if (!/^\d+\.\d+\.\d+$/.test(fm.version || '')) errs.push(`version 不是 semver：${JSON.stringify(fm.version)}`);
    }
    for (const s of SECRET) { const m = s.re.exec(text); if (m) errs.push(`${s.why}：${JSON.stringify(m[0].slice(0, 24))}`); }

    const entries = [{ name: `${name}/SKILL.md`, data: Buffer.from(text, 'utf8') }];
    for (const e of entries) if (e.name.startsWith('/') || e.name.includes('..')) errs.push(`條目路徑不安全：${e.name}`);
    const zip = buildZip(entries, STAMP);
    const sha = crypto.createHash('sha256').update(zip).digest('hex');
    const file = path.join(OUT, `${name}.skill`);
    fs.writeFileSync(file, zip);
    fs.writeFileSync(file + '.sha256', sha + '  ' + `${name}.skill` + '\n', 'utf8');

    // 檢查④：自己解開回來比對（只信「寫進去」不與「讀得出來」）
    const back = readZipEntry(zip, `${name}/SKILL.md`);
    if (!back || back.toString('utf8') !== text) errs.push('解壓回讀與來源不一致（zip 寫壞了）');

    if (errs.length) { fail++; console.log(`✗ ${name}`); for (const e of errs) console.log('   -', e); }
    else console.log(`✓ ${name}  ${(zip.length / 1024).toFixed(1)} KB  sha ${sha.slice(0, 12)}…`);

    manifest.push({
        name, version: fm?.version ?? '', description: fm?.description ?? '',
        file: `${name}.skill`, sha256: sha, size: zip.length, buildTime: STAMP,
        requires: name === 'ybh-adb-package' ? ['adb-author'] : [],
        notes: name === 'adb-author' ? ['通用流程：建立、驗收與交付紀律'] :
               name === 'adb-inspect' ? ['查證方法：走 MCP API，禁位元組 grep 與抽全文'] :
               ['《瑜伽師地論》專案覆盖，只列差異與路徑'],
        errors: errs,
    });
}
const mf = { _comment: '官網要分享的 skill 清單。欄位沿用 www/adb/manifest.json 的形狀；sha256 可用旁檔 .sha256 核對。buildTime 固定→同來源重複打包 sha 不變（確定性）。', generatedFrom: 'link-audit/skills', stamp: STAMP, skills: manifest };
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(mf, null, 1) + '\n', 'utf8');
console.log(`\n打包 ${manifest.length} 只 → ${OUT}｜清單 manifest.json`);
console.log(fail ? `⇒ ${fail} 只有問題，不准發布（見上方錯誤清單）` : '⇒ 全部通過四道檢查');
process.exit(fail ? 1 : 0);

function readZipEntry(zip: Buffer, name: string): Buffer | null {
    // 由 central directory 定位（比掃 local headers 穩：條目順序固定）
    const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) return null;
    const count = zip.readUInt16LE(eocd + 10), cenOff = zip.readUInt32LE(eocd + 16);
    let p = cenOff;
    for (let i = 0; i < count; i++) {
        if (zip.readUInt32LE(p) !== 0x02014b50) return null;
        const nLen = zip.readUInt16LE(p + 28), eLen = zip.readUInt16LE(p + 30), cLen = zip.readUInt16LE(p + 32);
        const entryName = zip.slice(p + 46, p + 46 + nLen).toString('utf8');
        const lho = zip.readUInt32LE(p + 42);
        if (entryName === name) {
            const lNLen = zip.readUInt16LE(lho + 26), lELen = zip.readUInt16LE(lho + 28);
            // 本檔標頭偏移：14 crc｜18 壓縮長度｜22 未壓縮長度｜26 檔名長｜28 延伸欄長
            const size = zip.readUInt32LE(lho + 18);
            return zip.slice(lho + 30 + lNLen + lELen, lho + 30 + lNLen + lELen + size);
        }
        p += 46 + nLen + eLen + cLen;
    }
    return null;
}
