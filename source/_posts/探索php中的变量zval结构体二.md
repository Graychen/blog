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
php中的引用计数
先看例子

``` php
<?php
$a = 'Hello World';
$b = $a;
unset($a);      
```

<!--more-->
PHP变量的名称和值在php内核中是保存在两个不同的地方的，值是通过一个与名字毫无关系的zval结构来保存，而这个变量的名字a则保存在符号表里，两者之间通过指针联系着。在我们上面的例子里，$a是一个字符串，我们通过zend_hash_add把它添加到符号表里，然后又把它赋值给$b,两者拥有相同的内容！如果两者指向完全相同的内容，我们有什么优化措施吗？
这里我们主要讲解refcount__gc这个成员。当一个变量被第一次创建的时候，它对应的zval结构体的refcount__gc成员的值会被初始化为1，理由很简单，因为只有这个变量自己在用它。但是当你把这个变量赋值给别的变量时，refcount__gc属性便会加1变成2，因为现在有两个变量在用这个zval结构了！ 以上描述转为内核中的代码大体如下：

``` c
    zval *helloval;
    MAKE_STD_ZVAL(helloval);
    ZVAL_STRING(helloval, "Hello World", 1);
    zend_hash_add(EG(active_symbol_table), "a", sizeof("a"),&helloval, sizeof(zval*), NULL);
    ZVAL_ADDREF(helloval); //这句很特殊，我们显式的增加了helloval结构体的refcount
    zend_hash_add(EG(active_symbol_table), "b", sizeof("b"),&helloval, sizeof(zval*), NULL)
```
这个时候当我们再用unset删除$a的时候，它删除符号表里的$a的信息，然后清理它的值部分，这时它发现$a的值对应的zval结构的refcount值是2，也就是有另外一个变量在一起用着这个zval，所以unset只需把这个zval的refcount减去1就行了！
引用计数绝对是节省内存的一个超棒的模式！但是当我们修改$b的值，而且还需要继续使用$a时，该怎么办呢？

``` php
    $a = 1;
    $b = $a;
    $b += 5;
```
从代码逻辑来看，我们希望语句执行后$a仍然是1，而$b则需要变成6。我们知道在第二句完成后内核通过让$a和$b共享一个zval结构来达到节省内存的目的，但是现在第三句来了，这时$b的改变应该怎样在内核中实现呢？ 答案非常简单，内核首先查看refcount__gc属性，如果它大于1则为这个变化的变量从原zval结构中复制出一份新的专属与$b的zval来，并改变其值。

``` c
zval *get_var_and_separate(char *varname, int varname_len TSRMLS_DC)
{
        zval **varval, *varcopy;
        if (zend_hash_find(EG(active_symbol_table),varname, varname_len + 1, (void**)&varval) == FAILURE)
        {
            /* 如果在符号表里找不到这个变量则直接return */
            return NULL;
        }

        if ((*varval)->refcount < 2)
        {   
        //如果这个变量的zval部分的refcount小于2，代表没有别的变量在用，return
        return *varval;
        }
            
        /* 否则，复制一份zval*的值 */
        MAKE_STD_ZVAL(varcopy);
        varcopy = *varval;
            
        /* 复制任何在zval*内已分配的结构*/
        zval_copy_ctor(varcopy);

        /* 从符号表中删除原来的变量
         * 这将减少该过程中varval的refcount的值
         */
        zend_hash_del(EG(active_symbol_table), varname, varname_len + 1);

        /* 初始化新的zval的refcount，并在符号表中重新添加此变量信息，并将其值与我们的新zval相关联。*/
        varcopy->refcount = 1;
        varcopy->is_ref = 0;
        zend_hash_add(EG(active_symbol_table), varname, varname_len + 1,&varcopy, sizeof(zval*), NULL);
            
        /* 返回新zval的地址 */
        return varcopy;
}  
```

现在$b变量拥有了自己的zval，并且可以自由的修改它的值了。
Change on Write

如果用户在PHP脚本中显式的让一个变量引用另一个变量时，我们的内核是如何处理的呢？

``` php
    $a = 1;
    $b = &$a;
    $b += 5;        
```

作为一个标准的PHP程序猿，我们都知道$a的值也变成6了。当我们更改$b的值时，内核发现$b是$a的一个用户端引用，也就是所它可以直接改变$b对应的zval的值，而无需再为它生成一个新的不同与$a的zval。因为他知道$a和$b都想得到这次变化！ 但是内核是怎么知道这一切的呢？简单的讲，它是通过zval的is_ref__gc成员来获取这些信息的。这个成员只有两个值，就像开关的开与关一样。它的这两个状态代表着它是否是一个用户在PHP语言中定义的引用。在第一条语句($a = 1;)执行完毕后,$a对应的zval的refcount__gc等于1，is_ref__gc等于0;。 当第二条语句执行后($b = &$a;)，refcount__gc属性向往常一样增长为2，而且is_ref__gc属性也同时变为了1！ 最后，在执行第三条语句的时候，内核再次检查$b的zval以确定是否需要复制出一份新的zval结构来，这次不需要复制，因为我们刚才上面的get_var_and_separate函数其实是个简化版，并且少写了一个条件：
``` c
    /* 如果这个zval在php语言中是通过引用的形式存在的，或者它的refcount小于2，则不需要复制。*/
    if ((*varval)->is_ref || (*varval)->refcount < 2) {
            return *varval;
    }       

```

这一次，尽管它的refcount等于2，但是因为它的is_ref等于1，所以也不会被复制。内核会直接的修改这个zval的值。
Separation Anxiety

我们已经了解了php语言中变量的复制和引用的一些事，但是如果复制和引用这两个事件被组合起来使用了该怎么办呢？看下面这段代码：

``` php
    $a = 1;
    $b = $a;
    $c = &$a;       
```
 !["我是傲娇的效果图"](/assets/blogImg/is_ref1.jpg)
这里我们可以看到,$a,$b,$c这三个变量现在共用一个zval结构，有两个属于change-on-write组合($a,$c),有两个属于copy-on-write组合($a,$b),我们的is_ref__gc和refcount__gc该怎样工作，才能正确的处理好这段复杂的关系呢？ The answer is: 不可能！在这种情况下，变量的值必须分离成两份完全独立的存在！$a与$c共用一个zval,$b自己用一个zval，尽管他们拥有同样的值，但是必须至少通过两个zval来实现。见图3.2【在引用时强制复制！】



同样，下面的这段代码同样会在内核中产生歧义，所以需要强制复制！
``` php
    //上图对应的代码
    $a = 1;
    $b = &$a;
    $c = $a;        
```
 !["我是傲娇的效果图"](/assets/blogImg/is_ref2.jpg)

需要注意的是，在这两种情况下，$b都与原初的zval相关联，因为当复制发生时，内核还不知道第三个变量的名字。











