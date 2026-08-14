from pathlib import Path

FILES = ["index.html", "ride.html"]


def read(name):
    return Path(name).read_text(encoding="utf-8")


def write(name, text):
    Path(name).write_text(text, encoding="utf-8")


def insert_before(text, needle, snippet, marker):
    if marker in text:
        return text
    if needle not in text:
        raise RuntimeError(f"{marker}: insertion point missing")
    return text.replace(needle, snippet + "\n" + needle, 1)


POLISH_SCRIPT = r'''<style id="topTaxiSavedAddressPolishV2Style">
.top-taxi-saved-address-hint-v2{
  margin:4px 2px 0;
  color:#9b9ba1;
  font-size:11px;
  line-height:1.45;
}
</style>
<script id="topTaxiSavedAddressPolishV2">
(function(){
  const KEY='topTaxiAddresses';
  const generic1=new Set(['','常用','常用:','常用：','常用地點 1','常用地點1','常用1','常用 1','常用3','常用 3']);
  const generic2=new Set(['','常用','常用:','常用：','常用地點 2','常用地點2','常用2','常用 2','常用4','常用 4']);

  function migrate(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!Array.isArray(raw))return;
      let changed=false;
      if(raw[2]&&generic1.has(String(raw[2].name||'').trim())){
        raw[2].name='常用 1'; changed=true;
      }
      if(raw[3]&&generic2.has(String(raw[3].name||'').trim())){
        raw[3].name='常用 2'; changed=true;
      }
      if(changed)localStorage.setItem(KEY,JSON.stringify(raw));
    }catch(_){ }
  }

  function normalizeInput(el, expected, allowed){
    if(!el)return;
    const value=String(el.value||'').trim();
    if(allowed.has(value))el.value=expected;
  }

  function normalizeButtonText(btn, expected, allowed){
    if(!btn)return;
    const value=String(btn.textContent||'').trim();
    if(allowed.has(value))btn.textContent=expected;
  }

  function fixDom(){
    migrate();

    // Ride closed-state label. Booking already has its own 收合 state while editor is open.
    const rideLabel=document.querySelector('#toggleSettings > span');
    if(rideLabel && String(rideLabel.textContent||'').trim()==='設定') rideLabel.textContent='常用地址';

    const bookingLabel=document.getElementById('savedSettingsLabel');
    if(bookingLabel && String(bookingLabel.textContent||'').trim()==='設定') bookingLabel.textContent='常用地址';

    // Setting editor names on both pages.
    normalizeInput(document.getElementById('sharedName2'),'常用 1',generic1);
    normalizeInput(document.getElementById('sharedName3'),'常用 2',generic2);
    normalizeInput(document.getElementById('fav1Name'),'常用 1',generic1);
    normalizeInput(document.getElementById('fav2Name'),'常用 2',generic2);

    // Existing rendered chips, if any.
    const bookingChips=document.querySelectorAll('#bookingSavedAddressChips .saved-address-chip');
    bookingChips.forEach(function(btn){
      const t=String(btn.textContent||'').trim();
      if(generic1.has(t))btn.textContent='常用 1';
      else if(generic2.has(t))btn.textContent='常用 2';
    });
    const rideChips=document.querySelectorAll('#savedChips .chip');
    rideChips.forEach(function(btn){
      const t=String(btn.textContent||'').trim();
      if(generic1.has(t))btn.textContent='常用 1';
      else if(generic2.has(t))btn.textContent='常用 2';
    });

    // Hint only where the shared-address control exists. No fare/errand leakage.
    const rideLine=document.querySelector('.saved-place-line');
    if(rideLine && !document.querySelector('.top-taxi-saved-address-hint-v2')){
      const hint=document.createElement('div');
      hint.className='top-taxi-saved-address-hint-v2';
      hint.textContent='儲存常用地址，下次可一鍵帶入';
      rideLine.insertAdjacentElement('afterend',hint);
    }
  }

  migrate();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixDom,{once:true});
  else fixDom();
  new MutationObserver(function(){requestAnimationFrame(fixDom);}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>'''

# Booking defaults for fresh users.
index = read("index.html")
index = index.replace('createEmptyAddressData("常用地點 1")', 'createEmptyAddressData("常用 1")')
index = index.replace('createEmptyAddressData("常用地點 2")', 'createEmptyAddressData("常用 2")')
index = insert_before(index, '</body>', POLISH_SCRIPT, 'topTaxiSavedAddressPolishV2')
write("index.html", index)

# Ride defaults + visible closed-state wording for fresh users.
ride = read("ride.html")
ride = ride.replace('<span>設定</span>\n            <svg class="settings-gear-icon"', '<span>常用地址</span>\n            <svg class="settings-gear-icon"', 1)
ride = ride.replace('value="常用地點 1"', 'value="常用 1"')
ride = ride.replace('value="常用4"', 'value="常用 2"')
ride = ride.replace('emptyAddress("常用地點 1")', 'emptyAddress("常用 1")')
ride = ride.replace('emptyAddress("常用地點 2")', 'emptyAddress("常用 2")')
ride = insert_before(ride, '</body>', POLISH_SCRIPT, 'topTaxiSavedAddressPolishV2')
write("ride.html", ride)

# Guard rails: only these two pages receive this patch.
for name in FILES:
    text=read(name)
    if text.count('topTaxiSavedAddressPolishV2') != 1:
        raise RuntimeError(f"{name}: polish marker count invalid")
    if 'topTaxiProgressiveStopGateV1' not in text:
        raise RuntimeError(f"{name}: previously PASS stop gate unexpectedly missing")

if '<span>常用地址</span>' not in read('ride.html'):
    raise RuntimeError('ride.html: 常用地址 button label not patched')

print('Saved-address polish prepared for booking + ride only.')
