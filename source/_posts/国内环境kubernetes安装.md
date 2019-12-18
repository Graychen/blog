---
title: 国内环境利用kubeadm进行kubernetes安装
date: 2019-12-18 20:10:10
tags: devops
---
最近想要学习kubernetes，特地从阿里云购买了两台云主机，用的是kubeadm部署，由于被墙不能直接执行kubeadm init,比较麻烦，所以练习下kubernetes的安装。
> 先介绍下两台都是centos7,需要注意的是作为主节点的云主机要有两个cpu，内存大于2gb，不然会提示cpu不够和内存限制
# Kubernetes主要核心组件
- etcd保存了整个集群的状态；
- apiserver提供了资源操作的唯一入口，并提供认证、授权、访问控制、API注册和发现等机制；
- controller manager负责维护集群的状态，比如故障检测、自动扩展、滚动更新等；
- scheduler负责资源的调度，按照预定的调度策略将Pod调度到相应的机器上；
- kubelet负责维护容器的生命周期，同时也负责Volume（CVI）和网络（CNI）的管理；
- Container runtime负责镜像管理以及Pod和容器的真正运行（CRI）；
- kube-proxy负责为Service提供cluster内部的服务发现和负载均衡；
除了核心组件，还有一些推荐的Add-ons：
- kube-dns负责为整个集群提供DNS服务
- Ingress Controller为服务提供外网入口
- Heapster提供资源监控
- Dashboard提供GUI
- Federation提供跨可用区的集群
- Fluentd-elasticsearch提供集群日志采集、存储与查询
# 安装kubeadm
采用国内阿里云镜像源，安装kubelet、kubeadm、kubectl:
``` shell 
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
exclude=kube*
EOF

# Set SELinux in permissive mode (effectively disabling it)
setenforce 0
sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config

yum install -y kubelet kubeadm kubectl --disableexcludes=kubernetes

systemctl enable kubelet

```
centos7用户还需要设置路由：
``` shell
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sysctl --system
```
Kubernetes 1.8开始要求关闭系统的Swap，如果不关闭，默认配置下kubelet将无法启动，关闭系统的Swap方法如下:
``` shell
swapoff -a
```
修改 /etc/fstab 文件，注释掉 SWAP 的自动挂载，使用free -m确认swap已经关闭。 swappiness参数调整，修改/etc/sysctl.d/k8s.conf添加下面一行：
``` shell
vm.swappiness=0
```
执行sysctl -p /etc/sysctl.d/k8s.conf使修改生效。

# 获取镜像列表
由于官方镜像地址被墙，所以我们需要首先获取所需镜像以及它们的版本。然后从国内镜像站获取。
``` shell
kubeadm config images list
```
然后我们创建一个k8s.shell文件
``` shell
images=(  # 下面的镜像应该去除"k8s.gcr.io/"的前缀，版本换成上面获取到的版本
    kube-apiserver:v1.17.0
    kube-controller-manager:v1.17.0
    kube-scheduler:v1.17.0
    kube-proxy:v1.17.0
    pause:3.1
    etcd:3.4.3-0
    coredns:1.6.5
)

for imageName in ${images[@]} ; do
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/$imageName
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/$imageName k8s.gcr.io/$imageName
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/$imageName
done
```
然后chmod +x ./k8s.shell给这个shell文件加上执行权限，然后./k8s.shell执行它，它就会从阿里云拉取对应的组件的镜像了
# 初始化环境
``` shell
kubeadm init # 这一步注意，如果需要特定的网络插件，需要额外加参数，具体看网络插件的介绍
```
# 配置授权信息
所需的命令在init成功后也会有提示，主要是为了保存相关的配置信息在用户目录下，这样不用每次都输入相关的认证信息。
``` shell
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
添加网络插件,以下是各个网桥，选择其中一个就可以了
```
## CNI bridge
``` shell
mkdir -p /etc/cni/net.d
cat >/etc/cni/net.d/10-mynet.conf <<-EOF
{
    "cniVersion": "0.3.0",
    "name": "mynet",
    "type": "bridge",
    "bridge": "cni0",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "subnet": "10.244.0.0/16",
        "routes": [
            {"dst": "0.0.0.0/0"}
        ]
    }
}
EOF
cat >/etc/cni/net.d/99-loopback.conf <<-EOF
{
    "cniVersion": "0.3.0",
    "type": "loopback"
}
EOF
```
## flannel
需要在kubeadm init 时设置 --pod-network-cidr=10.244.0.0/16
``` shell
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/v0.10.0/Documentation/kube-flannel.yml
```
weave
``` shell
sysctl net.bridge.bridge-nf-call-iptables=1
kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"
calico
```
需要 kubeadm init 时设置 --pod-network-cidr=192.168.0.0/16
``` shell 
kubectl apply -f https://docs.projectcalico.org/v3.1/getting-started/kubernetes/installation/hosted/rbac-kdd.yaml
kubectl apply -f https://docs.projectcalico.org/v3.1/getting-started/kubernetes/installation/hosted/kub
```
# 查看是否安装成功
``` shell
kubectl get pods -n kube-system
```
如果出现类似下面的情况就说明安装完成了，接下来就可以开始k8s之旅了。
``` shell
NAME                              READY   STATUS              RESTARTS   AGE
coredns-86c58d9df4-mmjls          1/1     Running             0          6h26m
coredns-86c58d9df4-p7brk          1/1     Running             0          6h26m
etcd-promote                      1/1     Running             1          6h26m
kube-apiserver-promote            1/1     Running             1          6h26m
kube-controller-manager-promote   1/1     Running             1          6h25m
kube-proxy-6ml6w                  1/1     Running             1          6h26m
kube-scheduler-promote            1/1     Running             1          6h25m
```
 参考文章:
-------------------
[kubernetes安装国内环境](https://zhuanlan.zhihu.com/p/46341911)
[kubernetes部署](https://zhuanlan.zhihu.com/p/55740564)
[深入剖析k8s之网络模型与CNI网络插件](https://blog.liu-kevin.com/2019/04/22/14-shen-ru-pou-xi-k8szhi-wang-luo-mo-xing-yu-cniwang-luo-cha-jian/)

