---
title: helm在k8s上的部署
date: 2019-12-21 09:57:06
tags: devops
---
helm是k8s集群上的包管理工具，类似centos上的yum，ubuntu上的apt-get。
在安装了k8s后我今天打算安装helm,来部署ingress暴露我的服务
## 基本概念
> 对于应用发布者而言，可以通过helm打包应用，管理应用依赖关系，管理应用版本并发布应用到软件仓库。
> 对于使用者而言，使用helm后不用需要了解kubernetes的yaml语法并编写应用部署文件，可以通过helm下载并在kubernetes上安装需要的应用。
> 除此以外，helm还提供了kubernetes上的软件部署，删除，升级，回滚应用的强大功能。
## 组件说明
- helm: kubernetes的应用打包工具，也是命令行工具的名称。
- tiller: helm的服务端，部署在kubernetes集群中，用于处理helm的相关命令。
- chart: helm的打包格式，内部包含了一组相关的kubernetes资源。
- repoistory: helm的软件仓库，repository本质上是一个web服务器，该服务器保存了chart软件包以供下载，并有提供一个该repository的chart包的清单文件以供查询。在使用时，helm可以对接多个不同的Repository。
- release: 使用helm install命令在kubernetes集群中安装的Chart称为Release。
## 安装
Helm由客户端命helm令行工具和服务端tiller组成，Helm的安装十分简单。 下载helm命令行工具到master节点node1的/usr/local/bin下，这里下载的2.13.1版本：
``` shell 
wget https://storage.googleapis.com/kubernetes-helm/helm-v2.13.1-linux-amd64.tar.gz
tar -zxvf helm-v2.13.1-linux-amd64.tar.gz
cd linux-amd64/
cp helm /usr/local/bin/
```
因为Kubernetes APIServer开启了RBAC访问控制，所以需要创建tiller使用的service account: tiller并分配合适的角色给它。 详细内容可以查看helm文档中的Role-based Access Control。 这里简单起见直接分配cluster-admin这个集群内置的ClusterRole给它。创建rbac-config.yaml文件：
``` shell
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tiller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: tiller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: tiller
    namespace: kube-system
```
``` shell
kubectl create -f rbac-config.yaml
serviceaccount/tiller created
clusterrolebinding.rbac.authorization.k8s.io/tiller created
```
接下来使用helm部署tiller:
``` shell
helm init --service-account tiller --skip-refresh
```
但是没有启动，查看了原因是镜像被强了，只能去阿里云下载对应的镜像,然后更名
``` shell
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.13.1
docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.13.1 gcr.io/kubernetes-helm/tiller:v2.13.1
```
然后再执行一遍
``` shell
helm init --service-account tiller --skip-refresh
Creating /root/.helm
Creating /root/.helm/repository
Creating /root/.helm/repository/cache
Creating /root/.helm/repository/local
Creating /root/.helm/plugins
Creating /root/.helm/starters
Creating /root/.helm/cache/archive
Creating /root/.helm/repository/repositories.yaml
Adding stable repo with URL: https://kubernetes-charts.storage.googleapis.com
Adding local repo with URL: http://127.0.0.1:8879/charts
$HELM_HOME has been configured at /root/.helm.

Tiller (the Helm server-side component) has been installed into your Kubernetes Cluster.

Please note: by default, Tiller is deployed with an insecure 'allow unauthenticated users' policy.
To prevent this, run `helm init` with the --tiller-tls-verify flag.
For more information on securing your installation see: https://docs.helm.sh/using_helm/#securing-your-helm-installation
Happy Helming!
```
tiller默认被部署在k8s集群中的kube-system这个namespace下：
``` shell
kubectl get pod -n kube-system -l app=helm
NAME                            READY   STATUS    RESTARTS   AGE
tiller-deploy-6966cf57d8-kfxlg   1/1     Running   0          83s
```
``` shell 
[root@iZ8vbbld8tet39uo7wyi2jZ ~]# helm version
Client: &version.Version{SemVer:"v2.13.1", GitCommit:"618447cbf203d147601b4b9bd7f8c37a5d39fbb4", GitTreeState:"clean"}
Server: &version.Version{SemVer:"v2.13.1", GitCommit:"618447cbf203d147601b4b9bd7f8c37a5d39fbb4", GitTreeState:"clean"}
```
## 使用Helm部署Nginx Ingress
为了便于将集群中的服务暴露到集群外部，从集群外部访问，接下来使用Helm将Nginx Ingress部署到Kubernetes上。 Nginx Ingress Controller被部署在Kubernetes的边缘节点上
``` shell
kubectl label node node1 node-role.kubernetes.io/edge=
node/node1 labeled
```
我们将node1做为边缘节点，打上Label：
``` shell
kubectl get node
NAME    STATUS   ROLES         AGE   VERSION
node1   Ready    edge,master   24m   v1.14.0
node2   Ready    <none>        11m   v1.14.0
```
stable/nginx-ingress chart的值文件ingress-nginx.yaml：
``` shell
controller:
  replicaCount: 1
  hostNetwork: true
  nodeSelector:
    node-role.kubernetes.io/edge: ''
  affinity:
    podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - nginx-ingress
            - key: component
              operator: In
              values:
              - controller
          topologyKey: kubernetes.io/hostname
  tolerations:
      - key: node-role.kubernetes.io/master
        operator: Exists
        effect: NoSchedule

defaultBackend:
  nodeSelector:
    node-role.kubernetes.io/edge: ''
  tolerations:
      - key: node-role.kubernetes.io/master
        operator: Exists
        effect: NoSchedule
```
nginx ingress controller的副本数replicaCount为1，将被调度到node1这个边缘节点上。这里并没有指定nginx ingress controller service的externalIPs，而是通过hostNetwork: true设置nginx ingress controller使用宿主机网络。
``` 
helm repo update

helm install stable/nginx-ingress \
-n nginx-ingress \
--namespace ingress-nginx  \
-f ingress-nginx.yaml
```
当然意料之中的没有这么一番丰顺
``` shell
kubectl get pods -n ingress-nginx
NAME                                            READY   STATUS             RESTARTS   AGE
nginx-ingress-controller-5f94977665-xx5dh       1/1     Running            0          4h43m
nginx-ingress-default-backend-774bd49bf-mm56k   0/1     ImagePullBackOff   0          4h43m
```
## 然后我们通过kubectl describe这个命令查看这个pod没有启动的原因
[root@iZ8vbbld8tet39uo7wyi2jZ ~]# kubectl --namespace=ingress-nginx describe pod nginx-ingress-default-backend-774bd49bf-mm56k
``` shell
Name:         nginx-ingress-default-backend-774bd49bf-mm56k
Namespace:    ingress-nginx
Priority:     0
Node:         iz8vbbld8tet39uo7wyi2jz/172.26.139.97
Start Time:   Fri, 20 Dec 2019 19:49:53 +0800
Labels:       app=nginx-ingress
              component=default-backend
              pod-template-hash=774bd49bf
              release=nginx-ingress
Annotations:  <none>
Status:       Pending
IP:           10.244.0.6
IPs:
  IP:           10.244.0.6
Controlled By:  ReplicaSet/nginx-ingress-default-backend-774bd49bf
Containers:
  nginx-ingress-default-backend:
    Container ID:
    Image:          k8s.gcr.io/defaultbackend-amd64:1.5
    Image ID:
    Port:           8080/TCP
    Host Port:      0/TCP
    State:          Waiting
      Reason:       ImagePullBackOff
    Ready:          False
    Restart Count:  0
    Liveness:       http-get http://:8080/healthz delay=30s timeout=5s period=10s #success=1 #failure=3
    Readiness:      http-get http://:8080/healthz delay=0s timeout=5s period=5s #success=1 #failure=6
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from nginx-ingress-backend-token-ftx8j (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             False
  ContainersReady   False
  PodScheduled      True
Volumes:
  nginx-ingress-backend-token-ftx8j:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  nginx-ingress-backend-token-ftx8j
    Optional:    false
QoS Class:       BestEffort
Node-Selectors:  node-role.kubernetes.io/edge=
Tolerations:     node-role.kubernetes.io/master:NoSchedule
                 node.kubernetes.io/not-ready:NoExecute for 300s
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:
  Type     Reason  Age                     From                              Message
  ----     ------  ----                    ----                              -------
  Warning  Failed  58m (x17 over 3h58m)    kubelet, iz8vbbld8tet39uo7wyi2jz  Error: ErrImagePull
  Warning  Failed  3m7s (x264 over 3h58m)  kubelet, iz8vbbld8tet39uo7wyi2jz  Error: ImagePullBackOff
```
原来还是对应的image没有下载过来
```
docker pull registry.cn-qingdao.aliyuncs.com/kubernetes_xingej/defaultbackend-amd64:1.5
docker tag googlecontainer/defaultbackend-amd64:1.1 k8s.gcr.io/defaultbackend-amd64:1.5
docker rmi registry.cn-qingdao.aliyuncs.com/kubernetes_xingej/defaultbackend-amd64:1.5
```
然后我们确认下对应的pod和service是否启动成功
``` shell
[root@iZ8vbbld8tet39uo7wyi2jZ ~]# kubectl get pods -n ingress-nginx
NAME                                            READY   STATUS    RESTARTS   AGE
nginx-ingress-controller-5f94977665-xx5dh       1/1     Running   0          5h9m
nginx-ingress-default-backend-774bd49bf-mm56k   1/1     Running   0          5h9m
[root@iZ8vbbld8tet39uo7wyi2jZ ~]# kubectl get service -n ingress-nginx
NAME                            TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
nginx-ingress-controller        LoadBalancer   10.96.96.226    <pending>     80:32074/TCP,443:32522/TCP   5h13m
nginx-ingress-default-backend   ClusterIP      10.96.228.114   <none>        80/TCP                       5h13m
```
然后访问下链接，测试是否链接成功
``` shell
[root@iZ8vbbld8tet39uo7wyi2jZ ~]# curl 172.26.139.97
default backend - 404
```
这样就可以了
## 参考资料

+ [使用kubeadm安装Kubernetes 1.14](https://blog.frognew.com/2019/04/kubeadm-install-kubernetes-1.14.html#31-helm)
+ [kubernetes 1.12.1 Ingress-nginx 部署使用](https://www.jianshu.com/p/e30b06906b77)
+ [Helm入门](https://juejin.im/post/5d54f87ff265da03b1204581)
+ [K8s安装Ingress](https://blog.bwcxtech.com/posts/5c50d041/)
