---
title: mac下配置vscode的xdebug
date: 2019-08-21 18:39:44
tags: 技术
---
# 最近将mac环境下的vscode配置了xdebug，因为配置的比较曲折，所以决定记录下思路
## 首先下载xdebug的扩展
``` php
pecl install xdebug
```
### 配置php.ini
``` php
zend_extension="xdebug.so"
xdebug.profiler_enable = on
xdebug.trace_output_dir = "/data/logs/xdebug"
xdebug.profile_output_dir = "/data/logs/xdebug"
xdebug.remote_enable = 1
xdebug.remote_autostart = 1
xdebug.remote_host = "localhost"
xdebug.remote_port = 9000
xdebug.idekey = "phpStorm"
 ```
### 保存并退出，重启php-fpm 
 ``` php
 brew services restart php72
```
## 二、VS Code 配置
1.安装 PHP Debug 扩展
2.左侧调试按钮 - 左侧顶部调试[Listen for XDebug]，设置
``` php
{
    // 使用 IntelliSense 了解相关属性。 
    // 悬停以查看现有属性的描述。
    // 欲了解更多信息，请访问: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
    {
        "name": "Listen for Xdebug",
        "type": "php",
        "request": "launch",
        "port": 9000
    },
    {
        "name": "Launch currently open script",
        "type": "php",
        "request": "launch",
        "program": "${file}",
        "cwd": "${fileDirname}",
        "port": 9001
    }
    ]
}
 ```
## 然后就可以利用xdebug调试php了
