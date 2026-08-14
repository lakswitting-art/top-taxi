from pathlib import Path

p = Path('ride.html')
text = p.read_text(encoding='utf-8')


def require(token):
    if token not in text:
        raise SystemExit(f'missing token: {token}')

# Clone the booking page's containment pattern: shortcut/toggle row and editor live in the same panel.
old_open = '''      <div class="field saved-place-field">\n        <div class="saved-place-line">'''
new_open = '''      <div class="field saved-place-field">\n        <div class="saved-address-panel compact ride-saved-address-panel">\n          <div class="booking-saved-place-line saved-place-line">'''
require(old_open)
text = text.replace(old_open, new_open, 1)

old_button = 'class="saved-settings-btn" type="button" aria-label="設定常用地址"'
new_button = 'class="saved-settings-btn saved-address-edit compact" type="button" aria-label="設定常用地址"'
require(old_button)
text = text.replace(old_button, new_button, 1)

old_join = '''        </div>\n      </div>\n      <div id="settings" class="settings ride-saved-compact" hidden>'''
new_join = '''          </div>\n          <div id="settings" class="saved-address-editor compact-editor settings ride-saved-compact" hidden>'''
require(old_join)
text = text.replace(old_join, new_join, 1)

old_close = '''        <button id="saveAddresses" class="primary ride-saved-save" type="button">儲存常用地址</button>\n      </div>\n      <div class="pickup-note-compact">'''
new_close = '''            <button id="saveAddresses" class="primary ride-saved-save" type="button">儲存常用地址</button>\n          </div>\n        </div>\n      </div>\n      <div class="pickup-note-compact">'''
require(old_close)
text = text.replace(old_close, new_close, 1)

# Booking resets the toggle label after Save auto-collapses. Ride previously forgot this.
old_save = '''        $("#settings").hidden=true;\n        setStatus("pickupStatus","常用地址與上車位置補充已儲存","ok");'''
new_save = '''        $("#settings").hidden=true;\n        const savedSettingsLabel=document.querySelector("#toggleSettings > span");\n        if(savedSettingsLabel)savedSettingsLabel.textContent="常用地址";\n        setStatus("pickupStatus","常用地址與上車位置補充已儲存","ok");'''
require(old_save)
text = text.replace(old_save, new_save, 1)

# Keep toggle state behavior exactly aligned with booking semantics.
old_toggle = '''    $("#toggleSettings").onclick=()=>{\n      const panel=$("#settings");\n      panel.hidden=!panel.hidden;\n      const label=document.querySelector("#toggleSettings > span");\n      if(label)label.textContent=panel.hidden?"常用地址":"收合";\n    };'''
new_toggle = '''    $("#toggleSettings").onclick=()=>{\n      const savedEditor=$("#settings");\n      const savedSettingsLabel=document.querySelector("#toggleSettings > span");\n      savedEditor.hidden=!savedEditor.hidden;\n      if(savedSettingsLabel){\n        savedSettingsLabel.textContent=savedEditor.hidden?"常用地址":"收合";\n      }\n    };'''
require(old_toggle)
text = text.replace(old_toggle, new_toggle, 1)

# Validation guards.
assert text.count('id="settings"') == 1
assert 'class="saved-address-panel compact ride-saved-address-panel"' in text
assert 'class="booking-saved-place-line saved-place-line"' in text
assert 'class="saved-address-editor compact-editor settings ride-saved-compact"' in text
assert 'savedSettingsLabel.textContent=savedEditor.hidden?"常用地址":"收合"' in text
assert 'if(savedSettingsLabel)savedSettingsLabel.textContent="常用地址";' in text
assert '#savedChips .chip' in text
assert 'topTaxiProgressiveStopGateScriptV1' in text
assert 'topTaxiSavedAddressViewportLockV2' in text

p.write_text(text, encoding='utf-8')
print('ride saved-address panel/toggle now follows booking pattern')
