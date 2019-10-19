---
title: 谈谈mysql的四种事务隔离级别
date: 2019-10-17 20:28:07
tags: 技术
---
这几天遇到事务的隔离级别的问题，网上查了资料整理一下，方便自己理解和吸收。
## 事务的并发问题
事务为什么需要隔离级别，这是因为事务有这几个问题。
1脏读:事务A读取了事务B更新的数据，然后B回滚，那么A读到的数据是脏数据
2不可重复读:事务A多次读取同一数据，事务B在事务A多次读取的过程中，对数据作了更新并提交，导致事务A多次读取同一数据时，结果不一致
3幻读:系统管理员A将数据库中所有学生的成绩从具体分数改为ABCDE等级，但是系统管理员B就在这个时候插入一条具体分数的记录，当系统管理员A结束后发现还有一条记录没改正，就好像发生幻觉一样。
> 不可重复读侧重于修改，幻读侧重于新增火删除。解决不可重复读的问题只需要锁住满足条件的行，解决幻读需要锁表。
## Mysql事务隔离级别

|事务隔离级别 |	脏读  |	不可重复读|	幻读  |
| ----------- |:-----:|:---------:|:-----:|
|读未提交（read-uncommitted）|	是|	是|	是|
|不可重复读（read-committed）|	否|	是|	是|
|可重复读（repeatable-read） |	否|	否|	是|
|串行化（serializable）	     |  否|	否|	否|

> mysql默认的事务隔离级别为repeatable-read
## 用例子说明各个隔离级别的情况
### 读未提交

``` mysql 
客户端A

mysql> set session transaction isolation level read uncommitted; 
Query OK, 0 rows affected (0.00 sec)

mysql> start transaction; 
Query OK, 0 rows affected (0.00 sec)

mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 450     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
3 rows in set (0.00 sec)
```
2在客户端A的事务提交之前，打开另一个客户端B，更新表account；
``` mysql 
客户端B
mysql> set session transaction isolation level read uncommitted;
Query OK, 0 rows affected (0.00 sec)

mysql> start transaction; 
Query OK, 0 rows affected (0.00 sec)
mysql> update account set  balance=balance-50 where id = 1; 
Query OK, 0 rows affected (0.00 sec)
mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 450     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
3 rows in set (0.00 sec)
```
3）这时，虽然客户端B的事务还没提交，但是客户端A就可以查询到B已经更新的数据：

``` mysql 
客户端A

mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 400     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
3 rows in set (0.00 sec)
4一旦客户端B的事务因为某种原因回滚，所有的操作都将会被撤销，那客户端A查询到的数据其实就是脏数据
``` mysql 
客户端B
mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 400     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
Query OK, 0 rows affected (0.00 sec)

mysql> rollback; 
Query OK, 0 rows affected (0.00 sec)
mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 450     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
3 rows in set (0.00 sec)
```
5）在客户端A执行更新语句update account set balance = balance - 50 where id =1，lilei的balance没有变成350，居然是400，是不是很奇怪，数据不一致啊，如果你这么想就太天真 了，在应用程序中，我们会用400-50=350，并不知道其他会话回滚了，要想解决这个问题可以采用读已提交的隔离级别
客户端A
``` mysql 
mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 400     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+

mysql> start transaction; 
Query OK, 0 rows affected (0.00 sec)
mysql> update account set  balance=balance-50 where id = 1; 
Query OK, 0 rows affected (0.00 sec)
mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 400     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
3 rows in set (0.00 sec)
```

## 读已提交

``` mysql 
客户端A

mysql> set session transaction isolation level read uncommitted; 
Query OK, 0 rows affected (0.00 sec)

mysql> start transaction; 
Query OK, 0 rows affected (0.00 sec)

mysql> select * from account; 
+------+------+---------+
| id   | name | balance |
+------+------+---------+
| 1   | lilei | 450     |
| 2   | hanmei| 16000   |
| 3   | lucy  | 2400    |
+------+------+---------+
3 rows in set (0.00 sec)
```
2）在客户端A的事务提交之前，打开另一个客户端B，更新表account：

