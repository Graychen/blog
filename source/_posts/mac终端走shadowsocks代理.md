---
title: mac终端走shadowsocks代理
date: 2019-08-22 11:44:23
tags: 技术
---
shadowsocks设置为：

打开shadowsocks
自动代理模式
服务器（香港阿里云）
以zsh作为说明
``` bash
➜  ~ vim ~/.zshrc
```
添加如下代理配置:

# proxy list
``` bash
alias proxy='export all_proxy=socks5://127.0.0.1:1080'
alias unproxy='unset all_proxy'
:wq保存退出
➜  ~ source ~/.zshrc
```
使用proxy前先查看下当前的ip地址：

``` bash
➜  ~ curl ip.cn
当前 IP：112.64.xxx.xx 来自：上海市 联通
或者
``` 

``` bash
~ curl cip.cc
IP	: 140.206.97.42
地址	: 中国  上海

数据二	: 上海市 | 联通

URL	: http://www.cip.cc/140.206.97.42
``` 
执行:

``` bash
➜  ~ proxy
➜  ~ curl ip.cn
当前 IP：47.89.xx.xxx 来自：香港特别行政区 阿里云
如果ip.cn不能用，可以换个类似的站点查询
```
``` bash
~ curl cip.cc
IP	: 45.78.47.19
地址	: 美国  加利福尼亚

数据二	: 美国 | 加利福尼亚州洛杉矶市 IT7 Networks

URL	: http://www.cip.cc/45.78.47.19
```
没问题，终端走了代理，brew update顺畅了- -
