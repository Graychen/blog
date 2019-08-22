---
title: 在minikube部署个node服务
date: 2019-08-22 18:51:09
tags: DevOps
---
## 创建Node.js应用程序
先编写server.js
``` js
var http = require('http');

var handleRequest = function(request, response) {
  console.log('Received request for URL: ' + request.url);
  response.writeHead(200);
  response.end('Hello World!');
};
var www = http.createServer(handleRequest);
www.listen(8080);
```
然后在http://localhost:8080/中看到"Hello World"
## 创建Docker容器镜像
在hellonode文件夹中创建一个Dockerfile命名的文件。Dockerfile描述了build的镜像，通过现有的镜像扩展（extend）build Docker容器镜像，本教程中的镜像扩展（extend）了现有的Node.js镜像。
``` Dockerfile
FROM node:6.9.2
EXPOSE 8080
COPY server.js .
CMD node server.js
```
确保使用Minikube Docker守护进程
``` 
eval $(minikube docker-env)
```
注意：如果不在使用Minikube主机时，可以通过运行eval $(minikube docker-env -u)来撤消此更改。
使用Minikube Docker守护进程build Docker镜像：
```
docker build -t hello-node:v1 .
```
## 创建Deployment
使用kubectl run命令创建Deployment来管理Pod。Pod根据hello-node:v1Docker运行容器镜像：
```
kubectl run hello-node --image=hello-node:v1 --port=8080
```
查看Deployment：
```
kubectl get deployments
```
输出：

```
NAME         DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
hello-node   1         1         1            1           3m
```
查看Pod：
```
kubectl get pods
```
输出：
```
NAME                         READY     STATUS    RESTARTS   AGE
hello-node-714049816-ztzrb   1/1       Running   0          6m
```
查看群集events：

```
kubectl get events
```
查看kubectl配置：
```
kubectl config view
```
## 创建Service
默认情况，这Pod只能通过Kubernetes群集内部IP访问。要使hello-node容器从Kubernetes虚拟网络外部访问，须要使用Kubernetes Service暴露Pod。
我们可以使用kubectl expose命令将Pod暴露到外部环境：
```
kubectl expose deployment hello-node --type=LoadBalancer
```
查看刚创建的Service：
```
kubectl get services
```
输出：

```
NAME         CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE
hello-node   10.0.0.71    <pending>     8080/TCP   6m
kubernetes   10.0.0.1     <none>        443/TCP    14d
```
通过--type=LoadBalancer flag来在群集外暴露Service，在支持负载均衡的云提供商上，将配置外部IP地址来访问Service。在Minikube上，该LoadBalancer type使服务可以通过minikube Service 命令访问。
```
minikube service hello-node
```
将打开浏览器，在本地IP地址为应用提供服务，显示“Hello World”的消息。
最后可以查看到一些日志
```
kubectl logs <POD-NAME>
```
更新应用程序
编辑server.js文件以返回新消息：
```
response.end('Hello World Again!');
```
build新版本镜像
```
docker build -t hello-node:v2 .
```
Deployment更新镜像：
```
kubectl set image deployment/hello-node hello-node=hello-node:v2
```
再次运行应用以查看新消息：
```
minikube service hello-node
```
