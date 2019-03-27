try {
    hexo.on('deployAfter', function() {//当deploy完成后执行备份
        run();
    });
} catch (e) {
    console.log("产生了一个错误<(￣3￣)> !，错误详情为：" + e.toString());
}

function run() {
    if (!which('git')) {
        echo('Sorry, this script requires git');
        exit(1);
    } else {
        echo("==================Auto Backup Begin==============================");
        if (exec('hexo b').code !== 0) {
            echo('Error: Git add failed');
            exit(1);
        }
        echo("==================Auto Backup Complete============================")
        echo("==================Auto Backup Complete============================")
    }
}
