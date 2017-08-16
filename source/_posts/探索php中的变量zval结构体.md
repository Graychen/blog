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
## 变量类型的实现
在以上实现的基础上，PHP语言得以实现了8种数据类型，这些数据类型在内核中的分别对应于特定的常量，它们分别是：

| 常量名称： |  解释 |
| :--------  |  :---:|
| IS_NULL    | 第一次使用的变量如果没有初始化过，则会自动的被赋予这个常量，当然我们也可以在PHP语言中通过null这个常量来给予变量null类型的值。 这个类型的值只有一个 ，就是NULL，它和0与false是不同的。|
| IS_BOOL    | 布尔类型的变量有两个值，true或者false。在PHP语言中，while、if等语句会自动的把表达式的值转成这个类型的。|
| IS_LONG    | PHP语言中的整型，在内核中是通过所在操作系统的signed long数据类型来表示的。 在最常见的32位操作系统中，它可以存储从-2147483648 到 +2147483647范围内的任一整数。 有一点需要注意的是，如果PHP语言中的整型变量超出最大值或者最小值，它并不会直接溢出， 而是会被内核转换成IS_DOUBLE类型的值然后再参与计算。 再者，因为使用了signed long来作为载体，所以这也就解释了为什么PHP语言中的整型数据都是带符号的了。| 
| IS_DOUBLE  | PHP中的浮点数据是通过C语言中的signed double型变量来存储的， 这最终取决与所在操作系统的浮点型实现。 我们做为程序猿，应该知道计算机是无法精准的表示浮点数的， 而是采用了科学计数法来保存某个精度的浮点数。 用科学计数法，计算机只用8位便可以保存2.225x10^(-308)~~1.798x10^308之间的浮点数。 用计算机来处理浮点数简直就是一场噩梦，十进制的0.5转成二进制是0.1， 0.8转换后是0.1100110011....。 但是当我们从二进制转换回来的时候，往往会发现并不能得到0.8。 我们用1除以3这个例子来解释这个现象：1/3=0.3333333333.....，它是一个无限循环小数， 但是计算机可能只能精确存储到0.333333，当我们再乘以三时， 其实计算机计算的数是0.333333*3=0.999999，而不是我们平时数学中所期盼的1.0. |
| IS_STRING  | PHP中最常用的数据类型——字符串，在内存中的存储和C差不多， 就是一块能够放下这个变量所有字符的内存，并且在这个变量的zval实现里会保存着指向这块内存的指针。 与C不同的是，PHP内核还同时在zval结构里保存着这个字符串的实际长度， 这个设计使PHP可以在字符串中嵌入‘\0’字符，也使PHP的字符串是二进制安全的， 可以安全的存储二进制数据！本着艰苦朴素的作风，内核只会为字符串申请它长度+1的内存， 最后一个字节存储的是‘\0’字符，所以在不需要二进制安全操作的时候， 我们可以像通常C语言的方式那样来使用它。|
| IS_ARRAY   | 数组是一个非常特殊的数据类型，它唯一的功能就是聚集别的变量。 在C语言中，一个数组只能承载一种类型的数据，而PHP语言中的数组则灵活的多， 它可以承载任意类型的数据，这一切都是HashTable的功劳， 每个HashTable中的元素都有两部分组成：索引与值， 每个元素的值都是一个独立的zval（确切的说应该是指向某个zval的指针）。
| IS_OBJECT  | 和数组一样，对象也是用来存储复合数据的，但是与数组不同的是， 对象还需要保存以下信息：方法、访问权限、类常量以及其它的处理逻辑。 相对与zend engine V1，V2中的对象实现已经被彻底修改， 所以我们PHP扩展开发者如果需要自己的扩展支持面向对象的工作方式， 则应该对PHP5和PHP4分别对待！
| IS_RESOURCE| 有一些数据的内容可能无法直接呈现给PHP用户的， 比如与某台mysql服务器的链接，或者直接呈现出来也没有什么意义。 但用户还需要这类数据，因此PHP中提供了一种名为Resource(资源)的数据类型。 有关这个数据类型的事宜将在第九章中介绍，现在我们只要知道有这么一种数据类型就行了。


