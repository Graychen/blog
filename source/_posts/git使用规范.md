---
title: git使用规范
date: 2018-02-11 22:30:54
tags: 技术 php
---
# Git工作流程

## 分支

- master: 用于生产环境部署, 只接受合并请求, 不直接提交
- testing: 用于测试环境测试
- develop: 用于日常开发主线, 其他分支只能合并到 develop 分支
- feature-xxx: 用于增加一个新功能
- hotfix-xxx: 用于修复一个紧急bug
每次开发新功能，都应该新建一个单独的分支
## 工作流

- 如果要贡献代码, 首先应阅读贡献指南, 确认如果贡献代码
- Fork对应的项目, 然后基于develop分支, 新建一个分支, 在这个分支上进行开发
- 开发时应遵守相应的编码规范和Git日志规范, 提交日志应当给出完整扼要的提交信息
- 开发完毕后, 先在本项目库上合并到develop分支, 合并完成之后再PR到原项目库
## Commit message 和 Change log 编写指南

Git 每次提交代码，都要写 Commit message（提交说明），否则就不允许提交 +Commit message 遵从[ Angular 规范](http://blog.cheenwe.cn/2016-04-18/git-commit-message/)
### 安装 Commitizen 来格式化 commit , 使其遵循以上规范

首先注意将package.json和node_modules加入.gitignore文件
全局安装commitizen: `npm install -g commitizen`
在项目根目录初始化package.json: `npm init --yes`
项目根目录运行 `commitizen init cz-conventional-changelog --save --save-exact`
每次提交代码时, 用 `git cz` 代替` git commit`
<!-- more -->
## 自动生成 Change log

安装 `npm install -g conventional-changelog-cli`
使用`conventional-changelog`生成日志: `conventional-changelog -p angular -i CHANGELOG.md -s -r 0`
## 版本号使用规范

版本号遵循语义化版本规范.

版本格式：主版本号.次版本号.修订号，版本号递增规则如下：

主版本号：当你做了不兼容的 API 修改，
次版本号：当你做了向下兼容的功能性新增，
修订号：当你做了向下兼容的问题修正。
先行版本号及版本编译信息可以加到“主版本号.次版本号.修订号”的后面，作为延伸。

更多内容参见 [语义化版本](http://semver.org/lang/zh-CN/)

## 参考资料

[Git 使用规范流程](http://www.ruanyifeng.com/blog/2015/08/git-use-process.html)
[Commit message 和 Change log 编写指南](http://www.ruanyifeng.com/blog/2016/01/commit_message_change_log.html)
[Git commit message 规范](http://blog.cheenwe.cn/2016-04-18/git-commit-message/)
