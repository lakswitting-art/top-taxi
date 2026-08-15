from pathlib import Path

files = ['ride.html', 'index.html', 'fare.html', 'errand.html']
for fn in files:
    p = Path(fn)
    s = p.read_text(encoding='utf-8')
    s = s.replace('━━━━━━━━━━━━━', '━━━━━━━━━━')
    if fn in ('ride.html', 'fare.html', 'errand.html'):
        s = s.replace('🔴 TOP Taxi｜', '◆ TOP Taxi｜')
    p.write_text(s, encoding='utf-8')

p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = '''    const dropoffDetails =
        dropoffDataForDispatch
            ? `\n${dispatchNodeHeader("🏁", "下車", dropoffDataForDispatch)}\n${dispatchNodeDisplayText(dropoffDataForDispatch)}\n`
            : `\n🏁 下車｜未提供\n`;'''
new = '''    const dropoffDetails =
        dropoffDataForDispatch
            ? `\n${dispatchNodeHeader("🏁", "下車", dropoffDataForDispatch)}\n${dispatchNodeDisplayText(dropoffDataForDispatch)}\n`
            : "";'''
if old not in s:
    raise SystemExit('index dropoff source target missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

assert '◆ TOP Taxi｜一般搭車' in Path('ride.html').read_text(encoding='utf-8')
assert '◆ TOP Taxi｜一般搭車' in Path('index.html').read_text(encoding='utf-8')
assert '◆ TOP Taxi｜車資試算' in Path('fare.html').read_text(encoding='utf-8')
assert '🔴 TOP Taxi｜' not in Path('errand.html').read_text(encoding='utf-8')
assert '🏁 下車｜未提供' not in Path('index.html').read_text(encoding='utf-8')
for fn in files:
    assert '━━━━━━━━━━━━━' not in Path(fn).read_text(encoding='utf-8')
print('message polish patch OK')
