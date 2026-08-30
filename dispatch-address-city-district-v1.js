/* TOP Taxi unified dispatch address block formatter | 2026-08-30
 * Final display rule:
 *   Header: city/county only, e.g. 📍 上車｜台中市
 *   Detail: keep a useful POI/store name + district/township + street address,
 *           e.g. 上利國際車業｜大里區中投西路三段937號
 *
 * Long Google SEO display names are compacted, but meaningful store/building/POI names
 * are retained. The original structured place data remains untouched for navigation,
 * route calculation and Order Data.
 *
 * Applies to pickup, waypoints, dropoff and errand address blocks.
 */
(function(){
  'use strict';

  const CITY_RE=/(新北市|台北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|宜蘭縣|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|台東縣|花蓮縣|澎湖縣|金門縣|連江縣)/u;

  function tw(value){return String(value||'').replace(/臺/g,'台').trim();}
  function cityOf(value){const m=tw(value).replace(/\s+/g,'').match(CITY_RE);return m?m[1]:'';}
  function districtOf(value){
    const s=tw(value).replace(/\s+/g,'');
    const city=cityOf(s);
    const rest=city?s.slice(s.indexOf(city)+city.length):s;
    const m=rest.match(/^([^0-9路街大道段巷弄號]{1,8}?(?:區|鄉|鎮|市))/u);
    return m?m[1]:'';
  }
  function stripCity(value){
    let s=tw(value).replace(/^台灣(?:省)?/u,'').replace(/^\s*\d{3}(?:\d{2,3})?\s*/u,'');
    const city=cityOf(s);
    if(city)s=s.replace(city,'');
    return s.replace(/^[-－—\s]+/u,'').trim();
  }
  function isHead(value){return /^(📍|🟡|🏁)\s/u.test(String(value||'').trim())&&/[｜|]/.test(String(value||''));}
  function looksLikeAddress(value){
    const s=tw(value).replace(/\s+/g,'');
    if(!s)return false;
    return /(?:縣|市|區|鄉|鎮).*(?:大道|路|街|段|巷|弄).*\d/u.test(s)||
      /(?:大道|路|街|段|巷|弄).*\d+(?:之\d+)?號?/u.test(s)||
      /\d+(?:之\d+)?號/u.test(s);
  }
  function compactPlace(value,lineLength=0){
    let s=tw(value).replace(/\s+/g,' ');
    if(!s||looksLikeAddress(s))return '';

    // Google 商家名稱有時會把 SEO 關鍵字全部塞在「-」後面。
    // 只在明顯過長且尾段屬商家 SEO 文案時縮成主要店名，避免誤傷正常分店名。
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
  }

  function normalize(text){
    const lines=String(text||'').split('\n');
    for(let i=0;i<lines.length;i++){
      if(!isHead(lines[i]))continue;

      const rawHead=String(lines[i]||'');
      const head=rawHead.trim();
      const sep=head.search(/[｜|]/);
      if(sep<0)continue;
      const label=head.slice(0,sep).trim();
      const headArea=head.slice(sep+1).trim();

      let detailIndex=-1;
      for(let j=i+1;j<Math.min(lines.length,i+4);j++){
        const t=String(lines[j]||'').trim();
        if(!t)continue;
        if(isHead(t))break;
        detailIndex=j;
        break;
      }
      if(detailIndex<0)continue;

      const rawDetail=String(lines[detailIndex]||'');
      const trimmedDetail=rawDetail.trim();
      const parts=trimmedDetail.split(/[｜|]/).map(x=>x.trim()).filter(Boolean);
      if(!parts.length)continue;

      let addressIndex=-1;
      for(let p=parts.length-1;p>=0;p--){
        if(looksLikeAddress(parts[p])){addressIndex=p;break;}
      }
      if(addressIndex<0)addressIndex=parts.length-1;

      let address=parts[addressIndex];
      const city=cityOf(headArea)||cityOf(address)||cityOf(rawDetail);
      const district=districtOf(address)||districtOf(rawDetail)||districtOf(headArea);
      address=stripCity(address);
      if(district&&!address.startsWith(district))address=district+address;

      let place='';
      if(parts.length>=2&&addressIndex!==0){
        place=compactPlace(parts[0],trimmedDetail.length);
        const placeKey=tw(place).replace(/\s+/g,'');
        const addressKey=tw(address).replace(/\s+/g,'');
        if(!placeKey||placeKey===addressKey||addressKey.includes(placeKey)&&looksLikeAddress(placeKey))place='';
      }

      if(city){
        const lead=(rawHead.match(/^\s*/)||[''])[0];
        lines[i]=lead+label+'｜'+city;
      }

      const detailLead=(rawDetail.match(/^\s*/)||[''])[0];
      lines[detailIndex]=detailLead+(place&&address?place+'｜'+address:(address||place||trimmedDetail));
    }
    return lines.join('\n');
  }

  function wrap(name){
    const fn=window[name];
    if(typeof fn!=='function'||fn.__topTaxiCityDistrictV1)return;
    const wrapped=function(){return normalize(fn.apply(this,arguments));};
    wrapped.__topTaxiCityDistrictV1=true;
    window[name]=wrapped;
  }

  function apply(){
    wrap('topTaxiFormatRideMessageV2');
    wrap('topTaxiFormatFareMessageV2');
    wrap('topTaxiFormatBookingMessageV2');
    wrap('topTaxiFormatErrandMessageV2');
  }

  window.topTaxiNormalizeDispatchCityDistrictV1=normalize;
  apply();
  setTimeout(apply,0);
  setTimeout(apply,100);
})();
