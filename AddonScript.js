if (localStorage.getItem("UserScript-ImportantNotice-20231002") == null) {
    let InputValue = prompt("警告！警告！警告！请仔细阅读以下内容！您需要重新安装用户脚本！安装指南在https://www.seanoj.edu.eu.org/#Install。因为从0.3.x版本开始，脚本出现重大更新，非0.3.x已不再支持（甚至会出现错误）。如果你已经明白了这些内容，或者你使用的已经是0.3.143及以上版本，那么请在下方输入“我已知晓”并点击确定。");
    if (InputValue != "我已知晓") {
        alert("您输入的内容不正确！请重新安装用户脚本！安装指南在https://www.seanoj.edu.eu.org/#Install。");
        window.location.href = "https://www.seanoj.edu.eu.org/#Install";
    }
    else {
        localStorage.setItem("UserScript-ImportantNotice-20231002", "true")
    }
}
