from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
old = 'content="width=device-width, initial-scale=1.0, viewport-fit=cover"'
new = 'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"'

if text.count(old) != 1:
    raise SystemExit(f'Expected exactly one booking viewport marker, found {text.count(old)}')

text = text.replace(old, new, 1)

for required in [
    'function topTaxiFormatBookingMessageV2(ctx)',
    'function bookingReturnToLineChat()',
    'topTaxiSavedAddressViewportLockV2',
]:
    if required not in text:
        raise SystemExit(f'Required booking behavior missing: {required}')

path.write_text(text, encoding='utf-8')
print('PASS: booking iOS focus viewport patched only')
