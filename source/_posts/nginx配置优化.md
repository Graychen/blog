---
title: nginx配置优化
date: 2018-01-04 22:52:38
tag: php
categories: 技术

---
最近由于刚看完nginx高性能web服务器详解，就想结合自己工作的经历，对nginx的优化配置做一个系统的总结，这篇是初级篇，是单机的nginx优化配置
首先我们看一份较简单的nginx.conf配置文件
```
#### 全局块开始 ####
user nobody nobody; #配置允许Nginx服务器的用户和用户组
worker_processes 3; #配置Nginx进程生成的worker_processes数目
error_log logs/error_log; #配置Nginx服务器允许对错误日志存放路径
pid nginx.pid; #配置Nginx服务允许时的错误日志存放路径
#### 全局块结束 ####

#### event开始 ####
events {
        use epoll; #配置事件驱动模型
        worker_connections 1024; #配置最大连接数
}
#### event结束 ####
#### http块开始 ####
http {
        include mime.types; #定义MIME-TYPE
        default_type application/octet-stream; 
        sendfile on; #配置允许使用sendfile方式传输
        keepalive_timeout 65; #配置连接超时
        log_format access.log #配置请求处理日志的分格
        '$remote_addr-[$time_local]-"$request"-"$http_user_agent"'

        gzip on; #gzip功能设置
        gzip_min_length 1024; #响应页数据上限
        gzip_buffers 4 16k; # 缓存空间大小
        gzip_comp_level 2; # 压缩级别为2
        gzip_types text/plain application/x-javascript text/css application/xml; #压缩文件类型
        gzip_vary on #启用压缩标识
        gzip_disable "MISIE[1-6]"; #ie1-6不开启压缩功能
        gunzip_static no #检查预压缩文件
        gzip_static on;
        gzup_http_version 1.0;
#### server块开始 ####
        server { #配置虚拟主机1
                listen 8081; 
                server_name myServer1; #监听端口和主机名称
                access_log /myweb/server1/log/access_log; #配置请求处理日志存放路径
                error_page 404 /404.html; 
                location /server1/location1 { #配置处理/server1/location1 请求的location
                        root /myweb;
                        index index.svr1-local.htm;
                }
                location /server2/location2 { #配置处理/server2/location2 请求的location
                        root /myweb;
                        index index.svr2-local.htm;
                }
        }
        server { #配置虚拟主机2
                listen 8082; 
                gzip off; #主机2关闭压缩
                server_name 192.168.1.3; #监听端口和主机名称
                access_log /myweb/server2/log/access_log; #配置请求处理日志存放路径
                error_page 404 /404.html; 
                location /server2/location1 { #配置处理/server2/location1 请求的location
                        root /myweb;
                        index index.svr2-local.htm;
                }
                location /server2/loc2 { #配置处理/server2/location2 请求的location
                        root /myweb;
                        index index.svr2-local.htm;
                }
                location = /404.html {
                        root /myweb/;
                        index 404.html;
                }
        }
#### server块结束 ####
}
#### http块结束 ####

```
通过这个我们认识了nginx配置的基本组成:
- 全局块：配置整体允许的配置指令，包括用户组，worker process数，Nginx进程,日志存放路径，配置文件引入
- event块：与用户的网络连接,事件模型的选择，worker process下的网络序列化,是否允许同事接受多个网络连接，每个worker process最大支持连接数
- http块：代理,缓存,日志定义,第三方模块的配置
- server块：虚拟主机
- location块: 基于请求对除虚拟主机之外的字符串进行匹配,包括地址定向，数据缓存，应答控制
<!--more-->
## Nginx如何处理请求
> *同步和异步*：同步是指发送方发送请求后，需要等待接收到接收方发回的响应后，才接着发送下一个请求；异步是指发送第一个请求后，不等待接收方响应请求，就继续发送下个请求。在同步机制中，发送方和接收方的步调是一致的；异步中，所有请求形成队列，接收方处理完成后通知发送方。
*阻塞和非阻塞*：描述进程处理调度方式，在网络通信中，主要指网络套接字Socket的阻塞和非阻塞，Socket的调用方式是调用结果返回之前，当前线程从运行状态被挂起，一直等到调用结果返回之后，才进入就绪状态，获取CPU后继续执行;Socket的非阻塞调用方式，如果调用结果不能返回，当前线程不会挂起，而是立即放回执行下一个调用。

Nginx主要使用Master-Worker模式，每个工作进程使用异步非阻塞方式，可以处理多个客户端请求。当某个工作进程接收到客户端的请求后，调用IO进行处理，如果不能立即得到结果，就去处理其他请求，而客户端再次期间也无需等待响应，可以去处理其他事情。当IO调用放回结果，就会通知此工作进程；该进程得到通知，暂时挂起当前处理的事物，去响应客户端请求。
## Nginx的事件驱动模型
IO调用是如何把自己的状态通知给工作进程的呢？IO调用在完成后能主动通知工作进程主要是使用事件驱动模型。
> *select*: 支持linux和windows，首先创建所关注事件的描述符集合（收集读事件的描述符，写事件的描述符，异常事件描述符）,然后调用select函数，轮询事件描述符，检查是否有相应事件发生。使用--with-select_module和--without-select_module是否编译该库。
*poll*: 支持linux，是select的优化版本，在一个描述符上设置了读，写，异常事件,轮询时可以同时检查事件是否发生。
*epoll*: 支持linux2.6以上，将待处理事件表直接放到内核中，然后给这些描述符设置所关注的事件，把它添加到事件列表中，在具体编码过程中通过相关调用对事件的描述符进行修改和删除。它支持一个进程打开大数目的事件描述符，上限是系统打开文件的最大数目，同时，epoll库的IO效率不随描述符怎家二线性下降，因为只对内核上报的活跃描述符进行操作。

