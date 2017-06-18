---
title: 探索php中的变量zval结构体
date: 2017-06-18 23:03:30
tags: php php扩展 c
categories: 技术

---
## 变量的类型
php是动态语言，c是静态语言，php是c实现的，我以前一直不明白静态的c是怎么实现动态的php的，后面发现php的每个变量都是一个zval结构体，zval中的type存储真正的类型，根据type来获取zvalue_value的值.
注意这个php的版本是5.4,最新的php7结构体已经变更
PHP在内核中是通过zval这个结构体来存储变量的，它的定义在Zend/zend.h文件里，简短精炼，只有四个成员组成：
``` c

struct _zval_struct {
        zvalue_value value; /* 变量的值 */
        zend_uchar type;    /* 变量当前的数据类型 */
        zend_uint refcount__gc;
        zend_uchar is_ref__gc;
};
typedef struct _zval_struct zval;

//在Zend/zend_types.h里定义的：
typedef unsigned int zend_uint;
typedef unsigned char zend_uchar;

```

保存变量值的value则是zvalue_value类型(PHP5)，它是一个union，同样定义在了Zend/zend.h文件里：
``` c
typedef union _zvalue_value {
        long lval;                  /* long value */
        double dval;                /* double value */
        struct {
                char *val;
                int len;
        } str;
        HashTable *ht;              /* hash table value */
        zend_object_value obj;
} zvalue_value;

```

> PHP中常见的变量类型有：
1. 整型/浮点/长整型/bool值 等等
2. 字符串
3. 数组/关联数组
4. 对象
5. 资源


PHP根据zval中的type字段来储存一个变量的真正类型，然后根据type来选择如何获取zvalue_value的值，比如对于整型和bool值:

``` c
      zval.type = IS_LONG;//整形
      zval.type = IS_BOOL;//布尔值
```

就去取zval.value.lval,对于bool值来说lval∈(0|1);
如果是双精度，或者float则会去取zval.value的dval。
而如果是字符串，那么:

``` c
         zval.type = IS_STRING
```

这个时候，就会取:

``` c 
         zval.value.str
```

而这个也是个结构，存有C分格的字符串和字符串的长度。
而对于数组和对象，则type分别对应IS_ARRAY, IS_OBJECT, 相对应的则分别取zval.value.ht和obj
比较特别的是资源，在PHP中，资源是个很特别的变量，任何不属于PHP内建的变量类型的变量，都会被看作成资源来进行保存，比如，数据库句柄，打开的文件句柄等等。 对于资源:

``` c
            type = IS_RESOURCE
```

