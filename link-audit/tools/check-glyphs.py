#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""字形檢查（README §五.1 的自動化）：掃我方敘述裡「僅簡體」的字形。

為什麼要寫成工具而不是靠人記得分批 grep：README 自己寫了「交付前逐檔掃」，
但會依賴記憶的規則一定會被破；skill 要上官網給別人用，這條就該進打包檢查
（package-skills.ts 的第⑤道）。

判準（盡量不造噪音，§五.1 已警告「檢查會變成噪音工廠」）：
  1. 逐字過 opencc s2t；轉換後不同、且結果穩定（s2t(t)==t）者列為候選。
  2. 候選再分兩類：
     - FAIL：只存在於簡體的字形（opencc 單字還原後不同、且還原穩定者）。
     - INFO：繁簡共用或 s2t 有意圖損失的字，見下方 AMBIGUOUS 的逐字理由——
             這些在繁體正典裡本來就合法，硬判錯就是假陽性，要人工看。
  3. 豁免：以 `>` 開頭的引文、含 `glyph:raw` 標記的行——屬 §五.2「引原文照原字形」，
     以及我們自己列舉簡體反例的行（README §五.1 那兩行就是這種）。

用法：
  python link-audit/tools/check-glyphs.py [檔或目錄…]     預設掃 link-audit/skills/
  python link-audit/tools/check-glyphs.py -                從 stdin 讀一段（參數 "-"）
  混用： python .../check-glyphs.py link-audit/skills -    檔與 stdin 一起掃
離開碼：0 無 FAIL；1 有 FAIL；2 偵測器跑不起來（opencc 未裝）——2 不等於通過。
"""
import glob
import os
import sys

# 只收「繁體正典裡本來就合法、但 opencc s2t 會改掉」的字，逐字附理由，避免清單變垃圾桶。
# 干（干支，非幹） 于（文言介詞，非於） 后（皇后，非後） 里（里程，非裡） 面（面孔，非麵）
# 台（臺／台對等） 愿（誠摯義，非願） 乘（乘車，繁體同形） 适（古人名，非「適合」）
AMBIGUOUS = set("干于后面台里愿乘适")


def sources(argv):
    """回傳 [(標籤, [行…])]；先一次讀進記憶體，因為 stdin 只能讀一遍。"""
    out = []
    for a in argv:
        if a == "-":
            out.append(("<stdin>", sys.stdin.read().split("\n")))
        elif os.path.isdir(a):
            for p in sorted(glob.glob(os.path.join(a, "**", "*.md"), recursive=True)):
                out.append((p, open(p, encoding="utf-8").read().split("\n")))
        elif os.path.isfile(a):
            out.append((a, open(a, encoding="utf-8").read().split("\n")))
        else:
            sys.stderr.write("找不到路徑：%s\n" % a)
            sys.exit(2)
    return out


def is_han(ch):
    o = ord(ch)
    return 0x4E00 <= o <= 0x9FFF or 0x3400 <= o <= 0x4DBF


def main():
    try:
        import opencc
    except ImportError:
        sys.stderr.write("未安裝 opencc——本檢查**沒跑**，不是通過。\n")
        return 2
    conv = opencc.OpenCC("s2t")

    argv = sys.argv[1:] or [os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "skills")]
    srcs = sources(argv)

    fails, infos, total_han, exempt_han = [], [], 0, 0
    for label, lines in srcs:
        for ln, line in enumerate(lines, 1):
            han = [ch for ch in line if is_han(ch)]
            total_han += len(han)
            if line.lstrip().startswith(">") or "glyph:raw" in line:
                exempt_han += len(han)
                continue
            for ch in han:
                t = conv.convert(ch)
                if t == ch or conv.convert(t) != t:
                    continue          # 同形，或 s2t 不穩定（非可靠簡體標記）
                (infos if ch in AMBIGUOUS else fails).append((label, ln, ch, t))

    for label, ln, ch, t in fails:
        print("FAIL %s:%d  「%s」應作「%s」" % (os.path.relpath(label), ln, ch, t))
    for label, ln, ch, t in infos:
        print("INFO %s:%d  「%s」→「%s」（繁簡同形／s2t 有損，人工判）"
              % (os.path.relpath(label), ln, ch, t))

    files = ", ".join(os.path.basename(l) if l != "<stdin>" else l for l, _ in srcs)
    print("—— 掃 %d 源（%s）、%d 個漢字；豁免 %d 字；FAIL %d、INFO %d"
          % (len(srcs), files, total_han, exempt_han, len(fails), len(infos)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
