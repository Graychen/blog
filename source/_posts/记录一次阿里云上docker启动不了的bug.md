---
title: 记录一次阿里云上docker启动不了的bug
date: 2019-10-09 13:25:06
tags: docker
---
# 最近在阿里云上遇到一个docker启动不了的bug，解决的时间蛮久的，所以想记录一下。
``` shell
systemctl status docker.service
● docker.service - Docker Application Container Engine
   Loaded: loaded (/etc/systemd/system/docker.service; enabled; vendor preset: disabled)
   Active: failed (Result: start-limit) since 六 2019-09-28 12:05:46 CST; 5min ago
     Docs: https://docs.docker.com
  Process: 1250 ExecStart=/usr/bin/dockerd --registry-mirror=39.98.73.138 --registry-mirror=<your accelerate address> --registry-mirror=<your accelerate address> --registry-mirror=<your accelerate address> -H fd:// --containerd=/run/containerd/containerd.sock (code=exited, status=1/FAILURE)
 Main PID: 1250 (code=exited, status=1/FAILURE)

9月 28 12:05:44 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: docker.service: main process exited, code=exited, status=1/FAILURE
9月 28 12:05:44 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Failed to start Docker Application Container Engine.
9月 28 12:05:44 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Unit docker.service entered failed state.
9月 28 12:05:44 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: docker.service failed.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: docker.service holdoff time over, scheduling restart.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Stopped Docker Application Container Engine.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: start request repeated too quickly for docker.service
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Failed to start Docker Application Container Engine.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Unit docker.service entered failed state.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: docker.service failed.
[root@iZ8vbcuptq5g86qk6lk4x1Z ~]# journalctl -xe
--
-- Unit docker.socket has finished shutting down.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Stopping Docker Socket for the API.
-- Subject: Unit docker.socket has begun shutting down
-- Defined-By: systemd
-- Support: http://lists.freedesktop.org/mailman/listinfo/systemd-devel
--
-- Unit docker.socket has begun shutting down.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Starting Docker Socket for the API.
-- Subject: Unit docker.socket has begun start-up
-- Defined-By: systemd
-- Support: http://lists.freedesktop.org/mailman/listinfo/systemd-devel
--
-- Unit docker.socket has begun starting up.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Listening on Docker Socket for the API.
-- Subject: Unit docker.socket has finished start-up
-- Defined-By: systemd
-- Support: http://lists.freedesktop.org/mailman/listinfo/systemd-devel
--
-- Unit docker.socket has finished starting up.
--
-- The start-up result is done.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: start request repeated too quickly for docker.service
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Failed to start Docker Application Container Engine.
-- Subject: Unit docker.service has failed
-- Defined-By: systemd
-- Support: http://lists.freedesktop.org/mailman/listinfo/systemd-devel
--
-- Unit docker.service has failed.
--
-- The result is failed.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Unit docker.service entered failed state.
9月 28 12:05:46 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: docker.service failed.
9月 28 12:10:01 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Started Session 6 of user root.
-- Subject: Unit session-6.scope has finished start-up
-- Defined-By: systemd
-- Support: http://lists.freedesktop.org/mailman/listinfo/systemd-devel
--
-- Unit session-6.scope has finished starting up.
--
-- The start-up result is done.
9月 28 12:10:01 iZ8vbcuptq5g86qk6lk4x1Z CROND[1271]: (root) CMD (/usr/lib64/sa/sa1 1 1)
9月 28 12:20:01 iZ8vbcuptq5g86qk6lk4x1Z systemd[1]: Started Session 7 of user root.
-- Subject: Unit session-7.scope has finished start-up
-- Defined-By: systemd
-- Support: http://lists.freedesktop.org/mailman/listinfo/systemd-devel
--
-- Unit session-7.scope has finished starting up.
--
-- The start-up result is done.
9月 28 12:20:01 iZ8vbcuptq5g86qk6lk4x1Z CROND[1277]: (root) CMD (/usr/lib64/sa/sa1 1 1)
lines 2500-2550/2550 (END)  
```
# 解决的步骤:
1）清除/etc/systemd/system/目录下的 docker.service.requires这个目录的生成是安装别的系统Kubernete时生成的依赖信息。
个人总结：对这类问题清除/etc/systemd/system目录下不用的目录和文件是首选
2）执行systemctl daemon-reload或重启系统


## 参考资料

+ [启动DOCKER时，遇到一个很奇葩的问题？](http://www.talkwithtrend.com/Question/415283?order=desc)
