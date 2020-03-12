---
title: Flutter卡在package获取的解决办法
date: 2020-03-12 10:30:32
tags: flutter
---
flutter一直卡在了Running "flutter packages get" in project_name…，试了几次，还是会卡住。
上网查找解决方法，原来是 storage.googleapis.com 撞墙了，而且 flutter 对此已经有对策了。

具体方法
Linux 或 Mac
``` shell
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn
```
Windows
新增两个环境变量即可：
``` shell
PUB_HOSTED_URL ===== https://pub.flutter-io.cn
FLUTTER_STORAGE_BASE_URL ===== https://storage.flutter-io.cn
```
执行一下 flutter doctor -v 命令。

然后再执行 flutter packages get 即可
