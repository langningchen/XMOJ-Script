if (localStorage.getItem("UserScript-ImportantNotice-20230814") == null) {
    let InputValue = prompt("警告！警告！警告！请仔细阅读以下内容！如果您的用户脚本在北京时间2023/08/14 15:10左右更新到了0.1.47，那么您需要重新安装用户脚本！安装指南在https://langningchen.github.io/XMOJ-Script/。因为此次更新开发者误修改了更新提示，导致点击了更新按钮会触发404错误。如果你已经明白了这些内容，或者你使用的不是0.1.47版本，那么请在下方输入“我已知晓”并点击确定。");
    if (InputValue != "我已知晓") {
        alert("您输入的内容不正确！请重新安装用户脚本！安装指南在https://langningchen.github.io/XMOJ-Script/。");
        window.location.href = "https://langningchen.github.io/XMOJ-Script/";
    }
    else {
        localStorage.setItem("UserScript-ImportantNotice-20230814", "true")
    }
}
