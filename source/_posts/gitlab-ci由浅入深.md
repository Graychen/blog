---
title: gitlab-ci由浅入深
date: 2018-02-11 22:57:07
tags:
---
# 概述

持续集成（CI）和 持续交付(CD) 是一种流行的软件开发实践，每次提交都通过自动化的构建（测试、编译、发布）来验证，从而尽早的发现错误。

持续集成实现了DevOps, 使开发人员和运维人员从繁琐的工作中解放出来。另外，这种形式极大地提高了开发者的开发效率和开发质量。 持续集成有多种工具，如Jenkins. GitLab内置了GitLab-CI，通过配置一段YAML脚本来实现持续集成.

# 功能

## 持续集成可以实现的功能:

- 代码审核: 自动化代码规范审查, 甚至代码质量检查
- 自动化测试: 单元测试, 功能测试和验收测试
- 编译发布: 将源代码编译成可执行程序, 并将程序上传到托管发布平台实现自动发布
- 构建部署: 通过构建Docker镜像, 或登录远程服务器执行相关部署命令和脚本, 实现自动化部署
## 原理

GitLab-CI 检测每次代码变动, 通过.gitlab-ci.yml脚本执行构建命令, 将命令发布到GitLab-Runners(运行机)上, 进而执行命令.
GitLab-Runners 基于Docker执行持续集成的每项任务, 这样就解决了环境依赖问题.
GitLab-Runners把实时将执行结果输出到GitLab网页上, 任务执行完后, 通过徽章标记和邮箱告知执行结果.
<!--more-->
在仓库根目录创建 .gitlab-ci.yml 文件, 内容如下
```
job-1:
  script:
      - echo "Hello World"
```
      这样, 在每次提交代码后, 都会自动执行以上脚本. 其中job-1是任务名称, 可以定义多个任务,
      script下面是 shell 命令, 只要命令执行成功, 就代表本次构建通过(出现passed标记)
  这样, 一次简单的持续集成已经搞定了.

  如何编写GitLab-CI配置文件

  见文档 如何编写GitLab-CI配置文件

  远程拉取代码

  使用ssh远程登录服务器, 然后执行git pull 拉取代码, 实现代码热更新

  由于ssh无密码登录需要用到密钥, 所以首先需要注入私钥

  如
```
  release-doc:
      stage: deploy
          script:
            - ssh root@$DEPLOY_SERVER "cd /mnt/data/docker-gollum/wiki && git pull origin master"
```

## 关键词

### 根主要关键词一览

|关键词|  含义|    可选 |   备注|
|--|--|--|--|
|image  | 声明使用的Docker镜像 |   为空时使用默认镜像 | 该镜像应当满足脚本执行的环境依赖|
|services   | Docker镜像使用的服务, 通过链接的方式来调用所需服务 | 可空 |   常用于链接数据库|
|stages  |定义构建阶段  |  为空时, 单纯定义jobs   | 项目的构建分为多个阶段, 例如: 安装依赖/准备, 编译, 测试, 发布等, 同时每个阶段包含若干任务|
|before_script  | 定义每个job之前执行的脚本  | 可空   | 每个job启动时会先执行该脚本|
|after_script   | 定义每个job之后执行的脚本  | 可空  |  同上|
|variables |  定义变量  |  可空  |  同上|
|cache  | 定义与后续job之间应缓存的文件  | 可空  |  同上|
### Demo:
```ci
image: aipline
services:
  - mysql
  - redis
stages:
  - build
  - test
  - deploy
before_script:
  - bundle install  
after_script:
  - rm secrets
cache:
paths:
  - binaries/
  - .config
```
## Jobs中的关键词
### jobs中存在一些与根中相同的关键词, 这些一旦定义, 则会向前覆盖, 即根中定义的则不会在该job执行
#### job 这里译为任务
|关键词 | 含义  |  可选  |  备注|
|--|--|--|--|
|image  | 声明任务使用的Docker镜像  |  为空时使用根中的定义  |  该镜像应当满足脚本执行的环境依赖|
|services   | 任务中Docker镜像使用的服务, 通过链接的方式来调用所需服务  |  可空  |  常用于链接数据库|
|stage  | 所属构建阶段   | 为空时则不使用stages |   一个任务属于一个构建阶段|
|before_script  | 定义每个job之前执行的脚本 |  可选  |  如果在job中定义则会覆盖根中的内容|
|script | 定义每个job执行的脚本  | 必须 |   
|after_script  |  定义每个job之后执行的脚本 |  可选 |   同上|
|variables  | 定义任务中使用的变量   | 可选  |  同上|
|cache  | 定义与后续job之间应缓存的文件 |  可选 |   同上|
|only   | 指定应用的Git分支 |  可选  | 可以是分支名称, 可用正则匹配分支, 也可是tags来指定打过标签的分支|
|except | 排除应用的Git分支 | 可选   | 同上|
|tags   | 指定执行的GitLab-Runners   | 可选|    通过匹配Runners的标签选定|
|allow_failure  |  允许失败  |  默认为false 如果允许失败, 本次任务不会影响整个构建的结果|
|when  |  定义合适执行任务 |   默认为always |   有on_success, on_failure, always or manual可选|
|dependencies  |  定义合任务所需要的工件|  可空 |   需要首先定义工件|
|artifacts |  定义工件  |  可空 |   工件中指定的目录会在任务执行成功后压缩传到GitLab, 后面需要该工件的任务执行时, 再自行下载解压|
|environment | 定义环境 |   可空 |   在部署任务中, 定义该任务所属的环境|

