---
title: Composer包是怎样炼成的
date: 2016-10-19 11:20:43
tag: php
categories: 技术
---

>**Composer**是php用来管理依赖关系的工具，你可以在自己的项目中声明所依赖的外部工具库，Composer会帮助你安装这些依赖的库文件 --[Composer中文网](http://www.phpcomposer.com/)

关于Composer的安装和下载可以直接点击上方的链接查看，本篇博文主要讲解该怎样创建自己的Composer包，并把它提交到[packgist](https://packagist.org/)

## 创建组件
### 产商名称和包名
在设置命名空间之前，先要确定产商名称和包名，类似于**laravel/framework**,确保它的唯一性，在packgist中不存在.厂商名称和包名是为了让packgist识别组件，而组件的命名空间是为了在php中使用组件，这是两个概念。
### 文件系统结构
- **src**:这个目录用于存放组件的源码   
- **tests**:这个目录用于存放测试代码   
- **composer.json**:Composer配置文件，用于描述组件，声明组件依赖以及自动加载配置等   
- **README.md**:这个Markdown提供组件的相关信息,使用文档说明软件许可证等   
- **CONTRIBUTING.md**:这个Markdown文件告知别人如何为这个组件做贡献  
- **LICENSE**：纯文本文件，声明组件的软件许可证
- **CHANGELOG.md**：Markdown文件，列出组件在每个版本中引入的改动

### 文件系统结构
我们新建一个组件目录（~/Packages/urlscanner），然后在urlscanner目录下通过如下命令生成composer.json文件：
composer init

然后在终端会让我们按照提示向导一步步填写composer.json内容：
最后回车，会生成相应的composer.json文件，我们对该文件作如下修改：
``` javascript
{
    "name": "graychen/container",
    "description": "a container for interface and container",
    "license": "MIT",
    "authors": [
        {
            "name": "Graychen",
            "email": "13780185250@sina.cn"
        }
    ],
    "minimum-stability": "dev",
    "require": {},
    "require-dev": {
            "phpunit/phpunit" : "~4.3" 
        },
    "autoload":{
        "psr-4":{
            "graychen\\container\\" : "src"
        }
    },
    "autoload-dev":{
        "psr-4":{
            "graychen\\container\\Tests\\":"tests/"
        }
    }
}

```
我们来仔细研究一下这个文件，看看每个部分究竟是什么意思：

- name：组件的厂商名和包名，也是Packagist中的组件名
- description：简要说明组件
- keywords：描述属性的关键字
- homepage：组件网站URL
- license：PHP组件采用的软件许可证（更多软件许可证参考：http://choosealicense.com/）
- authors：作者信息数组
- support：组件用户获取技术支持的方式
- require：组件自身依赖的组件
- require-dev：开发这个组件所需的依赖
- suggest：建议安装的组件
- autoload：告诉Composer自动加载器如何自动加载这个组件

READEME.md

通常这个是用户最先阅读的文件，对托管在Github和Bitbucket中的组件来说，更是如此。标准的READEME.md文件至少提供以下信息：
- 组件的名称和描述
- 安装说明
- 使用说明
- 测试说明
- 贡献方式
- 支持资源
- 作者信息
- 软件许可证

实现组件

开始之前我们使用如下命令安装依赖：
``` php
composer install
```
该命令会把依赖组件安装到vendor目录并生成自动加载器。
安装好以后我们来实现组件的具体功能。将所有的类，接口和Trait都放到src这个目录下。
``` php
<?php
namespace container;
/**
* @brief 服务容器
* author Graychen
 */
class Container implements \ArrayAccess{
    private $_bindings = [];//服务列表
    private $_instances= [];//已经实例化的服务
    //获取服务
    public function get($name,$params=[]){
        //先从实例化的列表中查找
        if(isset($this->$_instances[$name])){
            return $this->$_instances[$name]; 
        }
        //检测有没有注册该服务
        if(!isset($this->$_bindings[$name])){
            return null;
        }
        $concrete = $this->$_bindings[$name]['class'];//对象具体注册内容
        $obj = null;
        if($concrete instanceof \Closure){ //匿名函数方式
            $obj = call_user_func_array($concrete,$params);
        }elseif(is_string($concrete)){     //字符串方式
            if(empty($params)){
                $obj = new $concrete;
            }else{
                //带参数的类实例化,使用反射
                $class = new \reflectionClass($concrete);
                $obj = $class->newInstanceArgs($params);
            }
        }
        //如果是共享服务，则写入_instances列表，下次直接取回
        if($this->_bindings[$name]['shared']==true && $ojb){
            $this->_instances[$name]=$obj;
        }
        return $obj;
    } 
    //检测是否已经绑定
    public function has($name){
        return isset($this->_bindings[$name]) or isset($this->_instances[$name]);
    }
    //卸载服务
    public function remove($name){
        unset($this->_bindings[$name],$this->_instances[$name]);
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
            $this->_bindings[$name]=array("class"=>$class,"shared"=>$shared); 
        }
    }
    //ArrayAccess接口，检测服务是否存在
    public function offsetExists($offset){
        return $this->has($offset);
    }
    //ArrayAccess接口,以$di[$name]方式获取服务
    public function offsetGet($offset){
       return $this->get($offset); 
    }
    //ArrayAccess接口,以$di[$name]方式获取服务
    public function offsetSet($offset,$value){
        return $this->set($offset,$value);
    }
    //卸载服务
    public function offsetUnset($offset){
        return $this->remove($offset);
    }
} 
```
### 提交到packglist
我们先将代码提交到GitHub,注意将vendor目录添加到.gitignore仓库,我的是graychen/container：
``` git
git init
git remote add origin https://github.com/nonfu/urlscanner.git
git add .
git commit -m “urlscanner"
git pull origin master
git push origin master
```
 !["我是傲娇的效果图"](/assets/blogImg/Graychen-Container.gif)
 然后在Packagist中通过GitHub账户登录，通过https://packagist.org/packages/submit提交组件，在输入框中输入刚刚提交的GitHub仓库地址：
 check成功后点击submit即可将组件提交到Packagist：
 !["我是傲娇的效果图"](/assets/blogImg/Packagist.gif)
## 使用组件
 至此，我们已经成功将自己的组件提交到Packagist，现在任何人都可以使用Composer安装这个URL扫描器组件，然后在自己的PHP应用中使用。在终端执行如下命令安装这个组件：

 composer require graychen/container dev-master
