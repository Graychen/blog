---
title: lnmp源码搭建
date: 2017-05-08 22:47:02
categories: 技术
---
## mysql源码安装
1.安装编译源码需要的包
``` shell
sudo apt-get install make cmake gcc g++ bison libncurses5-dev
```
2.下载相应源码包
``` shell
[root@graychen ~]# wget https://sourceforge.net/projects/boost/files/boost/1.59.0/boost_1_59_0.tar.gz
[root@graychen ~]# wget http://cdn.mysql.com/Downloads/MySQL-5.7/mysql-5.7.13.tar.gz
```
3.新建MySQL用户和用户组
``` shell
[root@graychen ~]# groupadd -r mysql && useradd -r -g mysql -s /sbin/nologin -M mysql
```
4.预编译

``` shell
[root@graychen ~]# tar -zxvf boost_1_59_0.tar.gz
[root@graychen data]# md5sum mysql-5.7.13.tar.gz 
8fab75dbcafcd1374d07796bff88ae00  mysql-5.7.13.tar.gz
[root@graychen ~]# tar -zxvf mysql-5.7.13.tar.gz
[root@graychen data]# mkdir -p /data/mysql
[root@graychen data]# cd mysql-5.7.13
[root@graychen data]# cmake . -DCMAKE_INSTALL_PREFIX=/usr/local/mysql \
-DMYSQL_DATADIR=/data/mysql \
-DWITH_BOOST=../boost_1_59_0 \
-DSYSCONFDIR=/etc \
-DWITH_INNOBASE_STORAGE_ENGINE=1 \
-DWITH_PARTITION_STORAGE_ENGINE=1 \
-DWITH_FEDERATED_STORAGE_ENGINE=1 \
-DWITH_BLACKHOLE_STORAGE_ENGINE=1 \
-DWITH_MYISAM_STORAGE_ENGINE=1 \
-DENABLED_LOCAL_INFILE=1 \
-DENABLE_DTRACE=0 \
-DDEFAULT_CHARSET=utf8mb4 \
-DDEFAULT_COLLATION=utf8mb4_general_ci \
-DWITH_EMBEDDED_SERVER=1
```
5.编译安装

<!--more-->
``` shell
[root@graychen mysql-5.7.13]# make -j `grep processor /proc/cpuinfo | wc -l`
#编译很消耗系统资源，小内存可能编译通不过make install
[root@graychen mysql-5.7.13]# make install
```
6.设置启动脚本，开机自启动

``` shell
[root@graychen mysql-5.7.13]# ls -lrt /usr/local/mysql
[root@graychen mysql-5.7.13]# cp /usr/local/mysql/support-files/mysql.server /etc/init.d/mysqld
[root@graychen mysql-5.7.13]# chmod +x /etc/init.d/mysqld
[root@graychen mysql-5.7.13]# systemctl enable mysqld
mysqld.service is not a native service, redirecting to /sbin/chkconfig.
Executing /sbin/chkconfig mysqld on
```
7.配置文件

``` shell
/etc/my.cnf，仅供参考 
[root@graychen mysql-5.7.13]# cat > /etc/my.cnf << EOF
[client]
port = 3306
socket = /dev/shm/mysql.sock
[mysqld]
port = 3306
socket = /dev/shm/mysql.sock
basedir = /usr/local/mysql
datadir = /data/mysql
pid-file = /data/mysql/mysql.pid
user = mysql
bind-address = 0.0.0.0
server-id = 1
init-connect = 'SET NAMES utf8mb4'
character-set-server = utf8mb4
#skip-name-resolve
#skip-networking
back_log = 300
max_connections = 1000
max_connect_errors = 6000
open_files_limit = 65535
table_open_cache = 128
max_allowed_packet = 4M
binlog_cache_size = 1M
max_heap_table_size = 8M
tmp_table_size = 16M
read_buffer_size = 2M
read_rnd_buffer_size = 8M
sort_buffer_size = 8M
join_buffer_size = 8M
key_buffer_size = 4M
thread_cache_size = 8
query_cache_type = 1
query_cache_size = 8M
query_cache_limit = 2M
ft_min_word_len = 4
log_bin = mysql-bin
binlog_format = mixed
expire_logs_days = 30
log_error = /data/mysql/mysql-error.log
slow_query_log = 1
long_query_time = 1
slow_query_log_file = /data/mysql/mysql-slow.log
performance_schema = 0
explicit_defaults_for_timestamp
#lower_case_table_names = 1
skip-external-locking
default_storage_engine = InnoDB
#default-storage-engine = MyISAM
innodb_file_per_table = 1
innodb_open_files = 500
innodb_buffer_pool_size = 64M
innodb_write_io_threads = 4
innodb_read_io_threads = 4
innodb_thread_concurrency = 0
innodb_purge_threads = 1
innodb_flush_log_at_trx_commit = 2
innodb_log_buffer_size = 2M
innodb_log_file_size = 32M
innodb_log_files_in_group = 3
innodb_max_dirty_pages_pct = 90
innodb_lock_wait_timeout = 120
bulk_insert_buffer_size = 8M
myisam_sort_buffer_size = 8M
myisam_max_sort_file_size = 10G
myisam_repair_threads = 1
interactive_timeout = 28800
wait_timeout = 28800
[mysqldump]
quick
max_allowed_packet = 16M
[myisamchk]
key_buffer_size = 8M
sort_buffer_size = 8M
read_buffer = 4M
write_buffer = 4M
EOF
```
9.添加mysql的环境变量

