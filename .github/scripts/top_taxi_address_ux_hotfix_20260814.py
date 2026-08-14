from pathlib import Path
import re


def read(name):
    return Path(name).read_text(encoding="utf-8")


def write(name, text):
    Path(name).write_text(text, encoding="utf-8")


def insert_before(text, needle, snippet, marker):
    if marker in text:
        return text
    if needle not in text:
        raise RuntimeError(f"missing insertion point {needle!r}")
    return text.replace(needle, snippet + "\n" + needle, 1)


# Booking: two result renderers currently select on pointerdown.
index = read("index.html")
booking_pattern = re.compile(
    r'''row\.addEventListener\("pointerdown", function \(event\) \{\s*'''
    r'''event\.preventDefault\(\);\s*'''
    r'''event\.stopPropagation\(\);\s*'''
    r'''armBookingAddressSelectionGuard\(\);\s*'''
    r'''choosePrediction\(prediction\);\s*'''
    r'''\}\);\s*'''
    r'''row\.addEventListener\("click", function \(event\) \{\s*'''
    r'''event\.preventDefault\(\);\s*'''
    r'''event\.stopPropagation\(\);\s*'''
    r'''\}\);''',
    re.S,
)
booking_replacement = '''let pointerStartX = 0;
                    let pointerStartY = 0;
                    let pointerMoved = false;

                    row.addEventListener("pointerdown", function (event) {
                        pointerStartX = event.clientX;
                        pointerStartY = event.clientY;
                        pointerMoved = false;
                    }, { passive: true });

                    row.addEventListener("pointermove", function (event) {
                        if (
                            Math.abs(event.clientX - pointerStartX) > 8 ||
                            Math.abs(event.clientY - pointerStartY) > 8
                        ) {
                            pointerMoved = true;
                        }
                    }, { passive: true });

                    row.addEventListener("pointercancel", function () {
                        pointerMoved = true;
                    }, { passive: true });

                    row.addEventListener("pointerup", function (event) {
                        if (pointerMoved) return;
                        event.preventDefault();
                        event.stopPropagation();
                        armBookingAddressSelectionGuard();
                        choosePrediction(prediction);
                    });

                    row.addEventListener("click", function (event) {
                        event.preventDefault();
                        if (event.detail === 0) {
                            armBookingAddressSelectionGuard();
                            choosePrediction(prediction);
                        }
                    });'''
index, booking_count = booking_pattern.subn(booking_replacement, index)
if booking_count != 2:
    raise RuntimeError(f"booking touch replacements: expected 2, got {booking_count}")

booking_css = '''<style id="topTaxiBookingAddressTouchUXV1">
.address-suggestions{
  max-height:min(300px,44vh)!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  overscroll-behavior-y:contain;
  touch-action:pan-y;
  scrollbar-width:thin;
  scrollbar-color:rgba(120,120,126,.34) transparent;
  -webkit-overflow-scrolling:touch;
}
.address-suggestions::-webkit-scrollbar{width:3px}
.address-suggestions::-webkit-scrollbar-track{background:transparent}
.address-suggestions::-webkit-scrollbar-thumb{border-radius:999px;background:rgba(120,120,126,.34)}
.address-suggestion{
  min-height:64px;
  align-items:center;
  padding:13px 14px;
  text-align:left!important;
  touch-action:pan-y;
  -webkit-tap-highlight-color:transparent;
}
</style>'''
index = insert_before(index, "</head>", booking_css, "topTaxiBookingAddressTouchUXV1")
write("index.html", index)


# Fare: one result renderer has the same pointerdown bug.
fare = read("fare.html")
fare_pattern = re.compile(
    r'''button\.addEventListener\(\s*"pointerdown",\s*\(event\) => \{\s*'''
    r'''event\.preventDefault\(\);\s*'''
    r'''event\.stopPropagation\(\);\s*'''
    r'''armFareAddressSelectionGuard\(\);\s*'''
    r'''choosePrediction\(\s*prediction\s*\);\s*'''
    r'''\}\s*\);''',
    re.S,
)
fare_replacement = '''let pointerStartX = 0;
                            let pointerStartY = 0;
                            let pointerMoved = false;

                            button.addEventListener("pointerdown", (event) => {
                                pointerStartX = event.clientX;
                                pointerStartY = event.clientY;
                                pointerMoved = false;
                            }, { passive: true });

                            button.addEventListener("pointermove", (event) => {
                                if (
                                    Math.abs(event.clientX - pointerStartX) > 8 ||
                                    Math.abs(event.clientY - pointerStartY) > 8
                                ) {
                                    pointerMoved = true;
                                }
                            }, { passive: true });

                            button.addEventListener("pointercancel", () => {
                                pointerMoved = true;
                            }, { passive: true });

                            button.addEventListener("pointerup", (event) => {
                                if (pointerMoved) return;
                                event.preventDefault();
                                event.stopPropagation();
                                armFareAddressSelectionGuard();
                                choosePrediction(prediction);
                            });

                            button.addEventListener("click", (event) => {
                                event.preventDefault();
                                if (event.detail === 0) {
                                    armFareAddressSelectionGuard();
                                    choosePrediction(prediction);
                                }
                            });'''
