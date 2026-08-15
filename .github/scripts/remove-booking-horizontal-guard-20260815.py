from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

pattern = re.compile(
    r'\n<style id="topTaxiBookingAddressHorizontalGuardV2">.*?'
    r'<script id="topTaxiBookingAddressHorizontalGuardV2Script">.*?</script>\n',
    re.S,
)

new_text, count = pattern.subn('\n', text, count=1)
if count != 1:
    raise SystemExit(f'Expected exactly 1 booking horizontal guard block, removed {count}')

if 'topTaxiBookingAddressHorizontalGuardV2' in new_text or 'topTaxiBookingAddressHorizontalGuardV2Script' in new_text:
    raise SystemExit('Booking horizontal guard marker still present after patch')

for required in [
    'function topTaxiFormatBookingMessageV2(ctx)',
    'function bookingReturnToLineChat()',
    'showBookingSendResult("sync-warning")',
]:
    if required not in new_text:
        raise SystemExit(f'Required booking behavior missing after patch: {required}')

path.write_text(new_text, encoding='utf-8')
print('PASS: removed only BookingAddressHorizontalGuardV2 block')
