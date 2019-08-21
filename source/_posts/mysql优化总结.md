---
title: mysql优化总结
date: 2019-04-27 17:00:21
categories: 技术
---

最近总结下mysql的优化思路，希望接下来能看到这篇文章回忆和参考
# 优化sql语句
## 通过show status命令了解各种sql的执行效率
``` mysql
mysql> show status like 'Com_%';
```
- Com_select:执行select操作的次数，一次查询只增加1
- Com_insert:执行insert操作的次数，对于批量插入的insert操作，只累加一次
- Com_update: 执行update操作的次数
- Com_delete: 执行delete操作的次数
对InnoDB存储引擎
Innodb_rows_read: select查询返回的行数
Innodb_rows_inserted: 执行insert操作的行数
Innodb_rows_update: 执行update操作更新的行数
Innodb_rows_delete: 执行delete操作的行数
了解当前数据以插入更新为主还是以查询为主，各种类型sql的执行比例。对于更新操作的计数，是执行次数的计数。通过com_commit和Com_rollback可以了解事务提交和回滚的情况
## 定位执行效率较低的sql语句
- 通过慢查询日志定位那些执行效率低的sql语句，用--log-slow-queries=[filename]
- 通过show processlist命令查看mysql进行的线程，包括线程的状态，是否锁表
## 通过explain分析sql的执行计划
``` php
 mysql> explain select sum(amount) from customer a , payment b where 1=1 a.customer_id = b.customer_id and email = 'JANE.BENNETT@SAKILACUSTOMER.org'\G
***************1. row*********************
id:1
select_type:SIMPLE
table:a
type:ALL
possible_keys:PRIMARY
key:NULL
key_len:NULL
ref:NULL
ROWS:583
***************2. row*********************
id:2
select_type:SIMPLE
table:b
type: ref
possible_keys:idx_fk_customer_id
key:idx_fk_customer_id
key_len:2
ref:sakila.a.customer_id
ROWS:12
************************************
```
>
slect_type: select的类型
- SIMPLE(简单表，不使用表连接或者子查询)
- PRIMARY(主查询:外层的查询)
- UNION(UNION中的第二个或者后面的查询语句)
- SUBQUERY(子查询中的第一个SELECT)
table:输出结果集的表
type:
- ALL 全表扫描（表里全表来找到匹配的行）
- index 索引全扫描 (遍历索引来查询匹配的行)
- range 索引范围扫描 (常见< > <= >= between)
- ref 非唯一索引扫描表
- eq_ref 唯一索引扫描表 
- const/system 最多有一个匹配行
NULL：不用访问表或者索引