window.lastRequestId = null;
window.proxyConfig = {};
window.urls = new Array(200); // for cache
window.isString = string => ({}.toString.call(string) === '[object String]');

//Breaking the CORS Limitation
window.onHeadersReceivedCallback = details => {
  if (window.proxyDisabled == 'disabled') {
    return {};
  }

  let resHeaders = [];
  if(details.responseHeaders && details.responseHeaders.filter){
    resHeaders = details.responseHeaders.filter((responseHeader) => {
      return !~responseHeader.name.toLowerCase().indexOf('access-control-allow');
    })
  }
  
  resHeaders.push({ name: 'Access-Control-Allow-Origin', value: details.initiator || '*' });
  resHeaders.push({ name: 'Access-Control-Allow-Credentials', value: 'true' });
  resHeaders.push({ name: 'Access-Control-Allow-Headers', value: 'x-requested-with,Content-Type' });

  return {
    responseHeaders: resHeaders
  };
};

window.redirectToMatchingRule = (details) => {
  const rules = window.proxyConfig.proxy;
  let redirectUrl = details.url;

  // in case of chrome-extension downtime
  if (!rules || !rules.length || /^chrome-extension:\/\//i.test(redirectUrl)) {
    return {};
  }

  if (
    /http(s?):\/\/.*\.(js|css|json|jsonp)/.test(redirectUrl) &&
    window.urls.indexOf(redirectUrl) < 0
  ) {
    window.urls.shift();
    window.urls.push(redirectUrl);
  }

  try {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule && rule[0] && window.isString(rule[1])) {
        let reg = rule[0];
        let matched = false;

        // support [ ] ( ) \ * ^ $
        if (/\\|\[|]|\(|\)|\*|\$|\^/i.test(reg)) {
          // support ??
          reg = new RegExp(reg.replace('??', '\\?\\?'), 'i');
          matched = reg.test(redirectUrl);
        } else {
          matched = redirectUrl.indexOf(reg) > -1;
        }

        if (matched && details.requestId !== lastRequestId) {
          redirectUrl = redirectUrl.replace(reg, rule[1]);
        }
      }
    }
  } catch (e) {
    console.error('rule match error', e);
  }
  window.lastRequestId = details.requestId;
  return redirectUrl === details.url ? {} : { redirectUrl };
};

window.onBeforeRequestCallback = details => redirectToMatchingRule(details);
