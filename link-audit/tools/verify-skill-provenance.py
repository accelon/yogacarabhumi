#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""交付溯源檢查：`.skill` 裡的 SKILL.md、磁碟上的來源檔、版控裡那一份——**三者逐字相同**。

打包器第④道驗的是「zip 內容 == 磁碟上的來源檔」；這裡補另外兩環：
    已提交的原始檔 ＝ 磁碟上的來源檔 ＝ 交付出去的那顆
**為什麼要三點比而不是兩點比**：本檔第一版只比「zip vs 已提交」，負控當場證明它抓不到
「改了檔卻忘了提交」——那時沒重跑打包，zip 仍是舊的、和已提交那份一模一樣，於是報綠。
把磁碟那份也拉進來比，才能在這種時刻就擋下來：否則下一個人重跑打包器，會產出一顆
「檢查全綠、但倉庫裡找不到對應原始檔」的成品（勘誤 #30 的親戚）。

用法：
  python link-audit/tools/verify-skill-provenance.py            # 掃 deliv/ 與 out/ 兩份
  python link-audit/tools/verify-skill-provenance.py <dir>...   # 指定目錄
偏離即離開碼 1；比對用的是 git blob（HEAD 版）、磁碟位元組與 zip 條目原始位元組，不做任何正規化。
"""
import os
import subprocess
import sys
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKILLS = os.path.join(REPO, "link-audit", "skills")


def git_blob(path):
    """HEAD 裡那個路徑的位元組；不在版控裡回 None（那是失敗，不是跳過）。"""
    rel = os.path.relpath(path, REPO).replace("\\", "/")
    r = subprocess.run(["git", "-C", REPO, "show", "HEAD:" + rel], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def sha(b):
    import hashlib
    return hashlib.sha256(b).hexdigest()[:12]


def main():
    dirs = sys.argv[1:] or [os.path.join(REPO, "link-audit", "deliv"),
                            os.path.join(REPO, "link-audit", "out", "skills-dist")]
    seen, bad, said = 0, [], set()

    def add(key, msg):
        """來源端的問題（磁碟≠版控）屬於原始檔的性質，兩個目錄各報一次只是噪音；
        成品端的比對仍逐顆報，因為那才是「要交出去的東西」。"""
        if key not in said:
            said.add(key)
            bad.append(msg)

    for d in dirs:
        if not os.path.isdir(d):
            print("跳過不存在的目錄 %s" % d)
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".skill"):
                continue
            src = os.path.join(SKILLS, fn[:-6], "SKILL.md")
            committed = git_blob(src)
            if committed is None:
                add("src-" + fn[:-6], "%s：SKILL.md 不在 HEAD 裡（尚未提交？）" % fn[:-6])
                continue
            if not os.path.isfile(src):
                add("src-" + fn[:-6], "倉庫有、磁碟卻沒有 %s" % src)
                continue
            ondisk = open(src, "rb").read()
            if ondisk != committed:
                add("disk-" + fn[:-6], "磁碟 ≠ 版控（%s vs %s）⇒ %s 有改動沒提交，先別再打包交付" % (
                    sha(ondisk), sha(committed), fn[:-6]))
            with zipfile.ZipFile(os.path.join(d, fn)) as z:
                name = "%s/SKILL.md" % fn[:-6]
                if name not in z.namelist():
                    bad.append("%s：zip 內找不到 %s" % (fn, name))
                    continue
                inner = z.read(name)
            seen += 1
            if inner != committed:
                bad.append("%s：zip ≠ 版控（%s vs %s；行數 %d vs %d）" % (
                    fn, sha(inner), sha(committed),
                    inner.count(b"\n"), committed.count(b"\n")))
    if not seen:
        print("沒有任何 .skill 可比——0 樣本不等於通過。")
        return 1
    for b in bad:
        print("✗", b)
    print("⇒ 核對 %d 顆：%s" % (seen, "版控＝磁碟＝成品，三者逐字相同" if not bad
                               else "%d 項偏離" % len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
