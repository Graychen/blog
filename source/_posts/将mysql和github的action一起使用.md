---
title: 将mysql和github的action一起使用
date: 2020-02-02 21:43:28
tags: 技术
---
# 将MySQL服务与Github操作一起使用
借助新推出的Github Actions，现在可以基于事件在Githubs基础架构上自动运行单元测试和其他自动化任务。这是一篇简短的博客文章，描述了如何在Github Actions中使用MySQL / MariaDB服务。

Ubuntu映像已经包含一个预先配置的MySQL服务器，但是如果您要使用特定或更新的版本，甚至是MariaDB服务器，则需要使用服务。Github Actions中的服务只是一个运行特定映像并将其端口公开给localhost的Docker容器。您也可以通过安装所需的服务，apt-get但是在这种情况下使用Docker可能会更容易。

您需要谨慎使用此设置，因为如果使用默认端口，则您的应用或测试将连接到本地mysql服务器，而不是docker服务器。为确保应用使用正确的数据库，请确保使用${{ job.services.SERVICENAME.ports[3306] }}变量并将其传递给您的配置。由于启动脚本正在运行，由于Docker中的MySQL可能需要几分钟才能使用，因此您需要等待服务器准备就绪，否则它将无法接受连接，并且由于缺少数据库连接，以下步骤可能会失败。

以下YML代码可以用作此类操作的示例。

在本services节中，我们定义要启动的数据库docker映像（mariadb:latest在这种情况下）以及公开的端口。docker镜像使用传递给它的Environment变量来创建初始数据库并指定用户。有关更多详细信息，请参见https://hub.docker.com/_/mariadb/或https://hub.docker.com/_/mysql。该options规定被传递到码头工人为它的内部状况检查。此命令可确保在测试期间数据库可访问，并且如果指定的命令health-retries多次失败，则docker将自动重启容器。在本Verify MariaDB connection节中，简单mysqladmin ping在继续测试之前，请执行以确保数据库已完全启动并运行。当容器中的端口映射到主机上的随机端口时，我们还需要通过暴露变量来捕获它${{ job.services.mariadb.ports[3306] }}，并将其通过环境变量传递给命令。
``` ci 
name: Tests

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    services:
      mariadb:
        image: mariadb:latest
        ports:
          - 3306
        env:
          MYSQL_USER: user
          MYSQL_PASSWORD: password
          MYSQL_DATABASE: test
          MYSQL_ROOT_PASSWORD: password
        options: --health-cmd="mysqladmin ping" --health-interval=5s --health-timeout=2s --health-retries=3

    steps:
    - uses: actions/checkout@v1

    - name: Verify MariaDB connection
      env:
        PORT: ${{ job.services.mariadb.ports[3306] }}
      run: |
        while ! mysqladmin ping -h"127.0.0.1" -P"$PORT" --silent; do
          sleep 1
        done

    - name: Test
      run: |
        your tests
```
