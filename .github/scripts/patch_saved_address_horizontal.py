from pathlib import Path
import re

OLD_MARKER = "topTaxiSavedAddressNoHorizontalDragV1"
NEW_STYLE_MARKER = "topTaxiSavedAddressViewportLockV2"
NEW_SCRIPT_MARKER = "topTaxiSavedAddressViewportLockScriptV2"

RIDE_CSS = r'''
<style id="topTaxiSavedAddressViewportLockV2">
/* iOS/LIFF saved-address fix: avoid sub-16px focus zoom and any document-level horizontal pan. */
html,
body {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overscroll-behavior-x: none;
}
#settings.ride-saved-compact,
#settings.ride-saved-compact .ride-saved-address-row,
#settings.ride-saved-compact .saved-setting-name,
#settings.ride-saved-compact .autocomplete,
#settings.ride-saved-compact .suggestions,
#settings.ride-saved-compact .suggestion,
#settings.ride-saved-compact .suggestion > * {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
#settings.ride-saved-compact {
  overflow-x: hidden;
  overscroll-behavior-x: none;
}
#settings.ride-saved-compact input {
  font-size: 16px !important;
}
#settings.ride-saved-compact .autocomplete {
  width: 100%;
}
#settings.ride-saved-compact .suggestions {
  left: 0;
  right: 0;
  width: auto;
  max-width: 100%;
  overflow-x: hidden;
  touch-action: pan-y;
  overscroll-behavior-x: none;
}
#settings.ride-saved-compact .suggestion {
  overflow: hidden;
}
#settings.ride-saved-compact .suggestion strong,
#settings.ride-saved-compact .suggestion small {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
'''

BOOKING_CSS = r'''
<style id="topTaxiSavedAddressViewportLockV2">
/* iOS/LIFF saved-address fix: avoid sub-16px focus zoom and any document-level horizontal pan. */
html,
body {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overscroll-behavior-x: none;
}
#bookingSavedAddressEditor,
#bookingSavedAddressRows,
#bookingSavedAddressEditor .saved-address-row,
#bookingSavedAddressEditor .saved-setting-name,
#bookingSavedAddressEditor .address-autocomplete,
#bookingSavedAddressEditor .address-suggestions,
#bookingSavedAddressEditor .address-suggestion,
#bookingSavedAddressEditor .address-suggestion > * {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
#bookingSavedAddressEditor {
  overflow-x: hidden;
  overscroll-behavior-x: none;
}
#bookingSavedAddressEditor .saved-address-row {
  grid-template-columns: 92px minmax(0, 1fr);
}
#bookingSavedAddressEditor input {
  font-size: 16px !important;
}
#bookingSavedAddressEditor .address-autocomplete {
  width: 100%;
}
#bookingSavedAddressEditor .address-suggestions {
  left: 0;
  right: 0;
  width: auto;
  max-width: 100%;
  overflow-x: hidden;
  touch-action: pan-y;
  overscroll-behavior-x: none;
}
#bookingSavedAddressEditor .address-suggestion {
  overflow: hidden;
}
#bookingSavedAddressEditor .address-suggestion-main,
#bookingSavedAddressEditor .address-suggestion-secondary {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 390px) {
  #bookingSavedAddressEditor .saved-address-row {
    grid-template-columns: 82px minmax(0, 1fr);
  }
}
</style>
'''

LOCK_SCRIPT = r'''
<script id="topTaxiSavedAddressViewportLockScriptV2">
(function(){
  function clampDocumentX(){
    const scrolling = document.scrollingElement;
    if (scrolling && scrolling.scrollLeft) scrolling.scrollLeft = 0;
    if (document.documentElement && document.documentElement.scrollLeft) document.documentElement.scrollLeft = 0;
    if (document.body && document.body.scrollLeft) document.body.scrollLeft = 0;
  }

  function isSavedAddressField(target){
    if (!target || !target.closest) return false;
    return !!target.closest('#settings.ride-saved-compact, #bookingSavedAddressEditor');
  }

  document.addEventListener('focusin', function(event){
    if (!isSavedAddressField(event.target)) return;
    requestAnimationFrame(clampDocumentX);
    setTimeout(clampDocumentX, 80);
    setTimeout(clampDocumentX, 300);
  }, true);

  document.addEventListener('focusout', function(event){
    if (!isSavedAddressField(event.target)) return;
    requestAnimationFrame(clampDocumentX);
    setTimeout(clampDocumentX, 80);
  }, true);

  window.addEventListener('scroll', clampDocumentX, { passive: true });
})();
</script>
'''


def replace_old_style(text: str, css: str, filename: str) -> str:
    pattern = r'<style id="topTaxiSavedAddressNoHorizontalDragV1">.*?</style>'
    text, count = re.subn(pattern, css.strip(), text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{filename}: expected exactly one V1 style block, got {count}")
    return text


def patch(filename, css, required):
    p = Path(filename)
    text = p.read_text(encoding="utf-8")

    for token in required:
        if token not in text:
            raise SystemExit(f"{filename}: required marker missing: {token}")
    if OLD_MARKER not in text:
        raise SystemExit(f"{filename}: old horizontal-lock marker missing")
    if NEW_STYLE_MARKER in text or NEW_SCRIPT_MARKER in text:
        raise SystemExit(f"{filename}: V2 patch already exists")
    if "</head>" not in text:
        raise SystemExit(f"{filename}: </head> missing")

    text = replace_old_style(text, css, filename)
    text = text.replace("</head>", LOCK_SCRIPT + "\n</head>", 1)
    p.write_text(text, encoding="utf-8")


patch("ride.html", RIDE_CSS, ["ride-saved-compact", "homeAddressSuggestions", "fav2AddressSuggestions"])
patch("index.html", BOOKING_CSS, ["bookingSavedAddressEditor", "bookingSavedAddressRows", "address-suggestions"])

for f in ["ride.html", "index.html"]:
    t = Path(f).read_text(encoding="utf-8")
    assert OLD_MARKER not in t, f
    assert t.count(NEW_STYLE_MARKER) == 1, f
    assert t.count(NEW_SCRIPT_MARKER) == 1, f
    assert "font-size: 16px !important" in t, f
    assert "overflow-x: hidden" in t, f
    assert "touch-action: pan-y" in t, f

print("Patched iOS saved-address viewport behavior in ride.html + index.html only; fare/errand untouched")
