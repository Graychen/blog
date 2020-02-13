---
title: golang编程规范
date: 2020-02-13 10:26:33
tags: 技术
---
# go fmt
大部分的格式问题可以通过 gofmt 解决，gofmt 自动格式化代码，保证所有的Go代码与官方推荐的格式保持一致，于是所有格式有关问题，都以 gofmt 的结果为准。
代码提交前，必须执行gofmt进行格式化。
# go vet
vet工具可以帮我们静态分析我们的源码存在的各种问题，例如多余的代码，提前return的逻辑，struct的tag是否符合标准等。
代码提交前，必须执行go vet进行静态检查。

# 长度约定
代码块长度，代码块不能超过10行，否则就需要进行分块。
行代码长度控制，每行代码不能超过100个字符，超过100字符需换行，提高代码可读性。
# 注释
结构体、函数和包必须进行注释
结构体注释格式：
// ObjectMeta is metadata that all persisted resources must have, which includes all objects
// users must create.
type ObjectMeta struct {
}

- 函数注释格式：
// Compile parses a regular expression and returns, if successful,
// a Regexp that can be used to match against text.
```
func Compile(str string) (*Regexp, error) {
  。。。
}
```
- 包注释格式：
// Package path implements utility routines for
// manipulating slash-separated filename paths.
path

# 命名
- 关键或者复杂的代码需要进行注释：
- 注释内容必须是可读的完整句子，简要并且突出重点。
- 需要注释来补充的命名就不算是好命名。
- 使用可搜索的名称：单字母名称和数字常量很难从一大堆文字中搜索出来。单字母名称仅适用于短方法中的本地变量，名称长短应与其作用域相对应。若变量或常量可能在代码中多处使用，则应赋其以便于搜索的名称。
- 做有意义的区分：Product 和 ProductInfo 和 ProductData 没有区别，NameString 和 Name 没有区别，要区分名称，就要以读者能鉴别不同之处的方式来区分 。
- 函数命名规则：驼峰式命名，名字可以长但是得把功能，必要的参数描述清楚，函数名应当是动词或动词短语，不可导出的函数以小写开头。
- 如 postPayment、deletePage、save。并依 Javabean 标准加上 get、set、is 前缀。例如：xxx + With + 需要的参数名 + And + 需要的参数名 + …..
- 结构体命名规则：结构体名应该是名词或名词短语，如 Customer、WikiPage、Account、AddressParser
## 接口命名规则：
单个函数的接口名以"er"作为后缀，如Reader,Writer

## 接口的实现则去掉“er”
``` go
type Reader interface {
        Read(p []byte) (n int, err error)
}
```
## 两个函数的接口名综合两个函数名
``` go
type WriteFlusher interface {
    Write([]byte) (int, error)
    Flush() error
}
```

## 三个以上函数的接口名，类似于结构体名
``` go
type Car interface {
    Start([]byte)
    Stop() error
    Recover()
}
```
# 包
包名命名规则：包名应该为小写单词，不要使用下划线或者混合大小写。
文件夹命名规则：小写单词，使用横杠连接
文件命名 规则：小写单词，使用下划线连接，测试文件_test.go结束
一般情况下包名和文件夹命名是一致的，不过也可以不一样
常量
常量均需使用全部大写字母组成，并使用下划线分词：

const APP_VER = "1.0"

如果是枚举类型的常量，需要先创建相应类型：
``` go 
type Scheme string
const (
    HTTP  Scheme = "http"
    HTTPS Scheme = "https"
)
```
如果模块的功能较为复杂、常量名称容易混淆的情况下，为了更好地区分枚举类型，可以使用完整的前缀：
``` go
type PullRequestStatus int
const (
    PULL_REQUEST_STATUS_CONFLICT PullRequestStatus = iota
    PULL_REQUEST_STATUS_CHECKING
    PULL_REQUEST_STATUS_MERGEABLE
)
```
# 变量
## 变量名称一般遵循驼峰法，但遇到特有名词时，需要遵循以下规则：

- 如果变量为私有，且特有名词为首个单词，则使用小写，如 apiClient
- 其它情况都应当使用该名词原有的写法，如 APIClient、repoID、UserID
- 错误示例：UrlArray，应该写成 urlArray 或者 URLArray
若变量类型为 bool 类型，则名称应以 Has, Is, Can 或 Allow 开头：
``` go
var isExist boolvar hasConflict bool
var canManage bool
var allowGitHook bool
```
多个变量声明放在一起
``` go
var (
    isExist bool
    count int
)
```
在函数外部声明使用var,不要采用:=
``` go
struct
```
声明和初始化采用多行，初始化结构体使用带有标签的语法

``` go
type User struct{
    Username  string
    Email     string
}

u := User{
    Username: "yourname",
    Email:    "yourname@gmail.com",
}
```
修改对象属性不能直接使用赋值，要写成方法且必须加锁
``` go
# map
```
非线程安全，并发读写map的情况下必须加锁，不然会产生panic

>> go 1.9以下版本可参考 beego的safemap，1.9以上版本使用sync.Map

