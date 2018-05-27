---
title: 集群的nginx配置
date: 2018-01-15 00:01:54
tag: php
categories: 技术

---

这篇文章是nginx的进阶篇，我会详细梳理集群的nginx配置,包括nginx服务器的反向代理，负载均衡,不过这些都是要先建立后端服务器组。
按照上篇的惯例，我们先亮出集群nginx配置文件
## 实例
``` shell
user nobody nobody;
worker_process 2;
error_log /usr/local/webserver/nginx/logs/nginx_error.log crit;
pid /usr/local/webserver/nginx/nginx/pid;
worker_rlimit_nofile 65535;
events
{
        use epoll;
        woreker_connections 65535;
}
http
{
        include mime.types;
        default_type application/octet-stream;
        charset utf-8;
        sendfile on;
        tcp_nopush on;
        keepalive_timeout 60;
        tcp_nodelay on;
        client_body_buffer_size 512k;
        proxy_connect_timeout 5;
        proxy_read_timeout 60;
        proxy_send_timeout 5;
        proxy_buffer_size 16k;
        proxy_buffers 4 16k;
        proxy_busy_buffers_size 128k;
        proxy_temp_file_write_size 128k;
        gzip on;
        gzip_min_length 1k;
        gzip_buffers 4 16k;
        gzip_http_version 1.1;
        gzip_comp_level 2;
        gzip_types text/plain application/x-javascript text/css application/xml;
        gzip_vary on;
#设置Web缓存区名称为cache_one,内存缓存空间大小为200M,1天清理一次缓存，硬盘缓存空间大小为30GB
        proxy_temp_file_path /data0/proxy_temp_dir;
        proxy_cache_path /data0/proxy_cache_dir levels=1:2 keys_zone=cache_one:200m
        inactive=1d max_size=30g;
        upstream backend {
                server 192.168.1.3:80 weight=1 max_fails=2 fail_timeout=30s;
                server 192.168.1.4:80 weight=1 max_fails=2 fail_timeout=30s;
                server 192.168.1.5:80 weight=1 max_fails=2 fail_timeout=30s;
        }
        server
        {
                listen 80;
                server_name myweb;
                index index.html index.htm;
                root /data0/htdocs/www;
                location /
                {
                        #如果后端的服务器返回502,504执行超时等错误，将请求转发到另一台服务器。
                        proxy_next_upstream http_502 http_504 error timeout invalid_header;
                        proxy_cache cache_one;
                        #针对不同HTTP状态设置不同的缓存时间
                        proxy_cache_key $host$uri$is_args$args;
                        proxy_set_header Host $host;
                        proxy_set_header X-Forwarded-For $remote_addr;
                        proxy_pass http://backend_server;
                        expires 1d;
                }
                #配置缓存清楚功能
                location ~ /purge(/.*)
                {
                        allow 127.0.0.1;
                        allow 192.168.0.0/16;
                        deny all;                
                        proxy_cache_purge cache_one $host$1$is_args$args;
                }
                #配置数据不缓存
                location ~ .*\.(php|jpg|cgi)?$
                {
                        proxy_set_header Host $host;
                        proxy_set_header X-Forwarded-For $remote_addr;
                        proxy_pass http://backend;
                }
        }
}
```
<!--more-->
## 后端服务器组
### upstream 
upstream backend
{
        server backend1.example weight=5; #组内服务器设置权重，数字越大有限级越高
        server 127.0.0.1:8080 max_fails=3 fail_timeout=30s; #1请求失败的次数 2请求组内服务器的时间 #30秒内失败3次该服务器是无效状态
        server 127.0.0.1:8081 backup; #备用服务器 
        server 127.0.0.1:8082 down; #永久无效状态 
        server unix:/tmp/backend3; 
}
upstream backend2
{
        ip_hash #实现会话保持功能，将某个客户端定向到同一服务器，保证session,不能和weight一起用
        server myback1.proxy.com;
        server myback2.proxy.com;
        keeyalive 10 #控制网络连接保持功能,保证工作进程为服务器组打开一部分连接，控制数量
        last_conn;#选择当前网络连接最少的服务器
}
## rewrite功能配置
### ngx_http_rewrite_module模块
> 用于实现url的重写，依赖PCRE库，是一种地址重写，会产生两次请求

