from pathlib import Path
import re

path = Path('ride-ui-v2.html')
s = path.read_text(encoding='utf-8')
original = s

s, n = re.subn(
    r'\s*<header class="hero">.*?</header>\s*(?=<main>)',
    '\n',
    s,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f'Expected exactly one hero header, got {n}')

style = '''
<style id="topTaxiRideUIShell20260818">
html,body{background:#f2f3f5!important}
body{min-height:100vh}
.hero{display:none!important}
main{margin:0 auto!important;padding-top:max(12px,env(safe-area-inset-top))!important}
.saved-place-line .chip{
  color:#66666c!important;
  background:#f3f3f5!important;
  border-color:#e3e3e7!important;
  box-shadow:none!important;
  -webkit-tap-highlight-color:transparent;
}
.saved-place-line .chip.active{
  color:#55555b!important;
  background:#e9e9ed!important;
  border-color:#d9d9de!important;
  box-shadow:none!important;
}
.saved-place-line .chip:focus,
.saved-place-line .chip:focus-visible{
  outline:none!important;
  box-shadow:0 0 0 2px rgba(0,0,0,.055)!important;
}
</style>
'''

if 'topTaxiRideUIShell20260818' in s:
    raise SystemExit('Shell refinement style already exists')
if '</head>' not in s:
    raise SystemExit('Missing </head>')
s = s.replace('</head>', style + '\n</head>', 1)

if s == original:
    raise SystemExit('No changes made')
if '<header class="hero">' in s:
    raise SystemExit('Hero header still present')
if 'background:#f2f3f5!important' not in s:
    raise SystemExit('Neutral shell background missing')
if '.saved-place-line .chip.active' not in s:
    raise SystemExit('Saved-place gray override missing')

path.write_text(s, encoding='utf-8')
