"""Mint, list and revoke CapyNook gift codes.

Ryan needs to hand his nieces access without a card and without sharing his login.
A code writes an ordinary `subscriptions` row when redeemed, so the paywall needs no changes.

Needs supabase-migration-access-codes.sql to have been run in the Supabase SQL Editor first.

  python scripts/gift_codes.py new  --label "Zoe"                 # 1 use, never expires
  python scripts/gift_codes.py new  --label "nieces" --uses 3
  python scripts/gift_codes.py new  --label "trial"  --months 12  # a year, then lapses
  python scripts/gift_codes.py list
  python scripts/gift_codes.py revoke CAPYABCD1234
"""
import argparse, io, json, os, random, re, string, sys
import urllib.request, urllib.parse, urllib.error

ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
cfg = {}
for line in io.open(ENV, encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")
URL = cfg["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = cfg["SUPABASE_SERVICE_ROLE_KEY"]

# No 0/O/1/I/L — these get read aloud and written on paper.
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def call(method, path, params=None, payload=None, prefer=None):
    q = ("?" + urllib.parse.urlencode(params, doseq=True)) if params else ""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(URL + "/rest/v1/" + path + q, data=data, method=method)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", "Bearer " + KEY)
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        r = urllib.request.urlopen(req, timeout=60)
        b = r.read().decode("utf-8")
        return r.status, (json.loads(b) if b.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def pretty(code):
    return "%s-%s-%s" % (code[:4], code[4:8], code[8:])


def cmd_new(a):
    code = "CAPY" + "".join(random.choice(ALPHABET) for _ in range(8))
    row = {"code": code, "label": a.label, "max_uses": a.uses, "months": a.months}
    st, r = call("POST", "access_codes", None, row, prefer="return=representation")
    if st >= 300:
        if "does not exist" in str(r):
            sys.exit("access_codes table missing - run supabase-migration-access-codes.sql "
                     "in the Supabase SQL Editor first.")
        sys.exit("failed: %s %s" % (st, str(r)[:300]))
    print()
    print("   %s" % pretty(code))
    print()
    print("   label      : %s" % (a.label or "-"))
    print("   uses       : %d" % a.uses)
    print("   access     : %s" % ("%d months" % a.months if a.months else "no expiry"))
    print()
    print("   They sign up at capynook.net, then enter it on the Subscribe page.")
    print("   Dashes and case do not matter.")


def cmd_list(a):
    st, rows = call("GET", "access_codes", {"select": "*", "order": "created_at.desc"})
    if st >= 300:
        sys.exit("failed: %s %s" % (st, str(rows)[:300]))
    if not rows:
        print("no codes yet")
        return
    st2, reds = call("GET", "access_code_redemptions", {"select": "code,redeemed_at"})
    used = {}
    for r in (reds or []):
        used.setdefault(r["code"], []).append(r["redeemed_at"][:10])
    print("%-16s %-16s %-7s %-11s %-8s %s" % ("code", "label", "uses", "access", "active", "redeemed"))
    for r in rows:
        print("%-16s %-16s %-7s %-11s %-8s %s" % (
            pretty(r["code"]), (r.get("label") or "-")[:16],
            "%d/%d" % (r["uses"], r["max_uses"]),
            ("%d months" % r["months"]) if r.get("months") else "no expiry",
            "yes" if r["active"] else "REVOKED",
            ", ".join(used.get(r["code"], [])) or "-"))


def cmd_revoke(a):
    code = a.code.upper().replace("-", "").replace(" ", "")
    st, r = call("PATCH", "access_codes", {"code": "eq." + code}, {"active": False},
                 prefer="return=representation")
    if st >= 300 or not r:
        sys.exit("not found or failed: %s %s" % (st, str(r)[:200]))
    print("revoked %s" % pretty(code))
    print("NOTE: this stops future redemptions. Anyone who already redeemed keeps access "
          "until their subscription row is changed.")


p = argparse.ArgumentParser(description="CapyNook gift codes")
sub = p.add_subparsers(dest="cmd", required=True)

n = sub.add_parser("new", help="mint a code")
n.add_argument("--label", default=None, help="who it is for")
n.add_argument("--uses", type=int, default=1, help="how many accounts can redeem it")
n.add_argument("--months", type=int, default=None, help="months of access (default: no expiry)")
n.set_defaults(func=cmd_new)

l = sub.add_parser("list", help="show every code")
l.set_defaults(func=cmd_list)

r = sub.add_parser("revoke", help="turn a code off")
r.add_argument("code")
r.set_defaults(func=cmd_revoke)

a = p.parse_args()
a.func(a)
