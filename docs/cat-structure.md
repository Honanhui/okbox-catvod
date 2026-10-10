# Cat 参考订阅结构与本项目优化

日期：2026-10-08。

## 下载到的内容

用户指定入口实际下载到两个文件：index.js（6,486,569 字节）及 index.js.md5（32 字节）。MD5 校验一致：e5b9b774af06f3014f4cf0087cdf07a9。

index.js 是打包压缩后的 Node 程序，没有 sourceMappingURL。仅凭此入口无法取得作者原始的完整源码目录；不能把推测的目录说成已经下载的源码。

脚本包含模块注册、/config、/full-config、/check 和 /spider 路由，以及视频、阅读、外观等配置。程序启动会读取远程 Wex 配置；断网隔离启动因远程域名不可访问未能取得新目录。references/cat-sites.json 保存的是同一 MD5 程序此前返回的 94 条视频目录快照，只保留名称和路由元数据，不包含个人账号或配置凭据。不将94条解释成94个已经能播放的影视站。

原始下载文件保存在工作区 .analysis/cat-structure-20261008，不放进本项目发布包，也不把他人的整个打包程序重新发布成我们的爬虫。

## 已采用的结构改进

```text
config_open.json      站点与协议参数
spiders/registry.js  模块注册、站点开关、独立按需初始化
*_open.js            自己维护的站点/协议适配器
lib/                 公共 HTTP、HTML、加解密等
index.js             /config、/full-config、/check、/spider 接口
references/          仅供比较的站点目录，不参与运行
scripts/             构建、校验和真实源验证
tests/               协议及注册隔离测试
dist/index.js        单文件 Node 部署产物
dist/index.js.md5    产物 MD5
```

- 不再在 HTTP 入口手动注册每个站点实例，适配器由注册层统一创建。
- 每站按需初始化，并发共享初始化任务；某站初始化失败不会影响另一站，失败后可重试。
- enable:false 的站点不进入运行目录；拒绝重复 key，避免静默覆盖。
- 保留站点独立的 searchable、quickSearch、filterable；没有筛选功能时默认不宣称可筛选。
- 对外目录去除 ext，协议参数只在服务端使用。
- 增加 /full-config 与 /check 的 run 字段，保留现有 Docker 接口。

当前仍为五个自有适配条目。参考目录的其他站点不会自动变成可用模块；需要逐站实现及验证，特别是网盘和 P2P 线路。
