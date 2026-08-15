from pathlib import Path

# 1) ride.html: after a fully successful LINE + backend send, return to LINE chat.
p = Path('ride.html')
s = p.read_text(encoding='utf-8')
old = '''        if(backendSyncOk){
          rideSendState="success";
          showRideSendResult("success");
        }else{'''
new = '''        if(backendSyncOk){
          rideSendState="success";
          showRideSendResult("success");
          window.setTimeout(function(){
            try{
              if(window.liff && liff.isInClient()) liff.closeWindow();
            }catch(closeError){
              console.warn("RIDE LIFF CLOSE FAILED:",closeError);
            }
          },650);
        }else{'''
if old not in s:
    raise SystemExit('ride success target missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 2) index.html: prevent iOS/LIFF address interaction from shifting the whole document horizontally.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
needle = '''html {
    background: var(--black);
}'''
replacement = '''html {
    background: var(--black);
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    overscroll-behavior-x: none;
}

body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    overscroll-behavior-x: none;
}'''
if needle not in s:
    raise SystemExit('index html reset target missing')
s = s.replace(needle, replacement, 1)

# Existing body rule remains below; duplicate selector is intentional and only adds width/overflow safety.
marker = '''/* =========================================
   HERO
========================================= */'''
extra = '''/* Mobile LIFF horizontal-shift guard for address/autocomplete UI. */
.page,
.booking-card,
.autocomplete,
.address-autocomplete,
.address-suggestions,
.suggestions {
    max-width: 100%;
}

'''
if marker not in s:
    raise SystemExit('index hero marker missing')
s = s.replace(marker, extra + marker, 1)
p.write_text(s, encoding='utf-8')

print('ride return + booking horizontal lock patch OK')
