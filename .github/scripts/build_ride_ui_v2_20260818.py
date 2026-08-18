from pathlib import Path

src = Path('ride.html')
out = Path('ride-ui-v2.html')
text = src.read_text(encoding='utf-8')

# Clean card title + mini TOP Taxi wordmark.
text = text.replace(
    '<div id="rideTitle" class="form-title">🚕 即時叫車</div>',
    '<div id="rideTitle" class="form-title">即時叫車</div>',
    1,
)
text = text.replace(
    '<div class="form-label-small">TOP TAXI RIDE</div>',
    '<div class="form-label-small top-taxi-mini-logo"><span>TOP</span> Taxi</div>',
    1,
)

# Figure 2 service buttons: text-only, no emoji.
text = text.replace('>🚕 一般搭車</button>', '>一般搭車</button>', 1)
text = text.replace('>🚘 代駕服務</button>', '>代駕服務</button>', 1)

# Switching service must keep title emoji-free.
old_title_logic = '''      $("#rideTitle").textContent=isDriver
        ?"🚘 即時代駕"
        :"🚕 即時叫車";'''
new_title_logic = '''      $("#rideTitle").textContent=isDriver
        ?"即時代駕"
        :"即時叫車";'''
if old_title_logic not in text:
    raise SystemExit('Expected rideTitle service-switch block not found')
text = text.replace(old_title_logic, new_title_logic, 1)

style_id = 'topTaxiRideUIRefresh20260818'
css = r'''
<style id="topTaxiRideUIRefresh20260818">
/* TOP Taxi｜Ride UI Refresh V2 test
   Only visual title/wordmark/service-selector changes. */
#rideTitle{
  display:flex;
  align-items:center;
  gap:10px;
}
#rideTitle::before{
  content:"";
  width:4px;
  height:23px;
  flex:0 0 4px;
  border-radius:999px;
  background:linear-gradient(180deg,#ff3142 0%,#e10019 100%);
  box-shadow:0 2px 7px rgba(225,0,25,.18);
}
.top-taxi-mini-logo{
  color:#17171b !important;
  font-size:13px !important;
  font-weight:900 !important;
  letter-spacing:0 !important;
  line-height:1.1;
  white-space:nowrap;
}
.top-taxi-mini-logo span{color:var(--red)}

.ride-service-switch{
  grid-template-columns:1fr 1fr !important;
  gap:4px !important;
  margin:16px 0 18px !important;
  padding:5px !important;
  border:1px solid #e3e3e7 !important;
  border-radius:17px !important;
  background:linear-gradient(180deg,#fbfbfc 0%,#f2f2f4 100%) !important;
  box-shadow:0 7px 18px rgba(20,20,24,.08),inset 0 1px 0 rgba(255,255,255,.95) !important;
}
.ride-service-option{
  min-height:49px !important;
  padding:0 12px !important;
  border:1px solid transparent !important;
  border-radius:13px !important;
  background:transparent !important;
  color:#55555d !important;
  font-size:15px !important;
  font-weight:900 !important;
  letter-spacing:.1px;
  box-shadow:none !important;
  transition:transform .14s ease,background .18s ease,color .18s ease,box-shadow .18s ease,border-color .18s ease !important;
}
.ride-service-option:active{transform:scale(.985)}
.ride-service-option.active{
  border-color:rgba(181,0,21,.18) !important;
  background:linear-gradient(180deg,#ff263a 0%,#e5001c 100%) !important;
  color:#fff !important;
  box-shadow:0 7px 16px rgba(218,0,27,.24),inset 0 1px 0 rgba(255,255,255,.24) !important;
}
@media(max-width:390px){
  #rideTitle{gap:9px}
  #rideTitle::before{height:21px}
  .top-taxi-mini-logo{font-size:12.5px !important}
  .ride-service-option{min-height:47px !important;font-size:14.5px !important}
}
</style>
'''
if style_id in text:
    raise SystemExit('Unexpected pre-existing V2 style marker in source ride.html')
if '</head>' not in text:
    raise SystemExit('</head> marker not found')
text = text.replace('</head>', css + '\n</head>', 1)

required = [
    '<div id="rideTitle" class="form-title">即時叫車</div>',
    '<div class="form-label-small top-taxi-mini-logo"><span>TOP</span> Taxi</div>',
    '>一般搭車</button>',
    '>代駕服務</button>',
    'id="topTaxiRideUIRefresh20260818"',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f'Missing expected result: {needle}')

out.write_text(text, encoding='utf-8')
print('PASS: built ride-ui-v2.html without changing ride.html')
