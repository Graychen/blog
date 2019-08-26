---
title: php利用puppeteer来抓取西瓜视频
date: 2019-08-26 18:12:44
tags: 技术
---

最近想要抓取西瓜视频，却发现它的页面是react做的，动态的js渲染，使用普通的http只能抓到静态的页面，找了好久才发现可以使用无头的浏览器来渲染它的页面,而提供puppeteer就是对无界面的chrome浏览器的js组件
本来下载puppeteer的时候它会自动下载无头的chrome的,但是由于被墙的原因，这个方案不行，我后面是用了阿里的一个改进版的puppeteer库，但后面发现还是不行，最后我只能在我的docker里面先下chrome的组件了
下面是我的dockerfile
``` docker
FROM graychen/alpine-php7.1:alpine
WORKDIR /var/www/html
COPY supervisord.conf /etc/supervisor/conf.d/
COPY . /var/www/html
ENV CHROME_BIN="/usr/bin/chromium-browser"\
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN set -x \
&& apk update \
&& apk upgrade \
# replacing default repositories with edge ones
&& echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" > /etc/apk/repositories \
&& echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
&& echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories && \
# Add the packages
apk add --no-cache dumb-init curl make gcc g++ python linux-headers binutils-gold gnupg libstdc++ nss nodejs nodejs-npm \
  #alsa-lib \
  #at-spi2-atk \
  #atk \
  cairo \
  cups-libs \
  dbus-libs \
  eudev-libs \
  expat \
  flac \
  gdk-pixbuf \
  glib \
  libgcc \
  libjpeg-turbo \
  libpng \
  libwebp \
  libx11 \
  libxcomposite \
  libxdamage \
  libxext \
  libxfixes \
  tzdata \
  libexif \
  udev \
  xvfb \
  zlib-dev \
  chromium \
  chromium-chromedriver && \
npm install cnpm -g --registry=https://r.npm.taobao.org && \
cnpm install puppeteer@0.13.0  && \
apk del --no-cache make gcc g++ python binutils-gold gnupg libstdc++ && \
docker-php-ext-install sockets
ENTRYPOINT ["/usr/bin/supervisord", "-n", "-c",  "/etc/supervisor/conf.d/supervisord.conf"]%
```
因为我本身是用php，所以要下这个使用别人已经封装好的composer包
``` php
composer require jaeger/querylist-puppeteer
```
然后安装Node依赖（与composer一样在项目根目录下执行
下面是这个组件的用法
在QueryList中注册插件
``` php
use QL\QueryList;
use QL\Ext\Chrome;

$ql = QueryList::getInstance();
// 注册插件，默认注册的方法名为: chrome
$ql->use(Chrome::class);
// 或者自定义注册的方法名
$ql->use(Chrome::class,'chrome');
```
基本用法
``` php 
// 抓取的目标页面是使用Vue.js动态渲染的页面
$text = $ql->chrome('https://www.iviewui.com/components/button')->find('h1')->text();
print_r($text);
// 输出: Button 按钮
$rules = [
 'h1' => ['h1','text']
];
$ql = $ql->chrome('https://www.iviewui.com/components/button');
$data = $ql->rules($rules)->queryData();
```
后面我优化了一下参数,我将抓取的步骤放到了队列中
``` 
public function execute($queue)
    {
            $ql = QueryList::getInstance();
                // 注册插件，默认注册的方法名为: chrome
                $ql->use(Chrome::class);
                $ql->use(Chrome::class,'chrome');
                $url = 'https://www.ixigua.com/'.$this->jumpUrl;
                $text = $ql->chrome($url,[executablePath => '/usr/bin/chromium-browser', args=> ['--no-sandbox', '--disable-setuid-sandbox','--proxy-server="direct://"',
                '--proxy-bypass-list=*','–disable-gpu',
                '–disable-dev-shm-usage',
                '–disable-setuid-sandbox',
                '–no-first-run',
                '–no-zygote',
                '–single-process']],
                function ($page,$browser) {
                    $page->setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36');
                    // 设置cookie
                    $page->setCookie([
                    'name' => 'foo',
                    'value' => 'xxx',
                    'url' => $url
                    ],[
                    'name' => 'foo2',
                    'value' => 'yyy',
                    'url' => $url
                    ]);
                    $page->goto($url);
                    // 等待h1元素出现
                    $page->waitFor('#vs');
                    $page->waitFor('xg-poster');
                    $page->waitForNavigation();
                    $page->screenshot([
                        'path' => 'page.png',
                        'fullPage' => true
                    ]);
                    // 获取页面HTML内容
                    $html = $page->content();
                    // 关闭浏览器
                    $browser->close();
                    // 返回值一定要是页面的HTML内容
                    return $html;
                })->getHtml();
                $img = "#<xg-poster.*>([^<]*)</xg-poster>#";
                preg_match($img, $text, $contentImg);
                $str = explode(";",$contentImg[0]);
                $strUrl = explode("&",$str[1]);
                $imgUrl=$strUrl[0];
                $s = file_get_contents($imgUrl);
                $moive = new Moive();
                $dir = \Yii::getAlias('@frontend') . '/web/uploads/cover/'.date('Ymd');
                if(!is_dir($dir)) {
                    mkdir($dir);
                }
                $imgShotPath='cover/'.date('Ymd').'/'.time().'.jpg';
                $imgPath = $dir.'/'.time().'.jpg';
                file_put_contents($imgPath, $s);
                $head="#<h1>([^<]*)</h1>#";
                preg_match($head, $text, $contentHead);
                $regex = "/src=\s*[\'|\"]+?(.*?)[\'|\"]+?/";
                $return = preg_match_all($regex, $text, $content);
                $pathUrl = $content[1][4];
                $s = file_get_contents($pathUrl);
                $dir = \Yii::getAlias('@frontend') . '/web/uploads/video/'.date('Ymd');
                if(!is_dir($dir)) {
                    mkdir($dir);
                }
                $videoShotPath = 'video/'.date('Ymd').'/'.time().'.mp4';
                $videoPath = $dir.'/'.time().'.mp4';
                file_put_contents($videoPath, $s);
                $contentArray = explode("：", $contentHead[1]);
                $describe=$contentArray[1];
                $status = Moive::STATUS_SHOW;
                $num = 0;
                $this->saveData($moive, $describe, $status, $num, $imgShotPath, $videoShotPath);
    }
```
其实我现在的代码还有个问题，就是渲染出来的页面有时候没有渲染好就打印出来了，接下来看看怎么优化
