from pathlib import Path

FILES = ["index.html", "ride.html"]

STYLE_SCRIPT = r'''<style id="topTaxiProgressivePickupDetailV1Style">
/* Main trip: advanced pickup detail and waypoint helper follow the validated pickup gate. */
.top-taxi-first-address-locked{display:none!important;}

/* Saved addresses: keep the editor compact and reveal pickup-note editing only on demand. */
.top-taxi-saved-note-toggle{
  grid-column:2;
  width:100%;
  min-height:36px;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:8px;
  padding:7px 10px;
  border:0;
  border-radius:10px;
  background:transparent;
  color:#8f8f95;
  font:inherit;
  font-size:11.5px;
  font-weight:700;
  line-height:1.35;
  text-align:left;
  cursor:pointer;
}
.top-taxi-saved-note-toggle[hidden]{display:none!important;}
.top-taxi-saved-note-toggle:active{background:#f1f1f3;}
.top-taxi-saved-note-text{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.top-taxi-saved-note-arrow{
  color:#a0a0a6;
  font-size:17px;
  line-height:1;
  transition:transform .16s ease;
}
.top-taxi-saved-note-toggle[aria-expanded="true"] .top-taxi-saved-note-arrow{transform:rotate(90deg);}
.saved-address-note[hidden],.ride-saved-note[hidden]{display:none!important;}
</style>
<script id="topTaxiProgressivePickupDetailV1">
(function(){
  const LOCK='top-taxi-first-address-locked';

  function setupMainTripGate(){
    const addBtn=document.getElementById('addBookingWaypointBtn')||document.getElementById('addRideWaypoint');
    const pickupToggle=document.getElementById('toggleBookingPickupNote')||document.getElementById('togglePickupNote');
    const pickupWrap=pickupToggle?.closest('.pickup-note-compact')||null;
    const help=document.querySelector('.booking-waypoint-help,.waypoint-help');
    if(!addBtn)return;

    function sync(){
      const locked=addBtn.classList.contains(LOCK);
      if(pickupWrap)pickupWrap.classList.toggle(LOCK,locked);
      if(help)help.classList.toggle(LOCK,locked);
    }

    sync();
    new MutationObserver(sync).observe(addBtn,{attributes:true,attributeFilter:['class','hidden']});
    document.addEventListener('input',()=>setTimeout(sync,0),true);
    document.addEventListener('click',()=>setTimeout(sync,550),true);
    document.addEventListener('pointerup',()=>setTimeout(sync,160),true);
  }

  function setupSavedRow(row){
    if(!row||row.dataset.topTaxiSavedNoteReady==='1')return;
    const address=row.querySelector('.autocomplete input:not(.ride-saved-name-input),.address-autocomplete input:not(.saved-address-note)');
    const note=row.querySelector('.saved-address-note,.ride-saved-note');
    if(!address||!note)return;
    row.dataset.topTaxiSavedNoteReady='1';

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='top-taxi-saved-note-toggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span class="top-taxi-saved-note-text"></span><span class="top-taxi-saved-note-arrow">›</span>';
    note.insertAdjacentElement('beforebegin',toggle);
    note.hidden=true;

    const text=toggle.querySelector('.top-taxi-saved-note-text');

    function sync(){
      const hasAddress=!!String(address.value||'').trim();
      const value=String(note.value||'').trim();
      toggle.hidden=!hasAddress;
      text.textContent=value?'上車位置：'+value:'＋ 上車位置補充';
      if(!hasAddress){
        note.hidden=true;
        toggle.setAttribute('aria-expanded','false');
      }
    }

    toggle.addEventListener('click',function(){
      if(toggle.hidden)return;
      const open=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',open?'false':'true');
      note.hidden=open;
      if(!open)setTimeout(()=>note.focus(),0);
    });
    address.addEventListener('input',sync);
    address.addEventListener('change',sync);
    note.addEventListener('input',sync);
    note.addEventListener('change',sync);
    row.addEventListener('click',()=>setTimeout(sync,100),true);
    sync();
  }

  function setupSavedEditor(){
    document.querySelectorAll('.saved-address-row,.ride-saved-address-row').forEach(setupSavedRow);
    const root=document.getElementById('bookingSavedAddressEditor')||document.getElementById('settings')||document.body;
    new MutationObserver(function(){
      document.querySelectorAll('.saved-address-row,.ride-saved-address-row').forEach(setupSavedRow);
    }).observe(root,{childList:true,subtree:true});
  }

  function boot(){
    setupMainTripGate();
    setupSavedEditor();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>'''

for name in FILES:
    p=Path(name)
    text=p.read_text(encoding="utf-8")
    if '<script id="topTaxiProgressivePickupDetailV1">' in text:
        continue
    if 'topTaxiProgressiveStopGateScriptV1' not in text:
        raise RuntimeError(f"{name}: PASS first-address gate missing")
    if '</body>' not in text:
        raise RuntimeError(f"{name}: body close missing")
    text=text.replace('</body>', STYLE_SCRIPT+'\n</body>',1)
    p.write_text(text,encoding="utf-8")

for name in FILES:
    text=Path(name).read_text(encoding="utf-8")
    if text.count('<script id="topTaxiProgressivePickupDetailV1">') != 1:
        raise RuntimeError(f"{name}: progressive detail marker invalid")

if 'booking-waypoint-help' not in Path('index.html').read_text(encoding='utf-8'):
    raise RuntimeError('index.html: booking waypoint helper missing')
if 'waypoint-help' not in Path('ride.html').read_text(encoding='utf-8'):
    raise RuntimeError('ride.html: ride waypoint helper missing')
if 'ride-saved-address-row' not in Path('ride.html').read_text(encoding='utf-8'):
    raise RuntimeError('ride.html: unified saved-address layout missing')

print('Progressive pickup detail prepared for index + ride only.')
