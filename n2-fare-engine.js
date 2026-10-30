/* N2 shared fare and route policy. Same source is loaded by Node/V2 and the four customer pages. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.N2FareEngine=api;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const RELEASE='20261030-web-shared';
const DISPLAY_REVISION='20261031-all-route-messages';

// Extracted from local fare.html; verified against published normal-taxi fare.
function calculateFare(distanceKm, minutes) {

    const BASE_FARE = 80;          // 基本費
    const MINIMUM_FARE = 100;      // 一般搭車低消
    const TIME_RATE = 3;           // 每分鐘 3 元
    const FIRST_KM_RATE = 15;      // 前 20 公里，每公里 15 元
    const LONG_KM_RATE = 25;       // 超過 20 公里的部分，每公里 25 元
    const LONG_DISTANCE_START = 20;

    let distanceFare = 0;

    // 計算里程費
    if (distanceKm <= LONG_DISTANCE_START) {

        distanceFare =
            distanceKm * FIRST_KM_RATE;

    } else {

        distanceFare =
            (LONG_DISTANCE_START * FIRST_KM_RATE)
            +
            ((distanceKm - LONG_DISTANCE_START) * LONG_KM_RATE);

    }

    // 計算時間費
    const timeFare =
        minutes * TIME_RATE;

    // 總車資
    const totalFare =
        BASE_FARE +
        distanceFare +
        timeFare;

    // 個位數無條件捨去
    const finalFare =
        Math.floor(totalFare / 10) * 10;

    return Math.max(MINIMUM_FARE, finalFare);
}

// Designated driver uses the same $80 taxi meter (including its $100 minimum),
// then doubles the metered fare and adds the $300 service fee.
function calculateDriverFare(distanceKm, minutes) {
    const DRIVER_SERVICE_FEE = 300;
    return (calculateFare(distanceKm, minutes) * 2) + DRIVER_SERVICE_FEE;
}




const seconds = route => Number.isFinite(route?.seconds) ? route.seconds : Number(route?.minutes) * 60;
const sameSummary = (a, b) => Boolean(a && b &&
  Number(a.distanceKm).toFixed(1) === Number(b.distanceKm).toFixed(1) &&
  a.minutes === b.minutes && a.fare === b.fare);
function dominates(a, b, serviceType) {
  return a && b && seconds(a) <= seconds(b) && a.fare <= b.fare &&
    (serviceType !== 'driver' || a.distanceKm <= b.distanceKm) &&
    (seconds(a) < seconds(b) || a.fare < b.fare ||
      (serviceType === 'driver' && a.distanceKm < b.distanceKm));
}

function presentRoutes(routes = [], serviceType = 'taxi') {
  const valid = routes.filter(route => route && Number.isFinite(route.fare) &&
    Number.isFinite(route.distanceKm) && Number.isFinite(seconds(route)));
  const surface = valid.find(route => route.mode === 'SURFACE');
  const fast = valid.find(route => route.mode === 'FAST');
  const visible = [];
  for (const route of valid) {
    const duplicate = visible.find(item => sameSummary(item, route));
    if (duplicate) duplicate.modes.push(route.mode);
    else visible.push({...route, modes: [route.mode]});
  }
  const worthwhile = route => fast && seconds(route) <= seconds(fast) + 300 &&
    (route.fare <= fast.fare - 40 || (serviceType === 'driver' &&
      route.fare <= fast.fare && fast.distanceKm - route.distanceKm >= 0.999));
  const candidates = visible.filter(route => worthwhile(route) &&
    !valid.some(other => dominates(other, route, serviceType)));
  // A shorter fastest driver route can itself be the useful recommendation.
  if (!candidates.length && serviceType === 'driver' && surface && fast &&
      fast.fare <= surface.fare && seconds(fast) <= seconds(surface) + 300 &&
      surface.distanceKm - fast.distanceKm >= 0.999 &&
      !valid.some(other => dominates(other, fast, serviceType))) {
    candidates.push(visible.find(route => route.modes.includes('FAST')));
  }
  candidates.sort((a, b) => a.fare - b.fare || seconds(a) - seconds(b) || a.distanceKm - b.distanceKm);
  const recommended = candidates[0];
  return visible.map(route => ({...route, recommended: route === recommended,
    title: route.modes.includes('SURFACE') && route.modes.includes('FAST')
      ? '目前平面／快速路線相同'
      : route === recommended ? '推薦路線'
        : ({SURFACE: '平面路線', FAST: '快速路線', ECONOMY: '其他路線'}[route.mode] || '行車路線')}));
}


const ECONOMY_MAX_EXTRA_SECONDS = 5 * 60;
const ECONOMY_MIN_SAVINGS = 40;
const DRIVER_RECOMMENDED_MIN_DISTANCE_SAVINGS_KM = 1;

function routeResult(route, mode, calculate, surchargeAdjustment = 0) {
  if (!route || !Number.isFinite(route.distanceMeters) || route.distanceMeters <= 0 ||
      typeof route.duration !== 'string' || !/^\d+(?:\.\d{1,9})?s$/.test(route.duration)) return null;
  const seconds = Number(route.duration.slice(0, -1));
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const distanceKm = route.distanceMeters / 1000;
  const minutes = Math.ceil(seconds / 60);
  return {mode, distanceKm, minutes, fare: calculate(distanceKm, minutes) + surchargeAdjustment, seconds};
}

function sameRouteSummary(left, right) {
  return Boolean(left && right && left.distanceKm.toFixed(1) === right.distanceKm.toFixed(1) &&
    left.minutes === right.minutes && left.fare === right.fare);
}

function selectFastAndEconomy(routes, calculate, surchargeAdjustment = 0, surface = null,
  serviceType = 'taxi') {
  const candidates = (Array.isArray(routes) ? routes : [])
    .map(route => routeResult(route, 'FAST', calculate, surchargeAdjustment))
    .filter(Boolean)
    .sort((left, right) => left.seconds - right.seconds || left.fare - right.fare ||
      left.distanceKm - right.distanceKm);
  if (!candidates.length) throw new Error('INVALID_ROUTE_DATA');
  const fast = candidates[0];
  const comparisonRoutes = surface ? [surface, ...candidates] : candidates;
  const economy = candidates.slice(1)
    .filter(route => route.seconds <= fast.seconds + ECONOMY_MAX_EXTRA_SECONDS)
    .filter(route => route.fare <= fast.fare - ECONOMY_MIN_SAVINGS ||
      (serviceType === 'driver' && route.fare <= fast.fare &&
        route.distanceKm <= fast.distanceKm - DRIVER_RECOMMENDED_MIN_DISTANCE_SAVINGS_KM))
    .filter(route => !sameRouteSummary(route, surface))
    .filter(route => !comparisonRoutes.some(other => other !== route &&
      dominates(other, route, serviceType)))
    .sort((left, right) => left.fare - right.fare || left.seconds - right.seconds ||
      left.distanceKm - right.distanceKm)[0];
  return {fast: {...fast, mode: 'FAST'}, economy: economy ? {...economy, mode: 'ECONOMY'} : null};
}


function selectSurfaceRoute(routes,calculate=calculateFare,surchargeAdjustment=0){
 const candidates=(Array.isArray(routes)?routes:[]).map(r=>routeResult(r,'SURFACE',calculate,surchargeAdjustment)).filter(Boolean);
 if(!candidates.length)throw Error('INVALID_ROUTE_DATA');
 const fastest=Math.min(...candidates.map(r=>r.seconds));
 return candidates.filter(r=>r.seconds<=fastest+300).sort((a,b)=>a.fare-b.fare||a.seconds-b.seconds||a.distanceKm-b.distanceKm)[0];
}
function restLike(route,expectedLegCount){
 const legs=Array.isArray(route?.legs)?route.legs:[];
 if(!Number.isInteger(expectedLegCount)||expectedLegCount<1||legs.length!==expectedLegCount)throw Error('INVALID_ROUTE_LEGS');
 if(legs.some(l=>!Number.isFinite(l.distanceMeters)||l.distanceMeters<=0||!Number.isFinite(l.durationMillis)||l.durationMillis<=0))throw Error('INVALID_ROUTE_LEGS');
 const distanceMeters=Number.isFinite(route.distanceMeters)?route.distanceMeters:legs.reduce((n,l)=>n+l.distanceMeters,0);
 const durationMillis=Number.isFinite(route.durationMillis)?route.durationMillis:legs.reduce((n,l)=>n+l.durationMillis,0);
 if(!(distanceMeters>0&&durationMillis>0))throw Error('INVALID_ROUTE_DATA');
 return {distanceMeters,duration:(durationMillis/1000)+'s'};
}
function selectGoogleRoutes(routes,{surface=false,serviceType='taxi',expectedLegCount=1,surfaceRoute=null}={}){
 const raw=Array.isArray(routes)?routes:[];
 const checked=[];
 for(const route of raw){try{checked.push({raw:route,metrics:restLike(route,expectedLegCount)});}catch{}}
 if(!checked.length)throw Error('INVALID_ROUTE_DATA');
 const calculate=serviceType==='driver'?calculateDriverFare:serviceType==='errand'?(km,min)=>Math.max(220,calculateFare(km,min)):calculateFare;
 const metrics=checked.map(x=>x.metrics);
 const surfaceSummary=surfaceRoute?routeResult(restLike(surfaceRoute,expectedLegCount),'SURFACE',calculate):null;
 const selected=surface?selectSurfaceRoute(metrics,calculate):(()=>{const picked=selectFastAndEconomy(metrics,calculate,0,surfaceSummary,serviceType);return picked.economy||picked.fast;})();
 const entry=checked.find(x=>x.metrics.distanceMeters/1000===selected.distanceKm&&parseFloat(x.metrics.duration)===selected.seconds);
 // Normalize totals once so legacy page leg sums cannot show a different km/time than N2 prices.
 const legs=entry.raw.legs.map(l=>({distanceMeters:l.distanceMeters,durationMillis:l.durationMillis}));
 const last=legs.at(-1);last.distanceMeters+=entry.metrics.distanceMeters-legs.reduce((n,l)=>n+l.distanceMeters,0);
 last.durationMillis+=selected.seconds*1000-legs.reduce((n,l)=>n+l.durationMillis,0);
 if(!(last.distanceMeters>0&&last.durationMillis>0))throw Error('INVALID_ROUTE_LEGS');
 return {description:entry.raw.description,legs,distanceMeters:entry.metrics.distanceMeters,durationMillis:selected.seconds*1000,n2Release:RELEASE,n2Fare:selected.fare};
}
function googleRoutes(RouteClass,getServiceType=()=> 'taxi'){
 if(!RouteClass||typeof RouteClass.computeRoutes!=='function')throw Error('GOOGLE_ROUTES_REQUIRED');
 const options=(input,serviceType)=>({surface:input.routeModifiers?.avoidHighways===true,serviceType,
  expectedLegCount:(input.intermediates||[]).filter(p=>!p.via).length+1});
 const request=input=>({...input,computeAlternativeRoutes:!(input.intermediates||[]).length,
  fields:[...new Set([...(input.fields||[]),'legs','distanceMeters','durationMillis','description'])]});
 return {
  async computeRoutes(input){
   const serviceType=getServiceType();
   const response=await RouteClass.computeRoutes(request(input));
   return {...response,routes:[selectGoogleRoutes(response.routes,options(input,serviceType))]};
  },
  async computeRoutePair(fastInput,surfaceInput){
   const serviceType=getServiceType();
   const [fast,surface]=await Promise.all([RouteClass.computeRoutes(request(fastInput)),RouteClass.computeRoutes(request(surfaceInput))]);
   const selectedSurface=selectGoogleRoutes(surface.routes,options(surfaceInput,serviceType));
   const selectedFast=selectGoogleRoutes(fast.routes,{...options(fastInput,serviceType),surfaceRoute:selectedSurface});
   // Preserve every useful quote from these same two responses for outgoing messages.
   // The two interactive tabs retain their existing selected-route behavior.
   const legCount=options(fastInput,serviceType).expectedLegCount;
   const calculate=serviceType==='driver'?calculateDriverFare:serviceType==='errand'?(km,min)=>Math.max(220,calculateFare(km,min)):calculateFare;
   const surfaceQuote=routeResult(restLike(selectedSurface,legCount),'SURFACE',calculate);
   const fastMetrics=[];
   for(const route of fast.routes||[]){try{fastMetrics.push(restLike(route,legCount));}catch{}}
   const picked=selectFastAndEconomy(fastMetrics,calculate,0,surfaceQuote,serviceType);
   const quotes=[surfaceQuote,picked.fast,...(!(fastInput.intermediates||[]).length&&picked.economy?[picked.economy]:[])];
   const displayed=presentRoutes(quotes,serviceType);
   const n2RouteQuotes=quotes.filter(q=>q.mode!=='ECONOMY'||displayed.some(d=>d.recommended&&d.modes.includes('ECONOMY')));
   return [{...fast,routes:[selectedFast],n2RouteQuotes},{...surface,routes:[selectedSurface],n2RouteQuotes}];
  }
 };
}
function passengerExtras({serviceType='taxi',passengers='1',petMode='none'}={}){
 const count=String(passengers).replace(/人座|人/gu,'');
 if(serviceType==='driver')return {amount:0,items:[],quoteRequired:false};
 let amount=0;const items=[];
 if(count==='5'){amount+=50;items.push('5 人上車 +$50');}
 if(count==='7'){amount+=200;items.push('7 人座 +$200');}
 if(petMode==='no-carrier'){amount+=50;items.push('寵物無籠 +$50');}
 return {amount,items,quoteRequired:count==='9'};
}
function errandExtras({stops=0,taskType='delivery',movePlan='self',moveLift='yes',moveFloors=0,floorMode='none',elevatorFloor=0,stairsFloors=0,heavyItem=false,petCarrier='yes'}={}){
 let amount=0;const items=[];const n=v=>Math.max(0,parseInt(v,10)||0);
 stops=n(stops);if(stops){amount+=stops*50;items.push(`停靠點 ${stops} 個 +$${stops*50}`);}
 if(taskType==='move'){
  const service=movePlan==='driver'?600:300;amount+=service;items.push(`${movePlan==='driver'?'司機協助搬運':'自行搬運'} +$${service}`);
  if(movePlan==='driver'&&moveLift==='no'){const f=n(moveFloors);amount+=f*50;if(f)items.push(`無電梯 ${f} 樓 +$${f*50}`);}
  return {amount,items};
 }
 if(floorMode==='elevator'){amount+=50;items.push(`有電梯 ${n(elevatorFloor)||'?'} 樓 +$50`);}
 if(floorMode==='stairs'){const f=n(stairsFloors),fee=f>=2?(f-1)*50:0;amount+=fee;if(f)items.push(`爬樓梯 ${f} 樓 +$${fee}`);}
 if(heavyItem){amount+=100;items.push('搬運重物 +$100');}
 if(taskType==='pet'&&petCarrier==='no'){amount+=50;items.push('寵物無提籠／提袋 +$50');}
 return {amount,items};
}
function errandQuote({meterFare=null,taskType='delivery',extras={amount:0,items:[]}}={}){
 if(taskType==='move')return {base:meterFare,extras,total:meterFare==null?null:meterFare+extras.amount,isStarting:false};
 const base=meterFare==null?220:Math.max(220,meterFare);
 return {base,extras,total:base+extras.amount,isStarting:meterFare==null||meterFare<=220};
}
return Object.freeze({RELEASE,DISPLAY_REVISION,sameRouteSummary,ECONOMY_MAX_EXTRA_SECONDS,ECONOMY_MIN_SAVINGS,DRIVER_RECOMMENDED_MIN_DISTANCE_SAVINGS_KM,calculateFare,calculateDriverFare,presentRoutes,dominates,seconds,sameSummary,routeResult,selectFastAndEconomy,selectSurfaceRoute,selectGoogleRoutes,googleRoutes,passengerExtras,errandExtras,errandQuote});
});
