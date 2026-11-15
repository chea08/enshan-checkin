/* 恩山论坛 Cookie 获取 · Surge；保留原有存储键。 */
(function () {
  'use strict';
  const KEY = 'enshan_forum_cookie';
  const UA_KEY = 'enshan_forum_user_agent';
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
  try {
    if (typeof $request === 'undefined' || !/^https:\/\/www\.right\.com\.cn\/forum\//i.test($request.url || '')) return;
    const cookie = header($request.headers, 'Cookie');
    const token = auth(cookie);
    if (!token) return;
    const previous = read(KEY);
    if (!write(KEY, cookie)) {
      notify('保存失败', 'Surge 本地存储写入失败，请检查后重试。');
      return;
    }
    const ua = header($request.headers, 'User-Agent');
    if (ua) write(UA_KEY, ua);
    if (auth(previous) !== token) notify('获取成功', '登录 Cookie 已保存，可以运行签到脚本。');
  } catch (_) {
    notify('获取失败', '请重新登录恩山论坛并刷新页面。');
  } finally {
    $done({});
  }
})();
