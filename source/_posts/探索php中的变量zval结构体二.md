---
title: 探索php中的变量zval结构体二
date: 2017-06-20 17:04:13
tags: php php扩展 c
categories: 技术

---
上篇博文我们探索了php中的zval中的类型和值，现在我们探究下php的zval结构体中的:
       ` zend_uint refcount__gc `
       ` zend_uchar is_ref__gc `
``` c
struct _zval_struct {
        zvalue_value value; /* 变量的值 */
        zend_uchar type;    /* 变量当前的数据类型 */
        zend_uint refcount__gc; /*  */
        zend_uchar is_ref__gc;
};
typedef struct _zval_struct zval;
```