``` shell
[root@graychen mysql-5.7.13]# echo -e '\n\nexport PATH=/usr/local/mysql/bin:$PATH\n' >> /etc/profile && source /etc/profile
```
10.初始化数据库

``` shell
[root@graychen mysql-5.7.13]# mysqld --initialize-insecure --user=mysql --basedir=/usr/local/mysql --datadir=/data/mysql
```
11.启动数据库

``` shell
[root@graychen mysql-5.7.13]# systemctl start mysqld
[root@graychen mysql-5.7.13]# systemctl status mysqld
● mysqld.service - LSB: start and stop MySQL
Loaded: loaded (/etc/rc.d/init.d/mysqld)
Active: active (running) since 一 2016-07-18 11:15:35 CST; 8s ago
Docs: man:systemd-sysv-generator(8)
Process: 23927 ExecStart=/etc/rc.d/init.d/mysqld start (code=exited, status=0/SUCCESS)
CGroup: /system.slice/mysqld.service
├─23940 /bin/sh /usr/local/mysql/bin/mysqld_safe --datadir=/data/mysql --pid-file=/data/mysql/mysql.pid
└─24776 /usr/local/mysql/bin/mysqld --basedir=/usr/local/mysql --datadir=/data/mysql --plugin-dir=/usr/local/mysql/lib/plugin --user=mysql --log-error=/data/mysql/mysql-err...

7月 18 11:15:32 graychen systemd[1]: Starting LSB: start and stop MySQL...
7月 18 11:15:35 graychen mysqld[23927]: Starting MySQL..[  OK   ]
7月 18 11:15:35 graychen systemd[1]: Started LSB: start and stop MySQL.
```
12.查看MySQL服务进程和端口
``` shell
[root@graychen mysql-5.7.13]# ps -ef | grep mysql
root     23940     1  0 11:15 ?        00:00:00 /bin/sh /usr/local/mysql/bin/mysqld_safe --datadir=/data/mysql --pid-file=/data/mysql/mysql.pid
mysql    24776 23940  0 11:15 ?        00:00:00 /usr/local/mysql/bin/mysqld --basedir=/usr/local/mysql --datadir=/data/mysql --plugin-dir=/usr/local/mysql/lib/plugin --user=mysql --log-error=/data/mysql/mysql-error.log --open-files-limit=65535 --pid-file=/data/mysql/mysql.pid --socket=/dev/shm/mysql.sock --port=3306
[root@graychen mysql-5.7.13]# netstat -tunpl | grep 3306
tcp        0      0 0.0.0.0:3306            0.0.0.0:*               LISTEN      24776/mysqld
```
13.设置数据库root用户密码

MySQL和Oracle数据库一样，数据库也默认自带了一个 root 用户（这个和当前Linux主机上的root用户是完全不搭边的），我们在设置好MySQL数据库的安全配置后初始化root用户的密码。配制过程中，一路输入 y 就行了。这里只说明下MySQL5.7.13版本中，用户密码策略分成低级 LOW 、中等 MEDIUM 和超强 STRONG 三种，推荐使用中等 MEDIUM 级别！

