from pathlib import Path
import re

SLOTS = ["①", "②", "③", "④"]

STYLE = r'''
<style id="topTaxiSavedAddressSlotNumbersV2">
.saved-slot-name-input{
  min-width:0;
  width:100%;
  height:32px;
  min-height:32px;
  padding:0 4px !important;
  border:1px solid #e5e5e8 !important;
  border-radius:9px !important;
  background:#fff !important;
  color:#35353a !important;
  font-size:15px !important;
  font-weight:850 !important;
  text-align:center;
  line-height:1;
  box-shadow:none !important;
}
.saved-slot-name-input:focus{
  border-color:var(--red) !important;
  box-shadow:0 0 0 2px rgba(255,31,45,.08) !important;
}
#settings.ride-saved-compact .saved-setting-name,
#bookingSavedAddressEditor .saved-setting-name{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:4px;
  align-items:center;
}
</style>
'''.strip()


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing expected block: {label}")
    return text.replace(old, new, 1)


def replace_style(text, filename):
    pattern = r'<style id="topTaxiSavedAddressSlotNumbersV1">.*?</style>'
    text, count = re.subn(pattern, STYLE, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{filename}: expected one V1 slot style, got {count}")
    return text


def patch_ride():
    p = Path("ride.html")
    text = p.read_text(encoding="utf-8")
    text = replace_style(text, "ride.html")

    text = replace_once(
        text,
        '    const defaults=[emptyAddress("住家"),emptyAddress("公司"),emptyAddress("常用 1"),emptyAddress("常用 2")];',
        '    const RIDE_SAVED_SLOT_NAMES=["①","②","③","④"];\n    const defaults=RIDE_SAVED_SLOT_NAMES.map(name=>emptyAddress(name));',
        "ride defaults"
    )

    old_normalize = '''    function normalizeLegacyRideSavedName(item,index){
      const next=normalizeAddress(item||{},defaults[index]||{});
      const current=String(next.name||"").trim();
      const legacy1=new Set(["","常用","常用:","常用：","常用地點","常用地點 1","常用地點1","常用1","常用 1","常用3","常用 3"]);
      const legacy2=new Set(["","常用","常用:","常用：","常用地點","常用地點 2","常用地點2","常用2","常用 2","常用4","常用 4"]);
      if(index===2&&legacy1.has(current))next.name="常用 1";
      if(index===3&&legacy2.has(current))next.name="常用 2";
      return next;
    }'''
    new_normalize = '''    function normalizeLegacyRideSavedName(item,index){
      const next=normalizeAddress(item||{},defaults[index]||{});
      const current=String(next.name||"").trim();
      const genericByIndex=[
        new Set(["","住家","①"]),
        new Set(["","公司","②"]),
        new Set(["","常用","常用:","常用：","常用地點","常用地點 1","常用地點1","常用1","常用 1","常用3","常用 3","③"]),
        new Set(["","常用","常用:","常用：","常用地點","常用地點 2","常用地點2","常用2","常用 2","常用4","常用 4","④"])
      ];
      if(genericByIndex[index]?.has(current))next.name=RIDE_SAVED_SLOT_NAMES[index];
      return next;
    }'''
    text = replace_once(text, old_normalize, new_normalize, "ride name migration")

    replacements = [
        ('<span class="saved-slot-number" aria-hidden="true">①</span><input id="homeName" type="hidden" value="住家" aria-label="常用地點名稱">',
         '<input id="homeName" class="input ride-saved-name-input saved-slot-name-input" value="①" aria-label="常用地點名稱">'),
        ('<span class="saved-slot-number" aria-hidden="true">②</span><input id="workName" type="hidden" value="公司" aria-label="常用地點名稱">',
         '<input id="workName" class="input ride-saved-name-input saved-slot-name-input" value="②" aria-label="常用地點名稱">'),
        ('<span class="saved-slot-number" aria-hidden="true">③</span><input id="fav1Name" type="hidden" value="常用 1" aria-label="常用地點名稱">',
         '<input id="fav1Name" class="input ride-saved-name-input saved-slot-name-input" value="③" aria-label="常用地點名稱">'),
        ('<span class="saved-slot-number" aria-hidden="true">④</span><input id="fav2Name" type="hidden" value="常用 2" aria-label="常用地點名稱">',
         '<input id="fav2Name" class="input ride-saved-name-input saved-slot-name-input" value="④" aria-label="常用地點名稱">')
    ]
    for old, new in replacements:
        text = replace_once(text, old, new, "ride editable name field")

    text = replace_once(
        text,
        '        const fallbackNames=["住家","公司","常用3","常用4"];\n        b.textContent=(x.name||fallbackNames[i]||("常用"+(i+1))).trim();',
        '        b.textContent=(x.name||RIDE_SAVED_SLOT_NAMES[i]||("常用"+(i+1))).trim();',
        "ride chip fallback"
    )

    text = replace_once(
        text,
        '      const empty=emptyAddress("");\n      savedAddresses[index]=empty;\n      draftAddressData[index]=emptyAddress("");',
        '      const empty=emptyAddress(RIDE_SAVED_SLOT_NAMES[index]||"");\n      savedAddresses[index]=empty;\n      draftAddressData[index]=emptyAddress(RIDE_SAVED_SLOT_NAMES[index]||"");',
        "ride clear reset name"
    )

    text = replace_once(
        text,
        '          const id=ids[i],name=$("#"+id+"Name").value.trim()||defaults[i]?.name||"常用地址",pickupNote=$("#"+id+"PickupNote").value.trim();',
        '          const id=ids[i],name=$("#"+id+"Name").value.trim()||RIDE_SAVED_SLOT_NAMES[i]||"常用地址",pickupNote=$("#"+id+"PickupNote").value.trim();',
        "ride save fallback"
    )

    p.write_text(text, encoding="utf-8")


def patch_booking():
    p = Path("index.html")
    text = p.read_text(encoding="utf-8")
    text = replace_style(text, "index.html")

    old_defaults = '''const SHARED_ADDRESS_DEFAULTS = [
    createEmptyAddressData("住家"),
    createEmptyAddressData("公司"),
    createEmptyAddressData("常用 1"),
    createEmptyAddressData("常用 2")
];'''
    new_defaults = '''const SHARED_ADDRESS_SLOT_NAMES = ["①", "②", "③", "④"];
const SHARED_ADDRESS_DEFAULTS = SHARED_ADDRESS_SLOT_NAMES.map(function(name) {
    return createEmptyAddressData(name);
});'''
    text = replace_once(text, old_defaults, new_defaults, "booking defaults")

    old_normalize = '''function normalizeLegacySharedAddressName(item, index) {
    const next = normalizeAddressData(item || {}, SHARED_ADDRESS_DEFAULTS[index] || {});
    const current = String(next.name || "").trim();
    const legacy1 = new Set(["", "常用", "常用:", "常用：", "常用地點", "常用地點 1", "常用地點1", "常用1", "常用 1", "常用3", "常用 3"]);
    const legacy2 = new Set(["", "常用", "常用:", "常用：", "常用地點", "常用地點 2", "常用地點2", "常用2", "常用 2", "常用4", "常用 4"]);
    if (index === 2 && legacy1.has(current)) next.name = "常用 1";
    if (index === 3 && legacy2.has(current)) next.name = "常用 2";
    return next;
}'''
    new_normalize = '''function normalizeLegacySharedAddressName(item, index) {
    const next = normalizeAddressData(item || {}, SHARED_ADDRESS_DEFAULTS[index] || {});
    const current = String(next.name || "").trim();
    const genericByIndex = [
        new Set(["", "住家", "①"]),
        new Set(["", "公司", "②"]),
        new Set(["", "常用", "常用:", "常用：", "常用地點", "常用地點 1", "常用地點1", "常用1", "常用 1", "常用3", "常用 3", "③"]),
        new Set(["", "常用", "常用:", "常用：", "常用地點", "常用地點 2", "常用地點2", "常用2", "常用 2", "常用4", "常用 4", "④"])
    ];
    if (genericByIndex[index] && genericByIndex[index].has(current)) {
        next.name = SHARED_ADDRESS_SLOT_NAMES[index];
    }
    return next;
}'''
    text = replace_once(text, old_normalize, new_normalize, "booking name migration")

    old_editor = '''            '<div class="saved-setting-name">' +
                '<span class="saved-slot-number" aria-hidden="true">'+['①','②','③','④'][index]+'</span>' +
                '<input type="hidden" id="sharedName'+index+'" value="'+escapeHtml(item.name || "")+'">' +
                '<button type="button" class="saved-clear-btn" onclick="clearSharedAddressFromBooking('+index+')">清除</button>' +'''
    new_editor = '''            '<div class="saved-setting-name">' +
                '<input type="text" class="saved-slot-name-input" id="sharedName'+index+'" aria-label="常用地點名稱" value="'+escapeHtml(item.name || SHARED_ADDRESS_SLOT_NAMES[index] || "")+'">' +
                '<button type="button" class="saved-clear-btn" onclick="clearSharedAddressFromBooking('+index+')">清除</button>' +'''
    text = replace_once(text, old_editor, new_editor, "booking editable name field")

    text = replace_once(
        text,
        '        button.textContent = item.name || ("常用地點 " + (index + 1));',
        '        button.textContent = item.name || SHARED_ADDRESS_SLOT_NAMES[index] || ("常用地點 " + (index + 1));',
        "booking chip fallback"
    )

    text = replace_once(
        text,
        '    sharedAddresses[index] = createEmptyAddressData("");',
        '    sharedAddresses[index] = createEmptyAddressData(SHARED_ADDRESS_SLOT_NAMES[index] || "");',
        "booking clear reset name"
    )

    old_empty = '''            if (!typedAddress) {
                next.push(createEmptyAddressData(""));
                continue;
            }

            const fallbackName = SHARED_ADDRESS_DEFAULTS[index]?.name || ("常用地點 " + (index + 1));
            const name = typedName || oldItem.name || fallbackName;'''
    new_empty = '''            const fallbackName = SHARED_ADDRESS_SLOT_NAMES[index] || SHARED_ADDRESS_DEFAULTS[index]?.name || ("常用地點 " + (index + 1));
            const name = typedName || oldItem.name || fallbackName;

            if (!typedAddress) {
                next.push(createEmptyAddressData(name));
                continue;
            }'''
    text = replace_once(text, old_empty, new_empty, "booking preserve editable name")

    p.write_text(text, encoding="utf-8")


patch_ride()
patch_booking()

for filename in ["ride.html", "index.html"]:
    t = Path(filename).read_text(encoding="utf-8")
    assert "topTaxiSavedAddressSlotNumbersV1" not in t, filename
    assert t.count("topTaxiSavedAddressSlotNumbersV2") == 1, filename
    assert "saved-slot-name-input" in t, filename
    assert 'type="hidden" id="sharedName' not in t, filename

ride = Path("ride.html").read_text(encoding="utf-8")
booking = Path("index.html").read_text(encoding="utf-8")
for slot in SLOTS:
    assert slot in ride
    assert slot in booking
assert 'id="homeName" class="input ride-saved-name-input saved-slot-name-input"' in ride
assert 'class="saved-slot-name-input" id="sharedName' in booking

print("Editable ①②③④ saved-address names enabled in ride.html + index.html only")
