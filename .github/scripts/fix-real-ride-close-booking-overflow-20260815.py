from pathlib import Path

# --- ride.html: use the existing tested return function, but trigger immediately after success
p=Path('ride.html')
s=p.read_text(encoding='utf-8')
old='''        if(backendSyncOk){\n          rideSendState="success";\n          showRideSendResult("success");\n        }else{'''
new='''        if(backendSyncOk){\n          rideSendState="success";\n          showRideSendResult("success");\n          // iOS LINE LIFF: do not rely only on the delayed timer.\n          // Trigger the already-existing return path immediately after the successful send/sync chain.\n          setTimeout(rideReturnToLineChat, 80);\n        }else{'''
if old not in s:
    raise SystemExit('ride success marker missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# --- index.html: lock horizontal movement only while an address field is focused,
# and normalize Google autocomplete popup width to the visual viewport.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='topTaxiBookingAddressHorizontalGuardV2'
if marker not in s:
    code=r'''
<style id="topTaxiBookingAddressHorizontalGuardV2">
html.top-taxi-address-focus-lock,
html.top-taxi-address-focus-lock body{
  overflow-x:hidden!important;
  max-width:100%!important;
  width:100%!important;
  overscroll-behavior-x:none!important;
}
html.top-taxi-address-focus-lock body{
  position:relative!important;
  left:0!important;
  right:0!important;
}
html.top-taxi-address-focus-lock .page,
html.top-taxi-address-focus-lock .booking-card,
html.top-taxi-address-focus-lock .autocomplete,
html.top-taxi-address-focus-lock .address-autocomplete,
html.top-taxi-address-focus-lock input{
  max-width:100%!important;
  min-width:0!important;
}
.pac-container{
  max-width:calc(100vw - 28px)!important;
  box-sizing:border-box!important;
}
</style>
<script id="topTaxiBookingAddressHorizontalGuardV2Script">
(function(){
  const html=document.documentElement;
  const addressSelector='input[id*="pickup"],input[id*="dropoff"],input[id*="waypoint"],.autocomplete input,.address-autocomplete input';
  let locking=false;
  let raf=0;

  function isAddressInput(el){
    return !!(el && el.matches && el.matches(addressSelector));
  }
  function resetX(){
    if(!locking) return;
    const y=window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0;
    if(window.scrollX!==0) window.scrollTo(0,y);
    if(document.documentElement.scrollLeft) document.documentElement.scrollLeft=0;
    if(document.body && document.body.scrollLeft) document.body.scrollLeft=0;
  }
  function scheduleReset(){
    if(raf) cancelAnimationFrame(raf);
    raf=requestAnimationFrame(resetX);
  }
  function fitPac(){
    const vv=window.visualViewport;
    const vw=Math.max(280, Math.floor(vv ? vv.width : window.innerWidth));
    document.querySelectorAll('.pac-container').forEach(function(el){
      el.style.maxWidth=Math.max(240,vw-28)+'px';
      el.style.width=Math.max(240,vw-28)+'px';
      el.style.left='14px';
      el.style.right='auto';
      el.style.boxSizing='border-box';
    });
  }
  function enable(){
    locking=true;
    html.classList.add('top-taxi-address-focus-lock');
    resetX();
    fitPac();
  }
  function disable(){
    locking=false;
    html.classList.remove('top-taxi-address-focus-lock');
  }

  document.addEventListener('focusin',function(e){
    if(isAddressInput(e.target)){
      enable();
      setTimeout(function(){ resetX(); fitPac(); },50);
      setTimeout(function(){ resetX(); fitPac(); },300);
    }
  },true);
  document.addEventListener('focusout',function(e){
    if(isAddressInput(e.target)) setTimeout(function(){
      if(!isAddressInput(document.activeElement)) disable();
    },80);
  },true);
  window.addEventListener('scroll',scheduleReset,{passive:true});
  window.addEventListener('resize',function(){ if(locking){resetX();fitPac();} },{passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',function(){ if(locking){resetX();fitPac();} },{passive:true});
    visualViewport.addEventListener('scroll',function(){ if(locking){resetX();fitPac();} },{passive:true});
  }
  new MutationObserver(function(){ if(locking) fitPac(); }).observe(document.body,{childList:true,subtree:true});
})();
</script>
'''
    idx=s.rfind('</body>')
    if idx<0: raise SystemExit('index body marker missing')
    s=s[:idx]+code+s[idx:]
p.write_text(s,encoding='utf-8')

print('root-cause patch applied')
