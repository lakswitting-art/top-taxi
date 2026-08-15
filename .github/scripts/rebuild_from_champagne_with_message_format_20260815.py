from pathlib import Path
import re
import subprocess

FILES = ['ride.html', 'index.html', 'fare.html', 'errand.html']
BACKUP = 'origin/backup/champagne-2026-08-15'

# 1) Restore the four production pages exactly from the known-good champagne backup.
subprocess.run(['git','checkout',BACKUP,'--',*FILES], check=True)

# 2) Re-apply ONLY the customer LINE message formatter patch.
subprocess.run(['python3','.github/scripts/patch_dispatch_message_layout_20260815.py'], check=True)

# 3) Apply the final message presentation decisions, without touching page UX/LIFF behavior.
replacements = {
    'ride.html': [
        ("const header = serviceIsDriver ? '🚘 TOP Taxi｜即時叫車・代駕' : '🚕 TOP Taxi｜即時叫車・一般搭車';",
         "const header = serviceIsDriver ? 'TOP Taxi｜代駕' : 'TOP Taxi｜一般搭車';")
    ],
    'index.html': [
        ("const header=isDriver?'📅 TOP Taxi｜預約叫車・代駕':'📅 TOP Taxi｜預約叫車・一般搭車';",
         "const header=isDriver?'TOP Taxi｜代駕':'TOP Taxi｜一般搭車';"),
        ("out.push('','━━━━━━━━━━━━━','預約完成！客服確認後會立刻幫您安排！','',`🕐 ${ctx.bookDate} ${ctx.bookTime}｜${serviceShort}`,'',ctx.pickupDispatchHeader,ctx.pickupDispatchText);",
         "out.push('','━━━━━━━━━━','預約完成！客服確認後會立刻幫您安排！','',`🕐 ${ctx.bookDate} ${ctx.bookTime}`,serviceShort,'',ctx.pickupDispatchHeader,ctx.pickupDispatchText);")
    ],
    'fare.html': [
        ("const header=isDriver?'💰 TOP Taxi｜車資試算・代駕':'💰 TOP Taxi｜車資試算・一般搭車';",
         "const header='TOP Taxi｜車資試算';")
    ],
    'errand.html': [
        ("const header=`${icon} TOP Taxi｜跑腿服務・${task}`;",
         "const header=`TOP Taxi｜${task}`;")
    ]
}

for fn, pairs in replacements.items():
    p = Path(fn)
    s = p.read_text(encoding='utf-8')
    for old, new in pairs:
        if old not in s:
            raise SystemExit(f'marker missing in {fn}: {old[:100]}')
        s = s.replace(old, new, 1)
    # Shorten customer-facing divider everywhere the formatter/raw message may use it.
    s = s.replace('━━━━━━━━━━━━━', '━━━━━━━━━━')
    p.write_text(s, encoding='utf-8')

# 4) Booking: if no dropoff was supplied, do not create a "下車｜未提供" source block.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
pattern = re.compile(
    r'(const dropoffDetails\s*=\s*dropoffDataForDispatch\s*\?\s*`\\n\$\{dispatchNodeHeader\("🏁", "下車", dropoffDataForDispatch\)\}\\n\$\{dispatchNodeDisplayText\(dropoffDataForDispatch\)\}\\n`\s*:\s*)`\\n🏁 下車｜未提供\\n`;',
    re.S
)
s, n = pattern.subn(r'\1"";', s, count=1)
if n != 1:
    raise SystemExit('booking empty-dropoff source marker missing')
p.write_text(s, encoding='utf-8')

# 5) Guardrails: only the formatter changes may remain; none of today's failed UI patches may survive.
ride = Path('ride.html').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
fare = Path('fare.html').read_text(encoding='utf-8')
errand = Path('errand.html').read_text(encoding='utf-8')

assert "const message=topTaxiFormatRideMessageV2(await buildMessage());" in ride
assert "rideReturnTimer=setTimeout(rideReturnToLineChat,1100);" in ride
assert "650" not in ride or "liff.closeWindow" not in ride[ride.find('650')-300:ride.find('650')+300]
assert 'topTaxiFormatBookingMessageV2' in index
assert 'TOP Taxi｜一般搭車' in index
assert '🏁 下車｜未提供' not in index[index.find('const dropoffDetails'):index.find('const dropoffDetails')+800]
assert 'TOP TAXI BOOKING MOBILE HORIZONTAL LOCK' not in index
assert "const header='TOP Taxi｜車資試算';" in fare
assert 'const header=`TOP Taxi｜${task}`;' in errand

print('CHAMPAGNE BASE + MESSAGE FORMAT ONLY: OK')
