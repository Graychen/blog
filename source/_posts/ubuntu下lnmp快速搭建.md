---
title: ubuntu下lnmp快速搭建
date: 2017-05-10 21:12:37
tags: linux
categories: 技术

---

我所用的环境是ubuntu16.10，上篇博文是源码安装lnmp，但是大部分情况下没有这么多的精神和时间，这篇博文来介绍下利用apt-get这个工具来快速完成lnmp的搭建。
>下面的lnmp包括php7.1,mysql5.7,nginx1.2.8

## 安装php7.1
安装 Php7.1 之前，要先安装language-pack-en-base这个包，运行：

``` bash
sudo apt-get update  
sudo apt-get install -y language-pack-en-base  
```

这个包是为了解决系统不同语言之间可能发生的冲突，安装之后可以减少许多因语言编码带来的问题。其中-y参数表明直接安装，无需确认。

安装完成之后，运行：

``` bash
locale-gen en_US.UTF-8  
```

设定语言编码为<font color="red">UTF-8</font>。

进入正题，安装Php7.1，本教程采用ppa方式安装php7.1，运行：

``` bash
sudo apt-get install software-properties-common  
```

<!--more-->
software-properties-common是add-apt-repository所依赖的包，安装成功后，运行：

``` bash
sudo LC_ALL=en_US.UTF-8 add-apt-repository ppa:ondrej/php  

```

安装完成之后，运行<font color="red">**sudo apt-get update**</font>更新安装包，把刚才添加的包拉取下来。 运行**<font color="red">apt-cache search php7.1</font>**搜索php7.1开头的包检验是否安装成功，输出如下：

``` bash
root@demo:~# apt-cache search php7.1  
php-yaml - YAML-1.1 parser and emitter for PHP  
php-apcu - APC User Cache for PHP  
php-ssh2 - Bindings for the libssh2 library  
php-igbinary - igbinary PHP serializer  
php-mailparse - Email message manipulation for PHP  
php-libsodium - PHP wrapper for the Sodium cryptographic library  
php-propro - propro module for PHP

...
...
...
```

安装php7.1

``` bash
sudo apt-get -y install php7.1
```

安装完成后运行**<font color="red">php -v</font>**查看是否安装成功,成功的话显示

``` bash
PHP 7.1.0beta2 (cli) ( NTS  )  
Copyright (c) 1997-2016 The PHP Group  
Zend Engine v3.1.0-dev, Copyright (c) 1998-2016 Zend Technologies  
    with Zend OPcache v7.1.0beta2, Copyright (c) 1999-2016, by Zend Technologies
```
接着安装php7.1-mysql，这是php和mysql通信的模块

``` bash
sudo apt-get -y install php7.1-mysql  
```
安装 fpm，这是Nginx 用来解析php文件的：

``` bash
sudo apt-get install php7.1-fpm  
```

安装其他必备模块：

``` bash
apt-get install php7.1-curl php7.1-xml php7.1-mcrypt php7.1-json php7.1-gd php7.1-mbstring  
```

至此与php相关的模块安装安装完成。
## 安装Mysql
直接安装Mysql5.7吧，5.7 可以说是里程碑式的版本，提高了性能，并增加了很多新的特性。特别是新增加的json字段，用过之后你会爱上她的！！

>MySQL 开发团队于 9.12 日宣布 MySQL 8.0.0 开发里程碑版本（DMR）发布！但是目前 8.0.0 还是开发版本，如果你希望体验和测试最新特性，可以从 http://dev.mysql.com/downloads/mysql/ 下载各个平台的安装包。不过，MySQL 软件包是越来越大了，Linux 平台上的二进制打包后就将近有 1 GB。如果在产品环境中使用，在 8.0 没有进入稳定版本之前，请继续使用 5.7 系列，当前最新的版本是 5.7.15 GA 版本——这只有 600 M 多。
下载.deb包到你的服务器：

``` bash
wget http://dev.mysql.com/get/mysql-apt-config_0.5.3-1_all.deb  
```
 然后使用dpkg命令添加Mysql的源：
``` bash
sudo dpkg -i mysql-apt-config_0.5.3-1_all.deb  
```
注意在添加源的时候，会叫你选择安装 MySQL 哪个应用，这里选择 Server 即可，再选择 MySQL 5.7 后又会回到选择应用的那个界面，此时选择 Apply 即可
安装

``` bash
sudo apt-get update  
sudo apt-get install mysql-server  
``` 
安装完成之后运行mysql -V查看版本：

``` bash
root@demo:~# mysql -V  
``` 
mysql  Ver 14.14 Distrib 5.7.15, for Linux (x86_64) using  EditLine wrapper  
注意

如果你已经通过 ppa 的方式安装了 MySQL 5.6，首先得去掉这个源

``` bash
sudo apt-add-repository --remove ppa:ondrej/mysql-5.6  
``` 
 如果没有 apt-add-repository 先安装上
``` bash
 sudo apt-get install software-properties-common
``` 
然后其它和上面一样，但最后要运行sudo mysql_upgrade -u root -p升级数据库，运行sudo service mysql restart重启数据库，这样你的数据会完好无缺（不出意外的话）。
## 安装Nginx
简单，运行：
``` bash
sudo apt-get -y install nginx  
``` 
## nginx配置php

``` bash
sudo vim /etc/php/7.1/fpm/php.ini  
``` 
输入/fix_pathinfo搜索，将cgi.fix_pathinfo=1改为cgi.fix_pathinfo=0：
编辑fpm的配置文件： 运行：

``` bash
sudo vim /etc/php/7.1/fpm/pool.d/www.conf  
``` 
找到listen = /run/php/php7.1-fpm.sock修改为listen = 127.0.0.1:9000。使用9000端口。

``` bash
service php7.1-fpm stop
service php7.1-fpm start
``` 
配置Nginx：

运行：

``` bash
sudo vim /etc/nginx/sites-available/default  
``` 
下面是配置文件
``` bash
server {  
    #listen 80 default_server;
    listen 80;
    #listen [::]:80 default_server ipv6only=on;
    
    root /var/www;
    index index.php index.html index.htm;
                                        
    # Make site accessible from http://localhost/
    server_name lufficc.com www.lufficc.com;
    
    location / {
        # First attempt to serve request as file, then
        # as directory, then fall back to displaying a 404.
        try_files $uri $uri/ /index.php?$query_string;
        # Uncomment to enable naxsi on this location
        # include /etc/nginx/naxsi.rules
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        # With php7.0-cgi alone:
        fastcgi_pass 127.0.0.1:9000;
        # With php7.0-fpm:
        fastcgi_pass unix:/run/php/php7.0-fpm.sock;
    }
}
``` 
> 
  - root：是你的项目的public目录，也就是网站的入口
  - index：添加了，index.php，告诉Nginx先解析index.php文件
  - server_name：你的域名，没有的话填写localhost
  - location / try_files修改为了try_files $uri $uri/ /index.php?$query_string;
  - location ~ \.php$部分告诉Nginx怎么解析Php，原封不动复制即可，但注意：fastcgi_pass unix:/var/run/php/php7.1-fpm.sock;的目录要和fpm的配置文件中的listen一致。

## 运行nginx服务

``` bash
sudo service nginx restart  
sudo service php7.1-fpm restart  
```
如果出现下列错误
``` bash
[emerg]: bind() to 0.0.0.0:80 failed (98: Address already in use)
```
这是80端口被占用，运行下面命令，关闭80端口

``` bash
sudo fuser -k 80/tcp
service nginx start
```
**好了，一切完成！**







