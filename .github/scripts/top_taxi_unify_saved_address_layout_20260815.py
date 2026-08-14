from pathlib import Path
import re

INDEX = Path('index.html')
RIDE = Path('ride.html')


def strip_old_polish(text: str) -> str:
    text = re.sub(
        r'\s*<style id="topTaxiSavedAddressPolishV2Style">.*?</style>\s*<script id="topTaxiSavedAddressPolishV2">.*?</script>\s*',
        '\n',
        text,
        flags=re.S,
    )
    return text


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


# ------------------------------
# Booking: normalize slot 3/4 names at the data-loading layer.
# Keep the already-PASS booking compact layout unchanged.
# ------------------------------
index = strip_old_polish(INDEX.read_text(encoding='utf-8'))
index = index.replace('createEmptyAddressData("常用地點 1")', 'createEmptyAddressData("常用 1")')
index = index.replace('createEmptyAddressData("常用地點 2")', 'createEmptyAddressData("常用 2")')

booking_load_pattern = re.compile(
    r'function loadSharedAddresses\(\) \{.*?\n\}\n\nlet sharedAddressAutocompleteInitializer = null;',
    re.S,
)
booking_load_replacement = r'''function normalizeLegacySharedAddressName(item, index) {
    const next = normalizeAddressData(item || {}, SHARED_ADDRESS_DEFAULTS[index] || {});
    const current = String(next.name || "").trim();
    const legacy1 = new Set(["", "常用", "常用:", "常用：", "常用地點", "常用地點 1", "常用地點1", "常用1", "常用 1", "常用3", "常用 3"]);
    const legacy2 = new Set(["", "常用", "常用:", "常用：", "常用地點", "常用地點 2", "常用地點2", "常用2", "常用 2", "常用4", "常用 4"]);
    if (index === 2 && legacy1.has(current)) next.name = "常用 1";
    if (index === 3 && legacy2.has(current)) next.name = "常用 2";
    return next;
}

function loadSharedAddresses() {
    try {
        const saved = JSON.parse(localStorage.getItem(SHARED_ADDRESS_KEY) || "null");
        if (Array.isArray(saved)) {
            const next = SHARED_ADDRESS_DEFAULTS.map(function(def, i) {
                return normalizeLegacySharedAddressName(saved[i] || {}, i);
            });
            try { localStorage.setItem(SHARED_ADDRESS_KEY, JSON.stringify(next)); } catch (e) {}
            return next;
        }
    } catch (e) {}

    return SHARED_ADDRESS_DEFAULTS.map(function(item, i) {
        return normalizeLegacySharedAddressName({}, i);
    });
}

let sharedAddressAutocompleteInitializer = null;'''
index, booking_count = booking_load_pattern.subn(booking_load_replacement, index, count=1)
if booking_count != 1:
    raise RuntimeError(f'index.html: booking loadSharedAddresses patch count {booking_count}')
INDEX.write_text(index, encoding='utf-8')


# ------------------------------
# Ride: use the booking compact saved-address layout while preserving
# all original IDs, autocomplete containers, clear/save buttons and JS handlers.
# ------------------------------
ride = strip_old_polish(RIDE.read_text(encoding='utf-8'))
ride = ride.replace('emptyAddress("常用地點 1")', 'emptyAddress("常用 1")')
ride = ride.replace('emptyAddress("常用地點 2")', 'emptyAddress("常用 2")')
ride = ride.replace('value="常用地點 1"', 'value="常用 1"')
ride = ride.replace('value="常用4"', 'value="常用 2"')
ride = re.sub(
    r'(<button id="toggleSettings" class="saved-settings-btn" type="button" aria-label="設定常用地址">\s*<span>)(.*?)(</span>)',
    r'\1常用地址\3',
    ride,
    count=1,
    flags=re.S,
)

