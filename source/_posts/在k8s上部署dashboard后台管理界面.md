---
title: 在k8s上部署dashboard后台管理界面
date: 2019-12-20 16:30:34
tags: devops
---
在昨天成功部署了k8s后，我今天尝试着部署它的后台web界面
# 下载官方的yaml
``` 
wget https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/recommended/kubernetes-dashboard.yaml
```
由于官方的yaml不直接对外开放，需要在本地直接进行`kubectl proxy`进行代理,所以我们通过修改yaml来直接暴露端口和服务。有两个地方要修改：
## 第一个是修改镜像,kubernetes-dashboard.yaml配置文件112行
``` shell
 90 # ------------------- Dashboard Deployment ------------------- #
 91 
 92 kind: Deployment
 93 apiVersion: apps/v1
 94 metadata:
 95 labels:
 96 k8s-app: kubernetes-dashboard
 97 name: kubernetes-dashboard
 98 namespace: kube-system
 99 spec:
100 replicas: 1
101 revisionHistoryLimit: 10
102 selector:
103 matchLabels:
104 k8s-app: kubernetes-dashboard
105 template:
106 metadata:
107 labels:
108 k8s-app: kubernetes-dashboard
109 spec:
110 containers:
111 - name: kubernetes-dashboard
112 #image: k8s.gcr.io/kubernetes-dashboard-amd64:v1.10.1
113 image: mirrorgooglecontainers/kubernetes-dashboard-amd64:v1.10.0
114 ports:
115 - containerPort: 8443
116 protocol: TCP
```
## 第二个是添加一个type,指定端口类型为 NodePort，这样外界可以通过地址 nodeIP:nodePort 访问 dashboard,kubernetes-dashboard.yaml配置文件158行:
``` shell
148 # ------------------- Dashboard Service ------------------- #
149 
150 kind: Service
151 apiVersion: v1
152 metadata:
153 labels:
154 k8s-app: kubernetes-dashboard
155 name: kubernetes-dashboard
156 namespace: kube-system
157 spec:
158 type: NodePort
159 ports:
160 - port: 443
161 targetPort: 8443
162 selector:
163 k8s-app: kubernetes-dashboard
```
## 部署到k8s集群
``` shell
# kubectl apply -f kubernetes-dashboard.yaml 
# kubectl get pods -n kube-system |grep dashboard
kubernetes-dashboard-6685cb584f-xlk2h 1/1 Running 0 98s
# kubectl get pods,svc -n kube-system
NAME READY STATUS RESTARTS AGE
pod/coredns-78d4cf999f-5hcjm 1/1 Running 0 3h21m
pod/coredns-78d4cf999f-6mlql 1/1 Running 0 3h21m
pod/etcd-k8sm-218 1/1 Running 0 3h20m
pod/kube-apiserver-k8sm-218 1/1 Running 0 3h19m
pod/kube-controller-manager-k8sm-218 1/1 Running 0 3h20m
pod/kube-flannel-ds-amd64-6kfhg 1/1 Running 0 3h13m
pod/kube-flannel-ds-amd64-c4fr4 1/1 Running 0 152m
pod/kube-flannel-ds-amd64-qhc2w 1/1 Running 0 151m
pod/kube-proxy-7hntq 1/1 Running 0 151m
pod/kube-proxy-b4txb 1/1 Running 0 3h21m
pod/kube-proxy-bz529 1/1 Running 0 152m
pod/kube-scheduler-k8sm-218 1/1 Running 0 3h20m
pod/kubernetes-dashboard-6685cb584f-xlk2h 1/1 Running 0 3m5s

NAME TYPE CLUSTER-IP EXTERNAL-IP PORT(S) AGE
service/kube-dns ClusterIP 10.96.0.10 <none> 53/UDP,53/TCP 3h21m
service/kubernetes-dashboard NodePort 10.104.4.26 <none> 443:30023/TCP 3m5s
```
> 因为我是阿里云的ecs，还要在安全组添加30023进入的端口才能在外部访问
![截屏2019-12-21上午9.22.32.png](https://ws1.sinaimg.cn/large/6919c235gy1ga4315f1moj227u15mtg2.jpg)
## Token （令牌） 认证方式登录

1）授权 (所有 namespace )

// 创建serviceaccount
``` shell
# kubectl create serviceaccount dashboard-serviceaccount -n kube-system
```
// 创建clusterrolebinding
``` shell
# kubectl create clusterrolebinding dashboard-cluster-admin --clusterrole=cluster-admin --serviceaccount=kube-system:dashboard-serviceaccount
```
2）获取令牌（用于网页登录）

// 查看口令列表
``` shell
# kubectl get secret -n kube-system |grep dashboard-serviceaccount-token
dashboard-serviceaccount-token-f45wg kubernetes.io/service-account-token 3 22s
```
// 获取口令
``` shell
# kubectl describe secret dashboard-serviceaccount-token-f45wg -n kube-system
```
3）将获取到的token放在令牌里
![截屏2019-12-21上午9.25.38.png](https://ws1.sinaimg.cn/large/6919c235gy1ga434bjbalj227k13sgsr.jpg)
4) 登录成功
![截屏2019-12-21上午9.33.33.png](https://ws1.sinaimg.cn/large/6919c235gy1ga43c9j0ywj228011oq93.jpg)
5) 但是我还是遇到了
![截屏2019-12-21上午9.36.05.png](https://ws1.sinaimg.cn/large/6919c235gy1ga43f7ljwhj227o108n06.jpg)
这个问题暂时还没有解决
 参考文章:
-------------------
[30分钟带你搭建一套Dashboard的kubernetes（K8S）集群](https://zhuanlan.zhihu.com/p/92923128)
[使用kubeadm安装Kubernetes 1.8版本](https://www.kubernetes.org.cn/2906.html)
