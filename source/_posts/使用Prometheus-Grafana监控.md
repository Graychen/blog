---
title: 使用Prometheus+Grafana监控
date: 2017-12-10 18:09:37
tags: devops
---
## 简介
Prometheus（普罗米修斯）是一套开源的监控&报警&时间序列数据库的组合，起始是由SoundCloud公司开发的。随着发展，越来越多公司和组织接受采用Prometheus，社会也十分活跃，他们便将它独立成开源项目，并且有公司来运作。Google SRE的书内也曾提到跟他们BorgMon监控系统相似的实现是Prometheus。现在最常见的Kubernetes容器管理系统中，通常会搭配Prometheus进行监控。
Prometheus基本原理是通过HTTP协议周期性抓取被监控组件的状态，这样做的好处是任意组件只要提供HTTP接口就可以接入监控系统，不需要任何SDK或者其他的集成过程。这样做非常适合虚拟化环境比如VM或者Docker 。
Prometheus应该是为数不多的适合Docker、Mesos、Kubernetes环境的监控系统之一。

输出被监控组件信息的HTTP接口被叫做exporter 。目前互联网公司常用的组件大部分都有exporter可以直接使用，比如Varnish、Haproxy、Nginx、MySQL、Linux 系统信息 (包括磁盘、内存、CPU、网络等等)，具体支持的源看：https://github.com/prometheus。

与其他监控系统相比，Prometheus的主要特点是：

- 一个多维数据模型（时间序列由指标名称定义和设置键/值尺寸）。
- 非常高效的存储，平均一个采样数据占~3.5bytes左右，320万的时间序列，每30秒采样，保持60天，消耗磁盘大概228G。
- 一种灵活的查询语言。
- 不依赖分布式存储，单个服务器节点。
- 时间集合通过HTTP上的PULL模型进行。
- 通过中间网关支持推送时间。
- 通过服务发现或静态配置发现目标。
- 多种模式的图形和仪表板支持。

## Prometheus架构概览

