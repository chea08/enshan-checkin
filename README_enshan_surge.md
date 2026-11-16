# 恩山论坛 Surge 签到

适用 Surge iOS 5.9+，默认设备本地时间每天 **08:00** 签到。模块直接引用本仓库的远程脚本，iPhone 不需要填写本地绝对路径。

## 安装与更新

1. 在 Surge 的「模块」中添加或更新以下地址：
   `https://raw.githubusercontent.com/chea08/enshan-checkin/refs/heads/main/enshan.sgmodule`
2. 启用模块和 HTTPS 解密，安装并信任 Surge CA 证书。
3. 用经过 Surge 的浏览器登录 `https://www.right.com.cn/forum/`，点击头像进入个人资料页并刷新，即可获取 Cookie，无需点击签到。个人资料页地址包含 `home.php?mod=space` 和 `do=profile` 或 `mycenter=1`，不绑定固定 UID。已保存 Cookie 时也会提示更新成功；同一登录一分钟内连续刷新仅提示一次。其他论坛页面仍会自动更新 Cookie。
4. 在 Surge 脚本列表手动运行「恩山论坛签到」，检查通知。以后由定时任务执行。

2026-11-16 版更新个人资料页的 Cookie 获取提示，并增加版本参数。若仍运行旧版，请在 Surge 的外部资源列表更新关联脚本，再重新启用模块。

## 文件

- `enshan.sgmodule`：远程脚本配置、Cookie 抓取规则和每日任务。
- `enshan_cookie.js`：获取登录 Cookie 和浏览器 User-Agent。
- `enshan_checkin.js`：获取新 formhash、提交签到并复核结果。

保留原有 Cookie 存储键 `enshan_forum_cookie`。抓取脚本忽略游客请求，避免覆盖登录 Cookie；不在通知或日志中展示 Cookie。切换账号后重新登录并刷新论坛即可更新。

## 结果处理

- 已签到：跳过再次提交。
- 签到成功：接口明确返回成功或当前账号的签到按钮显示完成，且没有相反的页面状态。
- 待确认：返回内容不明确或提交后的页面无法复核，需打开论坛确认。不会因为 HTTP 200 就提示成功，也不会自动重发签到请求。
- 验证或登录失效：在浏览器完成网站验证、重新登录并刷新页面，然后重试。网站验证可能与设备或网络绑定，无法保证自动签到永远可用。

定时任务依赖 Surge 和系统调度，iOS 可能延迟或错过指定分钟；可手动补签。

## 检查范围

发布前使用模拟 HTTP、存储和通知检查登录识别、Cookie 更新、formhash 更新、结果判定、重复签到及失败处理。论坛签到页面存在滑动验证，真实账号签到仍需要安装后的运行结果确认。

脚本使用的 API 参考：[Surge 官方脚本文档](https://manual.nssurge.com/scripting/api.html)。
