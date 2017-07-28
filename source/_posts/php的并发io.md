---
title: php的并发io
date: 2017-06-25 23:04:46
tag: php
categories: 技术

---

计算领域一直是分为计算密集和IO密集型，web程序一直是io密集型，从最早的同步阻塞直接Fork进程，到Worker进程池，到现在的异步IO协程，io一直是服务器的难点，下面文章，将详细解析php的并发io问题。
## 多进程/多线程同步阻塞
最早的服务器端都是通过多进程来解决IO的问题,通过Accept一个客户端连接就创建一个进程，然后子进程进入循环同步阻塞与客户端进行交互，收发数据。
 !["我是傲娇的效果图"](/assets/blogImg/manyporcess.png)
因为线程之间是共享内存堆栈,所以不同的线程之间进行交互比较容易实现。比如聊天室这样的程序，客户端连接之间可以交互，比聊天室中的玩家可以任意的其他人发消息。用多线程模式实现非常简单，线程中可以直接向某一个客户端连接发送数据。而多进程模式就要用到管道、消息队列、共享内存，统称进程间通信（IPC）复杂的技术才能实现。
``` php

$serv = stream_socket_server("tcp://0.0.0.0.8000",$errno,$errstr) or die("create server failed");
while(1) {
        $conn = stream_socket_accept($serv);
        if(pcntl_fork() ==0) {
                $request = fread($conn);
                fwite($repose);
                fclose($conn);
                exit(0);
        }
}

```
## 多进程/线程模型的流程
1创建一个 socket，绑定服务器端口（bind），监听端口（listen），在PHP中用stream_socket_server一个函数就能完成上面3个步骤，当然也可以使用更底层的sockets扩展分别实现
2进入while循环，阻塞在accept操作上，等待客户端连接进入。此时程序会进入随眠状态，直到有新的客户端发起connect到服务器，操作系统会唤醒此进程。accept函数返回客户端连接的socket
3主进程在多进程模型下通过fork（php: pcntl_fork）创建子进程，多线程模型下使用pthread_create（php: new Thread）创建子线程。下文如无特殊声明将使用进程同时表示进程/线程。
4子进程创建成功后进入while循环，阻塞在recv（php: fread）调用上，等待客户端向服务器发送数据。收到数据后服务器程序进行处理然后使用send（php: fwrite）向客户端发送响应。长连接的服务会持续与客户端交互，而短连接服务一般收到响应就会close。
5当客户端连接关闭时，子进程退出并销毁所有资源。主进程会回收掉此子进程。
**这种模式最大的问题是，进程/线程创建和销毁的开销很大。所以上面的模式没办法应用于非常繁忙的服务器程序。对应的改进版解决了此问题，这就是经典的Leader-Follower模型。**
``` php

<?php
$serv = stream_socket_server("tcp://0.0.0.0:8000",$error,$errstr) or die("create server failed");
for($i=0; $i< 32;$i++){
        if (pcntl_fork() == 0 ){
                while(1) {
                        $conn = stream_socket_accept($serv);
                        if($conn == false) continue;
                        $request = fread($conn);
                        fwrite($reponse);
                        fclose($conn);
                }
                exit(0);
        }
}

```
他的特点是程序启动后就会创建N个进程。每个子进程就会进入Accept,等待新的连接进入。当客户端连接到服务器时，其中一个子进程就会被唤醒，开始处理客户端请求，并且不再接受新的TCP连接。当连接关闭，子进程才会释放，重新进入Accept,参与处理新的连接。
优点:复用进程，没有额外消耗，性能好。应用案例：Apache.PHP-FPM
缺点：严重依赖初始创建的进程数，操作系统可以创建的进程数有限。进程带来额外的进程调度，如果启动数千甚至数万个进程，消耗就会直线上升。调度消耗可能占到CPU的百分之几十甚至100%。
还有一种场景也是多进程模型的软肋。通常Web服务器启动100个进程，如果一个请求消耗100ms，100个进程可以提供1000qps，这样的处理能力还是不错的。但是如果请求内要调用外网Http接口，像QQ、微博登录，耗时会很长，一个请求需要10s。那一个进程1秒只能处理0.1个请求，100个进程只能达到10qps，这样的处理能力就太差了。