fare, fare_count = fare_pattern.subn(fare_replacement, fare)
if fare_count != 1:
    raise RuntimeError(f"fare touch replacements: expected 1, got {fare_count}")

fare_css = '''<style id="topTaxiFareAddressTouchUXV1">
.address-suggestions{
  max-height:min(300px,44vh)!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  overscroll-behavior-y:contain;
  touch-action:pan-y;
  scrollbar-width:thin;
  scrollbar-color:rgba(120,120,126,.34) transparent;
  -webkit-overflow-scrolling:touch;
}
.address-suggestions::-webkit-scrollbar{width:3px}
.address-suggestions::-webkit-scrollbar-track{background:transparent}
.address-suggestions::-webkit-scrollbar-thumb{border-radius:999px;background:rgba(120,120,126,.34)}
.address-suggestion{
  min-height:64px;
  align-items:center;
  padding:13px 14px;
  text-align:left!important;
  touch-action:pan-y;
  -webkit-tap-highlight-color:transparent;
}
</style>'''
fare = insert_before(fare, "</head>", fare_css, "topTaxiFareAddressTouchUXV1")
write("fare.html", fare)


# Ride already passes touch testing. Add only the location marker.
ride = read("ride.html")
ride_css = '''<style id="topTaxiRideSuggestionPinV1">
button.suggestion{
  grid-template-columns:32px minmax(0,1fr)!important;
  column-gap:10px!important;
  text-align:left!important;
}
button.suggestion::before{
  content:"📍";
  grid-column:1;
  grid-row:1 / span 2;
  align-self:center;
  width:32px;
  height:32px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:#f0f0f2;
  font-size:16px;
}
button.suggestion strong{grid-column:2;grid-row:1;min-width:0}
button.suggestion small{grid-column:2;grid-row:2;min-width:0}
</style>'''
ride = insert_before(ride, "</head>", ride_css, "topTaxiRideSuggestionPinV1")
write("ride.html", ride)


# Errand's live address controls are textareas, so its input-only clear helper misses them.
errand = read("errand.html")
errand_patch = '''<style id="topTaxiErrandAddressClearV1">
.top-taxi-address-plain-input{padding-right:46px!important}
.top-taxi-errand-address-clear{
  position:absolute;
  top:9px;
  right:8px;
  z-index:5200;
  width:32px;
  height:32px;
  min-height:32px;
  padding:0;
  border:0;
  border-radius:50%;
  background:transparent;
  color:#85858b;
  font:inherit;
  font-size:20px;
  line-height:1;
  cursor:pointer;
  touch-action:manipulation;
}
.top-taxi-errand-address-clear[hidden]{display:none!important}
</style>
<script id="topTaxiErrandAddressClearScriptV1">
(function(){
  function ensure(control){
    if(!control||control.dataset.errandClearReady==='1')return;
    const input=control.querySelector('.top-taxi-address-plain-input');
    if(!input)return;
    control.dataset.errandClearReady='1';
    const clear=document.createElement('button');
    clear.type='button';
    clear.className='top-taxi-errand-address-clear';
    clear.textContent='×';
    clear.setAttribute('aria-label','清除地址');
    const panel=control.querySelector('.address-suggestions');
    if(panel)control.insertBefore(clear,panel);else control.appendChild(clear);
    const sync=function(){clear.hidden=!input.value.trim();};
    clear.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      sync();
      input.focus();
    });
    input.addEventListener('input',sync);
    input.addEventListener('change',sync);
    input.addEventListener('focus',sync);
    sync();
  }
  function scan(){
    document.querySelectorAll('.top-taxi-address-plain-control').forEach(ensure);
  }
  const observer=new MutationObserver(function(){requestAnimationFrame(scan);});
  function boot(){
    scan();
    observer.observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>'''
errand = insert_before(errand, "</body>", errand_patch, "topTaxiErrandAddressClearV1")
write("errand.html", errand)


checks = {
    "index.html": "topTaxiBookingAddressTouchUXV1",
    "fare.html": "topTaxiFareAddressTouchUXV1",
    "ride.html": "topTaxiRideSuggestionPinV1",
    "errand.html": "topTaxiErrandAddressClearV1",
}
for name, marker in checks.items():
    text = read(name)
    if text.count(marker) != 1:
        raise RuntimeError(f"{name}: marker {marker} count is {text.count(marker)}")

print("Address UX hotfix prepared successfully.")