ride_load_pattern = re.compile(
    r'function loadAddresses\(\)\{.*?\n    \}\n\n    let savedAddresses=loadAddresses\(\);',
    re.S,
)
ride_load_replacement = r'''function normalizeLegacyRideSavedName(item,index){
      const next=normalizeAddress(item||{},defaults[index]||{});
      const current=String(next.name||"").trim();
      const legacy1=new Set(["","常用","常用:","常用：","常用地點","常用地點 1","常用地點1","常用1","常用 1","常用3","常用 3"]);
      const legacy2=new Set(["","常用","常用:","常用：","常用地點","常用地點 2","常用地點2","常用2","常用 2","常用4","常用 4"]);
      if(index===2&&legacy1.has(current))next.name="常用 1";
      if(index===3&&legacy2.has(current))next.name="常用 2";
      return next;
    }

    function loadAddresses(){
      try{
        const raw=JSON.parse(localStorage.getItem(SHARED_ADDRESS_KEY)||"null");
        if(Array.isArray(raw)){
          const next=defaults.map((d,i)=>normalizeLegacyRideSavedName(raw[i]||{},i));
          try{localStorage.setItem(SHARED_ADDRESS_KEY,JSON.stringify(next));}catch(e){}
          return next;
        }
      }catch(e){}
      return defaults.map((d,i)=>normalizeLegacyRideSavedName({},i));
    }

    let savedAddresses=loadAddresses();'''
ride, ride_load_count = ride_load_pattern.subn(ride_load_replacement, ride, count=1)
if ride_load_count != 1:
    raise RuntimeError(f'ride.html: loadAddresses patch count {ride_load_count}')

# When a slot name is blank on save, use the slot's official default name.
ride = ride.replace(
    'const id=ids[i],name=$("#"+id+"Name").value.trim()||"常用地點",pickupNote=$("#"+id+"PickupNote").value.trim();',
    'const id=ids[i],name=$("#"+id+"Name").value.trim()||defaults[i]?.name||"常用地址",pickupNote=$("#"+id+"PickupNote").value.trim();',
    1,
)

compact_settings = r'''<div id="settings" class="settings ride-saved-compact" hidden>
        <div class="ride-saved-address-row">
          <div class="saved-setting-name">
            <input id="homeName" class="input ride-saved-name-input" value="住家" aria-label="常用地點名稱">
            <button class="saved-clear-btn" type="button" data-clear-saved="0">清除</button>
          </div>
          <div class="autocomplete"><input id="homeAddress" class="input" autocomplete="off" placeholder="請輸入地址或地標"><div id="homeAddressSuggestions" class="suggestions" hidden></div></div>
          <input id="homePickupNote" class="input ride-saved-note" aria-label="上車位置補充" placeholder="上車位置補充（選填）">
        </div>
        <div class="ride-saved-address-row">
          <div class="saved-setting-name">
            <input id="workName" class="input ride-saved-name-input" value="公司" aria-label="常用地點名稱">
            <button class="saved-clear-btn" type="button" data-clear-saved="1">清除</button>
          </div>
          <div class="autocomplete"><input id="workAddress" class="input" autocomplete="off" placeholder="請輸入地址或地標"><div id="workAddressSuggestions" class="suggestions" hidden></div></div>
          <input id="workPickupNote" class="input ride-saved-note" aria-label="上車位置補充" placeholder="上車位置補充（選填）">
        </div>
        <div class="ride-saved-address-row">
          <div class="saved-setting-name">
            <input id="fav1Name" class="input ride-saved-name-input" value="常用 1" aria-label="常用地點名稱">
            <button class="saved-clear-btn" type="button" data-clear-saved="2">清除</button>
          </div>
          <div class="autocomplete"><input id="fav1Address" class="input" autocomplete="off" placeholder="請輸入地址或地標"><div id="fav1AddressSuggestions" class="suggestions" hidden></div></div>
          <input id="fav1PickupNote" class="input ride-saved-note" aria-label="上車位置補充" placeholder="上車位置補充（選填）">
        </div>
        <div class="ride-saved-address-row">
          <div class="saved-setting-name">
            <input id="fav2Name" class="input ride-saved-name-input" value="常用 2" aria-label="常用地點名稱">
            <button class="saved-clear-btn" type="button" data-clear-saved="3">清除</button>
          </div>
          <div class="autocomplete"><input id="fav2Address" class="input" autocomplete="off" placeholder="請輸入地址或地標"><div id="fav2AddressSuggestions" class="suggestions" hidden></div></div>
          <input id="fav2PickupNote" class="input ride-saved-note" aria-label="上車位置補充" placeholder="上車位置補充（選填）">
        </div>
        <button id="saveAddresses" class="primary ride-saved-save" type="button">儲存常用地址</button>
      </div>'''
