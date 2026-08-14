from pathlib import Path

p = Path("ride.html")
text = p.read_text(encoding="utf-8")

old = '''  function boot(){
    const line=document.querySelector('.saved-place-line');
    if(line&&!document.querySelector('.top-taxi-ride-saved-address-hint')){
      const hint=document.createElement('div');
      hint.className='top-taxi-ride-saved-address-hint';
      hint.textContent='儲存常用地址，下次可一鍵帶入';
      line.insertAdjacentElement('afterend',hint);
    }
    const label=document.querySelector('#toggleSettings > span');
    if(label)label.textContent='常用地址';
  }'''

new = '''  function boot(){
    const label=document.querySelector('#toggleSettings > span');
    if(label)label.textContent='常用地址';
  }'''

if old not in text:
    raise SystemExit("ride.html: duplicate ride saved-address hint block not found")

text = text.replace(old, new, 1)

# Remove now-unused ride-only hint CSS; shared .top-taxi-saved-address-hint remains.
old_css = '''.top-taxi-ride-saved-address-hint{
  margin:4px 2px 0;
  color:#9b9ba1;
  font-size:11px;
  line-height:1.45;
}
'''
if old_css in text:
    text = text.replace(old_css, "", 1)

# Guard: only one runtime insertion text remains in ride.html.
needle = "hint.textContent='儲存常用地址，下次可一鍵帶入';"
if text.count(needle) != 1:
    raise SystemExit(f"ride.html: expected exactly one saved-address hint insertion, found {text.count(needle)}")

# Guard approved behavior.
for token in [
    'savedSettingsLabel.textContent=savedEditor.hidden?"常用地址":"收合"',
    'if(savedSettingsLabel)savedSettingsLabel.textContent="常用地址";',
    '#savedChips .chip',
    'topTaxiSavedAddressViewportLockV2',
    'topTaxiProgressiveStopGateScriptV1',
]:
    if token not in text:
        raise SystemExit(f"ride.html: guard missing: {token}")

p.write_text(text, encoding="utf-8")
print("Removed duplicate ride saved-address hint; shared hint retained")
