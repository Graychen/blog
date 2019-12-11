---
title: elastic语句记录
date: 2019-12-11 15:14:26
tags: 技术
---
最近要做数据统计，要求是求出活跃人数，分别是日活，周活，月活人数。正好我们的elk有相应的student_no可以做人员的统计，我就来研究下elastic的语句。
``` shell 
GET /student_app_request/_search
{
   "_source":["student_no"],
  "query": {
      "bool" : {
            "must" : {
                "exists" : {
                    "field" : "student_no"
                }
            },
      "filter": [
        {"range":
          {
            "timestamp":{
                "gte" : "now-30d/d",
                "lt" :  "now/d"
          }
          }
        }
      ]
    }
  },
  "size": 1000,
  "aggs": {
    "student_num": {
      "cardinality": {"field": "student_no"}
    }
  }
}
```
 - _source
 这相当于mysql语句中的字段选择
 - must
 must中的bool参数表达了student_no这个字段一定要存在
 - filter
 range代表了对时间的筛选，表示了日志中timestamp这个时间戳的30天内的筛选
 - size
 代表了返回的数据量，如果想要单纯的拿统计数据的话，这个值可以设置为0
 - aggs
 相当于mysql中的聚合函数，构造一个数值来进行统计，我构造了student_num这个数字，对student_no的数量做了统计，并且使用了cardinlity对该字段做了去重


