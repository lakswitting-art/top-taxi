/* TOP Taxi Dispatch Message Formatter V3 | 2026-08-30 */
(function(){
  'use strict';

  const hideLegacyFooter = () => {
    try{
      document.querySelectorAll('.footer').forEach(el=>el.style.setProperty('display','none','important'));
    }catch(e){}
  };
  hideLegacyFooter();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hideLegacyFooter,{once:true});

  const setupUnifiedBottomNotice = () => {
    try{
      const status=document.getElementById('pageStatus');
      if(!status || status.dataset.topTaxiNoticeBound==='1') return;
      status.dataset.topTaxiNoticeBound='1';

      let notice=document.getElementById('topTaxiFinalNotice');
      if(!notice){
        notice=document.createElement('div');
        notice.id='topTaxiFinalNotice';
        notice.setAttribute('aria-live','polite');
        notice.style.marginTop='18px';
        notice.style.paddingTop='16px';
        notice.style.borderTop='1px solid #eee';
        notice.style.textAlign='center';
        notice.style.color='#8e8e94';
        notice.style.fontSize='12px';
        notice.style.fontWeight='400';
        notice.style.lineHeight='1.8';
        status.insertAdjacentElement('afterend',notice);
      }

      const sync=()=>{
        const text=String(status.textContent||'').trim();
        const isErrand=text==='送出後由客服確認並安排跑腿服務';
        const isDriver=text==='送出後由客服確認並安排代駕';
        const isRide=text==='送出後由客服確認並安排車輛';

        if(isErrand){
          notice.innerHTML='※ 送出後跑腿需求會直接傳送至 TOP Taxi 客服。<br>※ 客服確認後將安排跑腿服務。<br>※ 跑腿是否成立，仍以客服最終確認為準。';
        }else if(isDriver){
          notice.innerHTML='※ 送出後代駕需求會直接傳送至 TOP Taxi 客服。<br>※ 客服確認後將安排代駕服務。<br>※ 代駕是否成立，仍以客服最終確認為準。';
        }else if(isRide){
          notice.innerHTML='※ 送出後叫車需求會直接傳送至 TOP Taxi 客服。<br>※ 客服確認後將安排車輛。<br>※ 叫車是否成立，仍以客服最終確認為準。';
        }else{
          notice.hidden=true;
          status.style.removeProperty('display');
          return;
        }

        notice.hidden=false;
        status.style.setProperty('display','none','important');
      };

      sync();
      new MutationObserver(sync).observe(status,{childList:true,characterData:true,subtree:true});
    }catch(e){}
  };
  setupUnifiedBottomNotice();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupUnifiedBottomNotice,{once:true});

  const clean = (lines) => {
    const out=[];
    for(const raw of lines||[]){
      const line=String(raw??'').replace(/\s+$/,'');
      if(!line.trim() && (!out.length || !out[out.length-1].trim())) continue;
      out.push(line);
    }
    while(out.length && !out[0].trim()) out.shift();
    while(out.length && !out[out.length-1].trim()) out.pop();
    return out;
  };

  /*
   * Google 商家有時會把 SEO 關鍵字全部塞進 displayName，例如：
   * 上利國際車業-大里汽車買賣｜高價估車｜優質汽車｜認證車商｜...｜大里區中投西路三段937號
   * 派車單只保留「主要店名｜真正地址」。原始 Google place/address 不在這裡改動，
   * 所以導航、路線與車資計算完全不受影響。
   */
  const looksLikeDispatchStreetAddress = (value) => {
    const s=String(value||'').replace(/\s+/g,'').trim();
    if(!s) return false;
    return /(?:縣|市|區|鄉|鎮|村|里).*(?:大道|路|街|巷|弄|段)/u.test(s) ||
      /(?:大道|路|街|巷|弄|段).*\d+(?:之\d+)?號?/u.test(s) ||
      /\d+(?:之\d+)?號/u.test(s);
  };

  const compactDispatchPlaceLabel = (value,lineLength=0) => {
    let s=String(value||'').replace(/\s+/g,' ').trim();
    if(!s) return '';

    // 只有在整行本來就明顯過長，而且「-」後方是常見商家 SEO 描述時才縮掉；
    // 避免誤傷 7-ELEVEN、品牌分店名等正常名稱。
    if(lineLength>=28){
      const m=s.match(/^(.{2,24}?)[\-－–—](.+)$/u);
      if(m){
        const tail=String(m[2]||'').trim();
        if(/(?:買賣|高價估車|估車|收購|認證|優質|中古車|二手車|推薦|專營|專業服務|汽車買賣)/u.test(tail)){
          s=String(m[1]||'').trim();
        }
      }
    }
    return s;
  };

  const compactDispatchAddressLine = (raw) => {
    const line=String(raw??'');
    const trimmed=line.trim();
    if(!trimmed || !trimmed.includes('｜')) return line;

    const parts=trimmed.split('｜').map(v=>String(v||'').trim()).filter(Boolean);
    if(parts.length<3) return line;

    let addressIndex=-1;
    for(let i=parts.length-1;i>=1;i--){
      if(looksLikeDispatchStreetAddress(parts[i])){
        addressIndex=i;
        break;
      }
    }
    if(addressIndex<1) return line;

    // 地址列的第一段是 Google place name；中間多半是商家自己塞的 SEO 關鍵字。
    // 保留第一段 + 最後找到的正式地址即可。
    const place=compactDispatchPlaceLabel(parts[0],trimmed.length);
    const address=parts[addressIndex];
    if(!place || !address) return line;

    const leading=line.match(/^\s*/)?.[0]||'';
    return `${leading}${place}｜${address}`;
  };

  const compactDispatchOutput = (lines) => clean((lines||[]).map(compactDispatchAddressLine));
  window.topTaxiCompactDispatchAddressLineV1=compactDispatchAddressLine;

  const splitBlocks = (text) => {
    if(typeof window.topTaxiSplitAddressBlocksV2==='function'){
      return window.topTaxiSplitAddressBlocksV2(String(text||'').split('\n'));
    }
    const body=[],blocks=[];let block=null;
    const flush=()=>{if(block&&block.length){blocks.push(block);block=null;}};
    for(const raw of String(text||'').split('\n')){
      const t=String(raw??'').trim();
      if(/^(📍|🟡|🏁)\s/.test(t)){flush();block=[raw];continue;}
      if(block){if(!t){flush();body.push(raw);}else block.push(raw);continue;}
      body.push(raw);
    }
    flush();
    return {body,blocks};
  };

  const valueAfter = (lines,prefix) => {
    const line=(lines||[]).map(x=>String(x||'').trim()).find(x=>x.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : '';
  };
  const moneyExists = (value) => /\d/.test(String(value||''));
  const normalizeMoney = (value) => String(value||'').replace(/NT\$/g,'$').trim();
  const normalizeDistance = (value) => String(value||'').replace(/^約\s*/,'').trim();
  const normalizeDuration = (value) => String(value||'').replace(/^約\s*/,'').trim();
  const pushBlockList = (out,blocks) => {
    (blocks||[]).forEach((b,idx)=>{
      if(!b||!b.length) return;
      out.push('');
      out.push(...b);
    });
  };
  const renameHead = (block,label) => {
    if(!block||!block.length) return block;
    const next=[...block];
    const head=String(next[0]||'');
    const sep=head.indexOf('｜');
    const suffix=sep>=0?head.slice(sep):'';
    next[0]=`${label}${suffix}`;
    return next;
  };
  const compactEstimate = ({service,fare,route,distance,duration,noteLabel='車資',extraLine=''}) => {
    if(!moneyExists(fare)) return [];
    const out=[`💰 ${service}｜${normalizeMoney(fare)}`];
    if(route || distance || duration){
      out.push(`🛣️ ${route||'路線未提供'}｜${normalizeDistance(distance)||'--'}｜${normalizeDuration(duration)||'--'}`);
    }
    if(extraLine) out.push(extraLine);
    out.push('',`系統預估${noteLabel}僅供參考，實際費用依當日行程狀況為準。`);
    return out;
  };

  window.topTaxiFormatFareMessageV2 = function(text,mode){
    const service=mode==='driver'?'代駕服務':'一般搭車';
    const lines=String(text||'').split('\n');
    const split=splitBlocks(text);
    const fare=valueAfter(lines,'💰 預估車資：');
    const route=valueAfter(lines,'🛣️ 行車路線：');
    const distance=valueAfter(lines,'📏 行駛距離：')||valueAfter(lines,'📏 距離：');
    const duration=valueAfter(lines,'⏱️ 預估時間：');
    const out=['TOP Taxi｜車資試算'];
    const estimate=compactEstimate({service,fare,route,distance,duration,noteLabel:'車資'});
    if(estimate.length) out.push('',...estimate);
    out.push('','💬 禁菸、寵物、輪椅、收據等需求，請直接於 LINE 聊天室告知客服。','', '━━━━━━━━━━','',`⚡️ 即時｜${service}`);
    const blocks=(split.blocks||[]).filter(b=>!String(b?.[0]||'').includes('未提供'));
    pushBlockList(out,blocks);
    return compactDispatchOutput(out).join('\n');
  };

  window.topTaxiFormatRideMessageV2 = function(text){
    const service=(typeof rideService!=='undefined' && rideService==='driver')?'代駕服務':'一般搭車';
    const lines=String(text||'').split('\n');
    const split=splitBlocks(text);
    const fare=valueAfter(lines,'💰 預估車資：');
    const route=valueAfter(lines,'🛣️ 行車路線：');
    const distance=valueAfter(lines,'📏 距離：')||valueAfter(lines,'📏 行駛距離：');
    const duration=valueAfter(lines,'⏱️ 預估時間：');
    const extras=valueAfter(lines,'➕ 加價項目：');
    const out=['TOP Taxi｜即時叫車'];
    const estimate=compactEstimate({service,fare,route,distance,duration,noteLabel:'車資',extraLine:extras?`➕ 加價項目｜${extras}`:''});
    if(estimate.length) out.push('',...estimate);
    out.push('','━━━━━━━━━━','',`⚡️ 即時｜${service}`);
    const blocks=(split.blocks||[]).filter(b=>!String(b?.[0]||'').includes('未提供'));
    pushBlockList(out,blocks);

    const passenger=valueAfter(lines,'👥 乘車人數：')||valueAfter(lines,'👥 乘客人數：');
    const luggage=valueAfter(lines,'🧳 行李件數：');
    let memo='';
    for(let i=0;i<lines.length;i++){
      if(String(lines[i]||'').trim()==='💡 特殊需求'){
        memo=String(lines[i+1]||'').trim();
        break;
      }
    }
    const payment=valueAfter(lines,'💳 付款方式：');
    if(passenger && !/^1\s*人?$/.test(passenger)) out.push('',`👥 乘客人數｜${passenger}`);
    if(luggage && !/無行李/.test(luggage)) out.push('',`🧳 行李件數｜${luggage}`);
    if(memo && memo!=='無') out.push('',`💡 特殊需求｜${memo}`);
    if(payment && /後結/.test(payment)) out.push('',`💳 付款方式｜${payment}`);
    return compactDispatchOutput(out).join('\n');
  };

  window.topTaxiFormatBookingMessageV2 = function(ctx){
    ctx=ctx||{};
    const service=ctx.bookingService==='driver'?'代駕服務':'一般搭車';
    const fareLines=String(ctx.fareDetails||'').split('\n');
    const fare=valueAfter(fareLines,'💰 預估車資：');
    const route=valueAfter(fareLines,'🛣️ 行車路線：');
    const distance=valueAfter(fareLines,'📏 距離：')||valueAfter(fareLines,'📏 行駛距離：');
    const duration=valueAfter(fareLines,'⏱️ 預估時間：');
    const extras=valueAfter(fareLines,'➕ 加價項目：');
    const out=['TOP Taxi｜預約叫車'];
    const estimate=compactEstimate({service,fare,route,distance,duration,noteLabel:'車資',extraLine:extras?`➕ 加價項目｜${extras}`:''});
    if(estimate.length) out.push('',...estimate);
    out.push('','━━━━━━━━━━','',`📅 預約｜${service}`,`🕐 ${ctx.bookDate||''} ${ctx.bookTime||''}`.trim());
    if(ctx.pickupDispatchHeader && ctx.pickupDispatchText){
      out.push('',ctx.pickupDispatchHeader,ctx.pickupDispatchText);
      if(ctx.pickupNote) out.push(`📌 上車補充｜${ctx.pickupNote}`);
    }
    if(ctx.waypointDetails) out.push('',...clean(String(ctx.waypointDetails).split('\n')));
    if(ctx.dropoffDetails) out.push('',...clean(String(ctx.dropoffDetails).split('\n')));

    const passengerLines=clean(String(ctx.passengerDetails||'').split('\n'));
    passengerLines.forEach(line=>{
      const t=String(line||'').trim();
      if(t.startsWith('👥 乘車人數：')||t.startsWith('👥 乘客人數：')){
        const v=t.slice(t.indexOf('：')+1).trim();
        if(v && !/^1\s*人?$/.test(v)) out.push('',`👥 乘客人數｜${v}`);
      }else if(t.startsWith('🧳 行李件數：')){
        const v=t.slice(t.indexOf('：')+1).trim();
        if(v && !/無行李/.test(v)) out.push('',`🧳 行李件數｜${v}`);
      }
    });
    if(ctx.memo && ctx.memo!=='無') out.push('',`💡 特殊需求｜${ctx.memo}`);
    if(ctx.payment && /後結/.test(String(ctx.payment))) out.push('',`💳 付款方式｜${ctx.payment}`);
    return compactDispatchOutput(out).join('\n');
  };

  window.topTaxiFormatErrandMessageV2 = function(text){
    const task=(typeof TASKS!=='undefined' && typeof taskType!=='undefined' && TASKS[taskType])?TASKS[taskType]:'跑腿';
    const type=(typeof taskType!=='undefined')?taskType:'other';
    const icon={purchase:'🛒',delivery:'📦',queue:'🧾',pet:'🐾',move:'📦',other:'🛵'}[type]||'🛵';
    const lines=String(text||'').split('\n');
    const split=splitBlocks(text);
    const fareLine=(lines||[]).map(x=>String(x||'').trim()).find(x=>/^💰 預估(?:跑腿|搬家)費：/.test(x))||'';
    const fare=fareLine.includes('：')?fareLine.slice(fareLine.indexOf('：')+1).trim():'';
    const fareName=type==='move'?'預估搬家費':'預估跑腿費';
    const route=valueAfter(lines,'🛣️ 行車路線：');
    const distance=valueAfter(lines,'📏 距離：');
    const duration=valueAfter(lines,'⏱️ 預估時間：');
    const out=['TOP Taxi｜跑腿服務'];
    if(moneyExists(fare)){
      out.push('',`💰 ${fareName}｜${normalizeMoney(fare)}`);
      if(route||distance||duration) out.push(`🛣️ ${route||'路線未提供'}｜${normalizeDistance(distance)||'--'}｜${normalizeDuration(duration)||'--'}`);
      out.push('','系統預估費用僅供參考，實際費用依當日行程狀況為準。');
    }
    out.push('','━━━━━━━━━━','');
    const reserve=(typeof errandMode!=='undefined' && errandMode==='reserve');
    if(reserve){
      out.push(`📅 預約｜${icon} ${task}`);
      let d='',tm='';
      try{d=document.querySelector('#errandDate')?.value||'';tm=document.querySelector('#errandTime')?.value||'';}catch(e){}
      out.push(`🕐 ${d} ${tm}`.trim());
    }else{
      out.push(`⚡ 即時｜${icon} ${task}`);
    }

    const nearPurchase=type==='purchase' && typeof purchaseLocationMode!=='undefined' && purchaseLocationMode==='unspecified';
    if(nearPurchase) out.push('','⚠️ 購買地點｜送達地點附近購買');

    let hasFinal=false;
    try{hasFinal=typeof addressValue==='function' && !!addressValue('final');}catch(e){}
    const rawBlocks=(split.blocks||[]).filter(b=>!String(b?.[0]||'').includes('未提供'));
    const p1Label={purchase:'📍 購買地點',delivery:'📍 取件地點',queue:'📍 排隊地點',pet:'📍 接送起點',move:'📍 搬出地點',other:'📍 處理地點'}[type]||'📍 處理地點';
    const finalLabel=type==='move'?'🏁 搬入地點':'🏁 送達地點';
    const blocks=[];
    rawBlocks.forEach((b,idx)=>{
      let label;
      if(!nearPurchase && idx===0) label=p1Label;
      else if(hasFinal && idx===rawBlocks.length-1) label=finalLabel;
      else label=`🟡 停靠點 ${nearPurchase?idx+1:idx}`;
      blocks.push(renameHead(b,label));
    });
    pushBlockList(out,blocks);

    const body=clean(split.body||[]);
    const skipLine=(t)=>{
      return !t ||
        /^TOP Taxi/.test(t) ||
        t.startsWith('📋 服務類型：') ||
        t.startsWith('🛵 任務類型：') ||
        t.startsWith('📅 預約日期：') ||
        t.startsWith('⏰ 預約時間：') ||
        t.startsWith('📡 TOP Taxi｜') ||
        t==='━━━━━━━━━━' ||
        /需求已送出/.test(t) ||
        t.startsWith('🛣️ 行車路線：') ||
        t.startsWith('📏 距離：') ||
        t.startsWith('⏱️ 預估時間：') ||
        /^💰 預估(?:跑腿|搬家)費：/.test(t) ||
        (nearPurchase && t==='⚠️ 購買地點｜送達地點附近購買') ||
        (nearPurchase && t==='請於送達地點附近就近購買，實際店家依商品供應狀況選擇。');
    };
    const misc=[];
    for(let i=0;i<body.length;i++){
      const t=String(body[i]||'').trim();
      if(skipLine(t)) continue;
      if(t==='💡 任務內容'){
        const content=String(body[i+1]||'').trim();
        i++;
        if(content){
          const label={purchase:'🛍️ 代買內容',delivery:'📦 配送內容',queue:'🧾 排隊內容',pet:'💡 其他需求',move:'📦 搬運內容',other:'📝 任務內容'}[type]||'📝 任務內容';
          misc.push(`${label}｜${content}`);
        }
        continue;
      }
      if(t.startsWith('💳 付款方式：')){
        const v=t.slice('💳 付款方式：'.length).trim();
        if(/後結/.test(v)) misc.push(`💳 付款方式｜${v}`);
        continue;
      }
      if(t.startsWith('需要代墊｜')){
        let v=t.slice('需要代墊｜'.length).replace(/・後結客戶/g,'').replace(/NT\$/g,'$').trim();
        misc.push(`💰 代墊金額｜${v}`);
        continue;
      }
      if(t.startsWith('其他需求｜')){ misc.push(`💡 其他需求｜${t.slice('其他需求｜'.length).trim()}`); continue; }
      if(t.startsWith('寵物｜')){ misc.push(`🐾 寵物資訊｜${t.slice('寵物｜'.length).trim()}`); continue; }
      if(t.startsWith('提籠／提袋｜')){ misc.push(`🧺 提籠／提袋｜${t.slice('提籠／提袋｜'.length).trim()}`); continue; }
      if(t.startsWith('搬運方式｜')){ misc.push(`📦 搬運方式｜${t.slice('搬運方式｜'.length).trim()}`); continue; }
      if(t.startsWith('電梯｜')){ misc.push(`🏢 電梯｜${t.slice('電梯｜'.length).trim()}`); continue; }
      if(t.startsWith('搬家物品照片｜')){ misc.push(`📷 照片｜${t.slice('搬家物品照片｜'.length).trim()}`); continue; }
      if(t.startsWith('等待計費｜')){ misc.push('⏱️ 等待需求｜需現場持續排隊'); continue; }
      if(t.startsWith('聯絡人｜')){ misc.push(`👤 ${t}`); continue; }
      if(t.startsWith('📷 拍照回報｜')){ misc.push(t); continue; }
      if(t.startsWith('送達方式｜')||t.startsWith('放置位置｜')) continue; // already retained inside final address block
      misc.push(t);
    }
    misc.forEach(line=>{ if(line) out.push('',line); });
    return compactDispatchOutput(out).join('\n');
  };
})();