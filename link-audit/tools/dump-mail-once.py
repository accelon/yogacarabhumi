# -*- coding: utf-8 -*-
"""單次 IMAP 登入，完整 dump 指定 UID 的信件（ybh 線巡查用，不碰 fuyan 狀態檔）。"""
import importlib.util
import json
import sys

FUYAN_MAIL = r"D:\2026\fuyan\src\qq_mail.py"
STATE = r"D:\2026\yogacarabhumi-dila\link-audit\data\ybh-mail-state.json"


def main():
    spec = importlib.util.spec_from_file_location("qm", FUYAN_MAIL)
    mod = importlib.util.module_from_spec(spec)
    sys.stdout.reconfigure(encoding="utf-8")
    spec.loader.exec_module(mod)
    mod.STATE = STATE
    imap, _, _ = mod.connect()
    try:
        for uid in sys.argv[1:]:
            msg = mod.fetch(imap, uid)
            if msg is None:
                print("=== UID %s: 找不到 ===" % uid)
                continue
            print("=" * 78)
            print("UID %s | From: %s | To: %s | Date: %s | Subject: %s" % (
                uid, mod.dh(msg.get("From") or ""), mod.dh(msg.get("To") or ""),
                mod.dh(msg.get("Date") or ""), mod.dh(msg.get("Subject") or "")))
            print("=" * 78)
            print(mod.body_text(msg))
            print()
    finally:
        try:
            imap.logout()
        except Exception:
            pass


main()
