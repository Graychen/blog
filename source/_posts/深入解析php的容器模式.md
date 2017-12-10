
title: 深入解析php的容器模式
date: 2016-10-19 11:20:43
tag: php
categories: 技术
---
先说结论，**容器**在php中是一组健值对，php容器类通过数组来控制对象的生成,资源的获取,销毁和处理对象和对象的依赖关系。
### 我是傲娇的代码块:

``` php

<?php
/**
* @brief 服务容器
* author Graychen
 */
class Container implements \ArrayAccess{
  private $_binContainerngs = [];//服务列表
  private $_instances= [];//已经实例化的服务

  //获取服务
  public function get($name,$params=[]){
  //先从实例化的列表中查找
  if(isset($this->_instances[$name])){
  return $this->_instances[$name];
  }

  //检测有没有注册该服务
  if(!isset($this->_binContainerngs[$name])){
  return null;
  }

  $concrete = $this->_binContainerngs[$name]['class'];//对象具体注册内容

  $obj = null;

  if($concrete instanceof \Closure){ //匿名函数方式
  $obj = call_user_func_array($concrete,$params);
  }elseif(is_string($concrete)){ //字符串方式
  if(empty($params)){
  $obj = new $concrete;
  }else{
  //带参数的类实例化,使用反射
  $class = new \reflectionClass($concrete);
  $obj = $class->newInstanceArgs($params);
  }
  }
  //如果是共享服务，则写入_instances列表，下次直接取回
  if($this->_binContainerngs[$name]['shared']==true && $ojb){
  $this->_instances[$name]=$obj;
  }

  return $obj;
  }

  //检测是否已经绑定
  public function has($name){
  return isset($this->_binContainerngs[$name]) or isset($this->_instances[$name]);
  }

  //卸载服务
  public function remove($name){
  unset($this->_binContainerngs[$name],$this->_instances[$name]);
  }
  //设置服务
  public function set($name,$class){
  $this->_registerService($name,$class);
  }
  //设置共享服务
  public function setShared($name,$class){
  $this->_registerService($name,$class,true);
  }
  //注册服务
  private function _registerService($name,$class,$shared=false){
  $this->remove($name);
  if(!($class instanceof \Closure) && is_object($class)){
  $this->_instances[$name]=$class;
  }else{
  $this->_binContainerngs[$name]=array("class"=>$class,"shared"=>$shared);
  }
  }
  //ArrayAccess接口，检测服务是否存在
  public function offsetExists($offset){
  return $this->has($offset);
  }
  //ArrayAccess接口,以$Container[$name]方式获取服务
  public function offsetGet($offset){
  return $this->get($offset);
  }
  //ArrayAccess接口,以$Container[$name]方式获取服务
  public function offsetSet($offset,$value){
  return $this->set($offset,$value);
  }
  //卸载服务
  public function offsetUnset($offset){
  return $this->remove($offset);
  }
}

```

<!--more-->
### 使用方式

``` php

<?php
header("Content-Type:text/html;charset=utf8");
class A{
  public $name;
  public $age;
  public function __construct($name=""){
  $this->name = $name;

  }

}

include "Container.class.php";
$Container = new Container();

/**
* @brief $Container->setShared 匿名函数方式注册一个名为a1的服务
*
* @param 'a1'
* @param
*/
$Container->setShared('a1',function($name=""){
  return new A($name);
  });

$a1 = $Container->get('a1',array("小李"));
echo $a1->name."<br/>";//小李
/**
* @brief $Container->set 直接以类名方式注册
*
* @param 'a2'
* @param 'A'
*/
$Container->set('a2','A');

$a2 = $Container->get('a2',array("小张"));
echo $a2->name."<br/>";//小张
/**
* @brief $Container->set 直接传入实例化的对象
*
* @param 'a3'
* @param "小唐"
*/
$Container->set('a3',new A("小唐"));
echo $a3->name."<br/>";//小唐

```
### 分析
通过上面的代码实例，我们可以看到php注入容器(数组)的三种方式
- 匿名函数方式注册
- 类名方式注册
- 直接传入实例化的对象的注册
然后get方法
``` php
  //获取服务
  public function get($name,$params=[]){
  //先从实例化的列表中查找
  if(isset($this->_instances[$name])){
  return $this->_instances[$name];
  }

  //检测有没有注册该服务
  if(!isset($this->_binContainerngs[$name])){
  return null;
  }

  $concrete = $this->_binContainerngs[$name]['class'];//对象具体注册内容

  $obj = null;

  if($concrete instanceof \Closure){ //匿名函数方式
  $obj = call_user_func_array($concrete,$params);
  }elseif(is_string($concrete)){ //字符串方式
  if(empty($params)){
  $obj = new $concrete;
  }else{
  //带参数的类实例化,使用反射
  $class = new \reflectionClass($concrete);
  $obj = $class->newInstanceArgs($params);
  }
  }
  //如果是共享服务，则写入_instances列表，下次直接取回
  if($this->_binContainerngs[$name]['shared']==true && $ojb){
  $this->_instances[$name]=$obj;
  }

  return $obj;
  }

```

实际上通过分析get方法对这三种注入方式的数组都做了对应的处理
# 匿名方式

``` php
$Container->setShared('a1',function($name=""){
  return new A($name);
  });
```

``` php
  if($concrete instanceof \Closure){ //匿名函数方式
  $obj = call_user_func_array($concrete,$params);
  }
```
  

  首先通过**$concrete instanceof \Closure**来判断是否是匿名函数，然后通过**call_user_func_array($concrete,$params)**来调用这个函数，匿名方式注册的本身就是一个已经new的方法，自然get的时候就成功调用了这个已经实例化的方法。换句话说，匿名方式写的时候写的就是实例化的方法，容器的数组里面就存在了这个已经new的方法，只要判断是回调函数，就调用到了这个已经实例化的方法。
# 类名方式注册

``` php
$Container->set('a2','A');

```

``` php

  }elseif(is_string($concrete)){ //字符串方式
  if(empty($params)){
  $obj = new $concrete;
  }
  }

```

 直接以类名注册的方式比较简单，只要判断是字符串并且参数为空那么对应的get方法就会直接实例化（new）这个方法名，就比如上面的例子，直接就会实例化A这个方法名
# 带参数的类实例化,使用反射(接口方式)

``` php
$Container->set('a3',new A("小唐"));
```
``` php
  //带参数的类实例化,使用反射
  $class = new \reflectionClass($concrete);
  $obj = $class->newInstanceArgs($params);
  
```
> **reflectionClass**: ReflectionClass 类报告了一个类的有关信息。
> **newInstanceArgs**: ReflectionClass::newInstanceArgs — 从给出的参数创建一个新的类实例。