settings_pattern = re.compile(
    r'<div id="settings" class="settings(?: ride-saved-compact)?" hidden>.*?<button id="saveAddresses" class="primary(?: ride-saved-save)?" type="button">儲存常用地址</button>\s*</div>',
    re.S,
)
ride, settings_count = settings_pattern.subn(compact_settings, ride, count=1)
if settings_count != 1:
    raise RuntimeError(f'ride.html: settings block replacement count {settings_count}')

compact_css = r'''<style id="topTaxiRideSavedAddressCompactV1">
#settings.ride-saved-compact{
  margin-top:10px;
  padding:12px;
  border:1px solid var(--line);
  border-radius:14px;
  background:#fafafa;
  display:grid;
  gap:10px;
}
#settings.ride-saved-compact[hidden]{display:none!important;}
.ride-saved-address-row{
  display:grid;
  grid-template-columns:92px minmax(0,1fr);
  gap:8px;
}
.ride-saved-address-row .saved-setting-name{
  display:flex;
  align-items:center;
  gap:7px;
  min-width:0;
}
.ride-saved-address-row .saved-setting-name input{
  min-width:0;
  flex:1;
}
.ride-saved-address-row .input{
  min-height:42px;
  padding:0 10px;
  border-radius:12px;
  font-size:13px;
}
.ride-saved-name-input{
  text-align:center;
  font-weight:800;
}
.ride-saved-address-row .saved-clear-btn{
  flex:0 0 auto;
  padding:3px 2px;
}
.ride-saved-note{
  grid-column:2;
}
.ride-saved-save{
  margin-top:2px;
  min-height:44px;
}
.top-taxi-ride-saved-address-hint{
  margin:4px 2px 0;
  color:#9b9ba1;
  font-size:11px;
  line-height:1.45;
}
@media(max-width:390px){
  .ride-saved-address-row{grid-template-columns:82px minmax(0,1fr);}
}
</style>
<script id="topTaxiRideSavedAddressCompactScriptV1">
(function(){
  function boot(){
    const line=document.querySelector('.saved-place-line');
    if(line&&!document.querySelector('.top-taxi-ride-saved-address-hint')){
      const hint=document.createElement('div');
      hint.className='top-taxi-ride-saved-address-hint';
      hint.textContent='儲存常用地址，下次可一鍵帶入';
      line.insertAdjacentElement('afterend',hint);
    }
    const label=document.querySelector('#toggleSettings > span');
    if(label)label.textContent='常用地址';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>'''

# Avoid duplicate compact blocks if rerun.
ride = re.sub(r'\s*<style id="topTaxiRideSavedAddressCompactV1">.*?</script>\s*', '\n', ride, flags=re.S)
if '</body>' not in ride:
    raise RuntimeError('ride.html: missing </body>')
ride = ride.replace('</body>', compact_css + '\n</body>', 1)
RIDE.write_text(ride, encoding='utf-8')


# ------------------------------
# Guard rails
# ------------------------------
index_final = INDEX.read_text(encoding='utf-8')
ride_final = RIDE.read_text(encoding='utf-8')

if 'topTaxiProgressiveStopGateV1' not in index_final or 'topTaxiProgressiveStopGateV1' not in ride_final:
    raise RuntimeError('previously PASS progressive stop gate is missing')
if index_final.count('normalizeLegacySharedAddressName') < 2:
    raise RuntimeError('index legacy-name normalizer missing')
if ride_final.count('topTaxiRideSavedAddressCompactV1') != 1:
    raise RuntimeError('ride compact style marker invalid')
if ride_final.count('topTaxiRideSavedAddressCompactScriptV1') != 1:
    raise RuntimeError('ride compact script marker invalid')
for expected in ['id="homeName"','id="workName"','id="fav1Name"','id="fav2Name"','id="homeAddress"','id="workAddress"','id="fav1Address"','id="fav2Address"','id="saveAddresses"']:
    if ride_final.count(expected) != 1:
        raise RuntimeError(f'ride required ID invalid: {expected} count={ride_final.count(expected)}')
if '常用 1' not in index_final or '常用 2' not in index_final:
    raise RuntimeError('index slot 3/4 labels missing')
if '常用 1' not in ride_final or '常用 2' not in ride_final:
    raise RuntimeError('ride slot 3/4 labels missing')

print('Saved-address layout unified: booking standard preserved, ride compact layout applied.')
