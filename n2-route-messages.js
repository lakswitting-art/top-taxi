/* N2 customer messages: show every available route, independently of the selected tab. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./n2-fare-engine'));
  else {
    const api = factory(root.N2FareEngine);
    root.N2RouteMessages = api;
    api.install(root);
  }
})(typeof globalThis === 'object' ? globalThis : this, function (N2) {
  'use strict';
  const DISPLAY_REVISION = '20261031-all-route-messages';

  function routeBlock(routes, options = {}) {
    const serviceType = options.serviceType || 'taxi';
    const extras = options.extras || {amount: 0, items: []};
    const valid = (routes || []).filter(r => r && ['SURFACE', 'FAST', 'ECONOMY'].includes(r.mode) &&
      Number.isFinite(r.distanceKm) && r.distanceKm > 0 && Number.isFinite(r.minutes) && r.minutes > 0 &&
      Number.isFinite(r.fare));
    // An incomplete message must not invent the missing route from the selected quote.
    if (!valid.some(r => r.mode === 'SURFACE') || !valid.some(r => r.mode === 'FAST')) return '';
    const groups = N2.presentRoutes(valid, serviceType);
    const out = ['💰 ' + (options.serviceLabel || (serviceType === 'driver' ? '代駕服務' : '一般搭車'))];
    for (const group of groups) {
      if (group.modes.includes('ECONOMY') && !group.recommended) continue;
      const title = group.modes.includes('SURFACE') && group.modes.includes('FAST')
        ? '平面／快速路線相同'
        : group.modes.includes('SURFACE') ? '平面路線'
          : group.modes.includes('FAST') ? '快速路線' : '推薦路線';
      let amount = group.fare + extras.amount, starting = false;
      if (options.errand) {
        const quote = N2.errandQuote({meterFare: group.fare, taskType: options.taskType, extras});
        amount = quote.total; starting = quote.isStarting;
      }
      const price = options.quoteRequired ? '請洽客服' : '$' + amount + (starting ? ' 起' : '');
      out.push('', '【' + title + '】', group.distanceKm.toFixed(1) + ' km｜約 ' + group.minutes + ' 分鐘',
        (options.priceLabel || '預估車資') + '｜' + price);
    }
    if (extras.items?.length) out.push('', '➕ 加價項目｜' + extras.items.join('、'));
    out.push('', '系統預估' + (options.errand ? '費用' : '車資') + '僅供參考，實際費用依當日行程狀況為準。');
    return out.join('\n');
  }

  function replaceEstimate(text, routes, options) {
    const block = routeBlock(routes, options);
    if (!block) return text;
    const lines = String(text || '').split('\n');
    const divider = lines.findIndex(line => /^━{5,}$/u.test(line.trim()));
    if (divider < 0) return text;
    // Keep the title, non-price notices, and the complete order below the divider.
    const estimateStart = lines.findIndex((line, i) => i > 0 && /^💰/u.test(line.trim()));
    const after = estimateStart >= 0 ? lines.slice(estimateStart, divider) : lines.slice(1, divider);
    const noticeAt = after.findIndex(line => /^系統預估/u.test(line.trim()));
    const notices = noticeAt < 0 ? after.filter(line => /^💬/u.test(line.trim())) : after.slice(noticeAt + 1).filter(line => line.trim());
    return [lines[0], '', block, ...notices.length ? ['', ...notices] : [], '', ...lines.slice(divider)].join('\n');
  }

  function install(target) {
    const bind = (name, context) => {
      const previous = target[name];
      if (typeof previous !== 'function' || previous.n2AllRoutes) return;
      const wrapper = function (...args) {
        const text = previous.apply(this, args);
        const value = context();
        return value ? replaceEstimate(text, value.routes, value.options) : text;
      };
      wrapper.n2AllRoutes = true;
      target[name] = wrapper;
    };
    bind('topTaxiFormatRideMessageV2', () => typeof routeData !== 'undefined' && routeData?.routeQuotes ? {
      routes: routeData.routeQuotes,
      options: {serviceType: rideService, extras: extras(), quoteRequired: rideService !== 'driver' && document.querySelector('#passengers')?.value === '9'}
    } : null);
    bind('topTaxiFormatBookingMessageV2', () => typeof currentFareEstimate !== 'undefined' && currentFareEstimate?.routeQuotes ? {
      routes: currentFareEstimate.routeQuotes,
      options: {serviceType: bookingService, extras: bookingExtras(), quoteRequired: bookingService !== 'driver' && document.getElementById('passengerCount')?.value === '9人座'}
    } : null);
    bind('topTaxiFormatFareMessageV2', () => typeof selectedRouteData !== 'undefined' && selectedRouteData?.routeQuotes ? {
      routes: selectedRouteData.routeQuotes, options: {serviceType: serviceMode}
    } : null);
    bind('topTaxiFormatErrandMessageV2', () => typeof currentEstimate !== 'undefined' && currentEstimate?.routeQuotes ? {
      routes: currentEstimate.routeQuotes,
      options: {errand: true, taskType, serviceType: 'taxi', serviceLabel: taskType === 'move' ? '小型搬家' : '跑腿服務',
        priceLabel: taskType === 'move' ? '預估搬家費' : '預估跑腿費', extras: extraFees()}
    } : null);
  }
  return Object.freeze({DISPLAY_REVISION, routeBlock, replaceEstimate, install});
});
