---
title: 解析php的内存管理
date: 2017-06-21 13:59:12
tags: php php扩展 c
categories: 技术

---
## php的内存管理
在PHP内核中，大多数情况下都不应该直接使用C语言中自带着malloc、free、strdup、realloc、calloc等操作内存的函数，而应使用内核提供的操作内存的函数，这样可以由内核整体统一的来管理内存。
> 内存泄露
每个平台操作内存的方式都是差不多的有两个方面，一负责申请，二负责释放。如果应用程序向系统申请内存，系统便会在内存中寻找还没有被使用的地方，如果有合适的，便分配给这个程序，并标记下来，不再给其它的程序了。如果一个内存块没有释放，而所有者应用程序也永远不再使用它了。
对于一些需要长时间运行的程序，比如像Apache这样的web服务器以及它的php模块来说，都是伴随着操作系统长时间运行的，所以OS在很长一段时间内不能主动的回收内存，从而导致这个程序的每一个内存泄漏都会促进量变到质变的进化，最终引起严重的内存泄漏错误，使系统的资源消耗殆尽。

## Zend内存管理器
使用Zend内存管理(Zend Memory Manager,简称ZendMM、ZMM)层。内核的这一部分非常类似于操作系统的内存管理功能——分配内存给调用程序。区别在于，它处于进程空间中非常低的位置而且是"请求感知"的；这样一来，当一个请求结束时，它能够执行与OS在一个进程终止时相同的行为。也就是说，它会隐式地释放所有的为该请求所占用的内存。图1展示了ZendMM与OS以及PHP进程之间的关系。
!["我是傲娇的效果图"](/assets/blogImg/zend_manage.jpg)
 除了提供隐式的内存清除功能之外，ZendMM还能够根据php.ini中memory_limit设置来控制每一次内存请求行为，如果一个脚本试图请求比系统中可用内存更多的内存，或大于它每次应该请求的最大量，那么，ZendMM将自动地发出一个E_ERROR消息并且启动相应的终止进程。这种方法的一个额外优点在于，大多数内存分配调用的返回值并不需要检查，因为如果失败的话将会导致立即跳转到引擎的退出部分。 
 所有内部分配的内存都要使用一组特定的可选函数实现。例如，PHP内核代码不是使用malloc(16)来分配一个16字节内存块而是使用了emalloc(16)。除了实现实际的内存分配任务外，ZendMM还会使用相应的绑定请求类型来标志该内存块；这样以来，当一个请求"跳出"时，ZendMM可以隐式地释放它。 有些时候，某次申请的内存需要在一个请求结束后仍然存活一段时间，也就是持续性存在于各个请求之间。这种类型的分配（因其在一次请求结束之后仍然存在而被称为"永久性分配"），可以使用传统型内存分配器来实现，因为这些分配并不会添加ZendMM使用的那些额外的相应于每种请求的信息。然而有时，我们必须在程序运行时根据某个数据的具体值或者状态才能确定是否需要进行永久性分配，因此ZendMM定义了一组帮助宏，其行为类似于其它的内存分配函数，但是使用最后一个额外参数来指示是否为永久性分配。 如果你确实想实现一个永久性分配，那么这个参数应该被设置为1；在这种情况下，请求是通过传统型malloc()分配器家族进行传递的。然而，如果运行时刻逻辑认为这个块不需要永久性分配；那么，这个参数可以被设置为零，并且调用将会被调整到针对每种请求的内存分配器函数。 例如，pemalloc(buffer_len，1)将映射到malloc(buffer_len)，而pemalloc(buffer_len，0)将被使用下列语句映射到emalloc(buffer_len)：
 所有这些在ZendMM中提供的内存管理函数都能够从下表中找到其在C语言中的函数。

| C语言原生函数 |   PHP内核封装后的函数|
| :-------------|  :------------------:|
| void *malloc(size_t count);  |  void *emalloc(size_t count); void *pemalloc(size_t count, char persistent);|
|  void *calloc(size_t count); |  void *ecalloc(size_t count); void *pecalloc(size_t count, char persistent);|
|  void *realloc(void *ptr, size_t count); |   void *erealloc(void *ptr, size_t count); void *perealloc(void *ptr, size_t count, char persistent);|
|  void *strdup(void *ptr); |  void *estrdup(void *ptr); void *pestrdup(void *ptr, char persistent);|
|  void free(void *ptr); | void efree(void *ptr); void pefree(void *ptr, char persistent);|
你可能会注意到，即使是pefree()函数也要求使用永久性标志。这是因为在调用pefree()时，它实际上并不知道是否ptr是一种永久性分配。需要注意的是，如果针对一个ZendMM申请的非永久性内存直接调用free()能够导致双倍的空间释放，而针对一种永久性分配调用efree()有可能会导致一个段错误，因为ZendMM需要去查找并不存在的管理信息。因此，你的代码需要记住它申请的内存是否是永久性的，从而选择不同的内存函数，free()或者efree()。 除了上述内存管理函数外，还存在其它一些非常方便的ZendMM函数，例如： ````c void *estrndup(void *ptr，int len);
该函数能够分配len+1个字节的内存并且从ptr处复制len个字节到最新分配的块。这个estrndup()函数的行为可以大致描述如下：

```c
ZEND_API char *_estrndup(const char *s, uint length ZEND_FILE_LINE_DC ZEND_FILE_LINE_ORIG_DC)
{
        char *p;

        p = (char *) _emalloc(length+1 ZEND_FILE_LINE_RELAY_CC ZEND_FILE_LINE_ORIG_RELAY_CC);
            if (UNEXPECTED(p == NULL))
            {
                        return p;
                            
            }
        memcpy(p, s, length);
        p[length] = 0;
        return p;
}
```
<!--more-->

在此，被隐式放置在缓冲区最后的0可以确保任何使用estrndup()实现字符串复制操作的函数都不需要担心会把结果缓冲区传递给一个例如printf()这样的希望以为NULL为结束符的函数。当使用estrndup()来复制非字符串数据时，最后一个字节实质上浪费了，但其中的利明显大于弊。
void *safe_emalloc(size_t size, size_t count, size_t addtl);
void *safe_pemalloc(size_t size, size_t count, size_t addtl, char persistent);
这些函数分配的内存空间最终大小都是((size*count)+addtl)。 你可以会问："为什么还要提供额外函数呢？为什么不使用一个emalloc/pemalloc呢？"。 原因很简单：为了安全，以防万一。尽管有时候可能性相当小，但是，正是这一"可能性相当小"的结果导致宿主平台的内存溢出。 这可能会导致分配负数个数的字节空间，或更有甚者，会导致分配一个小于调用程序要求大小的字节空间。 而safe_emalloc()能够避免这种类型的陷井-通过检查整数溢出并且在发生这样的溢出时显式地预以结束。