有没有一种技术可以在一个进程内处理所有并发IO呢？答案是有，这就是IO复用技术。
## IO复用/事件循环/异步非阻塞
其实IO复用的历史和多进程一样长，Linux很早就提供了select系统调用，可以在一个进程内维持1024个连接。后来又加入了poll系统调用，poll做了一些改进，解决了1024限制的问题，可以维持任意数量的连接。但select/poll还有一个问题就是，它需要循环检测连接是否有事件。这样问题就来了，如果服务器有100万个连接，在某一时间只有一个连接向服务器发送了数据，select/poll需要做循环100万次，其中只有1次是命中的，剩下的99万9999次都是无效的，白白浪费了CPU资源。
直到Linux 2.6内核提供了新的epoll系统调用，可以维持无限数量的连接，而且无需轮询，这才真正解决了C10K问题。现在各种高并发异步IO的服务器程序都是基于epoll实现的，比如Nginx、Node.js、Erlang、Golang。像Node.js这样单进程单线程的程序，都可以维持超过1百万TCP连接，全部归功于epoll技术。
IO复用异步非阻塞程序使用经典的Reactor模型，Reactor顾名思义就是反应堆的意思，它本身不处理任何数据收发。只是可以监视一个socket句柄的事件变化。
 !["我是傲娇的效果图"](/assets/blogImg/reactor.png)
 Reactor有4个核心的操作：
 add添加socket监听到reactor，可以是listen socket也可以使客户端socket，也可以是管道、eventfd、信号等
 set修改事件监听，可以设置监听的类型，如可读、可写。可读很好理解，对于listen socket就是有新客户端连接到来了需要accept。对于客户端连接就是收到数据，需要recv。可写事件比较难理解一些。一个SOCKET是有缓存区的，如果要向客户端连接发送2M的数据，一次性是发不出去的，操作系统默认TCP缓存区只有256K。一次性只能发256K，缓存区满了之后send就会返回EAGAIN错误。这时候就要监听可写事件，在纯异步的编程中，必须去监听可写才能保证send操作是完全非阻塞的。
 del从reactor中移除，不再监听事件
 callback就是事件发生后对应的处理逻辑，一般在add/set时制定。C语言用函数指针实现，JS可以用匿名函数，PHP可以用匿名函数、对象方法数组、字符串函数名。
 Reactor只是一个事件发生器，实际对socket句柄的操作，如connect/accept、send/recv、close是在callback中完成的。具体编码可参考下面的伪代码：
 ``` php
 <?php
 $reactor=new Reactor();
 $svr_sock=stream_socket_server('tcp://127.0.0.1:9501');
 $reactor->add($svr_sock,EV_READ,function() use ($svr_sock,$reactor){
         $cli_sock = stream_socket_accept($svr_sock);
         $reactor->add($cli_sock,EV_READ,function() use ($cli_sock,$reactor){
                 $request = fread($cli_sock,8192);
                 $reactor->add($cli_sock,EV_WRITE,function() use ($cli_sock,$request,$reactor){
                         fwrite($cli_sock,"hello world\n");
                         $reactor->del($cli_sock);
                         fclose($cli_sock);
                 });
         });
});
 
 ```
 > Reactor模型还可以与多进程、多线程结合起来用，既实现异步非阻塞IO，又利用到多核。目前流行的异步服务器程序都是这样的方式：如
 Nginx：多进程Reactor
 Nginx+Lua：多进程Reactor+协程
 Golang：单线程Reactor+多线程协程
 Swoole：多线程Reactor+多进程Worker

 协程是什么
 协程从底层技术角度看实际上还是异步IO Reactor模型，应用层自行实现了任务调度，借助Reactor切换各个当前执行的用户态线程，但用户代码中完全感知不到Reactor的存在

 参考文章:
-------------------
[PHP并发IO编程之路](http://rango.swoole.com/archives/508)








