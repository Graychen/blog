---
title: php如何正确的统计中文
date: 2019-11-21 15:34:28
tags: 技术
---
PHP 中如何正确统计中文字数？这个是困扰我很久的问题，PHP 中有很多函数可以计算字符串的长度，比如下面的例子，分别使用了 strlen，mb_strlen，mb_strwidth 这个三个函数去测试统计字符串的长度，看看把中文算成几个字节：
``` php 
echo strlen("你好ABC") . "";
//输出 9
echo mb_strlen("你好ABC", 'UTF-8') . "";
// 输出 5
echo mb_strwidth("你好ABC") . "";
//输出 7
登录后复制
```
从上面的测试，我们可以看出：strlen 把中文字符算成 3 个字节，mb_strlen 不管中文还是英文，都算 1 个字节，而 mb_strwidth 则把中文算成 2 个字节，所以 mb_strwidth 才是我们想要的：中文 2 个字节，英文 1 个字节。