last：终止继续在本location块中处理接收到的URI，并将此处重写的URI作为一个新的URI，使用各location块进行
location / {
     rewrite ^(/myweb/.*)/media/(.*)\..*$ $1/mp3/$2.mp3 last;
     rewrite ^(/myweb/.*)/audio/(.*)\.*$ $1/mp3/$2.ra last;
}
### 域名跳转
```
server
{
        listen 80;
        server_name jump.myweb.name;
        rewrite ^ http://www.myweb.info/;#域名跳转
}
server
{
        listen 80;
        server_name jump.myweb.name jump.myweb.info
        if($host ^ myweb.\info) #.用\转义
        {
                rewrite *(.*) http://jump.myweb.name$1 permanent; #多域名跳转
        }
}
server
{
        listen 80;       
        server_name jump1.myweb.name jump2.myweb.name;
        if($http_host ~* ^(.*)\.myweb\.name$)
        {
                rewrite ^(.*) http://jump.myweb.name$1; #三级域名跳转
                break;
        }
}
```
### 域名镜像
```
server
{
        listen 80;
        server_name mirror1.myweb.name;
        rewrite ^(.*) http://jump1.myweb.name$1 last;
}
server
{
        listen 81;
        server_name mirror2.myweb.name;
        rewrite ^(.*) http://jump2.myweb.name$1 last;
}

```
### 独立域名
当一个网站包含多个板块时，可以为某些板块设置独立域名
```
server
{
        listen 80;
        server_name bbs.myweb.name;
        rewrite ^(.*) http://www.myweb.com/bbs$1 last;
}

```
### 防盗链
```
location ~* ^.+\.(gif|jpg|png|swf|flv|rar|zip)*
{
        valid_referers none blocked server_name *. myweb.name;
        if($invalid_referer) #检查请求头部Referer头域是不是自己的站点，如果不是，返回固定图片
        {
                rewrite ^/ http://www.myweb.com/images/forbidden.png;
        }
}
```
## 反向代理
> 局域网向Internet提供局域网内的资源，设置一个代理服务器

proxy_pass URL 设置被代理的服务器
```
upstream proxy_svrs
{
        ...
}
server
{
...
        location /
        {
                proxy_pass proxy_svrs;
        }
}
```
- proxy_hide_header field;#用于设置Nginx发送响应时，隐藏头域名信息
- proxy_pass_header field;#设置需要发送的头域信息
- proxy_pass_request_body on | false;# 是否将客户端的请求体发送给代理服务器
- proxy_pass_request_headers on | off; # 是否将客户端的请求头发送给代理服务器
- proxy_set_header field value; #更改接收的客户端请求的请求头信息，将新的请求头发送给被代理服务器
- proxy_set_body value; #更改客户端接收的请求体，将新的请求体发送给服务器
- proxy_bind; #强制将代理主机的连接绑定到指定的IP地址
- proxy_connect_timeout time;#与被代理服务器的连接超时时间
- proxy_read_timeout time;#被代理服务器组read后，等待响应超时时间
- proxy_send_timeout time; #被代理服务器组write后，等待响应超时时间 
- proxy_http_version 1.0|1.1#设置nginx和代理服务器的http协议版本
- proxy_method;#nginx 和代理服务器组的请求方法
- proxy_ignore_client_abort on; #客户端请求中断时，是否中断对被代理服务器的请求
- proxy_ignore_headers field;#nginx收到代理服务器的响应请求后，不会处理被设置的头域
- proxy_redirect; #修改被代理服务器组的Location域和Refresh域
- proxy_intercept_errors off; #直接返回代理服务器的http状态码
- proxy_hash_max_size 512; #http报头文的容量上限
- proxy_headers_hash_bucket_size 64; #http报头文的哈希表容量的单位大小
- proxy_next_upstream status;#遵循upstream指令的轮询规则
- proxy_ssl_session_reuse on;#开启ssl代理间协议
#### Proxy Buffer
- proxy_buffering on; #开启proxy buffer(存放从代理服务器接收的一次响应数据的临时存放文件,接收完整的一次响应后才发送到客户端)
- proxy_buffers 8 4k; #buffer个数 每个大小
- proxy_busy_buffers_size 16kb; #busy状态下buffer总大小
- proxy_temp_path /nginx/proxy_web/spool/proxy_temp 1 2; #临时文件路径 第几级目录
- proxy_max_temp_file_size 1024MB #临时文件总体积上限值
- proxy_temp_file_write_size 8kb; #数据量总大小限值
#### Proxy Cache(对已有数据在内存中建立缓存数据)
- proxy_cache zone | off #设置存放缓存内存区域名字
- proxy_cache_bypass #向客户端发送数据时不从缓存中获取
- proxy_cache_key $scheme$proxy_host$is_args$args #缓存数据建立索引的关键字
- proxy_cache_lock on#缓存中的数据同时只能被一条请求读取
- proxy_cache_lock_timeout 5s; #缓存锁的超时时间
- proxy_cache_min_use 1; #向代理发送相同请求超过几次才缓存
- proxy_cache_path /nginx/cache/a levels=1 keys_zone=a:10m;# 缓存路径 一级目录 缓存内存区域的名称和大小
- proxy_cache_use_stale error | timeout |invalid_header|updating|http_500|http_502#代理服务器出错时访问历史缓存
- proxy_cache_valid 200 302 10m #对返回200和302状态缓存10分钟
- proxy_store on;#开启本地磁盘缓存数据
- proxy_store_access user:rw group:rw all:r #配置缓存权限
### 负载均衡
> 将网络访问平衡地分摊到网络集群的各个操作单元上,减少用户的等待时间

upstream backend
{
  server 192.168.1.2:80 weight=5 #权限最高
  server 192.168.1.3:80 weight=2
  server 192.168.1.4:80          #默认1
}





