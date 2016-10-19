---
title: 变身吧！我的linux配置环境
date: 2016-10-18 14:35:17
tags: linux
categories: 技术

---
 我用的linux是ubuntu16长期支持版，自带的桌面太丑，自带的终端一直没有分屏功能，所以我就开始了改造工作。
# 先上效果图
 !["我是傲娇的效果图"](/assets/blogImg/桌面带终端效果图.png)
## 终端改造  Terminator
ubuntu自带的终端原本也不错，只是缺少分屏功能和强大的复制粘贴功能，所以就用Terminator来代替，其强大的分屏功能真是我的最爱了。
### 安装方式
sudo apt-get install terminator
### 常用快捷键
垂直分割窗口 `Ctrl+Shift+e`
水平分割窗口 `Ctrl+Shift+o`
复制         `Ctrl+Shift+c`
粘贴         `Ctrl+Shift+v`
切换窗口     `Ctrl+Shift+n`
将分割的某个窗口放大至全屏使用         `Ctrl+Shift+x`
从放大的某一窗口回到多窗口格局         `Ctrl+Shift+z`
 !["我是傲娇的效果图"](/assets/blogImg/多窗终端.png)

### 终端主题
 ``` shell
 apt-get install zsh
 wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh
 chsh -s `which zsh`
 sudo shutdown -r 0
 ```
 我用的主题是`ys`

### 桌面主题
 首先在这里[下载](https://github.com/anmoljagetia/Flatabulous/archive/master.zip)主题包，将文件解压后移动到`/usr/share/themes/`,接着安装图标:
 ```shell
 sudo add-apt-repository ppa:noobslab/icons
 sudo apt-get update
 sudo apt-get install ultra-flat-icons```
 
 然后需要`unity-tweak-tool`
 ```shell
 sudo apt-get install unity-tweak-tool
 sudo unity-tweak-tool
```
在Themes和icons下分别选择刚刚的主题和图标，大功告成！

 !["我是傲娇的效果图"](/assets/blogImg/选择主题.png)
 
完成后的样子 
 !["我是傲娇的效果图"](/assets/blogImg/桌面效果图.png)