``` shell
[root@graychen mysql-5.7.13]# mysql_secure_installation
```
## php源码安装

1.安装编译源码
``` shell
wget http://am1.php.net/get/php-7.1.4.tar.bz2/from/mirror
tar jxvf php-7.1.4.tar.bz2 
bzip2 -d php-7.1.4.tar.bz2 
cd php-7.1.4/
./configure --prefix=/usr/local/php --with-config-file-path=/usr/local/php/etc --with-config-file-scan-dir=/usr/local/php/etc/php.d --with-mcrypt=/usr/include --enable-mysqlnd --with-mysqli --with-pdo-mysql --enable-fpm --with-fpm-user=nginx --with-fpm-group=nginx --with-iconv --with-zlib --enable-shmop --enable-sysvsem --enable-inline-optimization --enable-mbregex --enable-mbstring --enable-ftp --enable-gd-native-ttf --with-openssl --enable-pcntl --enable-sockets --with-xmlrpc --enable-zip --enable-soap --without-pear --with-gettext --enable-session --with-curl --with-jpeg-dir --with-freetype-dir --enable-opcache --with-libxml-dir=/usr
sudo make test
sudo make install
```
2.配置php.ini
```
cp php.ini-development /usr/local/php/etc/php.ini
sudo mv php-fpm.d/www.conf.default php-fpm.d/www.conf
```
3.配置php-fpm.conf
```
cd /usr/local/php/etc/
mv php-fpm.conf.default php-fpm.conf
sudo mv php-fpm.conf.default php-fpm.conf
sudo mv php-fpm.d/www.conf.default php-fpm.d/www.conf
```
4.配置php-fpm开机启动
```
cd ~/src/php-7.1.4/sapi/fpm
sudo cp init.d.php-fpm /etc/init.d/php-fpm
sudo chmod +x /etc/init.d/php-fpm 
chkconfig --add php-fpm
systemctl --add php-fpm
sudo /sbin/chkconfig
sudo vi /etc/init.d/php-fpm
update-rc.d -f php-fpm defaults
runlevel
sudo service php-fpm start
```
## nginx源码安装
1.下载源码
```
wget http://nginx.org/download/nginx-1.11.2.tar.gz
tar -xzvf nginx-1.11.2.tar.gz -C /usr/src
```
2.安装依赖
```
sudo apt-get install gcc libpcre3 libpcre3-dev openssl libssl-dev libssl0.9.8 perl libperl-dev
```
3.编译安装源码
```
cd /usr/src/nginx-1.11.2
# 以下是一行。。用于生成makefile。如果需要添加第三方模块，使用--add-module=/path/module1的方法编译
./configure --prefix=/usr/local/nginx --with-ipv6 --with-http_ssl_module --with-http_realip_module --with-http_addition_module --with-http_dav_module --with-http_flv_module --with-http_mp4_module --with-http_gzip_static_module --with-http_perl_module --with-mail --with-mail_ssl_module
# make是生成在objs目录中，make install则安装到prefix所示的目录中
make && make install
# 没有错误出现的话，就可以进入nginx安装目录(/usr/local/nginx)配置。
```
>成功安装后，进入/usr/local/nginx，可以看到4个目录：
```
root@graychen:/usr/local/nginx# ll
total 44
drwxr-xr-x 11 root   root 4096 Jul 26 10:06 ./
drwxr-xr-x 12 root   root 4096 Jul 26 10:03 ../
drwxr-xr-x  2 root   root 4096 Jul 26 10:11 conf/
drwxr-xr-x  2 root   root 4096 Jul 26 10:03 html/
drwxr-xr-x  2 root   root 4096 Jul 26 10:07 logs/
drwxr-xr-x  2 root   root 4096 Jul 26 10:03 sbin/
```
其中，

 conf：放置nginx相关的配置文件，最核心的是nginx.conf
 html：默认的网站根目录
 logs：日志文件目录(访问日志，错误日志，运行时的进程id cat logs/nginx.pid)
 sbin：主程序(nginx)目录
