from pathlib import Path
import re

p = Path('errand.html')
s = p.read_text(encoding='utf-8')

for ident in ('topTaxiErrandAddressAB2','topTaxiErrandAddressAB4','topTaxiErrandAddressAB5'):
    s = re.sub(r'<style id="' + re.escape(ident) + r'">.*?</style>\s*', '', s, flags=re.S)

old = re.search(r"if\(!\(taskType==='purchase'&&purchaseLocationMode==='unspecified'\)\)\{activeSlotKeys\.push\('p1'\);.*?\}\n if\(cfg\.p2Max>0\)\{", s, flags=re.S)
if not old:
    raise SystemExit('p1 render block not found')
replacement = "if(!(taskType==='purchase'&&purchaseLocationMode==='unspecified')){activeSlotKeys.push('p1');root.appendChild(addressBlock(addressSlots.p1));}\n if(cfg.p2Max>0){"
s = s[:old.start()] + replacement + s[old.end():]

start = s.index('function addressBlock(slot,isFinal=false){')
end = s.index('\nfunction deliveryModuleHtml()', start)
fn = '''function addressBlock(slot,isFinal=false){
 const d=document.createElement('div');d.className='top-taxi-address-plain-field';d.dataset.slot=slot.key;
 const initial=slot.data?displayAddress(slot.data):'';
 d.innerHTML=`<div class="errand-address-head"><label>${slot.key==='p1'?'📍':isFinal?'🏁':'🟡'} ${slot.label} <span class="field-tag ${slot.required?'required-tag':'optional-tag'}">${slot.required?'必填':'選填'}</span></label></div><div id="${slot.key}Box" class="top-taxi-address-plain-control"><textarea id="${slot.key}Input" class="top-taxi-address-plain-input" rows="2" placeholder="請輸入${slot.label}地址或地標名稱" ${slot.required?'required':''}>${escapeHtml(initial)}</textarea><div class="address-suggestions" id="${slot.key}Suggestions"></div></div>${isFinal?deliveryModuleHtml():''}`;
 const input=d.querySelector(`#${slot.key}Input`);
 input.addEventListener('input',()=>{const q=input.value.trim();slot.place=null;slot.data=q?normalizeAddress({address:q}):null;syncDeliveryVisibility();renderPhoto();updateEstimate();});
 return d;
}'''
s = s[:start] + fn + s[end:]

css = '''<style id="topTaxiErrandAddressAB5">
.top-taxi-address-plain-field{display:block;width:100%;max-width:100%;min-width:0;margin:0 0 15px;padding:0;box-sizing:border-box}
.top-taxi-address-plain-control{position:relative;display:block;width:100%;max-width:100%;min-width:0;margin:0;padding:0;box-sizing:border-box}
.top-taxi-address-plain-input{display:block;width:100%;max-width:100%;min-width:0;min-height:86px;padding:14px;border:1px solid #e5e5e8;border-radius:14px;background:#fafafa;color:#222;font:inherit;font-size:16px;line-height:1.5;resize:none;outline:none;box-sizing:border-box}
.top-taxi-address-plain-input:focus{border-color:var(--red);background:#fff;box-shadow:0 0 0 3px rgba(255,31,45,.08),0 6px 18px rgba(255,31,45,.06)}
.top-taxi-address-plain-control .address-suggestions{left:0;right:0;width:auto;max-width:100%;box-sizing:border-box}
</style>'''
s = s.replace('</head>', css + '\n</head>', 1)

p.write_text(s, encoding='utf-8')
