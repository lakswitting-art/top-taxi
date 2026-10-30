'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),N2=require('../n2-fare-engine');
const pages=['ride.html','index.html','fare.html','errand.html'];
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
function fn(html,name){const at=html.indexOf('function '+name+'(');assert.ok(at>=0,name);let i=html.indexOf('{',at)+1,n=1;while(n&&i<html.length){if(html[i]==='{')n++;else if(html[i]==='}')n--;i++;}assert.equal(n,0);return html.slice(html.slice(at-6,at)==='async '?at-6:at,i);}
function fixture(km,minutes,description='test',legs=1){return{distanceMeters:km*1000,durationMillis:minutes*60000,description,legs:Array.from({length:legs},()=>({distanceMeters:km*1000/legs,durationMillis:minutes*60000/legs}))};}
const surface=[fixture(16.099,33,'outer ring'),fixture(11.598,38,'shorter surface'),fixture(12.401,38,'another surface')];
const fast=[fixture(16.064,21,'expressway')];
function dom(){const elements=new Map();const get=id=>{id=id.replace(/^#/,'');if(!elements.has(id))elements.set(id,{textContent:'',value:'1',hidden:false,classList:{toggle(){},remove(){},add(){}},style:{},setAttribute(){}});return elements.get(id);};return{get,elements,document:{getElementById:get,querySelector:get,querySelectorAll:()=>[]}};}
test('browser and Node expose the same N2 engine and release',()=>{const ctx={};vm.runInNewContext(source('n2-fare-engine.js'),ctx);assert.equal(ctx.N2FareEngine.RELEASE,N2.RELEASE);assert.equal(ctx.N2FareEngine.calculateDriverFare(16.064,21),1060);});
for(const page of pages)test(page+' inline scripts compile and shared engine loads first',()=>{
 const html=source(page);assert.ok(html.includes('<script src="https://lakswitting-art.github.io/top-taxi/n2-fare-engine.js?'));
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)){if(/application\/ld\+json|src=/iu.test(m[1])||!m[2].trim())continue;new vm.Script(m[2],{filename:page});}
 assert.ok(html.indexOf('n2-fare-engine.js')<html.indexOf('function calculate'));
});
const names={'ride.html':['calculateRideTaxiFare','calculateRideDriverFare'],'index.html':['calculateTaxiFare','calculateDriverFare'],'fare.html':['calculateFare','calculateDriverFare'],'errand.html':['calculateMeterFare']};
for(const page of pages)for(const [km,min,taxi,driver] of [[0,0,100,500],[16.064,21,380,1060],[11.598,38,360,1020],[20,35,480,1260],[20.1,10,410,1120]])test(`${page} shares N2 fares at ${km} km/${min} min`,()=>{
 const context={N2FareEngine:N2};vm.runInNewContext(names[page].map(n=>fn(source(page),n)).join('\n'),context);
 assert.equal(context[names[page][0]](km,min),taxi);if(names[page][1])assert.equal(context[names[page][1]](km,min),driver);
});
test('surface selection includes the shorter alternate rather than always using routes[0]',()=>{const p=N2.selectGoogleRoutes(surface,{surface:true});assert.equal(p.distanceMeters,11598);assert.equal(p.durationMillis,38*60000);assert.equal(p.n2Fare,360);assert.equal(surface[0].distanceMeters,16099);});
test('surface savings do not allow arbitrary extra travel time',()=>{const p=N2.selectGoogleRoutes([fixture(16,33),fixture(8,39)],{surface:true});assert.equal(p.distanceMeters,16000);});
test('equal-price slower surface option is not preferred',()=>{const p=N2.selectGoogleRoutes([fixture(3,10),fixture(2.8,11)],{surface:true});assert.equal(p.durationMillis,10*60000);});
test('near-fast lower-fare route remains the useful fast recommendation',()=>{const p=N2.selectGoogleRoutes([fixture(42,35),fixture(38,36)],{surface:false});assert.equal(p.distanceMeters,38000);});
test('invalid alternate is ignored without losing a valid default',()=>{const p=N2.selectGoogleRoutes([{legs:[]},fixture(10,20)],{surface:true});assert.equal(p.distanceMeters,10000);});
test('route and leg rounding are normalized before UI displays and prices',()=>{const x=fixture(16.064,21);x.legs[0].distanceMeters=16063;const p=N2.selectGoogleRoutes([x]);assert.equal(p.legs.reduce((n,l)=>n+l.distanceMeters,0),16064);assert.equal(x.legs[0].distanceMeters,16063);});
test('whole trip with two stops preserves point order, uses two requests and disables unsupported alternatives',async()=>{
 const requests=[],points=[{id:'A'},{id:'B'},{id:'C'},{id:'D'}];const Base={computeRoutes:async request=>{requests.push(request);return{routes:[fixture(20,40,'whole trip',3)]};}};
 const wrapper=N2.googleRoutes(Base);const base={origin:points[0],intermediates:points.slice(1,-1).map(location=>({location})),destination:points[3],fields:['legs']};
 await Promise.all([wrapper.computeRoutes({...base,routeModifiers:{avoidHighways:true}}),wrapper.computeRoutes({...base,routeModifiers:{avoidHighways:false}})]);
 assert.equal(requests.length,2);for(const r of requests){assert.equal(r.computeAlternativeRoutes,false);assert.equal(r.origin,points[0]);assert.equal(r.intermediates[0].location,points[1]);assert.equal(r.intermediates[1].location,points[2]);assert.equal(r.destination,points[3]);assert.ok(r.fields.includes('distanceMeters'));}
});
test('Google failure stays a failure and cannot fall back to hard-coded mileage',async()=>{const wrapper=N2.googleRoutes({computeRoutes:async()=>{throw Error('offline service unavailable');}});await assert.rejects(()=>wrapper.computeRoutes({fields:[]}),/unavailable/);});
test('service is captured before awaiting the response',async()=>{let service='taxi',release;const wrapper=N2.googleRoutes({computeRoutes:()=>new Promise(r=>{release=r;})},()=>service);const pending=wrapper.computeRoutes({fields:[]});service='driver';release({routes:fast});assert.equal((await pending).routes[0].n2Fare,380);});
test('ride toggles km, time and fare together using each selected N2 route',()=>{
 const d=dom(),ctx={N2FareEngine:N2,$:d.get,document:d.document,rideService:'taxi',petMode:'',updateSubmit(){},selectedRideRouteMode:'FAST',rideRouteOptions:{FAST:{km:16.064,min:21,baseFare:380},SURFACE:{km:11.598,min:38,baseFare:360}}};
 vm.runInNewContext(['extras','renderEstimate','selectRideRouteMode'].map(n=>fn(source('ride.html'),n)).join('\n'),ctx);
 ctx.selectRideRouteMode('SURFACE');assert.match(d.get('distance').textContent,/11.6/);assert.match(d.get('duration').textContent,/38/);assert.equal(d.get('fare').textContent,'$360');
 ctx.selectRideRouteMode('FAST');assert.match(d.get('distance').textContent,/16.1/);assert.equal(d.get('fare').textContent,'$380');
});
test('booking uses the same N2 route and passenger fees when switching',()=>{
 const d=dom();d.get('passengerCount').value='5人';const ctx={N2FareEngine:N2,document:d.document,bookingService:'taxi',bookingPetMode:'',selectedBookingRouteMode:'FAST',bookingRouteOptions:{FAST:{distanceKm:16.064,minutes:21,fare:380},SURFACE:{distanceKm:11.598,minutes:38,fare:360}}};
 vm.runInNewContext(['bookingExtras','getBookingFareQuote','renderBookingFareEstimate','selectBookingRouteMode'].map(n=>fn(source('index.html'),n)).join('\n'),ctx);
 ctx.selectBookingRouteMode('SURFACE');assert.match(d.get('estimateDistance').textContent,/11.6/);assert.equal(d.get('estimateFare').textContent,'$410');
 ctx.selectBookingRouteMode('FAST');assert.match(d.get('estimateDistance').textContent,/16.1/);assert.equal(d.get('estimateFare').textContent,'$430');
});
test('errand quote is the shared N2 minimum plus typed handling fees',()=>{
 const d=dom(),ctx={N2FareEngine:N2,$:d.get,taskType:'delivery',movePlan:'self',moveLift:'yes',floorMode:'stairs',petCarrier:'yes',addressSlots:{},addressValue:()=>'',currentEstimate:{meterFare:100}};d.get('stairsFloors').value='3';
 vm.runInNewContext(['extraFees','quote'].map(n=>fn(source('errand.html'),n)).join('\n'),ctx);const q=ctx.quote();assert.equal(q.base,220);assert.equal(q.total,320);assert.equal(q.extras.amount,100);
 ctx.taskType='move';ctx.movePlan='driver';ctx.moveLift='no';d.get('moveFloor').value='2';assert.equal(ctx.quote().total,800);
});
test('9 seats stays a customer-service quote and driver never inherits taxi passenger or pet fees',()=>{assert.equal(N2.passengerExtras({passengers:'9人座'}).quoteRequired,true);assert.equal(N2.passengerExtras({serviceType:'driver',passengers:'7',petMode:'no-carrier'}).amount,0);});
test('missing moving route never invents a starting total',()=>assert.equal(N2.errandQuote({taskType:'move',meterFare:null}).total,null));
test('release manifest matches the module bytes and every page cache version',()=>{
 const crypto=require('node:crypto'),manifest=JSON.parse(source('n2-engine-release.json'));
 assert.equal(manifest.revision,N2.RELEASE);
 assert.equal(manifest.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'n2-fare-engine.js'))).digest('hex'));
 for(const page of pages){const html=source(page);assert.ok(html.includes('n2-fare-engine.js?v='+N2.RELEASE));assert.ok(html.includes('.computeRoutePair('));}
});
test('recorded Google route pair matches the N2 backend incident regression',async()=>{
 const captured=require('./fixtures/ctust-wone.json');
 const wrapper=N2.googleRoutes({computeRoutes:async r=>({routes:(r.routeModifiers.avoidHighways?captured.surface:captured.fast).map(x=>({distanceMeters:x.distanceMeters,durationMillis:parseFloat(x.duration)*1000,legs:[{distanceMeters:x.distanceMeters,durationMillis:parseFloat(x.duration)*1000}]}))})});
 const [f,s]=await wrapper.computeRoutePair({routeModifiers:{avoidHighways:false}},{routeModifiers:{avoidHighways:true}});
 assert.equal(f.routes[0].distanceMeters,16064);assert.equal(f.routes[0].n2Fare,380);
 assert.equal(s.routes[0].distanceMeters,11598);assert.equal(s.routes[0].n2Fare,360);
});
test('ride recalculation replaces both route objects and clears the previous service quote while pending',async()=>{
 const d=dom(),calls=[];let finish;
 const wrapper=N2.googleRoutes({computeRoutes:async r=>{calls.push(r);await new Promise(resolve=>{if(calls.length===1)finish=resolve;else resolve();});return{routes:r.routeModifiers.avoidHighways?surface:fast};}});
 const ctx={N2FareEngine:N2,$:d.get,document:d.document,Date,console,RouteClass:wrapper,pickupPlace:{id:'A'},dropoffPlace:{id:'B'},calcSeq:0,rideService:'taxi',petMode:'',selectedRideRouteMode:'SURFACE',rideRouteOptions:{},routeData:{baseFare:999},updateSubmit(){},validateRideWaypoints:()=>true,getRideWaypointPlaces:()=>[],getRideWaypointData:()=>[],placeToAddressData:p=>p,hideEstimate(){throw Error('unexpected failed estimate');},setStatus(){}};
 const names=['calculateRideTaxiFare','calculateRideDriverFare','fareFormula','summarizeRideRoute','extras','renderEstimate','recalculate'];
 vm.runInNewContext(names.map(n=>fn(source('ride.html'),n)).join('\n'),ctx);
 const pending=ctx.recalculate();assert.equal(ctx.routeData,null);assert.equal(d.get('fare').textContent,'--');finish();await pending;
 assert.equal(calls.length,2);assert.equal(ctx.routeData.km,11.598);assert.equal(d.get('fare').textContent,'$360');
});