该图说明了普罗米修斯（Prometheus）及其一些生态系统组件的整体架构：
![Prometheus架构概览](http://ww1.sinaimg.cn/large/0060OHG5gy1fm4pg7j25ej30l60dw40p.jpg)
它的服务过程是这样的Prometheus daemon负责定时去目标上抓取metrics(指标) 数据，每个抓取目标需要暴露一个http服务的接口给它定时抓取。

- Prometheus：支持通过配置文件、文本文件、zookeeper、Consul、DNS SRV lookup等方式指定抓取目标。支持很多方式的图表可视化，例如十分精美的Grafana，自带的Promdash，以及自身提供的模版引擎等等，还提供HTTP API的查询方式，自定义所需要的输出。

- Alertmanager：是独立于Prometheus的一个组件，可以支持Prometheus的查询语句，提供十分灵活的报警方式。

- PushGateway：这个组件是支持Client主动推送metrics到PushGateway，而Prometheus只是定时去Gateway上抓取数据。

## Prometheus的数据模型

Prometheus从根本上所有的存储都是按时间序列去实现的，相同的metrics(指标名称) 和label(一个或多个标签) 组成一条时间序列，不同的label表示不同的时间序列。为了支持一些查询，有时还会临时产生一些时间序列存储。
metrics name&label指标名称和标签

每条时间序列是由唯一的”指标名称”和一组”标签（key=value）”的形式组成。

### 指标名称：
一般是给监测对像起一名字，例如http_requests_total这样，它有一些命名规则，可以包字母数字_之类的的。通常是以应用名称开头_监测对像_数值类型_单位这样。例如：push_total、userlogin_mysql_duration_seconds、app_memory_usage_bytes。

### 标签：
就是对一条时间序列不同维度的识别了，例如一个http请求用的是POST还是GET，它的endpoint是什么，这时候就要用标签去标记了。最终形成的标识便是这样了：http_requests_total{method=”POST”,endpoint=”/api/tracks”}。

记住，针对http_requests_total这个metrics name无论是增加标签还是删除标签都会形成一条新的时间序列。

查询语句就可以跟据上面标签的组合来查询聚合结果了。

如果以传统数据库的理解来看这条语句，则可以考虑http_requests_total是表名，标签是字段，而timestamp是主键，还有一个float64字段是值了。（Prometheus里面所有值都是按float64存储）。

<!--more-->
## Prometheus四种数据类型

### Counter
Counter用于累计值，例如记录请求次数、任务完成数、错误发生次数。一直增加，不会减少。重启进程后，会被重置。

例如：http_response_total{method=”GET”,endpoint=”/api/tracks”} 100，10秒后抓取http_response_total{method=”GET”,endpoint=”/api/tracks”} 100。
### Gauge
Gauge常规数值，例如 温度变化、内存使用变化。可变大，可变小。重启进程后，会被重置。

例如： memory_usage_bytes{host=”master-01″} 100 < 抓取值、memory_usage_bytes{host=”master-01″} 30、memory_usage_bytes{host=”master-01″} 50、memory_usage_bytes{host=”master-01″} 80 < 抓取值。
### Histogram

Histogram（直方图）可以理解为柱状图的意思，常用于跟踪事件发生的规模，例如：请求耗时、响应大小。它特别之处是可以对记录的内容进行分组，提供count和sum全部值的功能。

例如：{小于10=5次，小于20=1次，小于30=2次}，count=7次，sum=7次的求和值。
### Summary
Summary和Histogram十分相似，常用于跟踪事件发生的规模，例如：请求耗时、响应大小。同样提供 count 和 sum 全部值的功能。

例如：count=7次，sum=7次的值求值。

它提供一个quantiles的功能，可以按%比划分跟踪的结果。例如：quantile取值0.95，表示取采样值里面的95%数据。
## 配置文件解析
###下面的例子以这个项目为例(promethes项目)[https://mops-gitlab.lianluo.com/chenjiahui/Prometheus/tree/master]

``` yaml
# docker-compose.yml
version: '2.0'

services:
  prometheus: 
    image: prom/prometheus:v1.0.1
    volumes:
        - ./prometheus.yml:/etc/prometheus/prometheus.yml
        - prometheus_data:/prometheus
        - ./alert.rules:/etc/prometheus/alert.rules
    command:
        - '-config.file=/etc/prometheus/prometheus.yml'
        - '-alertmanager.url=http://alertmanager:9093'
    ports:
        - '9090:9090'

  grafana:
    image: "grafana/grafana:3.1.1"
    environment:
        - GF_SECURITY_ADMIN_PASSWORD=pass
    depends_on:
        - prometheus
    volumes:
        - grafana_data:/var/lib/grafana
        - ./alert.rules:/etc/prometheus/alert.rules
    ports:
        - "3000:3000"

  alertmanager:
    image: "prom/alertmanager:v0.8.0"
    volumes:
        - ./alertmanager.yml:/alertmanager.yml
    command:
        - '-config.file=/alertmanager.yml'
    
volumes:
  prometheus_data: {}
  grafana_data: {}
```
Prometheus内置了一个web界面，我们可通过http://monitor_host:9090进行访问：
![](http://ww1.sinaimg.cn/large/0060OHG5gy1fm4tb10am7j30mh093jsh.jpg)
但是自带的图形工具过于简陋，grafana是他的替代品，您可以通过http：// localhost：3000 / login访问Grafana,
![](http://ww1.sinaimg.cn/large/0060OHG5gy1fm4tbxey4xj30mo08k3zm.jpg)

在状态页面的“配置”下方，您会看到一个“目标”部分，其中列出了“prometheus”端点。
这相当于scrape_configs相同的设置，job_name 并且是普罗米修斯提供的指标的来源。换句话说，普罗米修斯服务器带有一个度量端点
或者上面所说的出口商，它报告普罗米修斯服务器本身的统计数据。
 
### cAdvisor 容器数据采集

因为promethus是通过主动去指定的地址拉取数据，所以要监听的项目需要配置导出器
 
```
cadvisor:
 image: google/cadvisor
 volumes:
   - /:/rootfs:ro
   - /var/run:/var/run:rw
   - /sys:/sys:ro
   - /var/lib/docker/:/var/lib/docker:ro
 ports:
     - "8080:8080"
 expose:
     - "8080"
```

### prometheus.yaml 配置监听数据地址

prometheus通过在这些目标上抓取指标HTTP端点来从监控目标收集指标,监听的就是数据导出器的地址

``` 
# my global config
global:
  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  # scrape_timeout is set to the global default (10s).

  # Attach these labels to any time series or alerts when communicating with
  # external systems (federation, remote storage, Alertmanager).
  external_labels:
      monitor: 'codelab-monitor'

# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
    - 'alert.rules'

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'prometheus'
    #scrape_interval: 5s
    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.

    static_configs:
      - targets: ['192.168.1.162:9090']
        labels:
          instance: prometheus

  - job_name: 'docker-online'
    #scrape_interval: 5s
    #scheme: http
    static_configs:
      - targets: ['192.168.1.162:8080']
        labels:
         group: 'port'
```

### Alertmanager报警组件

Alertmanager通过命令行flag和一个配置文件进行配置。命令行flag配置不变的系统参数、配置文件定义的禁止规则、通知路由和通知接收器。
要查看所有可用的命令行flag，运行alertmanager -h。
Alertmanager在运行时加载配置，如果不能很好的形成新的配置，更改将不会被应用，并记录错误。
配置文件
要指定加载的配置文件，需要使用-config.file标志。该文件使用YAML来完成，通过下面的描述来定义。括号内的参数是可选的，对于非列表的参数的值设置为指定的缺省值。
```
global:
  # ResolveTimeout is the time after which an alert is declared resolved
  # if it has not been updated.
  [ resolve_timeout: <duration> | default = 5m ]

  # The default SMTP From header field.
  [ smtp_from: <tmpl_string> ]
  # The default SMTP smarthost used for sending emails.
  [ smtp_smarthost: <string> ]

  # The API URL to use for Slack notifications.
  [ slack_api_url: <string> ]

  [ pagerduty_url: <string> | default = "https://events.pagerduty.com/generic/2010-04-15/create_event.json" ]
  [ opsgenie_api_host: <string> | default = "https://api.opsgenie.com/" ]

# Files from which custom notification template definitions are read.
# The last component may use a wildcard matcher, e.g. 'templates/*.tmpl'.
templates:
  [ - <filepath> ... ]

# The root node of the routing tree.
route: <route>

# A list of notification receivers.
receivers:
  - <receiver> ...

# A list of inhibition rules.
inhibit_rules:
  [ - <inhibit_rule> ... ]
```

路由 route
路由块定义了路由树及其子节点。如果没有设置的话，子节点的可选配置参数从其父节点继承。
每个警报进入配置的路由树的顶级路径，顶级路径必须匹配所有警报（即没有任何形式的匹配）。然后匹配子节点。如果continue的值设置为false，它在匹配第一个孩子后就停止；如果在子节点匹配，continue的值为true，警报将继续进行后续兄弟姐妹的匹配。如果警报不匹配任何节点的任何子节点（没有匹配的子节点，或不存在），该警报基于当前节点的配置处理。
路由配置格式

```
[ receiver: <string> ]
[ group_by: '[' <labelname>, ... ']' ]

# Whether an alert should continue matching subsequent sibling nodes.
[ continue: <boolean> | default = false ]

# A set of equality matchers an alert has to fulfill to match the node.
match:
  [ <labelname>: <labelvalue>, ... ]

# A set of regex-matchers an alert has to fulfill to match the node.
match_re:
  [ <labelname>: <regex>, ... ]

# How long to initially wait to send a notification for a group
# of alerts. Allows to wait for an inhibiting alert to arrive or collect
# more initial alerts for the same group. (Usually ~0s to few minutes.)
[ group_wait: <duration> ]

# How long to wait before sending notification about new alerts that are
# in are added to a group of alerts for which an initial notification
# has already been sent. (Usually ~5min or more.)
[ group_interval: <duration> ]

# How long to wait before sending a notification again if it has already
# been sent successfully for an alert. (Usually ~3h or more).
[ repeat_interval: <duration> ]

# Zero or more child routes.
routes:
  [ - <route> ... ]
```

在alertmanager这个配置文件配置任何警报报警alertmanager.yml，这看起来如下,这个例子是用slack(一款聊天工具),也可以用邮件,短信等其它方式报警：

``` yaml  
route:
    receiver: 'slack'
receivers:
    - name: 'slack'
      slack_configs:
          - send_resolved: true
            username: 'Prometheus'
            channel: '#random'
            api_url: 'https://hooks.slack.com/services/<your>/<stuff>/<here>'
```

### 报警规则

报警规则允许你定义基于Prometheus语言表达的报警条件，并发送报警通知到外部服务。
报警规则通过以下格式定义：

```
ALERT <alert name>
  IF <expression>
  [ FOR <duration> ]
  [ LABELS <label set> ]
  [ ANNOTATIONS <label set> ]
```

FOR子句使得Prometheus等待第一个传进来的向量元素（例如高HTTP错误的实例），并计数一个警报。如果元素是active，但是没有firing的，就处于pending状态。
LABELS（标签）子句允许指定一组附加的标签附到警报上。现有的任何标签都会被覆盖，标签值可以被模板化。
ANNOTATIONS（注释）子句指定另一组未查明警报实例的标签，它们被用于存储更长的其他信息，例如警报描述或者链接，注释值可以被模板化。
示例：

```
# alert.rules
ALERT service_down
  IF up == 0
ALERT high_load
  IF node_load1 > 0.5
  ANNOTATIONS {
      summary = "Instance {{ $labels.instance }} under high load",
      description = "{{ $labels.instance }} of job {{ $labels.job }} is under highload.",
  }
```

## 参考资料

+ [prometheus](https://prometheus.io)
+ [grafana](http://grafana.org)
+ [Prometheus监控 - Alertmanager报警模块](https://sagittariusyx.github.io/2016/03/07/prometheus-alertmanager/index.html)
+ [Monitoring Docker Services with Prometheus - CenturyLink Cloud Developer Center](https://www.ctl.io/developers/blog/post/monitoring-docker-services-with-prometheus/)
+ [使用Prometheus+Grafana监控MySQL实践 – 运维那点事](http://www.ywnds.com/?p=9656)
+ [使用Prometheus监控服务器](http://blog.frognew.com/2017/02/use-prometheus-on-centos7.html)
+ [Prometheus在Kubernetes下的监控实践](http://yunlzheng.github.io/2017/07/04/prometheus-kubernates/)
+ [通过Prometheus，Grafana和Docker进行监控](https://finestructure.co/blog/2016/5/16/monitoring-with-prometheus-grafana-docker-part-1)
