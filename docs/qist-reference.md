# qist/tvbox 参考与复用结果

核对日期：2026-10-08。

| 文件或目录 | 核对结论 | 本项目处理 |
| --- | --- | --- |
| cat/tjs/js/changzhang.js | 可读厂长实现；依赖 Spider、cat、cloud 等模块，不能单文件丢进 Node | 参考其播放器协议，独立实现 AES-128-CBC 解密分支；保留现有直链和 iframe 分支 |
| cat/js/czzy_open.js | 旧 Cat 接口，依赖 assets://、宿主 req | 用于核对页面结构，本项目使用 Node HTTP 与 cheerio 实现 |
| cat/js/AppYsV2.js | 可读通用 App 接口；并非所有 App 都使用同一种协议 | 不替换已验证 AppGet 适配器，避免误套协议 |
| cat/js/appysv2.js、caiji.js | 核对内容为 QuickJS 字节码 | 不直接运行；不能把 .js 扩展名当作 Node 兼容证明 |
| cat/tjs/js/feifan.js | 文件自身标注“已失效” | 不加入默认站点 |
| cat/tjs/open_config.json | 包含源配置及账号字段 | 不复制其中 Cookie、Token，不使用他人账号测试 |
| cat/tjs/README.md | 说明 Node 构建输出 dist/index.js.md5，与旧 QuickJS 入口不同 | 本项目也输出独立 Node bundle 和 MD5，但使用自己的构建流程 |

厂长新增分支使用播放器公开协议参数及每页 rand 作为 IV，不执行上游 eval。损坏密文会明确报错。该分支已通过构造响应测试，实时可用性仍需遇到对应播放器验证。

参考仓库并未在根目录提供可直接把所有内容重新授权为 MIT 的声明，因此交付包不整包复制该仓库；本项目 LICENSE 仅覆盖自行编写的代码。更多站点需按依赖、当前接口和实际播放逐个确认，不以配置中的名称数量当作跑通数量。

参考地址：

- https://github.com/qist/tvbox
- https://github.com/qist/tvbox/blob/master/cat/tjs/js/changzhang.js
- https://github.com/qist/tvbox/blob/master/cat/tjs/README.md
