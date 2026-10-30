'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const site = process.env.N2_WEB_SITE_DIR || '';
const asset = name => path.join(site || root, site ? 'assets' : '', name);
const N2 = require(asset('n2-fare-engine.js'));
const messages = require(asset('n2-route-messages.js'));
const quote = (mode, km, minutes) => ({mode, distanceKm: km, minutes, seconds: minutes * 60, fare: N2.calculateFare(km, minutes)});
const two = [quote('SURFACE', 71.3, 94), quote('FAST', 78, 65)];
const three = [quote('SURFACE', 31, 51), quote('FAST', 42, 35), quote('ECONOMY', 38, 36)];
const orderTail = '\n━━━━━━━━━━\n\n📅 預約｜一般搭車\n🕐 2030-01-01 04:30\n\n📍 上車｜測試縣\n測試鎮甲路10號\n\n🏁 下車｜測試縣\n測試市乙路20號\n\n💡 特殊需求｜有音樂';
const selectedMessage = (label = '平面道路') => 'TOP Taxi｜預約叫車\n\n💰 一般搭車｜$1940\n🛣️ ' + label + '｜71.3 km｜94 分鐘\n\n系統預估車資僅供參考，實際費用依當日行程狀況為準。\n' + orderTail;

test('outgoing estimate shows both modes and preserves the complete reservation', () => {
  const text = messages.replaceEstimate(selectedMessage(), two);
  assert.match(text, /【平面路線】\n71\.3 km｜約 94 分鐘\n預估車資｜\$1940/);
  assert.match(text, /【快速路線】\n78\.0 km｜約 65 分鐘\n預估車資｜\$2020/);
  assert.ok(text.endsWith(orderTail.trimStart()));
  assert.doesNotMatch(text, /💰 一般搭車｜\$1940/);
});
test('selected tab cannot hide another route from the outgoing message', () => {
  assert.equal(messages.replaceEstimate(selectedMessage('平面道路'), two),
    messages.replaceEstimate(selectedMessage('推薦快速路線'), two));
});
test('worthwhile third route appears under its own recommendation heading', () => {
  const text = messages.routeBlock(three);
  assert.match(text, /【平面路線】/); assert.match(text, /【快速路線】/);
  assert.match(text, /【推薦路線】\n38\.0 km｜約 36 分鐘\n預估車資｜\$930/);
  assert.equal((text.match(/【推薦路線】/g) || []).length, 1);
});
test('slower, dearer third route is not presented as a recommendation', () => {
  const text = messages.routeBlock([quote('SURFACE', 12.2, 24), quote('FAST', 19.3, 22), quote('ECONOMY', 13.1, 27)]);
  assert.doesNotMatch(text, /【推薦路線】|13\.1 km/);
});
test('same summaries stay compact while explicitly naming both modes', () => {
  const text = messages.routeBlock([quote('SURFACE', 7.3, 13), quote('FAST', 7.3, 13)]);
  assert.match(text, /【平面／快速路線相同】/);
  assert.equal((text.match(/預估車資｜/g) || []).length, 1);
});
test('passenger and pet extras are included in each amount and explained once', () => {
  const text = messages.routeBlock(two, {extras: {amount: 100, items: ['5 人 +$50', '寵物無籠 +$50']}});
  assert.match(text, /預估車資｜\$2040/); assert.match(text, /預估車資｜\$2120/);
  assert.equal((text.match(/➕ 加價項目/g) || []).length, 1);
});
test('designated-driver fares are preserved for every route', () => {
  const routes = two.map(r => ({...r, fare: N2.calculateDriverFare(r.distanceKm, r.minutes)}));
  const text = messages.routeBlock(routes, {serviceType: 'driver'});
  assert.match(text, /💰 代駕服務/); assert.match(text, /預估車資｜\$4180/); assert.match(text, /預估車資｜\$4340/);
});
test('nine seats quotes every route through customer service', () => {
  const text = messages.routeBlock(two, {quoteRequired: true});
  assert.equal((text.match(/預估車資｜請洽客服/g) || []).length, 2); assert.doesNotMatch(text, /\$1940/);
});
test('errand minimum and handling fees apply to every available route', () => {
  const text = messages.routeBlock([quote('SURFACE', 1, 4), quote('FAST', 1.5, 3)],
    {errand: true, taskType: 'delivery', priceLabel: '預估跑腿費', extras: {amount: 100, items: ['爬樓梯 +$100']}});
  assert.equal((text.match(/預估跑腿費｜\$320 起/g) || []).length, 2);
});
test('missing one mode does not manufacture a second quote', () => {
  assert.equal(messages.replaceEstimate(selectedMessage(), [two[0]]), selectedMessage());
  assert.equal(messages.replaceEstimate('無路線的訊息', []), '無路線的訊息');
});
function browserContext(routes, service = 'taxi') {
  const timers = [];
  const document = {readyState: 'loading', querySelectorAll: () => [], getElementById: () => ({value: '1人'}),
    querySelector: () => ({value: '1'}), addEventListener() {}};
  const context = {N2FareEngine: N2, document, console, setTimeout: fn => timers.push(fn), routeData: {routeQuotes: routes}, rideService: service,
    currentFareEstimate: {routeQuotes: routes}, bookingService: service, selectedRouteData: {routeQuotes: routes}, serviceMode: service,
    currentEstimate: {routeQuotes: routes}, taskType: 'delivery', extras: () => ({amount: 0, items: []}),
    bookingExtras: () => ({amount: 0, items: []}), extraFees: () => ({amount: 0, items: []})};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(site ? path.join(site, 'booking/dispatch-format-v3.js') : path.join(root, 'dispatch-format-v3.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(site ? path.join(site, 'errand/dispatch-format-v4.js') : path.join(root, 'dispatch-format-v4.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(site ? path.join(site, 'booking/dispatch-address-city-district-v1.js') : path.join(root, 'dispatch-address-city-district-v1.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(asset('n2-route-messages.js'), 'utf8'), context);
  for (const timer of timers) timer();
  return context;
}
for (const entry of ['Ride', 'Booking', 'Fare', 'Errand']) {
  test(entry + ': real formatter plus message wrapper lists all alternatives without changing the order', () => {
    const context = browserContext(three);
    const input = '📍 上車｜台中市\n甲地\n\n🏁 下車｜彰化縣\n乙地\n\n🛣️ 行車路線：平面道路\n📏 距離：31 km\n⏱️ 預估時間：51 分鐘\n💰 預估車資：$1050';
    const argument = entry === 'Booking' ? {bookingService: 'taxi', bookDate: '2030-01-01', bookTime: '04:30',
      fareDetails: input, pickupDispatchHeader: '📍 上車｜台中市', pickupDispatchText: '甲地', dropoffDetails: '🏁 下車｜彰化縣\n乙地'} : input;
    const fn = context['topTaxiFormat' + entry + 'MessageV2'];
    assert.equal(context.N2RouteMessages.DISPLAY_REVISION, N2.DISPLAY_REVISION);
    const text = fn(argument, 'taxi');
    assert.match(text, /【平面路線】/); assert.match(text, /【快速路線】/); assert.match(text, /【推薦路線】/);
    assert.match(text, /甲地/); assert.match(text, /乙地/);
    if (entry === 'Booking') assert.match(text, /2030-01-01 04:30/);
    assert.equal(context.routeData.routeQuotes, three);
  });
}
test('Google two-response pair retains all useful metrics without extra calls', async () => {
  let calls = 0;
  const sdk = r => ({distanceMeters: r.distanceKm * 1000, durationMillis: r.seconds * 1000,
    legs: [{distanceMeters: r.distanceKm * 1000, durationMillis: r.seconds * 1000}]});
  const api = N2.googleRoutes({computeRoutes: async r => {calls++; return {routes:
    (r.routeModifiers.avoidHighways ? [three[0]] : three.slice(1)).map(sdk)};}});
  const result = await api.computeRoutePair({routeModifiers: {avoidHighways: false}}, {routeModifiers: {avoidHighways: true}});
  assert.equal(calls, 2);
  assert.deepEqual(result[0].n2RouteQuotes.map(r => r.mode), ['SURFACE', 'FAST', 'ECONOMY']);
  assert.equal(result[0].routes[0].distanceMeters, 38000);
  assert.equal(result[0].n2RouteQuotes[1].distanceKm, 42);
  assert.equal(result[0].n2RouteQuotes, result[1].n2RouteQuotes);
});
test('all four pages retain the full quote and install the wrapper after legacy formatters', () => {
  for (const [page, dir] of [['ride.html','ride'], ['index.html','booking'], ['fare.html','fare'], ['errand.html','errand']]) {
    const html = fs.readFileSync(site ? path.join(site, dir, 'index.html') : path.join(root, page), 'utf8');
    assert.match(html, /routeQuotes:\s*(?:fastResponse|results\[0\]|fast)\.n2RouteQuotes/);
    assert.ok(html.indexOf('n2-route-messages.js?v=') > html.lastIndexOf('dispatch-address-city-district-v1.js'));
  }
});
