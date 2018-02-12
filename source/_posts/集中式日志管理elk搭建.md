---
title: 集中式日志管理elk搭建
date: 2018-02-10 13:56:26
tags: linux基础 
categories: 技术
---
前段时间，我们组内决定将各个应用的日志都集中管理起来，所以需要一款集中式的日志管理系统，查找了市面上的系统发现elk不错，所以我就研究搭建了elk，下面是我在搭建过程中的一些心得。
> elk:这其实是一套组件的缩写，其中比较核心的是三个组件ELK(Elasticsearch, Logstash, Kibana), 经过这么多年的发展已经是6.0.0版本
- Elasticsearch 高可用性，实时索引，拓展简单，接口友好
- Kibana 提供分析和可视化的 Web 平台，用来查询分析以及生成各种报表
- Logstash 是一个具有实时的数据收集引擎，几乎可以收集所有的数据
- Beats 轻量型采集器的平台，从边缘机器向 Logstash 和 Elasticsearch 发送数据
- X-Pack 是集成了多种便捷功能的单个插件 — security、alerting、monitoring、reporting、graph 探索

## elk的初始化
其实elk既可以在linux的环境安装也可以使用docker形式，我在github上找到一个已经配置好的docker环境的[docker-elk](https://github.com/deviantony/docker-elk)
使用git clone git@github.com:deviantony/docker-elk.git后执行docker-compose up,然后我们访问http://localhost:5601,以下是它的端口
- 5000: Logstash TCP input.
- 9200: Elasticsearch HTTP
- 9300: Elasticsearch TCP transport
- 5601: Kibana
<!--more-->
## elk 配置
我们先配置'elk/logstash/pipeline/logstash.conf'
```
input {
        beats { #通过这个端口接收filebeat组件发送过来的日志
                port => 5043
        }
}
## Add your filters / logstash plugins configuration here
filter {
        grok { # 正则形式将无序的日志整理成有序的结构形式
                match => { "message" => "%{GREEDYDATA:health_Timestamp}\[%{IPV4:health_IPaddress}\]\[-\]\[-\]\[%{LOGLEVEL:health_LogLevel}\]\[%{NOTSPACE:health_Category}\]%{GREEDYDATA:health_Text}" } 
        }    
        geoip { #通过这个可以将ip和地理位置相关联
                source => "clientip"
        }
}
output { #将日志信息交给elasticsearch处理
        elasticsearch {
                hosts => "elasticsearch:9200"
        }
}
```
## filebeat配置
然后我们到我们要挖掘日志的应用中添加filebeat组件，将日志的搬运方向直销刚刚留出来的elk的ip:5043端口
- 现在docker-compose.yml添加filebeat组件
```
filebeat:
        image: docker.elastic.co/beats/filebeat:6.0.0
        hostname: filebeat
        container_name: filebeat
        restart: always
        volumes:
        - ./services/filebeat/config/filebeat.yml:/usr/share/filebeat/filebeat.yml
        - ./services/filebeat/config/filebeat.template.json:/usr/share/filebeat/filebeat.template.json
        - ./api/runtime/logs:/var/logs
        - ./api/runtime/debug:/var/debug
        depends_on:
        - web
```
- 接着我们配置刚刚docker-compose配置的./services/filebeat/config/filebeat.yml
```
filebeat.prospectors:
- type: log
  paths:
      - "/var/logs/*.log"
     #- "/var/debug/*.data"
registry_file: /etc/registry/mark
#============================= 将以时间的日志归并为一行 ===============================
  multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
  multiline.negate: true
  multiline.match: after
  multiline.timeout: 10s
enable: true
#============================= Filebeat modules ===============================
#
filebeat.config.modules:
# Glob pattern for configuration loading
  path: /usr/share/filebeat/modules.d/*.yml
#
# Set to true to enable config reloading
reload.enabled: true

output:
logstash:
hosts: ["刚刚配置的elk的ip地址:5043"]

logging:
files:
rotateeverybytes: 10485760 # = 10MB
```

 参考文章:
-------------------
[官网](https://www.elastic.co/cn/products)
[使用Docker搭建ELK日志系统](http://blog.csdn.net/sysushui/article/details/78461498)
[ELK---合并多行日志（php.log）](https://www.jianshu.com/p/a980cd121212)
[docker容器日志集中ELK](https://jicki.me/2016/10/11/docker-elk-filebeat/)
[filebeat+logstash配置搭建](https://my.oschina.net/openplus/blog/1584861)
[关于Logstash中grok插件的正则表达式例子](https://www.cnblogs.com/stozen/p/5638369.html)
[使用Logstash收集PHP相关日志-Linux SA John-51CTO博客](http://blog.51cto.com/john88wang/1641723)
[Logstash整合Kafka](https://birdben.github.io/2016/11/21/Logstash/Logstash%E5%AD%A6%E4%B9%A0%EF%BC%88%E4%BA%8C%EF%BC%89Logstash%E6%95%B4%E5%90%88Kafka/)