示例
``` ci
installing-dependencies:
  script:
    - composer install --prefer-dist --optimize-autoloader -n --no-interaction -v --no-suggest
    - composer dump-autoload --optimize
  artifacts:
    - name: "vendor"
    - untracked: true
    - expire_in: 60 mins
    - paths:
    - vendor/    
deleteocker-build-image:    
  stage: test
  only:
    - master
  except:
    - develop
  tags:
    - ruby
    - postgres
  allow_failure: true
  dependencies:
    - installing-dependencies
  script:        
    - docker build -t registry.com/mops/image:latest .
    - docker push registry.com/mops/image:latest 
```

>注意:
jobs的名称不能重名
同一阶段中的任务, 是并行执行的
上一阶段所有任务执行完后, 才会进入下一阶段
定义工件时, 务必定义工件的过期时间, 否则工件会一直寸在GitLab上, 占用空间
如果需要在任务中传递文件, 优先选择使用 dependencies (结合artifacts)

###  验证配置文件合法性
  在GitLab中, 打开 /ci/lint网址, 将配置文件粘贴在些, 进行验证
##  通过gitlab-ci实现文件的自动部署
###  实现过程
  文档托管在gitlab上, 每次代码更新, 会自动出发gitlab-ci构建 在构建脚本中, 通过ssh 登录远程服务器执行git拉取文档的命令
###  过程
#### 生成ssh证书
  在服务器上, 使用ssh-keygen生成root用户(或其他有权访问的用户)的公钥和私钥
  在用户根目录(~)中, 创建authorized_keys并设置权限: chmod 600 authorized_keys
#### 添加公钥
  添加公钥: cat id_rsa.pub >> ~/.ssh/authorized_keys
  id_rsa.pub为第一步生成的公钥
  注意该证书的用户必须与ssh远程登录的用户一样, 例如我们的用户名是root
  将公钥添加到gitlab上, 以便于该用于可以拉取代码, 在User Settings找到 SSH Keys, 添加上面拿到的公钥
#### 设置CI/CD变量
  在 CI/CD Piplines中设置 Secret Variables, 包括 DEPLOY_SERVER 和 SSH_PRIVATE_KEY
  其中 SSH_PRIVATE_KEY 的内容是服务器上的私钥, DEPLOY_SERVER 是服务器地址
  编写 .gitlab-ci.yml 文件, 注入密钥, 通过ssh执行远程命令
  完整代码
  ```ci
# 使用alpine镜像, 该镜像很少,只有几兆
image: alpine
stages:
  - deploy
before_script:
  # 预先装 ssh-agent
  - 'which ssh-agent || ( apk update && apk add openssh-client)'
  # 启动服务
  - eval $(ssh-agent -s)
  # 将私钥写入deploy.key 文件
  - echo "$SSH_PRIVATE_KEY" > deploy.key
  # 配置较低权限
  - chmod 0600 deploy.key
  # 注入密钥
  - ssh-add deploy.key
  - mkdir -p ~/.ssh    
  - '[[ -f /.dockerenv ]] && echo -e "Host *\n\tStrictHostKeyChecking no\n\n" > ~/.ssh/config'

release-doc:
  stage: deploy
  variables:
    GIT_STRATEGY: none     
  script:
    # 连接远程服务器并执行拉取代码的命令
    - ssh root@$DEPLOY_SERVER "cd /path/to/wiki && git pull origin master"
  only:
    - master
  environment:
    name: production
    url: http://$DEPLOY_SERVER
```



