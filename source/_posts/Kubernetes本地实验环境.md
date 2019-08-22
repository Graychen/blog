---
layout: minikube
title: Kubernetes本地实验环境
date: 2019-08-22 13:12:59
tags: DevOps
---
最近在配置本地的k8s环境，由于网络原因，老是配置不成，偶然发现了阿里改版的minikube，
所以使用这个minikube来安装.
我是mac电脑，首先
``` bash
brew install kubernetes-cli
```
然后确认是否安装成功
```
kubectl version
```
接着安装[VitualBox](https://www.virtualbox.org/wiki/Downloads)
然后安装改版的minikube
``` bash
curl -Lo minikube http://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/releases/v1.2.0/minikube-darwin-amd64 && chmod +x minikube && sudo mv minikube /usr/local/bin/
```
接着启动
``` bash
minikube start --registry-mirror=https://registry.docker-cn.com
```
打开Kubernetes控制台
``` bash
minikube dashboard
```
## 参考资料

+ [Minikube - Kubernetes本地实验环境](https://yq.aliyun.com/articles/221687)
