if (localStorage.getItem("UserScript-ImportantNotice-20230830") == null) {
    let InputValue = prompt("警告！警告！警告！请仔细阅读以下内容！您需要重新安装用户脚本！安装指南在https://web.xmoj-bbs.tech/#Install。因为此次更新开发者误修改了更新内容，导致无法检查出新的更新。如果你已经明白了这些内容，或者你使用的已经是0.2.80及以上版本，那么请在下方输入“我已知晓”并点击确定。");
    if (InputValue != "我已知晓") {
        alert("您输入的内容不正确！请重新安装用户脚本！安装指南在https://web.xmoj-bbs.tech/#Install。");
        window.location.href = "https://web.xmoj-bbs.tech/#Install";
    }
    else {
        localStorage.setItem("UserScript-ImportantNotice-20230830", "true")
    }
}
