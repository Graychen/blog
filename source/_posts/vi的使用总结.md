---
title: vi的使用总结
date: 2016-09-21 22:15:36
tags: 编辑器
categories: 技术

---
# 初级篇
## 移动篇
- 上 k
- 下 j
- 左 h
- 右 l

- 至顶 gg
- 至尾部 Shift+g
- 行跳转 行号+gg

- 行首 Shift+6 (^)
- 行尾 Shift+4 ($) 

- 词组移动(词首) w 
- 词组移动(词首) W 
- 词组移动(词尾) e 
- 词组移动(词尾) E 

- 移动到查找的字母后 f
- 移动到查找的字母后 F

<!--more-->
## 操作篇
### 增    
- 在单词前插入 i
- 在单词前插入 a
- 在句首前插入 I
- 在句尾插入 A
- 在下一行插入 o
- 在上一行插入 O
### 删    
- 删除光标行内容 d
- 删除光标至尾行内容 D
- 删除当前行及n-1行数 数字dd
### 改    
- 复制 yy
- 粘贴 p
- 替换插入 s
- 替换整句插入 S
- 替换单个字母 r
- 接下来的子都要替换 R
- 当前行替换第一个单词 :s/oldwords/newwords/
- 替换当前行所有单词 :s/oldwords/newwords/g
- 替换每一行的第一个单词 :%s/oldwords/newwords/
- 替换每一行的单词 :%s/oldwords/newwords/g

### 查    
- 向后查找 /
- 向前查找 ?

## 选中篇
- 左选择 v+h
- 右选择 v+l
- 上选择 v+k
- 下选择 v+j

- 选择当前行V(shift+v) 
- 选择向上行V+k(shift+v) 
- 选择向下行V+j(shift+v) 

- 括号内的选择 v+i+) (不含括号)
- 括号内的选择 v+a+) (包含括号)

- 居中显示 zz 
- 头部显示 zt 
- 尾巴显示 zb 
## 退出篇
- 不保存退出 :q 
- 保存退出 :wq 
- 保存 :w 
- 强制退出 :q! 
- 强制退出 ctrl+z 
- 恢复 fg
## 文件切换篇
- 向右切换 tg
- 向左切换 tG

