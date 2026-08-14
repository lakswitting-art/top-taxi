from pathlib import Path

MARKER = "topTaxiSavedAddressSlotNumbersV1"
STYLE = r'''
<style id="topTaxiSavedAddressSlotNumbersV1">
.saved-slot-number{
  flex:0 0 auto;
  display:inline-grid;
  place-items:center;
  width:28px;
  height:32px;
  color:#35353a;
  font-size:22px;
  font-weight:850;
  line-height:1;
  user-select:none;
  -webkit-user-select:none;
}
#settings.ride-saved-compact .saved-setting-name,
#bookingSavedAddressEditor .saved-setting-name{
  justify-content:space-between;
}
</style>
'''


def require(text, token, filename):
    if token not in text:
        raise SystemExit(f"{filename}: required token missing: {token}")


def inject_style(text, filename):
    if MARKER in text:
        raise SystemExit(f"{filename}: slot-number patch already exists")
    require(text, "</head>", filename)
    return text.replace("</head>", STYLE + "\n</head>", 1)


# ---------- ride.html ----------
p = Path("ride.html")
ride = p.read_text(encoding="utf-8")

ride_replacements = {
    '<input id="homeName" class="input ride-saved-name-input" value="住家" aria-label="常用地點名稱">':
        '<span class="saved-slot-number" aria-hidden="true">①</span><input id="homeName" type="hidden" value="住家" aria-label="常用地點名稱">',
    '<input id="workName" class="input ride-saved-name-input" value="公司" aria-label="常用地點名稱">':
        '<span class="saved-slot-number" aria-hidden="true">②</span><input id="workName" type="hidden" value="公司" aria-label="常用地點名稱">',
    '<input id="fav1Name" class="input ride-saved-name-input" value="常用 1" aria-label="常用地點名稱">':
        '<span class="saved-slot-number" aria-hidden="true">③</span><input id="fav1Name" type="hidden" value="常用 1" aria-label="常用地點名稱">',
    '<input id="fav2Name" class="input ride-saved-name-input" value="常用 2" aria-label="常用地點名稱">':
        '<span class="saved-slot-number" aria-hidden="true">④</span><input id="fav2Name" type="hidden" value="常用 2" aria-label="常用地點名稱">',
}
for old, new in ride_replacements.items():
    require(ride, old, "ride.html")
    ride = ride.replace(old, new, 1)

old_toggle = '$("#toggleSettings").onclick=()=>{$("#settings").hidden=!$("#settings").hidden};'
new_toggle = '''$("#toggleSettings").onclick=()=>{\n      const panel=$("#settings");\n      panel.hidden=!panel.hidden;\n      const label=document.querySelector("#toggleSettings > span");\n      if(label)label.textContent=panel.hidden?"常用地址":"收合";\n    };'''
require(ride, old_toggle, "ride.html")
ride = ride.replace(old_toggle, new_toggle, 1)
ride = inject_style(ride, "ride.html")
p.write_text(ride, encoding="utf-8")


# ---------- index.html ----------
p = Path("index.html")
booking = p.read_text(encoding="utf-8")

# Initial closed label must be 常用地址.
require(booking, '<span id="savedSettingsLabel">設定</span>', "index.html")
booking = booking.replace('<span id="savedSettingsLabel">設定</span>', '<span id="savedSettingsLabel">常用地址</span>', 1)

# Saving/closing must return to 常用地址, not 設定.
require(booking, 'if (label) label.textContent = "設定";', "index.html")
booking = booking.replace('if (label) label.textContent = "設定";', 'if (label) label.textContent = "常用地址";', 1)

require(booking, 'savedSettingsLabel.textContent = savedEditor.hidden ? "設定" : "收合";', "index.html")
booking = booking.replace(
    'savedSettingsLabel.textContent = savedEditor.hidden ? "設定" : "收合";',
    'savedSettingsLabel.textContent = savedEditor.hidden ? "常用地址" : "收合";',
    1,
)

# Editor left column becomes fixed slot numbers; keep hidden name fields so existing/custom names persist.
old_name_line = "                '<input type=\"text\" id=\"sharedName'+index+'\" aria-label=\"常用地點名稱\" value=\"'+escapeHtml(item.name || \"\")+'\">' +"
new_name_lines = "                '<span class=\"saved-slot-number\" aria-hidden=\"true\">'+['①','②','③','④'][index]+'</span>' +\n                '<input type=\"hidden\" id=\"sharedName'+index+'\" value=\"'+escapeHtml(item.name || \"\")+'\">' +"
require(booking, old_name_line, "index.html")
booking = booking.replace(old_name_line, new_name_lines, 1)
booking = inject_style(booking, "index.html")
p.write_text(booking, encoding="utf-8")


# ---------- validation ----------
ride = Path("ride.html").read_text(encoding="utf-8")
booking = Path("index.html").read_text(encoding="utf-8")

assert ride.count(MARKER) == 1
assert booking.count(MARKER) == 1
for glyph in ['①','②','③','④']:
    assert glyph in ride, glyph
    assert glyph in booking, glyph
assert 'panel.hidden?"常用地址":"收合"' in ride
assert '<span id="savedSettingsLabel">常用地址</span>' in booking
assert 'savedEditor.hidden ? "常用地址" : "收合"' in booking
assert 'if (label) label.textContent = "常用地址";' in booking
assert 'type="hidden" id="sharedName' in booking
assert 'id="homeName" type="hidden"' in ride

print("Final saved-address polish applied to ride.html + index.html only")
