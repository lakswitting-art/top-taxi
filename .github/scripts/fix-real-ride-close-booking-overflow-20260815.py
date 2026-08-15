from pathlib import Path

# TOP Taxi unified LINE return rule:
# - LINE send success + backend sync success => auto return
# - LINE send success + backend sync warning => auto return
# - LINE send status uncertain => stay on page for manual confirmation
p = Path('ride.html')
s = p.read_text(encoding='utf-8')

old = '''      if(!isUncertain&&!isSyncWarning&&RIDE_SEND_TEST_MODE!=="success"){
        if(rideReturnTimer)clearTimeout(rideReturnTimer);
        rideReturnTimer=setTimeout(rideReturnToLineChat,1100);
      }
'''
new = '''      if(!isUncertain&&RIDE_SEND_TEST_MODE!=="success"){
        if(rideReturnTimer)clearTimeout(rideReturnTimer);
        rideReturnTimer=setTimeout(rideReturnToLineChat,1100);
      }
'''

if old not in s:
    raise SystemExit('ride unified-return target missing')

s = s.replace(old, new, 1)

if 'setTimeout(rideReturnToLineChat, 80);' in s:
    raise SystemExit('unexpected legacy 80ms close is still present')
if old in s:
    raise SystemExit('old sync-warning return gate is still present')

p.write_text(s, encoding='utf-8')
print('ride LINE return behavior unified')