zval结构体里的type成员的值便是以上某个IS_*常量之一。php的内核通过检测变量的这个成员值来知道他是什么类型的数据并做相应的后续处理。
如果要我们检测一个变量的类型
``` c
void describe_zval(zval *foo)
{
        if ( Z_TYPE_P(foo) == IS_NULL  )
        {
                    php_printf("这个变量的数据类型是： NULL");
                        
        }
        else
        {
                    php_printf("这个变量的数据类型不是NULL，这种数据类型对应的数字是： %d", Z_TYPE_P(foo));
                        
        }

}
```

以一个P结尾的宏的参数大多是*zval型变量。 此外获取变量类型的宏还有两个，分别是Z_TYPE和Z_TYPE_PP，前者的参数是zval型，而后者的参数则是**zval。

``` c
//开始定义php语言中的函数gettype
PHP_FUNCTION(gettype)
{
    //arg间接指向调用gettype函数时所传递的参数。是一个zval**结构
    //所以我们要对他使用__PP后缀的宏。
    zval **arg;

    //这个if的操作主要是让arg指向参数～
    if (zend_parse_parameters(ZEND_NUM_ARGS() TSRMLS_CC, "Z", &arg) == FAILURE) {
                return;
    }
                    
    //调用Z_TYPE_PP宏来获取arg指向zval的类型。
    //然后是一个switch结构，RETVAL_STRING宏代表这gettype函数返回的字符串类型的值
    switch (Z_TYPE_PP(arg)) {
        case IS_NULL:
            RETVAL_STRING("NULL", 1);
            break;
        case IS_BOOL:
            RETVAL_STRING("boolean", 1);
            break;
        case IS_LONG:
            RETVAL_STRING("integer", 1);
            break;
        case IS_DOUBLE:
            RETVAL_STRING("double", 1);
            break;
        case IS_STRING:
            RETVAL_STRING("string", 1);
            break;
        case IS_ARRAY:
            RETVAL_STRING("array", 1);
            break;
        case IS_OBJECT:
            RETVAL_STRING("object", 1);
            break;
        case IS_RESOURCE:
        {
            char *type_name;
            type_name = zend_rsrc_list_get_rsrc_type(Z_LVAL_PP(arg) TSRMLS_CC);
            if (type_name) {
                RETVAL_STRING("resource", 1);
                break;
            }
        }
        default:
                    RETVAL_STRING("unknown type", 1);
    }
}       
```
以上三个宏的定义在Zend/zend_operators.h里，定义分别是：

#define Z_TYPE(zval)        (zval).type
#define Z_TYPE_P(zval_p)    Z_TYPE(*zval_p)
#define Z_TYPE_PP(zval_pp)  Z_TYPE(**zval_pp)

## 变量值的实现
PHP内核提供了三个基础宏来方便我们对变量的值进行操作，这几个宏同样以Z_开头.
内核中针对具体的数据类型分别定义了相应的宏。 如针对IS_BOOL型的BVAL组合(Z_BVAL、Z_BVAL_P、Z_BVAL_PP)和针对IS_DOUBLE的DVAL组合(Z_DVAL、ZDVAL_P、ZDVAL_PP)等等。 我们通过下面这个例子来应用一下这几个宏:
``` c
void display_value(zval zv,zval *zv_p,zval **zv_pp)
{
    if( Z_TYPE(zv) == IS_NULL)
    {
                php_printf("类型是 IS_NULL!\n");
    }
    if( Z_TYPE_P(zv_p) == IS_LONG)
    {
                php_printf("类型是 IS_LONG，值是：%ld" , Z_LVAL_P(zv_p));
    }
    if(Z_TYPE_PP(zv_pp) == IS_DOUBLE)
    {
                php_printf("类型是 IS_DOUBLE,值是：%f" , Z_DVAL_PP(zv_pp) );
    }
}   
```
string型变量比较特殊，因为内核在保存String型变量时，不仅保存了字符串的值，还保存了它的长度， 所以它有对应的两种宏组合STRVAL和STRLEN，即：Z_STRVAL、Z_STRVAL_P、Z_STRVAL_PP与Z_STRLEN、Z_STRLEN_P、Z_STRLEN_PP。 前一种宏返回的是char *型，即字符串的地址；后一种返回的是int型，即字符串的长度。
``` c
void display_string(zval *zstr)
{
    if (Z_TYPE_P(zstr) != IS_STRING) {
        php_printf("这个变量不是字符串!\n");
        return;
    }
    PHPWRITE(Z_STRVAL_P(zstr), Z_STRLEN_P(zstr));
    //这里用了PHPWRITE宏，只要知道它是从Z_STRVAL_P(zstr)地址开始，输出Z_STRLEN_P(zstr)长度的字符就可以了。
}       
 ```       
