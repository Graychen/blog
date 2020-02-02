---
title: flutter环境搭建
date: 2020-01-16 23:48:48
tags: 技术
---
最近开始接触flutter,今天配置了flutter的开发环境，现在把这个过程记录下来.
# 系统环境要求
macOS (64-bit)
硬盘空间: 700 MB (不包含android studio等编辑器工具).
命令行工具:bash, mkdir, rm, git, curl, unzip, which,brew需要保证上述命令在命令行下能使用，
# 下载flutter
https://flutter.dev/docs/get-started/install/macos
- 解压安装包到你想安装的目录，如：
``` shell
cd ~/development
unzip ~/Downloads/flutter_macos_v0.5.1-beta.zip
```
添加flutter相关工具到path中：
export PATH=`pwd`/flutter/bin:$PATH
> 这个目前只能暂时配置flutter，要永久的话可以vi ~/.bash_profile,
``` shell
PATH=~/Documents/flutter/bin:$PATH
```
# 运行 flutter doctor
``` shell
flutter doctor
```
这是我的结果
```
➜  Documents flutter doctor
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, v1.12.13+hotfix.5, on Mac OS X 10.15.2 19C57, locale zh-Hans-CN)

[✓] Android toolchain - develop for Android devices (Android SDK version 29.0.2)
[✓] Xcode - develop for iOS and macOS (Xcode 11.3)
[!] Android Studio (version 3.5)
    ✗ Flutter plugin not installed; this adds Flutter specific functionality.
    ✗ Dart plugin not installed; this adds Dart specific functionality.
[✓] VS Code (version 1.41.1)
[!] Connected device
    ! No devices available

```
解决步骤:
打开Android Studio > Preferences > Plugins > flutter 下载过来
## iOS 设置
安装 Xcode
- 要为iOS开发Flutter应用程序，您需要Xcode 7.2或更高版本:
- 安装Xcode 7.2或更新版本(通过链接下载或苹果应用商店).
- 配置Xcode命令行工具以使用新安装的Xcode版本 sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer 对于大多数情况，当您想要使用最新版本的Xcode时，这是正确的路径。如果您需要使用不同的版本，请指定相应路径。
- 确保Xcode许可协议是通过打开一次Xcode或通过命令sudo xcodebuild -license同意过了.
使用Xcode，您可以在iOS设备或模拟器上运行Flutter应用程序。
设置iOS模拟器
要准备在iOS模拟器上运行并测试您的Flutter应用，请按以下步骤操作：
在Mac上，通过Spotlight或使用以下命令找到模拟器:
``` shell
open -a Simulator
```
通过检查模拟器 硬件>设备 菜单中的设置，确保您的模拟器正在使用64位设备（iPhone 5s或更高版本）.
根据您的开发机器的屏幕大小，模拟的高清屏iOS设备可能会使您的屏幕溢出。在模拟器的 Window> Scale 菜单下设置设备比例
运行 flutter run启动您的应用.
安装到iOS设备
要将您的Flutter应用安装到iOS真机设备，您需要一些额外的工具和一个Apple帐户，您还需要在Xcode中进行设置。
安装 homebrew （如果已经安装了brew,跳过此步骤）.
打开终端并运行这些命令来安装用于将Flutter应用安装到iOS设备的工具
brew update
然后我们在执行flutter doctor
``` shell
➜  Documents flutter doctor
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, v1.12.13+hotfix.5, on Mac OS X 10.15.2 19C57, locale zh-Hans-CN)

[✓] Android toolchain - develop for Android devices (Android SDK version 29.0.2)
[✓] Xcode - develop for iOS and macOS (Xcode 11.3)
[✓] Android Studio (version 3.5)
[✓] VS Code (version 1.41.1)
[✓] Connected device (1 available)

• No issues found!
```
然后我们创建第一个app项目
``` shell
flutter create my_app
```
然后运行
``` shell
cd my_app
flutter run
```
这样就可以运行第一个flutter的app了

## 参考资料

+ [flutter macOS install](https://flutter.dev/docs/get-started/install/macos)
+ [入门: 在macOS上搭建Flutter开发环境](https://flutterchina.club/setup-macos/)
+ [flutter环境搭建mac版](https://segmentfault.com/a/1190000014845833)
+ [flutter run: No connected devices](https://stackoverflow.com/questions/49045393/flutter-run-no-connected-devices)
