# Guard 资源分析

饭太硬和王二小的 Guard 资源不是可直接转换的 CSP JavaScript。它们的下载包包含：

- 仅转发调用的 `BaseSpiderGuard` DEX；
- 针对 ABI 的 Android 原生库；
- 由原生库加载的受保护资源。

## 已确认的调用链

两份 DEX 都会从 JAR 的 `assets/` 中复制 ABI 对应的 `.so` 到应用缓存目录并调用 `System.load()`。

- 饭太硬：`ftyguard_v7.so` / `ftyguard_v8.so`。其 `DexNative` 声明了 `decrypt`、`encrypt`、`getLoader`、`getSpider`、`noxSign` 和 `proxyInvoke`。
- 王二小：`wexguard_v7.so` / `wexguard_v8.so`。其 `DexNative` 声明了 `getLoader`、`getSpider` 和 `proxyInvoke`。

二者都会经 `getLoader(Context)` 创建运行时 DexClassLoader，再经 `getSpider(loader, className)` 取得实际 CSP 实例。因此，下一步应在隔离 Android 运行时对 `getLoader` 完成后产生的文件进行采集，而不是猜测 ZIP 外观或在 Windows 上执行 Android `.so`。

## 静态检查工具

```powershell
node scripts/inspect-guard.mjs <guard-or-so> [...]
```

工具只读取文件，不加载或执行 Android 原生库；它报告 ELF ABI、动态符号，以及伪装为 ZIP 的资源头能否正常解压。饭太硬的 `ftyshinidie.guard` 带有 `classes.dex` 本地 ZIP 头，但其压缩段无法按 DEFLATE 直接解开，说明该段仍受原生协议保护。