Array型变量的值其实是存储在C语言实现的HashTable中的， 我们可以用ARRVAL组合宏（Z_ARRVAL, Z_ARRVAL_P, Z_ARRVAL_PP）这三个宏来访问数组的值。 如果你看旧版本php的源码或者部分pecl扩展的源码，可能会发现一个HASH_OF()宏，这个宏等价于Z_ARRVAL_P()。 但不推荐在新代码中再使用了。
对象是一个复杂的结构体（zend_object_value结构体），不仅存储属性的定义、属性的值，还存储着访问权限、方法等信息。 内核中定义了以下组合宏让我们方便的操作对象： OBJ_HANDLE：返回handle标识符， OBJ_HT：handle表， OBJCE：类定义， OBJPROP：HashTable的属性， OBJ_HANDLER：在OBJ_HT中操作一个特殊的handler方法。 现在不用担心这些宏对象的意思，后续有专门的章节介绍object。
资源型变量的值其实就是一个整数，可以用RESVAL组合宏来访问它，我们把它的值传给zend_fetch_resource函数，便可以得到这个资源的操作句柄，如mysql的链接句柄等。
有关值操作的宏都定义在./Zend/zend_operators.h文件里：
``` c
//操作整数的
#define Z_LVAL(zval)            (zval).value.lval
#define Z_LVAL_P(zval_p)        Z_LVAL(*zval_p)
#define Z_LVAL_PP(zval_pp)      Z_LVAL(**zval_pp)

//操作IS_BOOL布尔型的
#define Z_BVAL(zval)            ((zend_bool)(zval).value.lval)
#define Z_BVAL_P(zval_p)        Z_BVAL(*zval_p)
#define Z_BVAL_PP(zval_pp)      Z_BVAL(**zval_pp)

//操作浮点数的
#define Z_DVAL(zval)            (zval).value.dval
#define Z_DVAL_P(zval_p)        Z_DVAL(*zval_p)
#define Z_DVAL_PP(zval_pp)      Z_DVAL(**zval_pp)

//操作字符串的值和长度的
#define Z_STRVAL(zval)          (zval).value.str.val
#define Z_STRVAL_P(zval_p)      Z_STRVAL(*zval_p)
#define Z_STRVAL_PP(zval_pp)        Z_STRVAL(**zval_pp)

#define Z_STRLEN(zval)          (zval).value.str.len
#define Z_STRLEN_P(zval_p)      Z_STRLEN(*zval_p)
#define Z_STRLEN_PP(zval_pp)        Z_STRLEN(**zval_pp)

#define Z_ARRVAL(zval)          (zval).value.ht
#define Z_ARRVAL_P(zval_p)      Z_ARRVAL(*zval_p)
#define Z_ARRVAL_PP(zval_pp)        Z_ARRVAL(**zval_pp)

//操作对象的
#define Z_OBJVAL(zval)          (zval).value.obj
#define Z_OBJVAL_P(zval_p)      Z_OBJVAL(*zval_p)
#define Z_OBJVAL_PP(zval_pp)        Z_OBJVAL(**zval_pp)

#define Z_OBJ_HANDLE(zval)      Z_OBJVAL(zval).handle
#define Z_OBJ_HANDLE_P(zval_p)      Z_OBJ_HANDLE(*zval_p)
#define Z_OBJ_HANDLE_PP(zval_p)     Z_OBJ_HANDLE(**zval_p)

#define Z_OBJ_HT(zval)          Z_OBJVAL(zval).handlers
#define Z_OBJ_HT_P(zval_p)      Z_OBJ_HT(*zval_p)
#define Z_OBJ_HT_PP(zval_p)     Z_OBJ_HT(**zval_p)

#define Z_OBJCE(zval)           zend_get_class_entry(&(zval) TSRMLS_CC)
#define Z_OBJCE_P(zval_p)       Z_OBJCE(*zval_p)
#define Z_OBJCE_PP(zval_pp)     Z_OBJCE(**zval_pp)

#define Z_OBJPROP(zval)         Z_OBJ_HT((zval))->get_properties(&(zval) TSRMLS_CC)
#define Z_OBJPROP_P(zval_p)     Z_OBJPROP(*zval_p)
#define Z_OBJPROP_PP(zval_pp)       Z_OBJPROP(**zval_pp)

#define Z_OBJ_HANDLER(zval, hf)     Z_OBJ_HT((zval))->hf
#define Z_OBJ_HANDLER_P(zval_p, h)  Z_OBJ_HANDLER(*zval_p, h)
#define Z_OBJ_HANDLER_PP(zval_p, h)     Z_OBJ_HANDLER(**zval_p, h)

#define Z_OBJDEBUG(zval,is_tmp)     (Z_OBJ_HANDLER((zval),get_debug_info)?  \
                        Z_OBJ_HANDLER((zval),get_debug_info)(&(zval),&is_tmp TSRMLS_CC): \
                                                (is_tmp=0,Z_OBJ_HANDLER((zval),get_properties)?Z_OBJPROP(zval):NULL)) 
#define Z_OBJDEBUG_P(zval_p,is_tmp) Z_OBJDEBUG(*zval_p,is_tmp) 
#define Z_OBJDEBUG_PP(zval_pp,is_tmp)   Z_OBJDEBUG(**zval_pp,is_tmp)

//操作资源的
#define Z_RESVAL(zval)          (zval).value.lval
#define Z_RESVAL_P(zval_p)      Z_RESVAL(*zval_p)
#define Z_RESVAL_PP(zval_pp)        Z_RESVAL(**zval_pp)
```     
## php的类型转换
php内核中提供了好多函数专门来帮我们实现类型转换的功能，你需要的只是调用一个函数而已。这一类函数有一个统一的形式：convert_to_*()
``` c
//将任意类型的zval转换成字符串
void change_zval_to_string(zval *value)
{
        convert_to_string(value);
}

//其它基本的类型转换函数
ZEND_API void convert_to_long(zval *op);
ZEND_API void convert_to_double(zval *op);
ZEND_API void convert_to_null(zval *op);
ZEND_API void convert_to_boolean(zval *op);
ZEND_API void convert_to_array(zval *op);
ZEND_API void convert_to_object(zval *op);

ZEND_API void _convert_to_string(zval *op ZEND_FILE_LINE_DC);
#define convert_to_string(op) if ((op)->type != IS_STRING) { _convert_to_string((op) ZEND_FILE_LINE_CC);  }
```
这里面有两个比较特殊，一个就是convert_to_string其实是一个宏函数，调用的另外一个函数；第二个便是没有convert_to_resource()的转换函数，因为资源的值在用户层面上，根本就没有意义，内核不会对它的值(不是指那个数字)进行转换。
注意，并不是所有的内存分配例程都有一个相应的p*对等实现。例如，不存在pestrndup()，并且在PHP 5.1版本前也不存在safe_pemalloc()。



