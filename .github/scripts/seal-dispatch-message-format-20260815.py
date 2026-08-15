from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly 1 match, got {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# ride.html — source page title is fixed; service type stays in dispatcher core.
replace_once(
    "ride.html",
    "  const header = serviceIsDriver ? 'TOP Taxi｜代駕' : 'TOP Taxi｜一般搭車';",
    "  const header = 'TOP Taxi｜即時叫車';",
)

# index.html — source page title is fixed; remove the temporary V2 marker.
replace_once(
    "index.html",
    "  const header=isDriver?'TOP Taxi｜代駕':'TOP Taxi｜一般搭車';",
    "  const header='TOP Taxi｜預約叫車';",
)
replace_once(
    "index.html",
    "  const out=[header,'','🧪 DISPATCH FORMAT V2'];",
    "  const out=[header];",
)

# fare.html — keep page title, remove duplicate legacy title anywhere in the old body,
# remove the temporary marker, and return to LINE even when backend sync fails after LINE success.
replace_once(
    "fare.html",
    "    if(i===0 && /TOP Taxi/.test(t)) continue;",
    "    if(/TOP Taxi｜車資試算/.test(t)) continue;",
)
replace_once(
    "fare.html",
    "  const out=[header,'','🧪 DISPATCH FORMAT V2','',...kept,'','━━━━━━━━━━','以上為系統預估車資，實際費用依當日行程狀況為準。','',`💰 試算｜${serviceShort}`];",
    "  const out=[header,'',...kept,'','━━━━━━━━━━','以上為系統預估車資，實際費用依當日行程狀況為準。','',`💰 試算｜${serviceShort}`];",
)
replace_once(
    "fare.html",
    '''        } else {\n            fareTripSendState = "sync-warning";\n            showFareTripResult("sync-warning", serviceName);\n        }''',
    '''        } else {\n            fareTripSendState = "sync-warning";\n            showFareTripResult("sync-warning", serviceName);\n            if (fareTripReturnTimer) clearTimeout(fareTripReturnTimer);\n            fareTripReturnTimer = setTimeout(function() {\n                returnToLineChat();\n            }, 1100);\n        }''',
)

# errand.html — source page title is fixed; instant keeps one line, reservation uses two lines.
replace_once(
    "errand.html",
    "  const header=`TOP Taxi｜${task}`;",
    "  const header='TOP Taxi｜跑腿服務';",
)
replace_once(
    "errand.html",
    '''  const core=errandMode==='reserve'\n    ? `🕐 ${$('#errandDate').value} ${$('#errandTime').value}｜${icon} ${task}`\n    : `⚡ 即時｜${icon} ${task}`;\n  const out=[header,'','🧪 DISPATCH FORMAT V2','',...topTaxiCleanMessageLinesV2(body),'',core];''',
    '''  const core=errandMode==='reserve'\n    ? [`🕐 ${$('#errandDate').value} ${$('#errandTime').value}`,`${icon} ${task}`]\n    : [`⚡ 即時｜${icon} ${task}`];\n  const out=[header,'',...topTaxiCleanMessageLinesV2(body),'',...core];''',
)
replace_once(
    "errand.html",
    '''  const blocks=split.blocks.filter(b=>!String(b[0]||'').includes('未提供'));\n  if(blocks.length) out.push('',...blocks.flatMap((b,idx)=>idx?[ '', ...b ]:b));''',
    '''  const blocks=split.blocks\n    .filter(b=>!String(b[0]||'').includes('未提供'))\n    .map(b=>{\n      const next=[...b];\n      const head=String(next[0]||'');\n      const sep=head.indexOf('｜');\n      const suffix=sep>=0?head.slice(sep):'';\n      if(head.startsWith('📍')) next[0]=`📍 上車${suffix}`;\n      if(head.startsWith('🏁')) next[0]=`🏁 下車${suffix}`;\n      return next;\n    });\n  if(blocks.length) out.push('',...blocks.flatMap((b,idx)=>idx?[ '', ...b ]:b));''',
)

# Seal assertions: four source titles, no temporary marker, service/time grammar intact.
checks = {
    "ride.html": [
        "const header = 'TOP Taxi｜即時叫車';",
        "`⚡ 即時｜${serviceShort}`",
    ],
    "index.html": [
        "const header='TOP Taxi｜預約叫車';",
        "`🕐 ${ctx.bookDate} ${ctx.bookTime}`",
        "serviceShort",
    ],
    "fare.html": [
        "const header='TOP Taxi｜車資試算';",
        "`💰 試算｜${serviceShort}`",
        "if(/TOP Taxi｜車資試算/.test(t)) continue;",
        "fareTripReturnTimer = setTimeout(function()",
    ],
    "errand.html": [
        "const header='TOP Taxi｜跑腿服務';",
        "[`🕐 ${$('#errandDate').value} ${$('#errandTime').value}`,`${icon} ${task}`]",
        "[`⚡ 即時｜${icon} ${task}`]",
        "`📍 上車${suffix}`",
        "`🏁 下車${suffix}`",
    ],
}

for path, needles in checks.items():
    text = Path(path).read_text(encoding="utf-8")
    if "🧪 DISPATCH FORMAT V2" in text:
        raise SystemExit(f"{path}: temporary V2 marker still present")
    for needle in needles:
        if needle not in text:
            raise SystemExit(f"{path}: missing sealed marker: {needle}")

# Protect the booking iOS focus fix while touching index.html.
index = Path("index.html").read_text(encoding="utf-8")
viewport = 'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"'
if index.count(viewport) != 1:
    raise SystemExit("index.html: booking iOS focus viewport fix was not preserved")

print("PASS: unified dispatch message format sealed across ride/index/fare/errand")
