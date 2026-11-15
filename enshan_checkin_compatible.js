/* 恩山论坛签到 · Surge iOS 5.9+ / Mac 5.5+ */
(function () {
  'use strict';
  const COOKIE_KEY = 'enshan_forum_cookie';
  const UA_KEY = 'enshan_forum_user_agent';
  const ORIGIN = 'https://www.right.com.cn';
  const BASE = ORIGIN + '/forum';
  const HOME = BASE + '/forum.php?mobile=no';
  const PAGE = BASE + '/erling_qd-sign_in.html?mobile=no';
  const SIGN = BASE + '/plugin.php?id=erling_qd%3Aaction&action=sign';
  const DEFAULT_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  let finished = false;
  function read(key) {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key) || '';
    if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key) || '';
    return '';
  }
  function write(key, value) {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.write(value, key);
    if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(value, key);
    return false;
  }
  function finish(title, message) {
    if (finished) return;
    finished = true;
    try {
      console.log('恩山论坛签到：' + title);
      if (typeof $notification !== 'undefined') $notification.post('恩山论坛签到', title, message || '', {url: PAGE});
      else if (typeof $notify !== 'undefined') $notify('恩山论坛签到', title, message || '');
    } finally { $done({}); }
  }
  function plain(value) {
    return String(value || '').replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/ig, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/ig, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function guard(body) {
    if (/aliyunCaptcha|_waf_is_mobile|acw_sc__v2|CF_APP_WAF|滑动验证|验证您是真人|\boo\s*=\s*\[/i.test(body)) {
      throw new Error('网站要求验证，请在浏览器完成验证并刷新论坛，更新 Cookie 后重试。');
    }
    if (/请先登录|您需要登录后才能使用签到功能|您需要先登录|尚未登录|您还没有登录/.test(plain(body))) {
      throw new Error('登录已失效，请重新登录恩山论坛并刷新页面获取 Cookie。');
    }
  }
  function formhash(html) {
    const inputs = html.match(/<input\b[^>]*>/ig) || [];
    for (const input of inputs) {
      if (/\bname\s*=\s*["']formhash["']/i.test(input)) {
        const value = /\bvalue\s*=\s*["']([a-f0-9]{8})["']/i.exec(input);
        if (value) return value[1];
      }
    }
    const value = /\bformhash\s*[:=]\s*["']([a-f0-9]{8})["']/i.exec(html) ||
      /(?:\?|&|&amp;)formhash=([a-f0-9]{8})(?=[&"'\s<>]|$)/i.exec(html);
    return value ? value[1] : '';
  }
  function loggedIn(html) {
    const uid = /\bdiscuz_uid\s*=\s*["']?(\d+)/i.exec(html);
    if (uid) return Number(uid[1]) > 0;
    return /<a\b[^>]*href\s*=\s*["'][^"']*member\.php\?[^"']*action=logout/i.test(html);
  }
  function button(html) {
    const patterns = [
      /<(button|a|span|div)\b[^>]*\bid\s*=\s*["']signin-btn["'][^>]*>([\s\S]*?)<\/\1>/ig,
      /<(button|a|span|div)\b[^>]*\bclass\s*=\s*["'][^"']*\b(?:signed|signin)\b[^"']*["'][^>]*>([\s\S]*?)<\/\1>/ig
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html))) {
        const text = plain(match[2]);
        if (text.length > 80) continue;
        if (/今日已签到|已经签到|已签到/.test(text)) return 'signed';
        if (/^(?:立即|点击|每日)?签到$/.test(text)) return 'unsigned';
      }
    }
    return '';
  }
  function apiResult(body) {
    let data;
    try { data = JSON.parse(body); } catch (_) { data = null; }
    let message = plain(body);
    if (data && typeof data === 'object') {
      const value = data.msg || data.message || data.info;
      message = typeof value === 'string' ? plain(value) : '';
      if (data.success === false || data.status === false || data.status === 'error') return {kind: 'failure', message};
    }
    if (message.length > 600) return {kind: '', message: ''};
    if (/失败|错误|无效|过期|未登录|权限|验证码|非法|拒绝|尚未|没有签到|未能签到|无法签到|签到不成功/.test(message)) return {kind: 'failure', message};
    if (/已经签到|已签到过|今日已签到|今天.*已.*签到/.test(message)) return {kind: 'already', message};
    if (/签到成功|打卡成功/.test(message) || (data && data.success === true)) return {kind: 'success', message};
    return {kind: '', message: ''};
  }
  function mergeCookies(cookie, headers) {
    const jar = Object.create(null);
    cookie.split(/;\s*/).forEach(pair => {
      const index = pair.indexOf('=');
      if (index > 0) jar[pair.slice(0, index)] = pair.slice(index + 1);
    });
    let lines = [];
    if (Array.isArray(headers)) {
      lines = headers.filter(item => String(item.field).toLowerCase() === 'set-cookie').map(item => String(item.value));
    } else {
      const key = Object.keys(headers || {}).find(k => k.toLowerCase() === 'set-cookie');
      const value = key ? headers[key] : [];
      lines = Array.isArray(value) ? value : String(value).split(/,(?=\s*[^=;,\s]+=)/);
    }
    lines.forEach(line => {
      const pair = /^\s*([^=;\s]+)=([^;]*)/.exec(line);
      if (!pair) return;
      const expiry = /(?:^|;)\s*expires\s*=\s*([^;]+)/i.exec(line);
      if (/(?:^|;)\s*max-age\s*=\s*0(?:;|$)/i.test(line) || (expiry && Date.parse(expiry[1]) <= Date.now())) delete jar[pair[1]];
      else jar[pair[1]] = pair[2];
    });
    return Object.keys(jar).map(key => key + '=' + jar[key]).join('; ');
  }
  async function main() {
    const supplied = typeof $argument !== 'undefined' && $argument ? $argument.trim() : '';
    let cookie = supplied || read(COOKIE_KEY).trim();
    if (!cookie) return finish('缺少 Cookie', '启用模块后，登录恩山论坛并刷新页面获取 Cookie。');
    const ua = read(UA_KEY) || DEFAULT_UA;
    function request(method, url, body) {
      const headers = {'User-Agent': ua, Cookie: cookie, 'Accept-Language': 'zh-CN,zh;q=0.9', Referer: PAGE};
      if (method === 'post') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers.Origin = ORIGIN;
      }
      const options = {url, headers, timeout: 12};
      if (body !== undefined) options.body = body;
      return new Promise((resolve, reject) => {
        function complete(error, response, value) {
          if (error) return reject(new Error('网络请求失败，请检查连接后手动重试。'));
          try {
            const html = typeof value === 'string' ? value : '';
            guard(html);
            const status = Number(response && (response.status || response.statusCode));
            if (status >= 300 && status < 400) throw new Error('网站发生跳转，请重新登录论坛并刷新页面后重试。');
            if (status !== 200) throw new Error('论坛返回 HTTP ' + status + '，请稍后重试。');
            if (!html) throw new Error('论坛返回空内容，无法确认签到结果。');
            cookie = mergeCookies(cookie, response.headers);
            if (!supplied && !write(COOKIE_KEY, cookie)) throw new Error('Cookie 更新失败，请检查本地存储。');
            resolve(html);
          } catch (err) { reject(err); }
        }
        if (typeof $httpClient !== 'undefined') {
          options['auto-redirect'] = false;
          options['auto-cookie'] = false;
          options['full-header-mode'] = true;
          $httpClient[method](options, complete);
        } else if (typeof $task !== 'undefined') {
          $task.fetch({...options, method: method.toUpperCase()}).then(response => complete(null, response, response.body), () => complete('network failure'));
        } else reject(new Error('当前脚本环境没有可用的 HTTP API。'));
      });
    }
    const home = await request('get', HOME);
    if (!loggedIn(home)) return finish('登录未生效', '未能确认当前账号登录状态，请重新登录并刷新论坛。');
    const before = await request('get', PAGE);
    if (button(before) === 'signed') return finish('今日已签到', '页面已显示当前账号今日签到完成。');
    const token = formhash(before) || formhash(home);
    if (!token) return finish('页面异常', '未找到 formhash，签到页面可能已经变化。');
    const response = await request('post', SIGN, 'formhash=' + encodeURIComponent(token));
    const result = apiResult(response);
    if (result.kind === 'failure') return finish('签到失败', result.message.slice(0, 200) || '接口明确返回失败，请打开签到页面查看原因。');
    let after;
    try { after = await request('get', PAGE); }
    catch (_) { return finish('签到待确认', '签到请求已提交，但页面复核失败，请打开签到页面确认；脚本不会自动重新提交。'); }
    const state = button(after);
    if (state === 'unsigned') return finish('签到未确认', '复核页面仍显示签到按钮，请在浏览器检查登录状态和验证提示。');
    if (state === 'signed' || result.kind === 'success' || result.kind === 'already') {
      return finish(result.kind === 'already' ? '今日已签到' : '签到成功（已验证）', result.message.slice(0, 200) || '签到页面已显示当前账号完成签到。');
    }
    finish('签到待确认', '接口未返回可识别的成功消息，请打开签到页面确认；脚本不会自动重复提交。');
  }
  main().catch(err => finish('签到未完成', err.message));
})();
