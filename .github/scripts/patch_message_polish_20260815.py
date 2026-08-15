from pathlib import Path
import re

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
s = re.sub(
    r'(const dropoffDetails\s*=\s*dropoffDataForDispatch\s*\?\s*`\\n\$\{dispatchNodeHeader\("🏁", "下車", dropoffDataForDispatch\)\}\\n\$\{dispatchNodeDisplayText\(dropoffDataForDispatch\)\}\\n`\s*:\s*)`\\n🏁 下車｜未提供\\n`;',
    r'\1"";',
    s,
    count=1,
    flags=re.S
)
p.write_text(s, encoding='utf-8')
print('message polish patch completed')
