---
title: 阿里云linux系统挂载磁盘
date: 2020-01-05 11:11:32
tags:
---
一、打开控制台-服务器-磁盘-创建磁盘
创建磁盘, 完成之后在返回刚刚的地方, 执行挂载
二、然后登录linux服务器 进程分区挂载
``` shell
[root@iZ8vbcuptq5g86qk6lk4x1Z data]# fdisk -l

磁盘 /dev/vda：42.9 GB, 42949672960 字节，83886080 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x000b2d99

   设备 Boot      Start         End      Blocks   Id  System
/dev/vda1   *        2048    83875364    41936658+  83  Linux

磁盘 /dev/vdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
```
然后我们将挂载的设置更改写入
``` shell
[root@iZ8vbcuptq5g86qk6lk4x1Z data]# fdisk /dev/vdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

Device does not contain a recognized partition table
使用磁盘标识符 0x677825d5 创建新的 DOS 磁盘标签。

命令(输入 m 获取帮助)：n
Partition type:
   p   primary (0 primary, 0 extended, 4 free)
   e   extended
Select (default p): p
分区号 (1-4，默认 1)：
起始 扇区 (2048-209715199，默认为 2048)：
将使用默认值 2048
Last 扇区, +扇区 or +size{K,M,G} (2048-209715199，默认为 209715199)：
将使用默认值 209715199
分区 1 已设置为 Linux 类型，大小设为 100 GiB

命令(输入 m 获取帮助)：p

磁盘 /dev/vdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x677825d5

   设备 Boot      Start         End      Blocks   Id  System
/dev/vdb1            2048   209715199   104856576   83  Linux

命令(输入 m 获取帮助)：p

磁盘 /dev/vdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x677825d5

   设备 Boot      Start         End      Blocks   Id  System
/dev/vdb1            2048   209715199   104856576   83  Linux

命令(输入 m 获取帮助)：p

磁盘 /dev/vdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x677825d5


   设备 Boot      Start         End      Blocks   Id  System
/dev/vdb1            2048   209715199   104856576   83  Linux

命令(输入 m 获取帮助)：m
命令操作
   a   toggle a bootable flag
   b   edit bsd disklabel
   c   toggle the dos compatibility flag
   d   delete a partition
   g   create a new empty GPT partition table
   G   create an IRIX (SGI) partition table
   l   list known partition types
   m   print this menu
   n   add a new partition
   o   create a new empty DOS partition table
   p   print the partition table
   q   quit without saving changes
   s   create a new empty Sun disklabel
   t   change a partition's system id
   u   change display/entry units
   v   verify the partition table
   w   write table to disk and exit
   x   extra functionality (experts only)

命令(输入 m 获取帮助) q
```
然后写入
``` shell
[root@iZ8vbcuptq5g86qk6lk4x1Z data]# mkfs.ext3 /dev/vdb
mke2fs 1.42.9 (28-Dec-2013)
文件系统标签=
OS type: Linux
块大小=4096 (log=2)
分块大小=4096 (log=2)
Stride=0 blocks, Stripe width=0 blocks
6553600 inodes, 26214400 blocks
1310720 blocks (5.00%) reserved for the super user
第一个数据块=0
Maximum filesystem blocks=4294967296
800 block groups
32768 blocks per group, 32768 fragments per group
8192 inodes per group
Superblock backups stored on blocks:
	32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632, 2654208,
	4096000, 7962624, 11239424, 20480000, 23887872

Allocating group tables: 完成
正在写入inode表: 完成
Creating journal (32768 blocks): 完成
Writing superblocks and filesystem accounting information: 完成
```
格式化 挂载
``` shell
[root@iZ8vbcuptq5g86qk6lk4x1Z data]# vi /etc/fstab
```
写入挂载的磁盘
``` shell
/dev/vdb /mnt ext3 defaults 0 0
```
然后我们进行挂载
``` shell
[root@iZ8vbcuptq5g86qk6lk4x1Z data]# mount -a
```
最后我们看到了我们刚挂载的磁盘
[root@iZ8vbcuptq5g86qk6lk4x1Z data]# df -h
文件系统        容量  已用  可用 已用% 挂载点
devtmpfs        1.9G     0  1.9G    0% /dev
tmpfs           1.9G     0  1.9G    0% /dev/shm
tmpfs           1.9G  828K  1.9G    1% /run
tmpfs           1.9G     0  1.9G    0% /sys/fs/cgroup
/dev/vda1        40G   31G  7.3G   81% /
tmpfs           1.9G   12K  1.9G    1% /var/lib/kubelet/pods/0de38241-1a67-420e-9be1-a134d074ef9a/volumes/kubernetes.io~secret/kube-proxy-token-vb2tf
tmpfs           1.9G   12K  1.9G    1% /var/lib/kubelet/pods/c43b28d3-3327-49aa-a495-ae852a62836b/volumes/kubernetes.io~secret/flannel-token-6wvm6
overlay          40G   31G  7.3G   81% /var/lib/docker/overlay2/a5427d390e807abd425386d6672b92a51a5254467d91085853ae38b99307e9f0/merged
overlay          40G   31G  7.3G   81% /var/lib/docker/overlay2/32ff2942f925963dbe545801c058e1c18c7b8fd647973f0ca02b52a2426c8b82/merged
shm              64M     0   64M    0% /var/lib/docker/containers/496f71ea4b9b2167a4902fb6a4724790378f1fe271d92bd384cdb901f440225f/mounts/shm
shm              64M     0   64M    0% /var/lib/docker/containers/61b7684e36a60c4096a512d7cd6f82ce3a8e9d930d85ad2d974b4705658a3c95/mounts/shm
overlay          40G   31G  7.3G   81% /var/lib/docker/overlay2/983dadfacba33b05d6ba40913ff78a8ac5ce53802d2b892ec675b0bc47e676a2/merged
overlay          40G   31G  7.3G   81% /var/lib/docker/overlay2/0775175ff240ea5b3370fc9cd08909cb0c9218b30e3d6e9545b42e8eb9e9017d/merged
tmpfs           379M     0  379M    0% /run/user/0
overlay          40G   31G  7.3G   81% /var/lib/docker/overlay2/30a79b628c071c1b624c3108abadeb2e159d4c76e28d8e0c6af9ad6ae262ad01/merged
overlay          40G   31G  7.3G   81% /var/lib/docker/overlay2/3fb2ddcf55f7ab7536c3f04567ea6d4452fca1dcbae1ccd6f868a997155e5130/merged

 参考文章:
-------------------
[阿里云Linux系统挂载磁盘](https://yq.aliyun.com/articles/656289)
