# TVBox 到 CatVodOpen（Node.js）转换状态

更新：2026-10-10

## Android Bridge 兼容的配置读取

转换器现在复刻 Android/FongMi Bridge 的配置解包方式：依次尝试普通/含注释 JSON、`八字符**Base64`、`2423…` AES-CBC、URL 编码和 `base64://` 包装，并以浏览器、OkHttp 3、OkHttp 4 标识重新请求。它只解包订阅配置，不执行远程 JAR、DEX、DRPY 或网页脚本。

```powershell
node scripts/convert-tvbox-subscription.mjs `
  --url "http://www.饭太硬.cc/tv" `
  --output converted\fty-node-candidates.json
```

## 当前转换结果

| 订阅 | 当前读取结果 | 已映射到现有 Node 适配器 | 未重写 CSP 项 |
| --- | ---: | ---: | ---: |
| 饭太硬 | 48 | 11 | 37 |
| 肥猫 | 39（上游有一处 JSON 键拼写错误，使用本地修复副本） | 16 | 23 |
| 王二小 | 63 | 6 | 57 |

### 已验证可运行的饭太硬项

[fty-node-verified.json](./fty-node-verified.json) 包含原有厂长、奥特、动漫巴士、急救教学，以及 7 个 Bili 配置源。Bili 项均按原分类文件完成 `home/category/detail/play/search` 在线只读验证。

### 肥猫

[feimao-node-candidates.json](./feimao-node-candidates.json) 包含 16 个可由现有 Node 适配器承接的候选项；[feimao-node-verified.json](./feimao-node-verified.json) 包含已通过全流程验证的 6 个 Bili 源和已验证的干饭、一碗。其余候选默认 `enable: false`。

### 王二小

[wanger-node-candidates.json](./wanger-node-candidates.json) 列出 6 个已映射 Bili 项和 57 个待独立重写的 `csp_Wex*Guard`、网盘、直播或短剧项；[wanger-node-verified.json](./wanger-node-verified.json) 包含 6 个五入口验证通过的 Bili 源。

## 为什么不能自动“重写全部 CSP”

饭太硬和王二小的 `spider` 地址确实可以被 Android Bridge 加载，但下载后是 ZIP：DEX 只包含 Guard 转发壳，真正 CSP 实现在各自的原生库和加密资源（饭太硬为 `ftyguard`，王二小为 `wexguard`）。订阅 JSON 只给出类名，例如 `csp_WexkuihuatvGuard`，没有公开的请求路径、签名、页面选择器或播放解密规则。

因此，完整的纯 Node 迁移只能逐协议独立实现和验证 `home/category/detail/play/search`，不能由订阅字段或 Android Bridge 运行结果自动生成。未重写项继续使用 Android Bridge 执行才会保持原功能；本目录中的 Node 输出只发布已实现且可验证的适配器。

## 验证

- `npm test`：16/16 通过，其中包含 Bridge 解码与 Bili 五入口协议测试。
- `npm run build`：通过。
- `npm run test:bundle`：通过，独立服务正常发布 9 个现有站点且不泄露协议密钥。
