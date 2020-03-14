---
title: 在github的action中使用mysql
date: 2020-03-14 15:27:16
tags: 技术
---
最近，我们开始使用GitHub Actions测试我们的所有软件包。您可以在此博客文章中了解有关我们常规设置的更多信息。
对于大多数软件包，这都很好。但是，我们的某些软件包（例如Laravel标签）使用SQLite中不提供的JSON函数。幸运的是，在GitHub Actions中使用像MySQL这样的数据库很简单。
在测试工作流程中，您需要添加MySQL到中services。
``` mysql 
services:
    mysql:
        image: mysql:5.7
        env:
            MYSQL_ALLOW_EMPTY_PASSWORD: yes
            MYSQL_DATABASE: laravel_tags
        ports:
            - 3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3
```
在执行测试的步骤中，应添加一个env变量DB_PORT。Laravel使用该环境变量来建立与数据库的连接。
```
- name: Execute tests
  run: vendor/bin/phpunit
  env:
      DB_PORT: ${{ job.services.mysql.ports[3306] }}
```
在其中phpunit.xml.dist应添加此部分。
```
<php>
    <env name="DB_CONNECTION" value="mysql"/>
    <env name="DB_USERNAME" value="root"/>
    <env name="DB_DATABASE" value="laravel_tags"/>
    <env name="DB_HOST" value="127.0.0.1" />
    <env name="DB_PORT" value="3306" />
</php>
```
那DB_PORT是用于本地测试。在GitHub Actions上，它将被工作流程中设置的端口覆盖。
这就是全部。查看整个GitHub Actions工作流程和phpunit配置文件，以获取更多上下文，在其中您需要使用上面的代码段。
