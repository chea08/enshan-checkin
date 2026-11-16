/* 恩山论坛 Cookie 获取 · Surge；保留原有存储键。 */
(function () {
  'use strict';
  const KEY = 'enshan_forum_cookie';
  const UA_KEY = 'enshan_forum_user_agent';
  const PROFILE_NOTICE_KEY = 'enshan_forum_cookie_profile_notice_at';
  function notify(subtitle, msg) {
    if (typeof $notification !== 'undefined') $notification.post('恩山论坛 Cookie', subtitle, msg);
    else if (typeof $notify !== 'undefined') $notify('恩山论坛 Cookie', subtitle, msg);
  }
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
  function header(headers, name) {
    const key = Object.keys(headers || {}).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? String(headers[key]) : '';
  }
  function auth(cookie) {
    const match = /(?:^|;\s*)[^=;\s]+_auth=([^;]+)/i.exec(cookie || '');
    return match && match[1] !== 'deleted' ? match[1] : '';
  }
  function isProfile(url) {
    return /^https:\/\/www\.right\.com\.cn\/forum\/home\.php\?/i.test(url) &&
      /[?&]mod=space(?:[&#]|$)/i.test(url) &&
      /[?&](?:do=profile|mycenter=1)(?:[&#]|$)/i.test(url);
  }
  try {
    if (typeof $request === 'undefined' || !/^https:\/\/www\.right\.com\.cn\/forum\//i.test($request.url || '')) return;
    const profile = isProfile($request.url);
    const cookie = header($request.headers, 'Cookie');
    const token = auth(cookie);
    if (!token) {
      if (profile) notify('未获取登录 Cookie', '请先登录恩山论坛，再刷新个人资料页；已保存的 Cookie 不会被游客请求覆盖。');
      return;
    }
    const previous = read(KEY);
    if (previous !== cookie && !write(KEY, cookie)) {
      notify('保存失败', 'Surge 本地存储写入失败，请检查后重试。');
      return;
    }
    const ua = header($request.headers, 'User-Agent');
    if (ua && read(UA_KEY) !== ua) write(UA_KEY, ua);
    const changedLogin = auth(previous) !== token;
    const now = Date.now();
    const lastProfileNotice = Number(read(PROFILE_NOTICE_KEY)) || 0;
    const confirmProfile = profile && (!lastProfileNotice || now < lastProfileNotice || now - lastProfileNotice >= 60000);
    if (changedLogin || confirmProfile) {
      notify(changedLogin ? '获取成功' : '更新成功', profile
        ? '已从个人资料页保存登录 Cookie，无需点击签到。'
        : '登录 Cookie 已保存，可以运行签到脚本。');
      if (profile) write(PROFILE_NOTICE_KEY, String(now));
    }
  } catch (_) {
    notify('获取失败', '请重新登录恩山论坛并刷新页面。');
  } finally {
    $done({});
  }
})();
