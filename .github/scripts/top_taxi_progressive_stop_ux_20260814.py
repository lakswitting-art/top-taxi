from pathlib import Path

FILES = ["ride.html", "index.html", "fare.html", "errand.html"]


def read(name):
    return Path(name).read_text(encoding="utf-8")


def write(name, text):
    Path(name).write_text(text, encoding="utf-8")


def insert_before(text, needle, snippet, marker):
    if marker in text:
        return text
    if needle not in text:
        raise RuntimeError(f"{marker}: missing insertion point {needle!r}")
    return text.replace(needle, snippet + "\n" + needle, 1)


COMMON_GATE = r'''<style id="topTaxiProgressiveStopGateV1">
.top-taxi-first-address-locked{display:none!important;}
</style>
<script id="topTaxiProgressiveStopGateScriptV1">
(function(){
  let currentAnchor=null;
  let firstAddressValid=false;

  function isVisible(el){
    if(!el||el.hidden)return false;
    const s=getComputedStyle(el);
    if(s.display==='none'||s.visibility==='hidden')return false;
    return !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
  }

  function addButtons(){
    return Array.from(document.querySelectorAll('button')).filter(function(btn){
      return (btn.textContent||'').replace(/\s+/g,'').includes('新增停靠點');
    });
  }

  function addressFields(){
    const selectors=[
      '.address-input',
      '.top-taxi-address-plain-input',
      '.autocomplete input',
      '.address-autocomplete input'
    ].join(',');
    return Array.from(document.querySelectorAll(selectors)).filter(function(el){
      if(el.closest('.saved-address-editor,.errand-saved-editor'))return false;
      return isVisible(el);
    });
  }

  function anchorFor(btn){
    const fields=addressFields();
    const before=fields.filter(function(el){
      return !!(el.compareDocumentPosition(btn)&Node.DOCUMENT_POSITION_FOLLOWING);
    });
    if(before.length)return before[before.length-1];
    const after=fields.filter(function(el){
      return !!(btn.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING);
    });
    return after[0]||fields[0]||null;
  }

  function refreshAnchor(){
    const btn=addButtons()[0]||null;
    const next=btn?anchorFor(btn):null;
    if(next!==currentAnchor){
      currentAnchor=next;
      firstAddressValid=false;
    }
  }

  function render(){
    refreshAnchor();
    addButtons().forEach(function(btn){
      btn.classList.toggle('top-taxi-first-address-locked',!firstAddressValid);
    });
  }

  function markValidIfAnchor(input){
    refreshAnchor();
    if(!currentAnchor||input!==currentAnchor)return;
    firstAddressValid=!!currentAnchor.value.trim();
    render();
  }

  document.addEventListener('input',function(e){
    refreshAnchor();
    if(currentAnchor&&e.target===currentAnchor){
      firstAddressValid=false;
      render();
    }
  },true);

  document.addEventListener('pointerup',function(e){
    const suggestion=e.target.closest?.('.address-suggestion,.suggestion');
    if(!suggestion)return;
    const box=suggestion.closest('.address-autocomplete,.autocomplete,.top-taxi-address-plain-control');
    const input=box?.querySelector('.address-input,.top-taxi-address-plain-input,input,textarea')||null;
    setTimeout(function(){markValidIfAnchor(input);},120);
  },true);

  document.addEventListener('click',function(e){
    const target=e.target.closest?.('.saved-address-chip,.location-inline-btn,.address-clear-btn,.top-taxi-address-clear,.top-taxi-errand-address-clear,button');
    if(!target)return;
    const label=(target.textContent||'').replace(/\s+/g,'');
    const isShortcut=target.matches('.saved-address-chip,.location-inline-btn')||label.includes('使用目前位置');
    const isClear=target.matches('.address-clear-btn,.top-taxi-address-clear,.top-taxi-errand-address-clear');
    if(isShortcut){
      setTimeout(function(){
        refreshAnchor();
        if(currentAnchor&&currentAnchor.value.trim()){
          firstAddressValid=true;
          render();
        }
      },500);
    }
    if(isClear){
      setTimeout(function(){
        refreshAnchor();
        if(!currentAnchor||!currentAnchor.value.trim())firstAddressValid=false;
        render();
      },80);
    }
  },true);

  const observer=new MutationObserver(function(){requestAnimationFrame(render);});

  function boot(){
    render();
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>'''

SAVED_ADDRESS_COPY = r'''<style id="topTaxiSavedAddressCopyV1">
.top-taxi-saved-address-hint{
  margin:4px 2px 0;
  color:#9b9ba1;
  font-size:11px;
  line-height:1.45;
}
</style>
<script id="topTaxiSavedAddressCopyScriptV1">
(function(){
  function replaceText(root){
    if(!root)return false;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode;
      if((node.nodeValue||'').includes('設定')){
        node.nodeValue=node.nodeValue.replace('設定','常用地址');
        return true;
      }
    }
    return false;
  }

  function boot(){
    const btn=document.querySelector('.saved-address-edit.compact,.saved-address-edit');
    if(!btn)return;
    replaceText(btn);
    const line=btn.closest('.booking-saved-place-line')||btn.parentElement;
    if(line&&!document.querySelector('.top-taxi-saved-address-hint')){
      const hint=document.createElement('div');
      hint.className='top-taxi-saved-address-hint';
      hint.textContent='儲存常用地址，下次可一鍵帶入';
      line.insertAdjacentElement('afterend',hint);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>'''

for name in FILES:
    text=read(name)
    if '新增停靠點' not in text:
        raise RuntimeError(f"{name}: expected stop button text not found")
    text=insert_before(text,'</body>',COMMON_GATE,'topTaxiProgressiveStopGateV1')
    if name in ('ride.html','index.html'):
        if 'saved-address-edit' not in text:
            raise RuntimeError(f"{name}: saved-address-edit not found")
        text=insert_before(text,'</body>',SAVED_ADDRESS_COPY,'topTaxiSavedAddressCopyV1')
    write(name,text)

for name in FILES:
    text=read(name)
    if text.count('topTaxiProgressiveStopGateV1')!=1:
        raise RuntimeError(f"{name}: progressive stop marker count invalid")
    if name in ('ride.html','index.html') and text.count('topTaxiSavedAddressCopyV1')!=1:
        raise RuntimeError(f"{name}: saved address marker count invalid")
    if name in ('fare.html','errand.html') and 'topTaxiSavedAddressCopyV1' in text:
        raise RuntimeError(f"{name}: saved address copy leaked into excluded page")

print('Progressive stop UX patch prepared successfully.')
