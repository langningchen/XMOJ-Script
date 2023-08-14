if (localStorage.getItem("UserScript-ImportantNotice-20230814")==null) {
    alert("警告！警告！警告！请仔细阅读以下内容！如果您的用户脚本在北京时间2023/08/14 15:10左右更新到了0.1.47，请按确定后手动升级!");
    location.href = "https://github.com/langningchen/XMOJ-Script/releases/download/0.1.49/XMOJ.user.js"
    localStorage.setItem("UserScript-ImportantNotice-20230814", "true")
}
