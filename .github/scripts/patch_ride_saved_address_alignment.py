from pathlib import Path


def require(text, token, filename):
    if token not in text:
        raise SystemExit(f"{filename}: required token missing: {token}")


def soften_name_style(text, filename):
    old = """  font-size:15px !important;\n  font-weight:850 !important;"""
    new = """  font-size:14px !important;\n  font-weight:600 !important;"""
    require(text, old, filename)
    return text.replace(old, new, 1)


# ==================== ride.html ====================
ride_path = Path("ride.html")
ride = ride_path.read_text(encoding="utf-8")

# 1) The saved-address editor must sit under pickup/current-location/shortcut row,
#    matching booking.html's visual order.
settings_start_marker = '      <div id="settings" class="settings ride-saved-compact" hidden>'
pickup_marker = '      <div class="field"><label class="label" for="pickup">'
saved_line_marker = '      <div class="field saved-place-field">'
pickup_note_marker = '      <div class="pickup-note-compact">'

for token in [settings_start_marker, pickup_marker, saved_line_marker, pickup_note_marker]:
    require(ride, token, "ride.html")

settings_start = ride.index(settings_start_marker)
pickup_pos = ride.index(pickup_marker, settings_start)
settings_block = ride[settings_start:pickup_pos]
if 'id="saveAddresses"' not in settings_block:
    raise SystemExit("ride.html: could not isolate saved-address settings block")

ride = ride[:settings_start] + ride[pickup_pos:]
insert_pos = ride.index(pickup_note_marker)
if ride.index(saved_line_marker) > insert_pos:
    raise SystemExit("ride.html: saved shortcut row is not before pickup-note insertion point")
ride = ride[:insert_pos] + settings_block + ride[insert_pos:]

# 2) Saved-address shortcut is a valid pickup source, just like booking chips/current location.
old_shortcut = "const isShortcut=target.matches('.saved-address-chip,.location-inline-btn')||label.includes('使用目前位置');"
new_shortcut = "const isShortcut=target.matches('.saved-address-chip,.location-inline-btn,#savedChips .chip')||label.includes('使用目前位置');"
require(ride, old_shortcut, "ride.html")
ride = ride.replace(old_shortcut, new_shortcut, 1)

# 3) Saved slot/name field should look like the original calm form typography, not a bold title.
ride = soften_name_style(ride, "ride.html")
ride_path.write_text(ride, encoding="utf-8")


# ==================== index.html ====================
booking_path = Path("index.html")
booking = booking_path.read_text(encoding="utf-8")
booking = soften_name_style(booking, "index.html")
booking_path.write_text(booking, encoding="utf-8")


# ==================== validation ====================
ride = ride_path.read_text(encoding="utf-8")
booking = booking_path.read_text(encoding="utf-8")

# Immediate page order: pickup -> saved shortcuts -> editor -> pickup note/waypoints.
positions = [
    ride.index(pickup_marker),
    ride.index(saved_line_marker),
    ride.index(settings_start_marker),
    ride.index(pickup_note_marker),
]
assert positions == sorted(positions), positions
assert ride.count(settings_start_marker) == 1
assert "#savedChips .chip" in ride
assert "font-size:14px !important;" in ride
assert "font-weight:600 !important;" in ride
assert "font-size:14px !important;" in booking
assert "font-weight:600 !important;" in booking

# Guard the already-approved pieces.
for token in [
    'panel.hidden?"常用地址":"收合"',
    'topTaxiSavedAddressViewportLockV2',
    'topTaxiProgressiveStopGateScriptV1',
    'id="addRideWaypoint"',
]:
    assert token in ride, token
for token in [
    'savedEditor.hidden ? "常用地址" : "收合"',
    'topTaxiSavedAddressViewportLockV2',
]:
    assert token in booking, token

print("Aligned ride saved-address layout, shortcut validity gate, and saved-name typography; booking logic untouched")
