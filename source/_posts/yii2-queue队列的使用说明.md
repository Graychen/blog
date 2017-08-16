---
title: yii2-queue队列的使用说明
date: 2017-07-28 12:15:36
tags: 编辑器
categories: 技术

---
## 概述

yii2-queue是一个yii官方推出的队列扩展库，主要通过队列异步运行任务，它支持基于DB，Redis，RabbitMQ，Beanstalk和Gearman的队列。

## 来源

+ [github](https://github.com/yiisoft/yii2-queue)
+ [packaglist](https://packagist.org/packages/yiisoft/yii2-queue)

<!--more-->
## 安装 

``` php
composer require yiisoft/yii2-queue
```
或者

``` php
在composer中添加"yiisoft/yii2-queue": "~2.0.0",然后持续composer install
```

## 操作步骤
发送到队列的每个任务应该被定义为一个单独的类。例如，如果您需要下载并保存文件，则该类可能如下所示：
下面的例子以redis作为驱动，[其它驱动](https://github.com/yiisoft/yii2-queue/blob/master/docs/guide/README.md)
首先我们配置redis的驱动，注意如果没有yiisoft/yii2-redis包的话要先执行composer require yiisoft/yii2-redis,再在/common/config/
注意要为queue配置一个queue的redis配置
```return [
    'bootstrap' => [
            'queue', // The component registers own console commands
    ],
    'compoents' => [
        ...//其它的配置
        'redis_queue' => [
            'class' => 'yii\redis\Connection',
            'hostname' => 'redis',
            'port' => '6379',
            'database' => 0,
        ],
        'queue' => [
            'class' => \yii\queue\redis\Queue::class,
            'redis' => 'redis2', // Redis connection component or its config
            'channel' => 'queue', // Queue channel key
            'as log' => \yii\queue\LogBehavior::class
        ],
    ]
```


``` php
class DownloadJob extends Object implements \yii\queue\Job
{
    public $url;
    public $file;
                
    public function execute($queue)
    {
        file_put_contents($this->file, file_get_contents($this->url));
    }
}

```

以下是将任务发送到队列中的方法：

``` php
Yii::$app->queue->push(new DownloadJob([
    'url' => 'http://example.com/image.jpg',
    'file' => '/tmp/image.jpg',
]));

```

将作业推入5分钟后运行的队列：

``` php
Yii::$app->queue->delay(5 * 60)->push(new DownloadJob([
    'url' => 'http://example.com/image.jpg',
    'file' => '/tmp/image.jpg',
]));
```

执行任务的方式取决于所使用的驱动程序。大部分的驱动程序可以使用控制台命令运行，组件应该在应用程序中注册。
在循环中获取并执行任务的命令，直到队列为空：

``` php
yii queue/run
```

命令启动一个无限查询队列的守护程序：

``` php
yii queue/listen
```
该组件具有跟踪被推入队列的作业的状态的能力。

``` php

//将作业推入队列并获取按摩ID。
$id = Yii::$app->queue->push(new SomeJob());

//工作正在等待执行。
Yii::$app->queue->isWaiting($id);

// Worker从队列中获取作业并执行它。
Yii::$app->queue->isReserved($id);

// Worker已经执行了这个工作。
Yii::$app->queue->isDone($id);

```
## 使用Supervisor管理php yii queue/listen
Supervisor是Linux的进程监视器。它会自动启动您的控制台进程。要在Ubuntu上安装，您需要运行命令：
``` php
sudo apt-get install supervisor
```
主管配置文件通常可用/etc/supervisor/conf.d。您可以创建任意数量的配置文件。
配置示例:
``` php
[program:yii-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=/usr/bin/php /var/www/my_project/yii queue/listen --verbose=1 --color=0
autostart=true
autorestart=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/my_project/log/yii-queue-worker.log
```






