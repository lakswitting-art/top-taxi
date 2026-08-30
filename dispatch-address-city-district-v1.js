/* TOP Taxi unified dispatch address block formatter | 2026-08-30
 * Final display rule:
 *   Header: city/county only, e.g. 📍 上車｜台中市
 *   Detail: district/township + street address only, e.g. 大里區中投西路三段937號
 *
 * Google place/displayName is intentionally removed from the LINE dispatch copy so
 * dispatchers can copy a clean address directly. The original structured place data
 * remains untouched for navigation, route calculation and Order Data.
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
        if(/[｜|]/.test(t)){detailIndex=j;break;}
      }
      if(detailIndex<0)continue;

      const rawDetail=String(lines[detailIndex]||'');
      const parts=rawDetail.trim().split(/[｜|]/).map(x=>x.trim()).filter(Boolean);
      if(parts.length<2)continue;

      // The first segment is Google place/displayName. It is deliberately omitted.
      // Use the last address-like payload after any SEO/name segments.
      let address=parts[parts.length-1];
      const city=cityOf(headArea)||cityOf(address)||cityOf(rawDetail);
      const district=districtOf(headArea)||districtOf(address)||districtOf(rawDetail);
      address=stripCity(address);
      if(district&&!address.startsWith(district))address=district+address;

      if(city){
        const lead=(rawHead.match(/^\s*/)||[''])[0];
        lines[i]=lead+label+'｜'+city;
      }

      const detailLead=(rawDetail.match(/^\s*/)||[''])[0];
      lines[detailIndex]=detailLead+address;
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
