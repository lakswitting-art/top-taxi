/* TOP Taxi final outbound LINE message cleaner | 2026-08-30 */
(function(){
  'use strict';

  function looksLikeStreetAddress(value){
    const s=String(value||'').replace(/\s+/g,'').trim();
    if(!s) return false;
    return /(?:縣|市|區|鄉|鎮|村|里).*(?:大道|路|街|巷|弄|段)/u.test(s) ||
      /(?:大道|路|街|巷|弄|段).*\d+(?:之\d+)?號?/u.test(s) ||
      /\d+(?:之\d+)?號/u.test(s);
  }

  function compactPlaceName(value,fullLineLength){
    let s=String(value||'').replace(/\s+/g,' ').trim();
    if(!s) return '';

    if(fullLineLength>=24){
      const m=s.match(/^(.{2,24}?)[\-－–—](.+)$/u);
      if(m){
        const tail=String(m[2]||'').trim();
        if(/(?:買賣|高價估車|估車|收購|認證|優質|中古車|二手車|推薦|專營|專業服務|汽車買賣)/u.test(tail)){
          s=String(m[1]||'').trim();
        }
      }
    }
    return s;
  }

  function compactAddressLine(raw){
    const line=String(raw??'');
    const trimmed=line.trim();

    // Google 商家名稱可能混用半形 | 與全形 ｜；即時叫車兩種都處理。
    // 這裡統一採相同規則，讓預約／試算／跑腿輸出完全一致。
    if(!trimmed || !/[｜|]/.test(trimmed)) return line;

    const parts=trimmed.split(/[｜|]/).map(v=>String(v||'').trim()).filter(Boolean);
    if(parts.length<2) return line;

    let addressIndex=-1;
    for(let i=parts.length-1;i>=1;i--){
      if(looksLikeStreetAddress(parts[i])){
        addressIndex=i;
        break;
      }
    }
    if(addressIndex<1) return line;

    const place=compactPlaceName(parts[0],trimmed.length);
    const address=parts[addressIndex];
    if(!place || !address) return line;

    const leading=(line.match(/^\s*/)||[''])[0];
    return `${leading}${place}｜${address}`;
  }

  function compactOutgoingText(text){
    return String(text??'').split('\n').map(compactAddressLine).join('\n');
  }

  window.topTaxiCompactOutgoingLineMessageV1=compactOutgoingText;

  function bindSendMessages(){
    try{
      if(!window.liff || typeof window.liff.sendMessages!=='function') return false;
      if(window.liff.sendMessages.__topTaxiFinalCleanV1) return true;

      const original=window.liff.sendMessages.bind(window.liff);
      const wrapped=function(messages){
        const next=Array.isArray(messages)
          ? messages.map(message=>{
              if(!message || message.type!=='text' || typeof message.text!=='string') return message;
              return {...message,text:compactOutgoingText(message.text)};
            })
          : messages;
        return original(next);
      };
      wrapped.__topTaxiFinalCleanV1=true;
      window.liff.sendMessages=wrapped;
      return true;
    }catch(error){
      console.warn('[TOP Taxi] final LINE cleaner bind failed',error);
      return false;
    }
  }

  if(!bindSendMessages()){
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(bindSendMessages() || tries>=40) clearInterval(timer);
    },250);
  }
})();
