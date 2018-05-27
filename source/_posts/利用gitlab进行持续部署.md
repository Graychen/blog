---
title: 利用gitlab进行持续部署
date: 2018-02-12 23:55:00
tags: devops
categories: 技术

---

## GitLab-CI使用Docker进行持续部署
Docker镜像通过私有仓库进行发布(如阿里云), 发布命令为:
```ci
 docker login -u username -p password registry.demo.com
 docker build -t registry.demo.com/repos/$CI_PROJECT_NAME:latest .
 docker push registry.demo.com/repos/$CI_PROJECT_NAME:latest
```
其中 `username`是用户名, `password`是密码, registry.demo.com是私有镜像库地址,
`$CI_PROJECT_NAME` 是GitLab-CI内置变量, 会自动替换为项目的名称, 这里也可以直接写死, 如
```ci
docker build -t registry.demo.com/repos/image-name:latest .
```
`image-name`, 就是要构建的镜像名称, `latest`是TAG标签, `repos`是仓库的空间名称

在下面的例子中, 首先通过composer安装依赖库, 然后通过artifacts传递给构建任务, 构建完镜像将镜像发布到私有库, 部署时通过拉取最新的镜像库, 进行部署
<!--more-->
项目的deploy目录中, 放置一些配置文件, 如Dockerfile, docker-compose.yml等, 通过rsync同步到部署服务器上, 用于部署所需
```
image: zacksleo/docker-composer:1.1

before_script:
    - 'which ssh-agent || ( apk update && apk add openssh-client)'
    - apk add rsync
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" > ~/deploy.key
    - chmod 0600 ~/deploy.key
    - ssh-add ~/deploy.key
    - mkdir -p ~/.ssh
    - '[[ -f /.dockerenv ]] && echo -e "Host *\n\tStrictHostKeyChecking no\n\n" > ~/.ssh/config'
    - export APP_ENV=testing

stages:
    - prepare    
    - build
    - deploy

variables:
    COMPOSER_CACHE_DIR: "/cache/composer"
    DOCKER_DRIVER: overlay

installing-dependencies:
    stage: prepare
    script:
        - composer install --prefer-dist -n --no-interaction -v --no-suggest
    artifacts:
        name: "vendor"
        untracked: true
        expire_in: 60 mins
        paths:
            - $CI_PROJECT_DIR/vendor    
test-image:
    stage: build
    image: docker:latest
    services:
        - docker:dind
    dependencies:
        - installing-dependencies
    script:
        - docker login -u username -p password registry.demo.com
        - docker build -t registry.demo.com/repos/$CI_PROJECT_NAME:latest .
        - docker push registry.demo.com/repos/$CI_PROJECT_NAME:latest
testing-server:
    stage: deploy
    image: alpine
    variables:
        DEPLOY_SERVER: "server-host"
    script:
        - cd deploy
        - rsync -rtvhze ssh . root@$DEPLOY_SERVER:/data/$CI_PROJECT_NAME --stats        
        - ssh root@$DEPLOY_SERVER "docker login -u username -p password registry.demo.com"
        - ssh root@$DEPLOY_SERVER "cd /data/$CI_PROJECT_NAME && docker-compose stop && docker-compose rm -f && docker-compose pull && docker-compose up -d"
        - ssh root@$DEPLOY_SERVER "docker exec -i $CI_PROJECT_NAME chown www-data:www-data web/assets"
        - ssh root@$DEPLOY_SERVER "docker exec -i $CI_PROJECT_NAME ./yii migrate/up --interactive=0"
```
## GitLab-CI使用LFTP进行持续部署

LFTP是一款FTP客户端软件, 支持 FTP 、 FTPS 、 HTTP 、 HTTPS 、 SFTP 、 FXP 等多种文件传输协议。

本文介绍如何使用 LFTP 将文件同步到远程FTP服务器上, 从而实现自动部署

mirror 命令及主要参数

-R 反向传输, 因为是上传(put)到远程服务器, 所以使用该参数 (默认是从远程服务器下载)
-L 下载符号链接作为文件, 主要处理文件软链接的问题
-v 详细输出日志
-n 只传输新文件 (相同的旧文件不会传输, 大大提升了传输效率)
--transfer-all 传输所有文件, 不论新旧
--parallel 同时传输的文件数
--file 本地文件
--target-directory 目标目录

配置参考
```
deploy:
    stage: deploy
    dependencies:
        - installing-dependencies
    script:
        - apk add lftp
        # 只上传新文件
        - lftp -c "set ftp:ssl-allow no; open -u $FTP_USERNAME,$FTP_PASSWORD $FTP_HOST; cd /wwwroot; mirror -RLnv ./ /wwwroot --ignore-time --parallel=50 --exclude-glob .git* --exclude .git/"
        # 指定目录覆盖上传 (强制更新)
        - lftp -c "set ftp:ssl-allow no; open -u $FTP_USERNAME,$FTP_PASSWORD $FTP_HOST;mirror -RLv ./vendor/composer /wwwroot/vendor/composer --ignore-time --transfer-all --parallel=50 --exclude-glob .git* --exclude .git/"
        # 单独上传autoload文件(强制更新)
        - lftp -c "set ftp:ssl-allow no; open -u $FTP_USERNAME,$FTP_PASSWORD $FTP_HOST;mirror -Rv --file=vendor/autoload.php --target-directory=/wwwroot/vendor/ --transfer-all"
    only:
        - master
```
## GitLab-CI使用Rsync进行持续部署
rsync命令是一个远程数据同步工具
主要参数
-r 递归目录
-t 保留修改时间
-v 详细日志
-h 输出数字以人类可读的格式
-z 在传输过程中压缩文件数据
-e 指定要使用的远程shell, 注意该过程需要注入SSH

配置参考
```
before_script:
    - 'which ssh-agent || ( apk update && apk add openssh-client)'
    - apk add rsync
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" > ~/deploy.key
    - chmod 0600 ~/deploy.key
    - ssh-add ~/deploy.key
    - mkdir -p ~/.ssh
    - '[[ -f /.dockerenv ]] && echo -e "Host *\n\tStrictHostKeyChecking no\n\n" > ~/.ssh/config'
    - export APP_ENV=testing


testing-server:
    stage: deploy
    image: alpine
    variables:
        DEPLOY_SERVER: "server-host"
    script:
        - cd deploy
        - rsync -rtvhze ssh . root@$DEPLOY_SERVER:/data/$CI_PROJECT_NAME --stats
```
>注意
远程服务器需要安装rsync, 否则会出现 bash: rsync: command not found 错误
