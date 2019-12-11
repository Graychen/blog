---
title: 记一次阿里云ssh登录不上的bug
date: 2019-12-11 15:00:54
tags: 技术
---
刚刚在阿里云上由于原本的mysql镜像使用不上了，所以开始一顿操作，结果ssh登录不上去了，下面是显示的错误。
#问题描述#
 ssh链接不上，阿里的远程连接也连接不上，failed to create mount unit file /run/systemd/generator/-.mount, as it already exists.Duplicate entry in /etc/fstab?
 #原因#
 系统盘才是挂载到根的。您数据盘也挂载到根。就有问题。我帮您注释了
 ```
 /dev/vdb/ ext3 defaults 0 0
 ```