4.配置Nginx开机自启动
Ubuntu/Linux系统开机自启动，很简单，在/etc/init.d/目录下编写一个服务脚本(比如nginx)，然后在/etc/init.d/rc.local中添加一行启动命令。操作步骤如下
> * vi /etc/init.d/nginx ,其中具体的脚本展示如下：
```
[plain] view plain copy

 #!/bin/bash
 # nginx Startup script for the Nginx HTTP Server
 # it is v.0.0.2 version.
 # chkconfig: - 85 15
 # description: Nginx is a high-performance web and proxy server.
 #              It has a lot of features, but it's not for everyone.
 # processname: nginx
 # pidfile: /var/run/nginx.pid
 # config: /usr/local/nginx/conf/nginx.conf

 #注意：这里的三个变量需要根据具体的环境而做修改。
 nginxd=/opt/nginx/sbin/nginx
 nginx_config=/opt/nginx/conf/nginx.conf
 nginx_pid=/opt/nginx/logs/nginx.pid
 RETVAL=0
 prog="nginx"

 # Check that networking is up.
 [ -x $nginxd  ] || exit 0
 # Start nginx daemons functions.
 start() {
     if [ -e $nginx_pid  ];then
        echo "nginx already running...."
        exit 1
     fi
        echo -n $"Starting $prog: "
        $nginxd -c ${nginx_config}
        RETVAL=$?
        echo
        [ $RETVAL = 0  ]
        return $RETVAL
     
}
 # Stop nginx daemons functions.
 stop() {
       echo -n $"Stopping $prog: "
       $nginxd -s stop
       RETVAL=$?
       echo
       [ $RETVAL = 0  ] && rm -f /var/lock/subsys/nginx $nginx_pid
     
}
 # reload nginx service functions.
 reload() {
       echo -n $"Reloading $prog: "
       kill -HUP `cat ${nginx_pid}`
       RETVAL=$?
       echo
     
}
 # See how we were called.
 case "$1" in
   start)
           start
           ;;
   stop)
           stop
           ;;
   reload)
           reload
           ;;
   restart)
           stop
           start
           ;;
   status)
           status $prog
           RETVAL=$?
           ;;
   *)
           echo $"Usage: $prog {start|stop|restart|reload|status|help}"
           exit 1
 esac
 exit $RETVAL
```
> * sudo chmod a+x /etc/init.d/nginx
> * 在rc.local文件的最后中添加如下的一行: /etc/init.d/nginx start
最后，nginx可以通过 /etc/init.d/nginx start或者 service nginx start进行启动。


到这里整个LNMP已经安装完成.
## nginx和php的关联
下面我们就配置php和nginx能运行php网站: 首先为php创建配置文件:
``` shell
cp php.ini-production /usr/local/php/php.ini # 如果是开发就复制php.ini-development
cp /usr/local/php/etc/php-fpm.conf.default /usr/local/php/etc/php-fpm.conf
ln -s /usr/local/php/bin/php /usr/bin/
```
配置php-fpm,编辑php-fpm.conf

``` shell
vi /usr/local/php/etc/php-fpm.conf
```
找到listen那一行,修改成如下内容:

``` shell
listen = /var/run/php-fpm/php-fpm.sock   # 使用unix socket
```
启动php-fpm

``` shell
mkdir /var/run/php-fpm
/usr/local/php/sbin/php-fpm
```
然后配置nginx,编辑nginx配置文件

``` shell
vi /usr/local/nginx/conf/nginx.conf
```
修改nginx配置文件支持php:
``` shell
server {
        listen       80;
        server_name  localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        location / {
            root   html;
            index  index.php index.html index.htm;         # 添加index.php的首页文件
        }

        # 添加下面内容
        location ~ \.php$ {
            fastcgi_pass        unix:/var/run/php-fpm/php-fpm.sock;
            fastcgi_index       index.php;
            fastcgi_param SCRIPT_FILENAME $document_root/$fastcgi_script_name;
            include fastcgi_params;
            include fastcgi.conf;
}
```
修改完毕后保存退出重启nginx:

pkill -9 nignx
/usr/local/nginx/sbin/nginx
然后在/usr/local/nginx/html下创建index.php,

vi /usr/local/nginx/html/index.php
添加下面内容:
``` php
<?php
phpinfo();
?>
} 
```
保存退出后访问http://localhost/index.php,看到下面页面表示已经安装配置成功:

![php页面](/assets/blogImg/php.png)


