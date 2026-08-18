/* TOP Taxi Dispatch Message Formatter V4 | 2026-08-19
 * Errand shared post-formatter: remove legacy duplicate 24H branding.
 * Applies to all six errand task types through the common formatter path.
 */
(function(){
  'use strict';
  const previous=window.topTaxiFormatErrandMessageV2;
  if(typeof previous!=='function') return;

  window.topTaxiFormatErrandMessageV2=function(text){
    const formatted=previous.apply(this,arguments);
    const out=[];
    for(const raw of String(formatted||'').split('\n')){
      const t=String(raw||'').trim();
      if(/^🛵\s*TOP Taxi｜24H\s*跑腿服務$/.test(t)) continue;
      if(/^TOP Taxi｜24H\s*跑腿服務$/.test(t)) continue;
      if(!t && (!out.length || !String(out[out.length-1]||'').trim())) continue;
      out.push(raw);
    }
    while(out.length && !String(out[out.length-1]||'').trim()) out.pop();
    return out.join('\n');
  };
})();