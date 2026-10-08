# OKBOX CatVodOpen 0.1

独立维护的 Node.js 爬虫订阅源码。目录和单站 `__jsEvalReturn()` 接口参考 CatVodOpen；GitHub Actions 将源码打包为 `dist/index.js` 和 `dist/index.js.md5`，供 OKBOX 的 Docker 媒体服务器加载。

本项目不使用 Android、DEX/JAR 或源作者的整个加密程序。不需要把服务器管理中心上传 GitHub。只上传本目录中的文件。

## 首批适配

| 站点 | 协议 | 说明 |
|---|---|---|
| 厂长 | 网站 HTML | 自动跟随入口跳转，解析当前分类、搜索表单、详情及播放页 |
| 干饭 | 肥猫 AppGet 家族 | 独立 Node 请求、AES 响应解密、搜索、详情和签名播放 |
| 一碗 | 肥猫 AppGet 家族 | 与干饭共用协议实现，各自保存入口和公开初始化参数 |
| 蔬菜 | 肥猫 AppGet 家族 | 自动读取地址发布页，缓存 15 分钟；部分影片上游未提供集数 |
| 动漫巴士 | 网站 HTML + 播放器 HTTP API | 分类、搜索、详情与播放器参数解析 |

仅列出已编写适配器的站点，不代表所有影片、线路永久可用。真实核验结果见 `docs/verification.md`。其他缺失站点不会用空实现或名称替换假装可用。

## 上传 GitHub 并生成订阅

1. 解压源码包，新建一个 GitHub 仓库，默认分支为 `main`。
2. 将本目录全部源码上传到仓库根目录，包含隐藏的 `.github/workflows/build.yml`。不要上传 `node_modules`。
3. 打开仓库 **Actions → Build Cat subscription → Run workflow**。第一次上传主分支也会自动构建。
4. 成功后会生成 Actions 下载包，并将 `dist/` 提交回 `main` 分支。如果写入被仓库策略阻止，到 **Settings → Actions → General → Workflow permissions** 检查是否允许读写；受保护分支可下载 Actions 产物后手动上传。
5. 在 Docker 管理中心添加下列订阅地址，将 `你的用户名/你的仓库名` 替换为实际值：

```text
https://raw.githubusercontent.com/你的用户名/你的仓库名/main/dist/index.js.md5
```

`.md5` 是校验入口，同目录必须存在 `index.js`。GitHub 只负责构建和托管文件；爬虫请求在你自己的 Docker 服务器中运行，不是让 GitHub Actions 一直充当视频服务器。

以上 raw 地址用于公开仓库。私有仓库需要服务器能够访问的认证入口，不能直接照抄公开 raw 地址。配置中的 `key` 是订阅公开的 AppGet 协议初始化参数，不是个人网盘 Token。请勿向公开仓库添加个人 Cookie、网盘 Token 或账号密码。

## 源码结构

```text
config_open.json            站点名称、模块及源站初始化参数
czzy_open.js                厂长单站适配器
appget_open.js              AppGet 协议适配器，可生成多个独立站点实例
dm84_open.js                动漫巴士单站适配器
lib/cat.js                  HTTP、HTML、AES、集数编码
index.js                    Cat /config 与 /spider HTTP 服务
scripts/build.mjs           打包 JS 并计算 MD5
scripts/verify-live.mjs      真实源验证，独立于离线构建
tests/                      模拟源协议测试
.github/workflows/build.yml GitHub 自动构建与发布
dist/                       构建产物
```

`config_open.json` 是源码的构建配置，不是让 Docker 重新支持 TVBox JSON 订阅。最终只添加 `.js.md5` 地址。

## 本地运行

需要 Node.js 22 或更新版本：

```sh
npm ci --ignore-scripts
npm test
npm run build
npm start
```

默认监听 `127.0.0.1:9988`，提供 `/health`、`/config` 和 `/spider/<站点key>/3/<操作>`。`PORT`、`HOST` 可由 Docker 运行器指定。构建产物已打包第三方依赖，Docker 下载后不需要再次执行 npm install。

真实源检查：

```sh
npm run verify:live
```

结果写入被 Git 忽略的 `verification.local.json`。配置环境变量 `FFPROBE_BIN` 为 ffprobe 可执行文件路径后，还会验证音视频流编码。真实源验证访问上游网站，可能遇到超时或地区差异；GitHub 构建默认运行本地模拟源测试，避免上游临时故障阻止发布。

## 后续新增站点

1. 新建 `xxx_open.js`，导出 `__jsEvalReturn()` 工厂；每次调用返回独立的 `init/home/homeVod/category/search/detail/play` 方法实例。
2. 在 `index.js` 的 `factories` 注册模块，在 `config_open.json` 添加站点。
3. 运行模拟测试、构建和真实完整流程核验，再启用站点。

脚本内部使用 Node 的 HTTP、加密和 HTML 解析，不依赖客户端全局 `req`、`assets://` 或 Dart。虽然接口结构相似，不能保证这些源码直接放进旧版 CatVodOpen 客户端执行；交付目标是生成 Docker 可运行的 Node 订阅。

## 更新范围

GitHub Actions 在源码或站点参数改变后重新生成 JS。厂长会自动跟随配置入口的跳转；AppGet 地址或公开密钥改变时需要更新 `config_open.json`。本版没有声称自动同步饭太硬/肥猫/王二小所有配置，也没有包含网盘登录或 P2P 下载引擎。

参考格式：https://github.com/itfw/CatVodOpen

参考协议资料：https://github.com/qist/tvbox/tree/master/cat/js