### 主进程:
- 读取Nginx配置文件并验证其有效性和正确性
- 建立，绑定和关闭Socket
- 按照配置生成管理和结束进程
- 接收外界指令，比如重启，升级及退出服务器等指令
- 不中断服务，实现平滑重启，升级及退出服务
- 开启日志文件，获取文件描述符
- 编译和处理Perl脚本
### 工作进程：
- 接收客户端请求
- 将请求一次送入各个功能模块进行过滤处理
- IO调用，获取响应数据
- 与后端服务器通信，接收后端服务器处理结果
- 数据缓存，访问索引，查询和调用缓存数据
- 发送请求结果，响应客户端请求
- 接收主程序指令，比如重启升级和退出
### 缓存索引重建及管理进程
缓存索引重建:在Nginx启动一段时间后由主进程生成，在缓存元数据重建完成后退出,根据本地磁盘在内存中建立索引元数据
魂村索引管理:存在主进程的整个生命周期，主要在索引数据更新后，判断是否过期
## 优化配置
### 针对ipv4的内核参数配置优化
在/etc/sysctl.conf中追加下面的参数,然后使用*/sbin/sysctl -p*命令使配置生效
- net.core.netdev_max_backlog=262144 #表示当每个接收数据包的速率比内核处理这些包的速率快时，允许发送到队列的数据包的最大数目
- net.core.somaxconn=262144 #TCP连接数，高并发下，可能导致连接超时或重传问题
- net.ipv4.tcp_max_orphans=262144 #允许最多Tcp套接字关联到用户文件句柄上，防止Dos攻击
- net.ipv4.tcp_timestamps=0 # 禁用对时间戳的支持
- net.ipv4.tcp_synack_retries=1 # 放弃tcp连接之前发送一次SYN+ACK包 
- net.ipv4.tcp_syn_retries=1 # 设置放弃连接之前发送SYN包的数量
### 针对CPU的Nginx配置优化
- worker_processes 4; #针对cpu核数
- worker_cpu_affinity 0001 0100 1000 0010 #为每个分配分配他的cpu
### 与网络连接相关的配置
- keepalive_timeout 60 50 #（1）服务端与客户端保持连接的超时时间 （2）Keep-Alive消息头，客户端连接事件
- send_timeout 10s # 设置Nginx服务器响应客户端的超时事件，某次会话等待客户端响应超过10s，断开连接
- client_header_buffer_size 4k #客户端响应头部的缓冲区大小
### 与事件驱动相关(event模块)
use epoll #事件驱动模型
worker_connections 65535 #每个工作进程允许同时连接客户端的最大数量，Client=worker_processes * worker_connections /2
worker_rlimit_sigpending 1024 #Linux事件信号队列长度上限
#### poll事件驱动
devpoll_change 32 #传递给内核的事件数
devpoll_events 32 #从内核获取事件数量
#### kqueue事件驱动
kqueue_changes 512 #传递给内核的事件数
kqueue_events 512 #从内核获取事件数量
#### epoll_events驱动
epoll_changes 512 #发送和收到内核的事件数
#### rtsig
rtsig_signo signo
###Gzip压缩(http模块)
#### ngx_http_gip_module模块(适用于大文件下载)
gzip on #开启压缩功能
gzip_buffers 32 4k | 16 8k #number*size存储压缩空间
gzip_comp_level 1 #压缩基本，1-9 1:压缩程度低，压缩效率高 9：压缩程度最高，压缩效率最低
gzip_disable MSIE [4-6]\. #ie4-6不进行gzip压缩
gzip_http_version 1.0|1.1; # 开启Gzip功能的最低http协议版本
gzip_min_length 1024 #开启页面压缩的最小值,页面大于这个值才开启压缩
gzip_proxied on #开启对后端服务器返回结构的Gzip压缩
gzip_proxied expired #当后端服务器响应页头部包含只是响应数据过期时间的expired头域时，开启对响应数据的压缩
gzip_proxied no-cache #当后端服务器响应页头部包含只是响应数据过期时间的expired头域时，开启对响应数据的压缩
gzip_proxied no-store #当后端服务器响应页头部Cache-Control的指令为no-store时，开启对响应数据的Gzip压缩
gzip_proxied private #当后端服务器响应页头部Cache-Control的指令为private时，开启对响应数据的Gzip压缩
gzip_proxied no_last_modified #当后端服务器响应页头部不包含Last-Modified时，开启对响应数据的压缩
gzip_proxied no_etag #当后端服务器响应页头部不包含ETag时，开启对响应数据的压缩
gzip_proxied auth #当后端服务器响应页头部用于标示HTTP授权证书时，开启对响应数据的压缩
gzip_proxied any #无条件开启对响应数据的压缩
gzip_types text/plain application/x-javascript text/css text/html application/xml #根据响应页的MIME-TYPE选择性地开启Gzip压缩功能
gzip_vary on #经过压缩处理的响应会在头部添加"Vary:Accept-Encoding:gizp"也可用add_header Vary Accept-Encoding gzip
#### ngx_http_gzip_static_module模块(可确定数据长度)
编译添加--with-http_gzip_static_module
gzip_static on | off | aways; #开启 | 关闭 | 不检查客户端是否支持压缩,直接发送压缩文件
gzip_proxied no-cache no-store private auth;
#### ngx_http_gunzip_module模块(不支持解压的浏览器，对数据进行解压)
编译添加--with-http_gunzip_module
gunzip_static on
gunzip_buffers 32 4k | 16 8k








