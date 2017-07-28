---
title: docker中使用supervisor管理队列
date: 2017-07-25 23:04:46
tag: php
categories: 技术

---

## 简介
Supervisor[链接](http://supervisord.org) 是一个用 Python 写的进程管理工具，可以很方便的用来启动、重启、关闭进程（不仅仅是 Python 进程）。除了对单个进程的控制，还可以同时启动、关闭多个进程，比如很不幸的服务器出问题导致所有应用程序都被杀死，此时可以用 supervisor 同时启动所有应用程序而不是一个一个地敲命令启动。
## 安装
Supervisor 可以运行在 Linux、Mac OS X 上。如前所述，supervisor 是 Python 编写的，所以安装起来也很方便，可以直接用 pip : sudo pip install supervisor
 如果是 Ubuntu 系统，还可以使用 apt-get install supervisor 安装,由于我们的容器是alpine系统,所以可以在Dockerfile里添加
``` bash
RUN apk add supervisor
```
这样容器就可以安装superviosr
## 配置
然后在docker的服务目录services里创建supervisor目录，创建supervisor.conf文件

``` 
[supervisord]
nodaemon=true
[program:mqtt-server]
directory = /var/www/html ;
command = php yii queue/listen
autostart = true
startsecs = 5
autorestart = true
startretries = 10
redirect_stderr=true
stdout_logfile = /var/www/html/yii-queue-worker.log
```
然后在Dockerfile-web-volumes里面添加

```
- ./services/supervisor:/etc/supervisor/conf.d
```

以此将本地的配置文件映射到docker容器里面的supervisor的默认配置文件
## 运行
> 本来我的想法是在Dockerfile里面直接添加`ENTRYPOINT ['/usr/bin/supervisord','-c','/etc/supervisor/conf.d']`,想在docker build的时候直接启动supervisor管理队列，但是我的队列是其余redis的，运行到这一步的时候redis的docker还没有启动，导致我的页面一直502，虽然supervisor启动了，但是队列的redis驱动还没有启动，所以选择了折中的方法。`注意，如果队列基于其它driver的可以这样直接运行的`

折中的方案是在.gitlab-ci.yml文件中的**testing-server:**-> **script:**和**staging-server:**->**script:**下分别添加
```
- ssh root@$DEPLOY_SERVER "docker exec -i $CI_PROJECT_NAME /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf &>/dev/null&"
```

这样的方式是在部署的时候在启动supervisord,想当于在docker启动后在启动supervisord这个软件，这样就可以实现监听队列了
然后将docker-compose.yml和目录supervisor复制到deploy目录里的production,staging,testing三个目录里面

