# 函数
函数采用命名的多值返回，传入变量和返回变量以小写字母开头
``` go
func nextInt(b []byte, pos int) (value, nextPos int)
```
函数返回值可能为空或零值时，加一个逻辑判断的返回值
``` go
func Foo(a int, b int) (string, bool)
```
函数返回用显式，不要用隐式，避免返回值被重复定义，导致返回值错误，特别是error返回值
``` go
func Foo() (bar *Bar,err error){
  a,err:=A()
  if err !=  nil{
      return
  }
  ...
  return
}
```
约定下面的写法
``` go
func Foo() (bar *Bar,err error){
  a,err:=A()
  if err !=  nil{
      return nil,err
  }
  ...
  return bar,nil
}
```
# init
- 在同一个文件中，可以重复定义init方法
- 在同一个文件中，多个init方法按照在代码中编写的顺序依次执行
- 在同一个package中，可以多个文件中定义init方法
- 在同一个package中，不同文件中的init方法的执行按照文件名先后执行各个文件中的init方法
建议同一个文件中只定义一个init方法，同一个package中init尽量合并

# 错误处理
- error作为函数的值返回,必须对error进行处理
- 错误描述如果是英文必须为小写，不需要标点结尾
- 采用独立的错误流进行处理
不要采用下面的处理错误写法:
``` go
if err != nil {
    // error handling
} else {
    // normal code
}
```
采用下面的写法

``` go
if err != nil {
    // error handling
    return // or continue, etc.
}
// normal code
```
使用函数的返回值时，则采用下面的方式

``` go
x, err := f()
if err != nil {
    // error handling
    return
}
// use x

```
控制结构
if接受初始化语句，约定如下方式建立局部变量
``` go
if err := file.Chmod(0664); err != nil {
  return err
}
```
for 采用短声明建立局部变量
``` go
sum := 0
for i := 0; i < 10; i++ {
  sum += i
}
```
range
``` go
如果只需要第一项（key），就丢弃第二个：

for key := range m {
    if key.expired() {
        delete(m, key)
    }
}
```
如果只需要第二项，则把第一项置为下划线
``` go
sum := 0
for _, value := range array {
    sum += value
}
```
return 尽早 return：一旦有错误发生，马上返回
``` go
f, err := os.Open(name)
if err != nil {
  return err
}
d, err := f.Stat()
if err != nil {
  f.Close()
  return err
}
codeUsing(f, d)

# panic
```
在逻辑处理中不要使用panic，且业务逻辑中要有recover机制
``` go
# import
```
对 import 的包进行分组管理，用换行符分割，而且标准库作为分组的第一组。如果你的包引入了三种类型的包，标准库包，程序内部包，第三方包，建议采用如下方式进行组织你的包。

``` go
 package main

import (
    "fmt"
    "os"

    "kmg/a"
    "kmg/b"

    "code.google.com/a"
    "github.com/b"
)
```
在项目中不要使用相对路径引入包：

// 错误示例
``` go
import "../net"
```
// 正确的做法
``` go
import "github.com/repo/proj/src/net"
```
# 参数传递
对于少量数据，不要传递指针
对于大量数据的 struct 可以考虑使用指针
传入的参数是 map，slice，chan 不要传递指针，因为 map，slice，chan 是引用类型，不需要传递指针的指针
# 单元测试
单元测试文件名命名规范：
``` go
　　　　 example_test.go
```
测试用例的函数名称必须以 Test 开头，例如：
``` go
func TestExample(t * testing.T)
```
# 性能测试：
函数名以Benchmark开头

``` go
func BenchmarkExample(b *testing.B)
```
# 日志
为了方便日志分析，记录日志统一使用glog详细用法请看 这里
记录有意义的日志，日志里记录一些比较有意义的状态数据：程序启动，退出的时间点；程序运行消耗时间；耗时程序的执行进度；重要变量的状态变化。
日志内容必须是可读的英文语句，第一个单词首字母大写，合理标点符号
``` go
glog.V(2).Infof("Skipping nil field: %s", key)
glog.Errorf("Failed to changes docker version to docker apiverson: %v", err)
glog.Fatalf("Error compiling: %v", err)
```
错误日志必须日志打印：
``` go
_, err := serverFailureDetector.Detect()
if err != nil {
   glog.Errorf("Failed to detect server failure, %v", err)
   return
}
```
日志等级
等级	方法	说明
Fatal	glog.Fatal	致命的异常，造成服务中断的错误, 一般只在程序初始化校验阶段使用
Error	glog.Error	异常，其他错误运行期错误；
Warning	glog.Warning	警告，如程序调用了一个即将作废的接口，接口的不当使用，运行状态不是期望的但仍可继续处理等；
Info	glog.Info	有意义的信息，如程序启动，关闭事件，收到请求事件等；
Debug	glog.V(2).Info	调试信息，可记录详细的业务处理到哪一步了，以及当前的变量状态；
Trace	glog.V(5).Info	更详细的跟踪信息；
依赖包

依赖包统一用gomodule管理

# 参考
https://github.com/golang/go/wiki/CodeReviewComments
