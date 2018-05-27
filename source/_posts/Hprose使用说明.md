---
layout: rpc
title: Hprose使用说明
date: 2018-05-20 12:37:25
tags: 技术
---
# 简介

Hprose(High Performance Remote Object Service Engine)
是一款先进的轻量级、跨语言、跨平台、无侵入式、高性能动态远程对象调用引擎库。它不仅简单易用，而且功能强大。 你无需专门学习，只需看上几眼，就能用它轻松构建分布式应用系统。

# 使用手册

# 案例(php)
## 安装
- 使用`composer require hprose/hprose`
如果你正在使用 composer 管理你的项目，那么你不需要做任何特别处理。只要在 composer.json 中的 require 段添加了对 hprose/hprose 的引用就可以了。如果你需要 swoole 支持，添加 hprose/hprose-swoole 就可以了。
然后在代码中这样引用

<!--more-->

### 服务端
```
<?php
use Hprose\Swoole\Http\Server;

//定义Hello服务
function hello($name) {
    return "Hello $name!";
}

//发布服务器
$server = new Server();

//注册hello方法
$server->addFunction('hello');

$server->start();
```
### 客户端
``` php 
use Hprose\Client;

$client=Client::create('http://localhost/',false);
echo $client->hello("World");
```
#案例(go)
## 安装
```
go get github.com/gorilla/websocket
go get github.com/valyala/fasthttp
go get github.com/hprose/hprose-golang
```
## 使用
### 服务端
```
package main

import(
    "net/http"
    "github.com/hprose/hprose-golang/rpc"
      )

func hello(name string) string {
    return "Hello" + name + "!"
}

func main() {
    service := rpc.NewHTTPService()
    service.AddFunction("hello", hello, rpc.Options{})
    http.ListenAndServer(":8080",service)
}
```


### 客户端
``` go 
package main

import (
        "fmt"
        "github.com/hprose/hprose-golang/rpc"
       )

type Stub struct {
    Hello func(string) (string, error)
    AsyncHello func(func(string, error),string) `name:"hello"`
}

func main() {
    client := rpc.NewClient("http://127.0.0.1:8080/")
    var stub *Stub
    client.UseService(&stub)
    stub.AsyncHello(func(result string,err error) {
            fmt.Println(result, error)
            },"async world")
            fmt.Println(stub.Hello("world"))
}
```



