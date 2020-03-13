---
title: flutter的一个运行错误
date: 2020-03-13 17:04:56
tags: flutter
---
执行flutter run会发生以下错误，
```
Xcode's output:
↳
    /Users/zzz/Desktop/pro/flutter/myap/build/ios/Debug-iphoneos/Runner.app: resource fork, Finder information, or similar detritus not allowed
    Command CodeSign failed with a nonzero exit code
    note: Using new build system
    note: Planning build
    note: Constructing build description
Could not build the precompiled application for the device.
Error launching application on iphone11 pro max.
```
当我在当前目录下执行:
```
xattr -rc .
```
接着执行flutter run 它就可以了，
