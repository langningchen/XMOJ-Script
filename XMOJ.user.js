// ==UserScript==
// @name         XMOJ
// @version      0.1.46
// @description  XMOJ增强脚本
// @author       @langningchen
// @namespace    https://github/langningchen
// @match        http://*.xmoj.tech/*
// @require      https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/hmac-sha1.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/codemirror/6.65.7/codemirror.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/codemirror/6.65.7/mode/clike/clike.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/codemirror/6.65.7/addon/merge/merge.js
// @require      https://cdn.bootcdn.net/ajax/libs/diff_match_patch/20121119/diff_match_patch_uncompressed.js
// @require      https://cdn.bootcdn.net/ajax/libs/marked/4.3.0/marked.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/KaTeX/0.16.6/katex.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/KaTeX/0.16.6/contrib/auto-render.min.js
// @require      https://ghproxy.com/https://raw.githubusercontent.com/drudru/ansi_up/master/ansi_up.js
// @require      http://xmoj-bbs.infinityfreeapp.com/aes.js
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setClipboard
// @connect      xmoj-bbs.infinityfreeapp.com
// ==/UserScript==

/**
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Program Start
let SecondsToString = (InputSeconds) => {
    let Hours = Math.floor(InputSeconds / 3600);
    let Minutes = Math.floor((InputSeconds % 3600) / 60);
    let Seconds = InputSeconds % 60;
    return (Hours < 10 ? "0" : "") + Hours + ":" +
        (Minutes < 10 ? "0" : "") + Minutes + ":" +
        (Seconds < 10 ? "0" : "") + Seconds;
}
let StringToSeconds = (InputString) => {
    let SplittedString = InputString.split(":");
    return parseInt(SplittedString[0]) * 60 * 60 +
        parseInt(SplittedString[1]) * 60 +
        parseInt(SplittedString[2]);
}
let SizeToStringSize = (Memory) => {
    if (UtilityEnabled("AddUnits")) {
        if (Memory < 1024) {
            return Memory + "B";
        } else if (Memory < 1024 * 1024) {
            return (Memory / 1024).toFixed(2) + "KB";
        } else if (Memory < 1024 * 1024 * 1024) {
            return (Memory / 1024 / 1024).toFixed(2) + "MB";
        } else {
            return (Memory / 1024 / 1024 / 1024).toFixed(2) + "GB";
        }
    }
    else {
        return Memory;
    }
};
let TimeToStringTime = (Time) => {
    if (UtilityEnabled("AddUnits")) {
        if (Time < 1000) {
            return Time + "ms";
        } else if (Time < 1000 * 60) {
            return (Time / 1000).toFixed(2) + "s";
        } else if (Time < 1000 * 60 * 60) {
            return (Time / 1000 / 60).toFixed(2) + "min";
        } else {
            return (Time / 1000 / 60 / 60).toFixed(2) + "h";
        }
    }
    else {
        return Time;
    }
};
let TidyTable = (Table) => {
    if (UtilityEnabled("NewBootstrap") && Table != null) {
        Table.className = "table table-hover";
        Table.querySelector("thead > tr").removeAttribute("class");
        Table.querySelector("thead > tr").removeAttribute("align");
        Table.querySelector("thead > tr").innerHTML = Table.querySelector("thead > tr").innerHTML.replaceAll("td", "th");
        let Temp = Table.querySelector("thead > tr").children;
        for (let j = 0; j < Temp.length; j++) {
            let Width = Temp[j].style.width;
            Temp[j].removeAttribute("style");
            Temp[j].style.width = Width;
            Temp[j].removeAttribute("onclick");
            Temp[j].removeAttribute("align");
        }
        Table.querySelector("tbody").className = "table-group-divider";
        Temp = Table.querySelector("tbody").children;
        for (let j = 0; j < Temp.length; j++) {
            Temp[j].removeAttribute("align");
            let Temp2 = Temp[j].querySelectorAll("*");
            for (let k = 0; k < Temp2.length; k++) {
                Temp2[k].classList.remove("left");
                Temp2[k].classList.remove("center");
                if (Temp2[k].className == "") {
                    Temp2[k].removeAttribute("class");
                }
            }
        }
    }
};
let UtilityEnabled = (Name) => {
    if (localStorage.getItem("UserScript-Setting-" + Name) == null) {
        localStorage.setItem("UserScript-Setting-" + Name, "true");
    }
    return localStorage.getItem("UserScript-Setting-" + Name) == "true";
};
let RequestAPI = (Item, Action, Data, CallBack) => {
    let UserID = profile.innerText;
    let Session = "";
    let Temp = document.cookie.split(";");
    for (let i = 0; i < Temp.length; i++) {
        if (Temp[i].includes("PHPSESSID")) {
            Session = Temp[i].split("=")[1];
        }
    }
    Data.Action = Action;
    Data.UserID = UserID;
    Data.Session = Session;
    let DataString = "";
    for (let i in Data) {
        if (Data[i] != null) {
            DataString += i + "=" + encodeURIComponent(Data[i]) + "&";
        }
    }
    DataString = DataString.substring(0, DataString.length - 1);
    GM_xmlhttpRequest({
        method: "POST",
        url: "http://xmoj-bbs.infinityfreeapp.com/" + Item + (UserScriptDebug ? "-Debug" : "") + ".php",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        cookie: "__test=" + localStorage.getItem("UserScript-InfinityFree-Cookie"),
        data: DataString,
        onload: (Response) => {
            if (Response.status == 508) {
                CallBack({
                    "Success": false,
                    "ErrorMessage": "服务器连接数过多，请稍后再试"
                });
                return
            }
            if (Response.status != 200) {
                CallBack({
                    "Success": false,
                    "ErrorMessage": "服务器返回错误码：" + Response.status
                });
                return;
            }
            let ResponseData;
            try {
                ResponseData = JSON.parse(Response.responseText);
                if (ResponseData.Success == false && ResponseData.ErrorMessage.indexOf("max_user_connections") != -1) {
                    ResponseData.ErrorMessage = "服务器连接数过多，请稍后再试";
                    return;
                }
            } catch (error) {
                if (Response.responseText.indexOf("aes.js") != -1) {
                    let ScriptData = Response.responseText.substring(Response.responseText.indexOf("<script>") + 8, Response.responseText.lastIndexOf("</script>"));
                    let ValueA = ScriptData.substring(ScriptData.indexOf("a=toNumbers(\"") + 13, ScriptData.indexOf("\"),b=toNumbers"));
                    let ValueB = ScriptData.substring(ScriptData.indexOf("b=toNumbers(\"") + 13, ScriptData.indexOf("\"),c=toNumbers"));
                    let ValueC = ScriptData.substring(ScriptData.indexOf("c=toNumbers(\"") + 13, ScriptData.indexOf("\");document.cookie"));
                    function toNumbers(Input) {
                        var Output = [];
                        Input.replace(/(..)/g, function (d) {
                            Output.push(parseInt(d, 16))
                        });
                        return Output;
                    }
                    function toHex() {
                        var Input = [];
                        Input = (arguments.length == 1 && arguments[0].constructor == Array) ? arguments[0] : arguments;
                        var Output = "";
                        for (var i = 0; i < Input.length; i++) {
                            Output += (Input[i] < 16 ? "0" : "") + Input[i].toString(16);
                        }
                        return Output.toLowerCase();
                    }
                    let Cookie = toHex(slowAES.decrypt(toNumbers(ValueC), 2, toNumbers(ValueA), toNumbers(ValueB)));
                    localStorage.setItem("UserScript-InfinityFree-Cookie", Cookie);
                    RequestAPI("BBS", Action, Data, CallBack);
                    return;
                }
                if (Response.responseText.indexOf("parking") != -1) {
                    CallBack({
                        "Success": false,
                        "ErrorMessage": "在访问XMOJ的时候请不要打开VPN"
                    });
                    return;
                }
                ResponseData = {
                    "Success": false,
                    "ErrorMessage": "JSON解析错误：" + error
                };
            }
            CallBack(ResponseData);
        }
    });
};

GM_registerMenuCommand("重置数据", () => {
    if (confirm("确定要重置数据吗？")) {
        localStorage.clear();
        location.reload();
    }
});

let SearchParams = new URLSearchParams(location.search);
let UserScriptDebug = (localStorage.getItem("UserScript-Debug") != null);

if (location.host != "www.xmoj.tech") {
    location.host = "www.xmoj.tech";
}
else {
    if (document.querySelector("#navbar") != null) {
        if (document.querySelector("body > div > div.jumbotron") != null) {
            document.querySelector("body > div > div.jumbotron").className = "mt-3";
        }

        if (UtilityEnabled("AutoLogin") &&
            document.querySelector("#profile") != null &&
            document.querySelector("#profile").innerHTML == "登录" &&
            location.pathname != "/login.php" &&
            location.pathname != "/loginpage.php" &&
            location.pathname != "/lostpassword.php") {
            localStorage.setItem("UserScript-LastPage", location.pathname + location.search);
            location.href = "loginpage.php";
        }

        let Discussion = document.createElement("li");
        document.querySelector("#navbar > ul:nth-child(1)").appendChild(Discussion);
        Discussion.innerHTML = "<a href=\"/discuss3/discuss.php\">讨论</a>";

        if (document.querySelector("#navbar > ul:nth-child(1)").childElementCount > 8 && UtilityEnabled("ACMRank")) {
            let ACMRank = document.createElement("li");
            document.querySelector("#navbar > ul:nth-child(1)").insertBefore(ACMRank, document.querySelector("#navbar > ul:nth-child(1) > li:nth-child(9)"));
            ACMRank.innerHTML = "<a href=\"/contestrank-oi.php?cid=" + SearchParams.get("cid") + "&ByUserScript=1\">ACM 排名</a>";
            ACMRank.classList.add("active");
        }
        if (UtilityEnabled("Translate")) {
            document.querySelector("#navbar > ul:nth-child(1) > li:nth-child(2) > a").innerText = "题库";
        }

        if (UtilityEnabled("ReplaceLinks")) {
            document.body.innerHTML =
                String(document.body.innerHTML).replaceAll(
                    /\[<a href="([^"]*)">([^<]*)<\/a>\]/g,
                    "<button onclick=\"location.href='$1'\" class=\"btn btn-outline-secondary\">$2</button>");
        }
        if (UtilityEnabled("ReplaceXM")) {
            document.body.innerHTML = String(document.body.innerHTML).replaceAll("我", "高老师");
            document.body.innerHTML = String(document.body.innerHTML).replaceAll("小明", "高老师");
            document.body.innerHTML = String(document.body.innerHTML).replaceAll("下海", "上海");
            document.body.innerHTML = String(document.body.innerHTML).replaceAll("海上", "上海");
            document.body.innerHTML = String(document.body.innerHTML).replaceAll("小红", "低老师");
            document.body.innerHTML = String(document.body.innerHTML).replaceAll("xiaoming", "gaolaoshi");
            document.title = String(document.title).replaceAll("小明", "高老师");
        }

        if (UtilityEnabled("NewBootstrap")) {
            let Temp = document.querySelectorAll("link");
            for (var i = 0; i < Temp.length; i++) {
                if (Temp[i].href.indexOf("bootstrap.min.css") != -1) {
                    Temp[i].href = "https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0-alpha3/css/bootstrap.min.css";
                }
                else if (Temp[i].href.indexOf("white.css") != -1) {
                    Temp[i].remove();
                }
                else if (Temp[i].href.indexOf("semantic.min.css") != -1) {
                    Temp[i].remove();
                }
                else if (Temp[i].href.indexOf("bootstrap-theme.min.css") != -1) {
                    Temp[i].remove();
                }
                else if (Temp[i].href.indexOf("problem.css") != -1) {
                    Temp[i].remove();
                }
            }
            if (UtilityEnabled("DarkMode")) {
                document.querySelector("html").setAttribute("data-bs-theme", "dark");
            }
            else {
                document.querySelector("html").setAttribute("data-bs-theme", "light");
            }

            let PopperScriptElement = document.createElement("script"); document.head.appendChild(PopperScriptElement);
            PopperScriptElement.type = "module";
            PopperScriptElement.src = "https://cdn.bootcdn.net/ajax/libs/popper.js/2.11.7/umd/popper.min.js";
            let CodeMirrorStyleElement = document.createElement("link"); document.head.appendChild(CodeMirrorStyleElement);
            CodeMirrorStyleElement.rel = "stylesheet";
            CodeMirrorStyleElement.href = "https://cdn.bootcdn.net/ajax/libs/codemirror/6.65.7/codemirror.min.css";
            let CodeMirrorThemeStyleElement = document.createElement("link"); document.head.appendChild(CodeMirrorThemeStyleElement);
            CodeMirrorThemeStyleElement.rel = "stylesheet";
            CodeMirrorThemeStyleElement.href = "https://cdn.bootcdn.net/ajax/libs/codemirror/6.65.7/theme/darcula.min.css";
            let CodeMirrroMergeStyleElement = document.createElement("link"); document.head.appendChild(CodeMirrroMergeStyleElement);
            CodeMirrroMergeStyleElement.rel = "stylesheet";
            CodeMirrroMergeStyleElement.href = "https://cdn.bootcdn.net/ajax/libs/codemirror/6.65.7/addon/merge/merge.min.css";
            // let SentryScriptElement = document.createElement("script"); document.head.appendChild(SentryScriptElement);
            // SentryScriptElement.src = "https://js.sentry-cdn.com/a4c8d48a19954926bf0d8e3d6d6c3024.min.js";
            Temp = document.querySelectorAll("script");
            for (var i = 0; i < Temp.length; i++) {
                if (Temp[i].src.indexOf("bootstrap.min.js") != -1) {
                    Temp[i].remove();
                    let BootstrapScriptElement = document.createElement("script"); document.head.appendChild(BootstrapScriptElement);
                    BootstrapScriptElement.type = "module";
                    BootstrapScriptElement.src = "https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0-alpha3/js/bootstrap.min.js";
                }
            }
            document.querySelector("nav").className = "navbar navbar-expand-lg bg-body-tertiary";
            document.querySelector("#navbar > ul:nth-child(1)").classList = "navbar-nav me-auto mb-2 mb-lg-0";
            document.querySelector("body > div > nav > div > div.navbar-header").outerHTML = `<a class="navbar-brand" href="/">高老师的OJ</a><button type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbar"><span class="navbar-toggler-icon"></span></button>`;
            document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li").classList = "nav-item dropdown";
            document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > a").className = "nav-link dropdown-toggle";
            document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > a > span.caret").remove();
            Temp = document.querySelector("#navbar > ul:nth-child(1)").children;
            for (var i = 0; i < Temp.length; i++) {
                if (Temp[i].classList.contains("active")) {
                    Temp[i].classList.remove("active");
                    Temp[i].children[0].classList.add("active");
                }
                Temp[i].classList.add("nav-item");
                Temp[i].children[0].classList.add("nav-link");
            }
            document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > a").setAttribute("data-bs-toggle", "dropdown");
            document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > a").removeAttribute("data-toggle");
        }
        if (UtilityEnabled("RemoveUseless") && document.getElementsByTagName("marquee")[0] != undefined) {
            document.getElementsByTagName("marquee")[0].remove();
        }

        let Style = document.createElement("style");
        document.body.appendChild(Style);
        Style.innerHTML = `
                nav {
                    border-bottom-left-radius: 5px;
                    border-bottom-right-radius: 5px;
                }
                .status_y:hover {
                    box-shadow: #52c41a 1px 1px 10px 0px !important;
                }
                .status_n:hover {
                    box-shadow: #fe4c61 1px 1px 10px 0px !important;
                }
                .test-case {
                    border-radius: 5px !important;
                }
                .test-case:hover {
                    box-shadow: rgba(0, 0, 0, 0.3) 0px 10px 20px 3px !important;
                }
                .software_list {
                    width: unset !important;
                }
                .software_item {
                    margin: 5px 10px !important;
                    background-color: var(--bs-secondary-bg) !important;
                }
                .item-txt {
                    color: var(--bs-emphasis-color) !important;
                }
                .cnt-row {
                    justify-content: inherit;
                    align-items: stretch;
                    width: 100% !important;
                    padding: 1rem 0;
                }
                .cnt-row-head {
                    padding: 0.8em 1em;
                    background-color: var(--bs-secondary-bg);
                    border-radius: 0.3rem 0.3rem 0 0;
                    width: 100%;
                }
                .cnt-row-body {
                    padding: 1em;
                    border: 1px solid var(--bs-secondary-bg);
                    border-top: none;
                    border-radius: 0 0 0.3rem 0.3rem;
                }`;
        if (UtilityEnabled("AddAnimation")) {
            Style.innerHTML += `.status, .test-case {
                    transition: 0.5s !important;
                }`;
        }
        if (UtilityEnabled("AddColorText")) {
            Style.innerHTML += `.red {
                    color: red !important;
                }
                .green {
                    color: green !important;
                }
                .blue {
                    color: blue !important;
                }`;
        }

        if (UtilityEnabled("RemoveUseless")) {
            if (document.getElementsByClassName("footer")[0] != null) {
                document.getElementsByClassName("footer")[0].remove();
            }
        }

        if (UtilityEnabled("ReplaceYN")) {
            Temp = document.getElementsByClassName("status_y");
            for (let i = 0; i < Temp.length; i++) {
                Temp[i].innerText = "✓";
            }
            Temp = document.getElementsByClassName("status_n");
            for (let i = 0; i < Temp.length; i++) {
                Temp[i].innerText = "✗";
            }
        }

        Temp = document.getElementsByClassName("page-item");
        for (let i = 0; i < Temp.length; i++) {
            Temp[i].children[0].className = "page-link";
        }
        if (document.getElementsByClassName("pagination")[0] != null) {
            document.getElementsByClassName("pagination")[0].classList.add("justify-content-center");
        }

        Temp = document.getElementsByTagName("table");
        for (let i = 0; i < Temp.length; i++) {
            if (Temp[i].querySelector("thead") != null) {
                TidyTable(Temp[i]);
            }
        }

        setInterval(() => {
            try {
                let CurrentDate = new Date(new Date().getTime() + diff);
                let Year = CurrentDate.getFullYear();
                if (Year > 3000) {
                    Year -= 1900;
                }
                let Month = CurrentDate.getMonth() + 1;
                let _Date = CurrentDate.getDate();
                let Hours = CurrentDate.getHours();
                let Minutes = CurrentDate.getMinutes();
                let Seconds = CurrentDate.getSeconds();
                document.getElementById("nowdate").innerHTML =
                    Year + "-" +
                    (Month < 10 ? "0" : "") + Month + "-" +
                    (_Date < 10 ? "0" : "") + _Date + " " +
                    (Hours < 10 ? "0" : "") + Hours + ":" +
                    (Minutes < 10 ? "0" : "") + Minutes + ":" +
                    (Seconds < 10 ? "0" : "") + Seconds;
            } catch (Error) { }

            if (UtilityEnabled("ResetType")) {
                if (document.querySelector("#profile") != undefined &&
                    document.querySelector("#profile").innerHTML == "登录") {
                    if (document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").childNodes.length == 3) {
                        document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").childNodes[3].remove();
                    }
                }
                else if (document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul > li:nth-child(3) > a > span") != undefined &&
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul > li:nth-child(3) > a > span").innerText != "个人中心") {
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul > li:nth-child(3) > a > span").innerText = "个人中心";
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul > li:nth-child(4)").remove();
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul > li:nth-child(4)").remove();
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul > li:nth-child(4)").remove();
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").innerHTML =
                        String(document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").innerHTML).replaceAll("&nbsp;", "");
                    let Temp = document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").children;
                    for (var i = 0; i < Temp.length; i++) {
                        if (Temp[i].tagName.toLowerCase() != "li") {
                            Temp[i].remove();
                        }
                        Temp[i].classList.add("dropdown-item");
                    }
                    let ShortMessageButton = document.createElement("li");
                    ShortMessageButton.className = "dropdown-item";
                    ShortMessageButton.innerHTML = `<a href="/mail.php">短消息</a>`;
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").appendChild(ShortMessageButton);
                    let SettingsButton = document.createElement("li");
                    SettingsButton.className = "dropdown-item";
                    SettingsButton.innerHTML = `<a href="/index.php?ByUserScript=1">插件设置</a>`;
                    document.querySelector("#navbar > ul.nav.navbar-nav.navbar-right > li > ul").appendChild(SettingsButton);
                }
            }
            if (UtilityEnabled("AutoCountdown")) {
                let Temp = document.getElementsByClassName("UpdateByJS");
                for (let i = 0; i < Temp.length; i++) {
                    let TimeStamp = parseInt(Temp[i].getAttribute("EndTime")) - new Date().getTime();
                    if (TimeStamp < 3000) {
                        Temp[i].classList.remove("UpdateByJS");
                        location.reload();
                    }
                    let CurrentDate = new Date(TimeStamp);
                    let Day = parseInt(TimeStamp / 1000 / 60 / 60 / 24);
                    let Hour = CurrentDate.getUTCHours();
                    let Minute = CurrentDate.getUTCMinutes();
                    let Second = CurrentDate.getUTCSeconds();
                    Temp[i].innerText = (Day != 0 ? Day + "天" : "") +
                        (Hour != 0 ? (Hour < 10 ? "0" : "") + Hour + "小时" : "") +
                        (Minute != 0 ? (Minute < 10 ? "0" : "") + Minute + "分" : "") +
                        (Second != 0 ? (Second < 10 ? "0" : "") + Second + "秒" : "");
                }
            }
        }, 100);

        fetch("https://langningchen.github.io/XMOJ-Script/Update.json", { cache: "no-cache" })
            .then((Response) => {
                return Response.json();
            })
            .then((Response) => {
                let CurrentVersion = GM_info.script.version;
                let LatestVersion = Object.keys(Response.UpdateHistory)[Object.keys(Response.UpdateHistory).length - 1];
                if (CurrentVersion < LatestVersion) {
                    let UpdateDiv = document.createElement("div");
                    UpdateDiv.innerHTML = `<div class="alert alert-warning alert-dismissible fade show" role="alert">
                        <div>
                            XMOJ用户脚本发现新版本${LatestVersion}，当前版本${CurrentVersion}，点击
                            <a href="https://langningchen.github.io/XMOJ-Script/XMOJ.user.js target="_blank" class="alert-link">此处</a>
                            更新
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>`;
                    document.querySelector("body > div").insertBefore(UpdateDiv, document.querySelector("body > div > div.mt-3"));
                }
                if (localStorage.getItem("UserScript-Update-LastVersion") != GM_info.script.version) {
                    localStorage.setItem("UserScript-Update-LastVersion", GM_info.script.version);
                    let UpdateDiv = document.createElement("div"); document.querySelector("body").appendChild(UpdateDiv);
                    UpdateDiv.className = "modal fade";
                    UpdateDiv.id = "UpdateModal";
                    UpdateDiv.tabIndex = "-1";
                    let UpdateDialog = document.createElement("div"); UpdateDiv.appendChild(UpdateDialog);
                    UpdateDialog.className = "modal-dialog";
                    let UpdateContent = document.createElement("div"); UpdateDialog.appendChild(UpdateContent);
                    UpdateContent.className = "modal-content";
                    let UpdateHeader = document.createElement("div"); UpdateContent.appendChild(UpdateHeader);
                    UpdateHeader.className = "modal-header";
                    let UpdateTitle = document.createElement("h5"); UpdateHeader.appendChild(UpdateTitle);
                    UpdateTitle.className = "modal-title";
                    UpdateTitle.innerText = "更新日志";
                    let UpdateCloseButton = document.createElement("button"); UpdateHeader.appendChild(UpdateCloseButton);
                    UpdateCloseButton.type = "button";
                    UpdateCloseButton.className = "btn-close";
                    UpdateCloseButton.setAttribute("data-bs-dismiss", "modal");
                    let UpdateBody = document.createElement("div"); UpdateContent.appendChild(UpdateBody);
                    UpdateBody.className = "modal-body";
                    let UpdateFooter = document.createElement("div"); UpdateContent.appendChild(UpdateFooter);
                    UpdateFooter.className = "modal-footer";
                    let UpdateButton = document.createElement("button"); UpdateFooter.appendChild(UpdateButton);
                    UpdateButton.type = "button";
                    UpdateButton.className = "btn btn-secondary";
                    UpdateButton.setAttribute("data-bs-dismiss", "modal");
                    UpdateButton.innerText = "关闭";
                    let Version = Object.keys(Response.UpdateHistory)[Object.keys(Response.UpdateHistory).length - 1]
                    let Data = Response.UpdateHistory[Version];
                    let UpdateDataCard = document.createElement("div"); UpdateBody.appendChild(UpdateDataCard);
                    UpdateDataCard.className = "card mb-3";
                    let UpdateDataCardBody = document.createElement("div"); UpdateDataCard.appendChild(UpdateDataCardBody);
                    UpdateDataCardBody.className = "card-body";
                    let UpdateDataCardTitle = document.createElement("h5"); UpdateDataCardBody.appendChild(UpdateDataCardTitle);
                    UpdateDataCardTitle.className = "card-title";
                    UpdateDataCardTitle.innerText = Version;
                    let UpdateDataCardSubtitle = document.createElement("h6"); UpdateDataCardBody.appendChild(UpdateDataCardSubtitle);
                    UpdateDataCardSubtitle.className = "card-subtitle mb-2 text-muted";
                    UpdateDataCardSubtitle.innerText = new Date(Data.UpdateDate).toLocaleString();
                    let UpdateDataCardText = document.createElement("p"); UpdateDataCardBody.appendChild(UpdateDataCardText);
                    UpdateDataCardText.className = "card-text";
                    let UpdateDataCardList = document.createElement("ul"); UpdateDataCardText.appendChild(UpdateDataCardList);
                    UpdateDataCardList.className = "list-group list-group-flush";
                    for (let j = 0; j < Data.UpdateCommits.length; j++) {
                        let UpdateDataCardListItem = document.createElement("li"); UpdateDataCardList.appendChild(UpdateDataCardListItem);
                        UpdateDataCardListItem.className = "list-group-item";
                        UpdateDataCardListItem.innerHTML =
                            "(<a href=\"https://github.com/langningchen/XMOJ-Script/commit/" + Data.UpdateCommits[j].Commit + "\" target=\"_blank\">"
                            + Data.UpdateCommits[j].ShortCommit + "</a>) " +
                            Data.UpdateCommits[j].Description;
                    }
                    let UpdateDataCardLink = document.createElement("a"); UpdateDataCardBody.appendChild(UpdateDataCardLink);
                    UpdateDataCardLink.className = "card-link";
                    UpdateDataCardLink.href = "https://github.com/langningchen/XMOJ-Script/releases/tag/" + Version;
                    UpdateDataCardLink.target = "_blank";
                    UpdateDataCardLink.innerText = "查看该版本";
                    new bootstrap.Modal(document.getElementById("UpdateModal")).show();
                }
            });
        fetch("https://langningchen.github.io/XMOJ-Script/AddonScript.js", { cache: "no-cache" })
            .then((Response) => {
                return Response.text();
            })
            .then((Response) => {
                eval(Response);
            });

        addEventListener("focus", () => {
            debugger
            RequestAPI("BBS", "GetMentionList", {}, (Response) => {
                if (Response.Success) {
                    let MentionList = Response.Data.MentionList;
                    for (let i = 0; i < MentionList.length; i++) {
                        GM_notification({
                            title: "XMOJ",
                            text: "@" + MentionList[i].UserID + " 在讨论 " + MentionList[i].Title + " 中提及了你，点击此处查看",
                            timeout: 10000,
                            onclick: () => {
                                open("http://www.xmoj.tech/discuss3/thread.php?tid=" + MentionList[i].PostID + "&page=" + MentionList[i].Page, "_blank");
                                RequestAPI("BBS", "ReadMention", {
                                    "MentionID": MentionList[i].MentionID
                                }, () => { });
                            }
                        });
                    }
                }
            });
            if (location.pathname != "/mail.php") {
                RequestAPI("Mail", "GetUnreadList", {}, (Response) => {
                    if (Response.Success) {
                        let UnreadList = Response.Data.UnreadList;
                        for (let i = 0; i < UnreadList.length; i++) {
                            GM_notification({
                                title: "XMOJ",
                                text: "@" + UnreadList[i].OtherUser + " 给你发了一封短消息，点击此处查看",
                                timeout: 10000,
                                onclick: () => {
                                    open("http://www.xmoj.tech/mail.php?other=" + UnreadList[i].OtherUser, "_blank");
                                }
                            });
                        }
                    }
                });
            }
        });

        if (location.pathname == "/index.php" || location.pathname == "/") {
            if (new URL(location.href).searchParams.get("ByUserScript") != null) {
                localStorage.setItem("UserScript-Opened", "true");
                let Container = document.getElementsByClassName("mt-3")[0];
                Container.innerHTML = "";
                let Alert = document.createElement("div");
                Alert.classList.add("alert");
                Alert.classList.add("alert-primary");
                Alert.role = "alert";
                Alert.innerHTML = `欢迎使用XMOJ增强脚本！点击
                <a class="alert-link" href="modifypage.php?ByUserScript=1" target="_blank">此处</a>
                查看更新日志。`;
                Container.appendChild(Alert);
                let UtilitiesCard = document.createElement("div");
                UtilitiesCard.classList.add("card");
                UtilitiesCard.classList.add("mb-3");
                let UtilitiesCardHeader = document.createElement("div");
                UtilitiesCardHeader.classList.add("card-header");
                UtilitiesCardHeader.innerText = "功能列表";
                UtilitiesCard.appendChild(UtilitiesCardHeader);
                let UtilitiesCardBody = document.createElement("div");
                UtilitiesCardBody.classList.add("card-body");
                let CreateList = (Data) => {
                    let List = document.createElement("ul");
                    List.classList.add("list-group");
                    for (let i = 0; i < Data.length; i++) {
                        let Row = document.createElement("li");
                        Row.classList.add("list-group-item");
                        if (Data[i].Type == "A") {
                            Row.classList.add("list-group-item-success");
                        }
                        else if (Data[i].Type == "F") {
                            Row.classList.add("list-group-item-warning");
                        }
                        else if (Data[i].Type == "D") {
                            Row.classList.add("list-group-item-danger");
                        }
                        if (Data[i].Children == undefined) {
                            let CheckBox = document.createElement("input");
                            CheckBox.classList.add("form-check-input");
                            CheckBox.classList.add("me-1");
                            CheckBox.type = "checkbox";
                            CheckBox.id = Data[i].ID;
                            if (localStorage.getItem("UserScript-Setting-" + Data[i].ID) == null) {
                                localStorage.setItem("UserScript-Setting-" + Data[i].ID, "true");
                            }
                            if (localStorage.getItem("UserScript-Setting-" + Data[i].ID) == "false") {
                                CheckBox.checked = false;
                            }
                            else {
                                CheckBox.checked = true;
                            }
                            CheckBox.addEventListener("change", () => {
                                localStorage.setItem("UserScript-Setting-" + Data[i].ID, CheckBox.checked);
                            });

                            Row.appendChild(CheckBox);
                            let Label = document.createElement("label");
                            Label.classList.add("form-check-label");
                            Label.htmlFor = Data[i].ID;
                            Label.innerText = Data[i].Name;
                            Row.appendChild(Label);
                        }
                        else {
                            let Label = document.createElement("label");
                            Label.innerText = Data[i].Name;
                            Row.appendChild(Label);
                        }
                        if (Data[i].Children != undefined) {
                            Row.appendChild(CreateList(Data[i].Children));
                        }
                        List.appendChild(Row);
                    }
                    return List;
                };
                UtilitiesCardBody.appendChild(CreateList([
                    { "ID": "ACMRank", "Type": "A", "Name": "比赛ACM排名，并且能下载ACM排名" },
                    { "ID": "MoreSTD", "Type": "F", "Name": "查看到更多标程" },
                    { "ID": "GetOthersSample", "Type": "A", "Name": "获取到别人的测试点数据" },
                    { "ID": "AutoRefresh", "Type": "A", "Name": "比赛列表、比赛排名界面自动刷新" },
                    { "ID": "AutoCountdown", "Type": "A", "Name": "比赛列表等界面的时间自动倒计时" },
                    { "ID": "DownloadPlayback", "Type": "A", "Name": "回放视频增加下载功能" },
                    { "ID": "ImproveACRate", "Type": "A", "Name": "自动提交已AC题目以提高AC率" },
                    { "ID": "AutoO2", "Type": "F", "Name": "代码提交界面自动选择O2优化" },
                    {
                        "ID": "Beautify", "Type": "F", "Name": "美化界面", "Children": [
                            { "ID": "NewBootstrap", "Type": "F", "Name": "使用新版的Bootstrap样式库*" },
                            { "ID": "ResetType", "Type": "F", "Name": "重新排版*" },
                            { "ID": "AddColorText", "Type": "A", "Name": "增加彩色文字" },
                            { "ID": "AddUnits", "Type": "A", "Name": "状态界面内存与耗时添加单位" },
                            { "ID": "DarkMode", "Type": "A", "Name": "使用暗色模式" },
                            { "ID": "AddAnimation", "Type": "A", "Name": "增加动画" },
                            { "ID": "ReplaceYN", "Type": "F", "Name": "题目前对错的Y和N替换为勾和叉" },
                            { "ID": "RemoveAlerts", "Type": "D", "Name": "去除多余反复的提示" },
                            { "ID": "Translate", "Type": "F", "Name": "统一使用中文，翻译了部分英文*" },
                            { "ID": "ReplaceLinks", "Type": "F", "Name": "将网站中所有以方括号包装的链接替换为按钮" },
                            { "ID": "RemoveUseless", "Type": "D", "Name": "删去无法使用的功能*" },
                            { "ID": "ReplaceXM", "Type": "F", "Name": "将网站中所有“小明”和“我”关键字替换为“高老师”，所有“小红”替换为“低老师”，所有“下海”、“海上”替换为“上海”，所有“xiaoming”替换为“gaolaoshi”" }
                        ]
                    },
                    { "ID": "AutoLogin", "Type": "A", "Name": "在需要登录的界面自动跳转到登陆界面" },
                    { "ID": "SavePassword", "Type": "A", "Name": "自动保存用户名与密码，免去每次手动输入密码的繁琐" },
                    { "ID": "CopySamples", "Type": "F", "Name": "题目界面测试样例有时复制无效" },
                    { "ID": "RefreshSolution", "Type": "F", "Name": "状态页面结果自动刷新每次只能刷新一个" },
                    { "ID": "CopyMD", "Type": "A", "Name": "复制题目或题解内容" },
                    { "ID": "OpenAllProblem", "Type": "A", "Name": "比赛题目界面一键打开所有题目" },
                    {
                        "ID": "CheckCode", "Type": "A", "Name": "提交代码前对代码进行检查", "Children": [
                            { "ID": "IOFile", "Type": "A", "Name": "是否使用了文件输入输出（如果需要使用）" },
                            { "ID": "CompileError", "Type": "A", "Name": "是否有编译错误" }
                        ]
                    },
                    { "ID": "ExportACCode", "Type": "F", "Name": "导出AC代码每一道题目一个文件" },
                    { "ID": "LoginFailed", "Type": "F", "Name": "登录后跳转失败*" },
                    { "ID": "NewDownload", "Type": "A", "Name": "下载页面增加下载内容" },
                    { "ID": "CompareSource", "Type": "A", "Name": "比较代码" }
                ]));
                let UtilitiesCardFooter = document.createElement("div");
                UtilitiesCardFooter.className = "card-footer text-muted";
                UtilitiesCardFooter.innerText = "* 不建议关闭，可能会导致系统不稳定、界面错乱、功能缺失等问题\n绿色：增加功能　黄色：修改功能　红色：删除功能";
                UtilitiesCardBody.appendChild(UtilitiesCardFooter);
                UtilitiesCard.appendChild(UtilitiesCardBody);
                Container.appendChild(UtilitiesCard);
                let FeedbackCard = document.createElement("div");
                FeedbackCard.className = "card mb-3";
                let FeedbackCardHeader = document.createElement("div");
                FeedbackCardHeader.className = "card-header";
                FeedbackCardHeader.innerText = "反馈、源代码、联系作者";
                FeedbackCard.appendChild(FeedbackCardHeader);
                let FeedbackCardBody = document.createElement("div");
                FeedbackCardBody.className = "card-body";
                let FeedbackCardText = document.createElement("p");
                FeedbackCardText.className = "card-text";
                FeedbackCardText.innerText = "如果您有任何建议或者发现了bug，请前往本项目的GitHub页面并提交issue。提交issue前请先搜索是否有相同的issue，如果有请在该issue下留言。请在issue中尽可能详细地描述您的问题，并且附上您的浏览器版本、操作系统版本、脚本版本、复现步骤等信息。谢谢您支持本项目。";
                FeedbackCardBody.appendChild(FeedbackCardText);
                let FeedbackCardLink = document.createElement("a");
                FeedbackCardLink.className = "card-link";
                FeedbackCardLink.innerText = "GitHub";
                FeedbackCardLink.href = "https://github.com/langningchen/XMOJ-Script";
                FeedbackCardBody.appendChild(FeedbackCardLink);
                FeedbackCard.appendChild(FeedbackCardBody);
                Container.appendChild(FeedbackCard);
            }
            else {
                let Temp = document.querySelector("body > div > div.mt-3 > div > div.col-md-8").children;
                let NewsData = [];
                for (let i = 0; i < Temp.length; i += 2) {
                    let Title = Temp[i].children[0].innerText;
                    let Time = 0;
                    if (Temp[i].children[1] != null) {
                        Time = Temp[i].children[1].innerText;
                    }
                    let Body = Temp[i + 1].innerHTML;
                    NewsData.push({ "Title": Title, "Time": Time, "Body": Body });
                }
                document.querySelector("body > div > div.mt-3 > div > div.col-md-8").innerHTML = "";
                for (let i = 0; i < NewsData.length; i++) {
                    let NewsRow = document.createElement("div");
                    NewsRow.className = "cnt-row";
                    let NewsRowHead = document.createElement("div");
                    NewsRowHead.className = "cnt-row-head title";
                    NewsRowHead.innerHTML = NewsData[i].Title;
                    if (NewsData[i].Time != 0) {
                        NewsRowHead.innerHTML += "<small class=\"ms-3\">" + NewsData[i].Time + "</small>";
                    }
                    NewsRow.appendChild(NewsRowHead);
                    let NewsRowBody = document.createElement("div");
                    NewsRowBody.className = "cnt-row-body";
                    NewsRowBody.innerHTML = NewsData[i].Body;
                    NewsRow.appendChild(NewsRowBody);
                    document.querySelector("body > div > div.mt-3 > div > div.col-md-8").appendChild(NewsRow);
                }
                let CountDownData = document.querySelector("#countdown_list").innerHTML;
                document.querySelector("body > div > div.mt-3 > div > div.col-md-4").innerHTML = `<div class="cnt-row">
                        <div class="cnt-row-head title">倒计时</div>
                        <div class="cnt-row-body">${CountDownData}</div>
                    </div>`;
            }
        } else if (location.pathname == "/problemset.php") {
            if (UtilityEnabled("Translate")) {
                document.querySelector("body > div > div.mt-3 > center > table:nth-child(2) > tbody > tr > td:nth-child(2) > form > input").placeholder = "题目编号";
                document.querySelector("body > div > div.mt-3 > center > table:nth-child(2) > tbody > tr > td:nth-child(2) > form > button").innerText = "确认";
                document.querySelector("body > div > div.mt-3 > center > table:nth-child(2) > tbody > tr > td:nth-child(3) > form > input").placeholder = "标题或内容";
                document.querySelector("#problemset > thead > tr > th:nth-child(1)").innerText = "状态";
            }
            if (UtilityEnabled("ResetType")) {
                document.querySelector("#problemset > thead > tr > th:nth-child(1)").style.width = "5%";
                document.querySelector("#problemset > thead > tr > th:nth-child(2)").style.width = "10%";
                document.querySelector("#problemset > thead > tr > th:nth-child(3)").style.width = "75%";
                document.querySelector("#problemset > thead > tr > th:nth-child(4)").style.width = "5%";
                document.querySelector("#problemset > thead > tr > th:nth-child(5)").style.width = "5%";
            }
            document.querySelector("body > div > div.mt-3 > center > table:nth-child(2)").outerHTML = `
            <div class="row">
                <div class="center col-md-3"></div>
                <div class="col-md-2">
                    <form action="problem.php" class="input-group">
                        <input class="form-control" type="number" name="id" placeholder="题目编号" min="0">
                        <button class="btn btn-outline-secondary" type="submit">跳转</button>
                    </form>
                </div>
                <div class="col-md-4">
                    <form action="problemset.php" class="input-group">
                        <input class="form-control" type="text" name="search" placeholder="标题或内容">
                        <button class="btn btn-outline-secondary" type="submit">查找</button>
                    </form>
                </div>
            </div>`;
            if (SearchParams.get("search") != null) {
                document.querySelector("body > div > div.mt-3 > center > div > div:nth-child(3) > form > input").value = SearchParams.get("search");
            }

            let Temp = document.querySelector("#problemset").rows;
            for (let i = 1; i < Temp.length; i++) {
                localStorage.setItem("UserScript-Problem-" + Temp[i].children[1].innerText + "-Name",
                    Temp[i].children[2].innerText);
            }
        } else if (location.pathname == "/problem.php") {
            if (SearchParams.get("cid") != null) {
                document.getElementsByTagName("h2")[0].innerHTML += " (" +
                    localStorage.getItem("UserScript-Contest-" + SearchParams.get("cid") +
                        "-Problem-" + SearchParams.get("pid") + "-PID") +
                    ")";
            }
            if (document.querySelector("body > div > div.mt-3 > h2") != null) {
                document.querySelector("body > div > div.mt-3").innerHTML = "没有此题目或题目对你不可见";
                setTimeout(() => {
                    location.href = "problemset.php";
                }, 1000);
            }
            else {
                let PID = localStorage.getItem("UserScript-Contest-" + SearchParams.get("cid") +
                    "-Problem-" + SearchParams.get("pid") + "-PID");

                document.querySelector("body > div > div.mt-3 > center").lastChild.style.marginLeft = "10px";
                Temp = document.querySelectorAll(".sampledata");
                for (var i = 0; i < Temp.length; i++) {
                    Temp[i].parentElement.className = "card";
                }
                if (UtilityEnabled("RemoveUseless")) {
                    document.getElementsByTagName("center")[1].remove();
                }
                if (UtilityEnabled("CopySamples")) {
                    $(".copy-btn").click((Event) => {
                        let CurrentButton = $(Event.currentTarget);
                        let span = CurrentButton.parent().last().find(".sampledata");
                        if (!span.length) {
                            CurrentButton.text("未找到代码块").addClass("done");
                            setTimeout(() => {
                                $(".copy-btn").text("复制").removeClass("done");
                            }, 1000);
                            return;
                        }
                        GM_setClipboard(span.text());
                        CurrentButton.text("复制成功").addClass("done");
                        setTimeout(() => {
                            $(".copy-btn").text("复制").removeClass("done");
                        }, 1000);
                        document.body.removeChild(textarea[0]);
                    });
                }
                let IOFileElement = document.querySelector("body > div > div.mt-3 > center > h3");
                if (IOFileElement != null) {
                    while (IOFileElement.childNodes.length >= 1) {
                        IOFileElement.parentNode.insertBefore(IOFileElement.childNodes[0], IOFileElement);
                    }
                    IOFileElement.parentNode.insertBefore(document.createElement("br"), IOFileElement);
                    IOFileElement.remove();
                    let Temp = document.querySelector("body > div > div.mt-3 > center").childNodes[2].data.trim();
                    let IOFilename = Temp.substring(0, Temp.length - 3);
                    localStorage.setItem("UserScript-Problem-" + PID + "-IOFilename", IOFilename);
                }

                if (UtilityEnabled("CopyMD")) {
                    await fetch(location.href).then((Response) => {
                        return Response.text();
                    }).then((Response) => {
                        let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                        let Temp = ParsedDocument.querySelectorAll(".cnt-row");
                        for (let i = 0; i < Temp.length; i++) {
                            if (Temp[i].children[1].children[0].className == "content") {
                                let CopyMDButton = document.createElement("button");
                                CopyMDButton.className = "btn btn-sm btn-outline-secondary copy-btn";
                                CopyMDButton.innerText = "复制";
                                CopyMDButton.style.marginLeft = "10px";
                                CopyMDButton.type = "button";
                                document.querySelectorAll(".cnt-row")[i].children[0].appendChild(CopyMDButton);
                                CopyMDButton.addEventListener("click", () => {
                                    GM_setClipboard(Temp[i].children[1].children[0].innerText.trim().replaceAll("\n\t", "\n").replaceAll("\n\n", "\n").replaceAll("\n\n", "\n"));
                                    CopyMDButton.innerText = "复制成功";
                                    setTimeout(() => {
                                        CopyMDButton.innerText = "复制";
                                    }, 1000);
                                });
                            }
                        }
                    });
                }

                let DiscussButton = document.createElement("button");
                DiscussButton.className = "btn btn-outline-secondary position-relative";
                DiscussButton.innerHTML = `讨论`;
                DiscussButton.style.marginLeft = "10px";
                DiscussButton.type = "button";
                DiscussButton.addEventListener("click", () => {
                    if (SearchParams.get("cid") != null) {
                        open("http://www.xmoj.tech/discuss3/discuss.php?pid=" + PID, "_blank");
                    }
                    else {
                        open("http://www.xmoj.tech/discuss3/discuss.php?pid=" + SearchParams.get("id"), "_blank");
                    }
                });
                document.querySelector("body > div > div.mt-3 > center").appendChild(DiscussButton);
                let UnreadBadge = document.createElement("span");
                UnreadBadge.className = "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger";
                UnreadBadge.style.display = "none";
                DiscussButton.appendChild(UnreadBadge);

                let RefreshCount = () => {
                    RequestAPI("BBS", "GetPostCount", {
                        "ProblemID": PID
                    }, (Response) => {
                        if (Response.Success) {
                            if (Response.Data.DiscussCount != 0) {
                                UnreadBadge.innerText = Response.Data.DiscussCount;
                                UnreadBadge.style.display = "";
                            }
                        }
                    });
                };
                RefreshCount();
                addEventListener("focus", RefreshCount);
            }
            Style.innerHTML += "code, kbd, pre, samp {";
            Style.innerHTML += "    font-family: monospace, Consolas, 'Courier New';";
            Style.innerHTML += "    font-size: 1rem;";
            Style.innerHTML += "}";
            Style.innerHTML += "pre {";
            Style.innerHTML += "    padding: 0.3em 0.5em;";
            Style.innerHTML += "    margin: 0.5em 0;";
            Style.innerHTML += "}";
            Style.innerHTML += ".in-out {";
            Style.innerHTML += "    overflow: hidden;";
            Style.innerHTML += "    display: flex;";
            Style.innerHTML += "    padding: 0.5em 0;";
            Style.innerHTML += "}";
            Style.innerHTML += ".in-out .in-out-item {";
            Style.innerHTML += "    flex: 1;";
            Style.innerHTML += "    overflow: hidden;";
            Style.innerHTML += "}";
            Style.innerHTML += ".cnt-row .title {";
            Style.innerHTML += "    font-weight: bolder;";
            Style.innerHTML += "    font-size: 1.1rem;";
            Style.innerHTML += "}";
            Style.innerHTML += ".cnt-row .content {";
            Style.innerHTML += "    overflow: hidden;";
            Style.innerHTML += "}";
            Style.innerHTML += "a.copy-btn {";
            Style.innerHTML += "    float: right;";
            Style.innerHTML += "    padding: 0 0.4em;";
            Style.innerHTML += "    border: 1px solid var(--bs-primary);";
            Style.innerHTML += "    border-radius: 3px;";
            Style.innerHTML += "    color: var(--bs-primary);";
            Style.innerHTML += "    cursor: pointer;";
            Style.innerHTML += "}";
            Style.innerHTML += "a.copy-btn:hover {";
            Style.innerHTML += "    background-color: var(--bs-secondary-bg);";
            Style.innerHTML += "}";
            Style.innerHTML += "a.done, a.done:hover {";
            Style.innerHTML += "    background-color: var(--bs-primary);";
            Style.innerHTML += "    color: white;";
            Style.innerHTML += "}";
        } else if (location.pathname == "/status.php") {
            if (new URL(location.href).searchParams.get("ByUserScript") == null) {
                document.querySelector("body > script:nth-child(5)").remove();
                if (UtilityEnabled("NewBootstrap")) {
                    document.querySelector("#simform").outerHTML = `<form id="simform" class="justify-content-center form-inline row g-2" action="status.php" method="get" style="padding-bottom: 7px;">
                    <input class="form-control" type="text" size="4" name="user_id" value="${document.getElementById("profile").innerText}"style="display: none;">
                <div class="col-md-1">
                    <label for="problem_id" class="form-label">题目编号</label>
                    <input type="text" class="form-control" id="problem_id" name="problem_id" size="4">
                </div>
                <div class="col-md-1">
                    <label for="language" class="form-label">语言</label>
                    <select id="language" name="language" class="form-select">
                        <option value="-1" selected="">全部</option>
                        <option value="0">C</option>
                        <option value="1">C++</option>
                        <option value="2">Pascal</option>
                    </select>
                </div><div class="col-md-1">
                    <label for="jresult" class="form-label">结果</label>
                    <select id="jresult" name="jresult" class="form-select">
                        <option value="-1" selected="">全部</option>
                        <option value="4">正确</option>
                        <option value="5">格式错误</option>
                        <option value="6">答案错误</option>
                        <option value="7">时间超限</option>
                        <option value="8">内存超限</option>
                        <option value="9">输出超限</option>
                        <option value="10">运行错误</option>
                        <option value="11">编译错误</option>
                        <option value="0">等待</option>
                        <option value="1">等待重判</option>
                        <option value="2">编译中</option>
                        <option value="3">运行并评判</option>
                    </select>
                </div>
                <div class="col-md-1">
                    <button type="submit" class="btn btn-primary">查找</button>
                </div><div id="csrf"></div></form>`;
                }

                if (UtilityEnabled("GetOthersSample")) {
                    let GetOthersSampleButton = document.createElement("button");
                    document.querySelector("body > div.container > div > div.input-append").appendChild(GetOthersSampleButton);
                    GetOthersSampleButton.className = "btn btn-outline-secondary";
                    GetOthersSampleButton.innerText = "获取他人样例";
                    GetOthersSampleButton.addEventListener("click", () => {
                        location.href = "status.php?ByUserScript=1";
                    });
                    GetOthersSampleButton.style.marginBottom = GetOthersSampleButton.style.marginRight = "7px";
                    GetOthersSampleButton.style.marginRight = "7px";
                }
                if (UtilityEnabled("ImproveACRate")) {
                    let ImproveACRateButton = document.createElement("button");
                    document.querySelector("body > div.container > div > div.input-append").appendChild(ImproveACRateButton);
                    ImproveACRateButton.className = "btn btn-outline-secondary";
                    ImproveACRateButton.innerText = "提高AC率";
                    ImproveACRateButton.disabled = true;
                    let ACProblems = [];
                    await fetch("http://www.xmoj.tech/userinfo.php?user=" + document.getElementById("profile").innerText)
                        .then((Response) => {
                            return Response.text();
                        }).then((Response) => {
                            let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                            ImproveACRateButton.innerText += "(" + (parseInt(ParsedDocument.querySelector("#statics > tbody > tr:nth-child(4) > td:nth-child(2)").innerText) / parseInt(ParsedDocument.querySelector("#statics > tbody > tr:nth-child(3) > td:nth-child(2)").innerText) * 100).toFixed(2) + "%)";
                            let Temp = ParsedDocument.querySelector("#statics > tbody > tr:nth-child(2) > td:nth-child(3) > script").innerText.split("\n")[5].split(";");
                            for (let i = 0; i < Temp.length; i++) {
                                ACProblems.push(Number(Temp[i].substring(2, Temp[i].indexOf(","))));
                            }
                            ImproveACRateButton.disabled = false;
                        });
                    ImproveACRateButton.addEventListener("click", async () => {
                        ImproveACRateButton.disabled = true;
                        let SubmitTimes = 3;
                        let Count = 0;
                        let SubmitInterval = setInterval(async () => {
                            if (Count >= SubmitTimes) {
                                clearInterval(SubmitInterval);
                                location.reload();
                                return;
                            }
                            ImproveACRateButton.innerText = "正在提交 (" + (Count + 1) + "/" + SubmitTimes + ")";
                            let PID = ACProblems[Math.floor(Math.random() * ACProblems.length)];
                            let SID = 0;
                            await fetch("http://www.xmoj.tech/status.php?problem_id=" + PID + "&jresult=4")
                                .then((Result) => {
                                    return Result.text();
                                }).then((Result) => {
                                    let ParsedDocument = new DOMParser().parseFromString(Result, "text/html");
                                    SID = ParsedDocument.querySelector("#result-tab > tbody > tr:nth-child(1) > td:nth-child(2)").innerText;
                                });
                            let Code = "";
                            await fetch("http://www.xmoj.tech/getsource.php?id=" + SID)
                                .then((Response) => {
                                    return Response.text();
                                }).then((Response) => {
                                    Code = Response.substring(0, Response.indexOf("/**************************************************************")).trim();
                                });
                            await fetch("http://www.xmoj.tech/csrf.php")
                                .then((Response) => {
                                    return Response.text();
                                }).then((Response) => {
                                    CSRF = new DOMParser().parseFromString(Response, "text/html").querySelector("input[name=csrf]").value;
                                });
                            await fetch("http://www.xmoj.tech/submit.php", {
                                "headers": {
                                    "content-type": "application/x-www-form-urlencoded"
                                },
                                "referrer": "http://www.xmoj.tech/submitpage.php?id=2298",
                                "method": "POST",
                                "body": "id=" + PID + "&" +
                                    "language=1&" +
                                    "source=" + encodeURIComponent(Code) + "&" +
                                    "enable_O2=on"
                            });
                            Count++;
                        }, 1000);
                    });
                    ImproveACRateButton.style.marginBottom = ImproveACRateButton.style.marginRight = "7px";
                    ImproveACRateButton.style.marginRight = "7px";
                }
                if (UtilityEnabled("CompareSource")) {
                    let CompareButton = document.createElement("button");
                    document.querySelector("body > div.container > div > div.input-append").appendChild(CompareButton);
                    CompareButton.className = "btn btn-outline-secondary";
                    CompareButton.innerText = "比较提交记录";
                    CompareButton.addEventListener("click", () => {
                        location.href = "comparesource.php";
                    });
                    CompareButton.style.marginBottom = "7px";
                }

                if (UtilityEnabled("ResetType")) {
                    document.querySelector("#result-tab > thead > tr > th:nth-child(1)").remove();
                    document.querySelector("#result-tab > thead > tr > th:nth-child(2)").remove();
                    document.querySelector("#result-tab > thead > tr > th:nth-child(9)").remove();
                    document.querySelector("#result-tab > thead > tr > th:nth-child(9)").remove();
                }
                let Temp = document.querySelector("#result-tab > tbody").childNodes;
                for (let i = 1; i < Temp.length; i += 2) {
                    if (UtilityEnabled("ResetType")) {
                        Temp[i].childNodes[0].remove();
                        Temp[i].childNodes[0].innerHTML = "<a href=\"showsource.php?id=" + Temp[i].childNodes[0].innerText + "\">" + Temp[i].childNodes[0].innerText + "</a>";
                        Temp[i].childNodes[1].remove();
                        Temp[i].childNodes[1].children[0].removeAttribute("class");
                        Temp[i].childNodes[3].childNodes[0].innerText = SizeToStringSize(Temp[i].childNodes[3].childNodes[0].innerText);
                        Temp[i].childNodes[4].childNodes[0].innerText = TimeToStringTime(Temp[i].childNodes[4].childNodes[0].innerText);
                        Temp[i].childNodes[5].innerText = Temp[i].childNodes[5].childNodes[0].innerText;
                        Temp[i].childNodes[6].innerText = SizeToStringSize(Temp[i].childNodes[6].innerText.substring(0, Temp[i].childNodes[6].innerText.length - 1));
                        Temp[i].childNodes[8].remove();
                        Temp[i].childNodes[8].remove();
                    }
                    if (SearchParams.get("cid") == null) {
                        localStorage.setItem("UserScript-Solution-" + Temp[i].childNodes[0].innerText + "-Problem",
                            Temp[i].childNodes[1].innerText);
                    }
                    else {
                        localStorage.setItem("UserScript-Solution-" + Temp[i].childNodes[0].innerText + "-Contest",
                            SearchParams.get("cid"));
                        localStorage.setItem("UserScript-Solution-" + Temp[i].childNodes[0].innerText + "-PID-Contest",
                            Temp[i].childNodes[1].innerText.charAt(0));
                    }
                }

                if (UtilityEnabled("ResetType")) {
                    document.querySelector("#result-tab > thead > tr > th:nth-child(1)").style.width = "10%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(2)").style.width = "10%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(3)").style.width = "20%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(4)").style.width = "10%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(5)").style.width = "10%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(6)").style.width = "10%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(7)").style.width = "10%";
                    document.querySelector("#result-tab > thead > tr > th:nth-child(8)").style.width = "20%";
                }

                if (UtilityEnabled("RefreshSolution")) {
                    let Rows = document.getElementById("result-tab").rows;
                    let Points = Array();
                    for (let i = Rows.length - 1; i > 0; i--) {
                        Rows[i].cells[2].className = "td_result";
                        let SolutionID = Rows[i].cells[0].innerText;
                        if (Rows[i].cells[2].children.length == 2) {
                            Points[SolutionID] = Rows[i].cells[2].children[1].innerText;
                            Rows[i].cells[2].children[1].remove();
                        }
                        Rows[i].cells[2].innerHTML += "<img style=\"margin-left: 10px\" height=\"18\" width=\"18\" src=\"image/loader.gif\">";
                        setTimeout(() => {
                            RefreshResult(SolutionID);
                        }, 0);
                    }

                    let RefreshResult = async (SolutionID) => {
                        let CurrentRow = null;
                        let Rows = document.getElementById("result-tab").rows;
                        for (let i = 1; i < Rows.length; i++) {
                            if (Rows[i].cells[0].innerText == SolutionID) {
                                CurrentRow = Rows[i];
                                break;
                            }
                        }
                        await fetch("status-ajax.php?solution_id=" + SolutionID)
                            .then((Response) => {
                                return Response.text();
                            })
                            .then((Response) => {
                                let ResponseData = Response.split(",");
                                CurrentRow.cells[3].innerHTML = "<div id=\"center\" class=\"red\">" + SizeToStringSize(ResponseData[1]) + "</div>";
                                CurrentRow.cells[4].innerHTML = "<div id=\"center\" class=\"red\">" + TimeToStringTime(ResponseData[2]) + "</div>";
                                let TempHTML = "<a href=\"" + (ResponseData[0] == 11 ? "ce" : "re") + "info.php?sid=" + SolutionID + "\" class=\"" + judge_color[ResponseData[0]] + "\">";
                                TempHTML += judge_result[ResponseData[0]];
                                TempHTML += "</a>";
                                if (Points[SolutionID] != undefined) {
                                    TempHTML += "<span style=\"margin-left: 5px\" class=\"badge text-bg-info\">" + Points[SolutionID] + "</span>";
                                }
                                if (ResponseData[0] < 4) {
                                    setTimeout(() => {
                                        RefreshResult(SolutionID)
                                    }, 500);
                                    TempHTML += "<img style=\"margin-left: 5px\" height=\"18\" width=\"18\" src=\"image/loader.gif\">";
                                }
                                CurrentRow.cells[2].innerHTML = TempHTML;
                            });
                    };
                }
            }
            else if (UtilityEnabled("GetOthersSample")) {
                document.querySelector("body > div > div.mt-3").innerHTML = `<div class="mt-3">
            <div class="row g-3 align-items-center mb-2">
            <div class="col-auto">
                <label for="NameInput" class="col-form-label">测试点获取人姓名的拼音</label>
            </div>
            <div class="col-auto">
                <input type="text" id="NameInput" class="form-control" value="${document.getElementById("profile").innerText}">
            </div>
            </div>
            <div class="row g-3 align-items-center mb-2">
            <div class="col-auto">
                <label for="DateInput" class="col-form-label">测试点获取的日期</label>
            </div>
            <div class="col-auto">
                <input type="date" id="DateInput" class="form-control" value="${new Date().toISOString().slice(0, 10)}">
            </div>
            </div>
            <div class="row g-3 align-items-center mb-2">
            <div class="col-auto">
                <label for="ProblemInput" class="col-form-label">获取测试点的题目ID</label>
            </div>
            <div class="col-auto">
                <input type="number" id="ProblemInput" class="form-control">
            </div>
            </div>
            <div class="row g-3 align-items-center mb-2">
            <div class="col-auto">
                <label for="SID" class="col-form-label">获取测试点的提交ID</label>
            </div>
            <div class="col-auto">
                <input type="number" id="SID" class="form-control">
            </div>
            </div>
            <div class="row g-3 align-items-center mb-2">
            <div class="col-auto">
                <label for="SampleInput" class="col-form-label">获取的测试点编号</label>
            </div>
            <div class="col-auto">
                <input type="number" id="SampleInput" class="form-control">
            </div>
            </div>
            <button type="submit" class="btn btn-primary mb-3" id="GetSample">获取</button>
            <div role="alert" id="GetSampleAlert" style="display: none"></div>
        </div>`;
                GetSample.addEventListener("click", async () => {
                    document.getElementById("GetSampleAlert").style.display = "none";
                    let Name = document.getElementById("NameInput").value;
                    let DateInput = document.getElementById("DateInput").value.replaceAll("-", "");
                    let ProblemID = document.getElementById("ProblemInput").value;
                    let SID = document.getElementById("SID").value;
                    let Sample = document.getElementById("SampleInput").value;
                    if (Name == "" || DateInput == "" || SID == "" || Sample == "") {
                        document.getElementById("GetSampleAlert").classList = "alert alert-danger";
                        document.getElementById("GetSampleAlert").innerText = "请填写完整信息";
                        document.getElementById("GetSampleAlert").style.display = "block";
                        return;
                    }
                    if (DateInput < new Date().toISOString().slice(0, 10).replaceAll("-", "") - 7) {
                        document.getElementById("GetSampleAlert").classList = "alert alert-danger";
                        document.getElementById("GetSampleAlert").innerText = "只能获取7天内的测试点";
                        document.getElementById("GetSampleAlert").style.display = "block";
                        return;
                    }
                    await fetch("http://www.xmoj.tech/userinfo.php?user=" + Name)
                        .then((Response) => {
                            return Response.text();
                        }).then(async (Response) => {
                            if (Response.indexOf("No such User") != -1) {
                                document.getElementById("GetSampleAlert").classList = "alert alert-danger";
                                document.getElementById("GetSampleAlert").innerText = "用户不存在";
                                document.getElementById("GetSampleAlert").style.display = "block";
                                return;
                            }
                            await fetch("http://www.xmoj.tech/data_down/" + DateInput + "/" + Name + "_" + SID + "_" +
                                (localStorage.getItem("UserScript-Problem-" + ProblemID + "-IOFilename") == null ?
                                    "" :
                                    localStorage.getItem("UserScript-Problem-" + ProblemID + "-IOFilename"))
                                + Sample + ".zip")
                                .then((Response) => {
                                    if (Response.status == 404) {
                                        document.getElementById("GetSampleAlert").classList = "alert alert-danger";
                                        document.getElementById("GetSampleAlert").innerText = "无此测试点";
                                        document.getElementById("GetSampleAlert").style.display = "block";
                                        return;
                                    }
                                    return Response.blob();
                                })
                                .then((Response) => {
                                    if (Response == undefined) {
                                        return;
                                    }
                                    document.getElementById("GetSampleAlert").classList = "alert alert-success";
                                    document.getElementById("GetSampleAlert").innerText = "获取成功";
                                    document.getElementById("GetSampleAlert").style.display = "block";
                                    let a = document.createElement("a");
                                    a.href = window.URL.createObjectURL(Response);
                                    a.download = Name + "_" + SID + "_" + Sample + ".zip";
                                    a.click();
                                });
                        });
                });
            }
        } else if (location.pathname == "/contest.php") {
            if (UtilityEnabled("AutoCountdown")) {
                clock = () => { }
            }
            if (location.href.indexOf("?cid=") == -1) {
                if (UtilityEnabled("ResetType")) {
                    document.querySelector("body > div > div.mt-3 > center").innerHTML =
                        String(document.querySelector("body > div > div.mt-3 > center").innerHTML).replaceAll("ServerTime:", "服务器时间：");
                    document.querySelector("body > div > div.mt-3 > center > table").style.marginTop = "10px";

                    document.querySelector("body > div > div.mt-3 > center > form").outerHTML = `<div class="row">
                        <div class="col-md-4"></div>
                        <form method="post" action="contest.php" class="col-md-4">
                            <div class="input-group">
                                <input name="keyword" type="text" class="form-control" spellcheck="false" data-ms-editor="true">
                                <input type="submit" value="搜索" class="btn btn-outline-secondary">
                            </div>
                        </form>
                    </div>`;
                }
                if (UtilityEnabled("Translate")) {
                    document.querySelector("body > div > div.mt-3 > center > table > thead > tr").childNodes[0].innerText = "编号";
                    document.querySelector("body > div > div.mt-3 > center > table > thead > tr").childNodes[1].innerText = "标题";
                    document.querySelector("body > div > div.mt-3 > center > table > thead > tr").childNodes[2].innerText = "状态";
                    document.querySelector("body > div > div.mt-3 > center > table > thead > tr").childNodes[3].remove();
                    document.querySelector("body > div > div.mt-3 > center > table > thead > tr").childNodes[3].innerText = "创建者";
                }
                let Temp = document.querySelector("body > div > div.mt-3 > center > table > tbody").childNodes;
                for (let i = 1; i < Temp.length; i++) {
                    let CurrentElement = Temp[i].childNodes[2].childNodes;
                    if (CurrentElement[1].childNodes[0].data.indexOf("运行中") != -1) {
                        let Time = String(CurrentElement[1].childNodes[1].innerText).substring(4);
                        let Day = parseInt(Time.substring(0, Time.indexOf("天"))) || 0;
                        let Hour = parseInt(Time.substring((Time.indexOf("天") == -1 ? 0 : Time.indexOf("天") + 1), Time.indexOf("小时"))) || 0;
                        let Minute = parseInt(Time.substring((Time.indexOf("小时") == -1 ? 0 : Time.indexOf("小时") + 2), Time.indexOf("分"))) || 0;
                        let Second = parseInt(Time.substring((Time.indexOf("分") == -1 ? 0 : Time.indexOf("分") + 1), Time.indexOf("秒"))) || 0;
                        let TimeStamp = new Date().getTime() + diff + ((((isNaN(Day) ? 0 : Day) * 24 + Hour) * 60 + Minute) * 60 + Second) * 1000;
                        CurrentElement[1].childNodes[1].setAttribute("EndTime", TimeStamp);
                        CurrentElement[1].childNodes[1].classList.add("UpdateByJS");
                    } else if (CurrentElement[1].childNodes[0].data.indexOf("开始于") != -1) {
                        let TimeStamp = Date.parse(String(CurrentElement[1].childNodes[0].data).substring(4)) + diff;
                        CurrentElement[1].setAttribute("EndTime", TimeStamp);
                        CurrentElement[1].classList.add("UpdateByJS");
                    } else if (CurrentElement[1].childNodes[0].data.indexOf("已结束") != -1) {
                        let TimeStamp = String(CurrentElement[1].childNodes[0].data).substring(4);
                        CurrentElement[1].childNodes[0].data = " 已结束 ";
                        CurrentElement[1].className = "red";
                        let Temp = document.createElement("span");
                        CurrentElement[1].appendChild(Temp);
                        Temp.className = "green";
                        Temp.innerHTML = TimeStamp;
                    }
                    Temp[i].childNodes[3].style.display = "none";
                    Temp[i].childNodes[4].innerHTML = "<a href=\"userinfo.php?user=" + Temp[i].childNodes[4].innerHTML + "\">" + Temp[i].childNodes[4].innerHTML + "</a>";
                    localStorage.setItem("UserScript-Contest-" + Temp[i].childNodes[0].innerText + "-Name", Temp[i].childNodes[1].innerText);
                }
            } else {
                document.getElementsByTagName("h3")[0].innerHTML =
                    "比赛" + document.getElementsByTagName("h3")[0].innerHTML.substring(7);
                if (document.querySelector("#time_left") != null) {
                    let EndTime = document.querySelector("body > div > div.mt-3 > center").childNodes[3].data;
                    EndTime = EndTime.substring(EndTime.indexOf("结束时间是：") + 6, EndTime.lastIndexOf("。"));
                    EndTime = new Date(EndTime).getTime();
                    if (new Date().getTime() < EndTime) {
                        document.querySelector("#time_left").classList.add("UpdateByJS");
                        document.querySelector("#time_left").setAttribute("EndTime", EndTime);
                    }
                }
                let HTMLData = document.querySelector("body > div > div.mt-3 > center > div").innerHTML;
                HTMLData = HTMLData.replaceAll("&nbsp;&nbsp;\n&nbsp;&nbsp;", "&nbsp;")
                HTMLData = HTMLData.replaceAll("<br>开始于: ", "开始时间：")
                HTMLData = HTMLData.replaceAll("\n结束于: ", "<br>结束时间：")
                HTMLData = HTMLData.replaceAll("\n订正截止日期: ", "<br>订正截止日期：")
                HTMLData = HTMLData.replaceAll("\n现在时间: ", "当前时间：")
                HTMLData = HTMLData.replaceAll("\n状态:", "<br>状态：")
                document.querySelector("body > div > div.mt-3 > center > div").innerHTML = HTMLData;
                if (UtilityEnabled("RemoveAlerts") && document.querySelector("body > div > div.mt-3 > center").innerHTML.indexOf("尚未开始比赛") != -1) {
                    document.querySelector("body > div > div.mt-3 > center > a").setAttribute("href",
                        "start_contest.php?cid=" + SearchParams.get("cid"));
                }
                else if (UtilityEnabled("AutoRefresh")) {
                    addEventListener("focus", async () => {
                        await fetch(location.href)
                            .then((Response) => {
                                return Response.text();
                            })
                            .then((Response) => {
                                let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                                let Temp = ParsedDocument.querySelector("#problemset > tbody").children;
                                if (UtilityEnabled("ReplaceYN")) {
                                    for (let i = 0; i < Temp.length; i++) {
                                        let Status = Temp[i].children[0].innerText;
                                        if (Status.indexOf("Y") != -1) {
                                            document.querySelector("#problemset > tbody").children[i].children[0].children[0].className = "status status_y";
                                            document.querySelector("#problemset > tbody").children[i].children[0].children[0].innerText = "✓";
                                        }
                                        else if (Status.indexOf("N") != -1) {
                                            document.querySelector("#problemset > tbody").children[i].children[0].children[0].className = "status status_n";
                                            document.querySelector("#problemset > tbody").children[i].children[0].children[0].innerText = "✗";
                                        }
                                    }
                                }
                            });
                    });
                    document.querySelector("body > div > div.mt-3 > center > br:nth-child(2)").remove();
                    document.querySelector("body > div > div.mt-3 > center > br:nth-child(2)").remove();
                    document.querySelector("body > div > div.mt-3 > center > div > .red").innerHTML =
                        String(document.querySelector("body > div > div.mt-3 > center > div > .red").innerHTML).replaceAll("<br>", "<br><br>");
                    let StaticButton = document.createElement("button");
                    document.querySelectorAll("body > div > div.mt-3 > center > div > .red")[1].appendChild(StaticButton);
                    StaticButton.className = "btn btn-outline-secondary";
                    StaticButton.innerText = "统计";
                    StaticButton.addEventListener("click", () => {
                        location.href = "/conteststatistics.php?cid=" + SearchParams.get("cid");
                    });

                    document.querySelector("#problemset > tbody").innerHTML =
                        String(document.querySelector("#problemset > tbody").innerHTML).replaceAll(
                            /\t&nbsp;([0-9]*) &nbsp;&nbsp;&nbsp;&nbsp; 问题 &nbsp;([^<]*)/g,
                            "$2. $1");

                    document.querySelector("#problemset > tbody").innerHTML =
                        String(document.querySelector("#problemset > tbody").innerHTML).replaceAll(
                            /\t\*([0-9]*) &nbsp;&nbsp;&nbsp;&nbsp; 问题 &nbsp;([^<]*)/g,
                            "拓展$2. $1");

                    if (UtilityEnabled("MoreSTD") && document.querySelector("#problemset > thead > tr").innerHTML.indexOf("标程") != -1) {
                        let Temp = document.querySelector("#problemset > thead > tr").children;
                        for (let i = 0; i < Temp.length; i++) {
                            if (Temp[i].innerText == "标程") {
                                Temp[i].remove();
                                let Temp2 = document.querySelector("#problemset > tbody").children;
                                for (let j = 0; j < Temp2.length; j++) {
                                    if (Temp2[j].children[i] != undefined) {
                                        Temp2[j].children[i].remove();
                                    }
                                }
                            }
                        }
                        document.querySelector("#problemset > thead > tr").innerHTML += "<td width=\"5%\">标程</td>";
                        Temp = document.querySelector("#problemset > tbody").children;
                        for (let i = 0; i < Temp.length; i++) {
                            Temp[i].innerHTML += "<td><a href=\"problem_std.php?cid=" + SearchParams.get("cid") + "&pid=" + i + "\" target=\"_blank\">打开</a></td>";
                        }
                    }

                    Temp = document.querySelector("#problemset > tbody").rows;
                    for (let i = 0; i < Temp.length; i++) {
                        if (Temp[i].childNodes[0].children.length == 0) {
                            Temp[i].childNodes[0].innerHTML = "<div class=\"status\"></div>";
                        }
                        let PID = Temp[i].childNodes[1].innerHTML;
                        if (PID.substring(0, 2) == "拓展") {
                            PID = PID.substring(2);
                        }
                        Temp[i].children[2].children[0].target = "_blank";
                        localStorage.setItem("UserScript-Contest-" + SearchParams.get("cid") + "-Problem-" + i + "-PID",
                            PID.substring(3));
                        localStorage.setItem("UserScript-Problem-" + PID.substring(3) + "-Name",
                            Temp[i].childNodes[2].innerText);
                    }

                    if (UtilityEnabled("OpenAllProblem")) {
                        let OpenAllDiv = document.createElement("div");
                        OpenAllDiv.style.marginTop = "20px";
                        OpenAllDiv.style.textAlign = "left";
                        document.querySelector("body > div > div.mt-3 > center").insertBefore(OpenAllDiv, document.querySelector("#problemset"));
                        let OpenAllButton = document.createElement("button");
                        OpenAllButton.className = "btn btn-outline-secondary";
                        OpenAllButton.innerText = "打开全部题目";
                        OpenAllButton.style.marginRight = "5px";
                        OpenAllDiv.appendChild(OpenAllButton);
                        OpenAllButton.addEventListener("click", () => {
                            let Rows = document.querySelector("#problemset > tbody").rows;
                            for (let i = 0; i < Rows.length; i++) {
                                open(Rows[i].children[2].children[0].href, "_blank");
                            }
                        });
                        let OpenUnsolvedButton = document.createElement("button");
                        OpenUnsolvedButton.className = "btn btn-outline-secondary";
                        OpenUnsolvedButton.innerText = "打开未解决题目";
                        OpenAllDiv.appendChild(OpenUnsolvedButton);
                        OpenUnsolvedButton.addEventListener("click", () => {
                            let Rows = document.querySelector("#problemset > tbody").rows;
                            for (let i = 0; i < Rows.length; i++) {
                                if (!Rows[i].children[0].children[0].classList.contains("status_y")) {
                                    open(Rows[i].children[2].children[0].href, "_blank");
                                }
                            }
                        });
                    }

                    if (UtilityEnabled("ResetType")) {
                        document.querySelector("#problemset > thead > tr > th:nth-child(1)").style.width = "5%";
                    }
                    localStorage.setItem("UserScript-Contest-" + SearchParams.get("cid") + "-ProblemCount",
                        document.querySelector("#problemset > tbody").rows.length);
                }
            }
        } else if (location.pathname == "/contestrank-oi.php") {
            if (document.querySelector("#rank") == null) {
                document.querySelector("body > div > div.mt-3").innerHTML = "<center><h3>比赛排名</h3><a></a><table id=\"rank\"></table>";
            }
            if (new URL(location.href).searchParams.get("ByUserScript") == null) {
                if (document.querySelector("body > div > div.mt-3 > center > h3").innerText == "比赛排名") {
                    document.querySelector("#rank").innerText = "比赛暂时还没有排名";
                }
                else {
                    document.querySelector("body > div > div.mt-3 > center > h3").innerText =
                        document.querySelector("body > div > div.mt-3 > center > h3").innerText.substring(
                            document.querySelector("body > div > div.mt-3 > center > h3").innerText.indexOf(" -- ") + 4)
                        + "（OI排名）";
                    document.querySelector("#rank > thead > tr > :nth-child(1)").innerText = "排名";
                    document.querySelector("#rank > thead > tr > :nth-child(2)").innerText = "用户";
                    document.querySelector("#rank > thead > tr > :nth-child(3)").innerText = "昵称";
                    document.querySelector("#rank > thead > tr > :nth-child(4)").innerText = "AC数";
                    document.querySelector("#rank > thead > tr > :nth-child(5)").innerText = "得分";
                    let RefreshOIRank = async () => {
                        await fetch(location.href)
                            .then((Response) => {
                                return Response.text()
                            })
                            .then((Response) => {
                                let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                                TidyTable(ParsedDocument.getElementById("rank"));
                                let Temp = ParsedDocument.getElementById("rank").rows;
                                for (var i = 1; i < Temp.length; i++) {
                                    let MetalCell = Temp[i].cells[0];
                                    let Metal = document.createElement("span");
                                    Metal.innerText = MetalCell.innerText;
                                    Metal.className = "badge text-bg-primary";
                                    MetalCell.innerText = "";
                                    MetalCell.appendChild(Metal);
                                    Temp[i].cells[1].children[0].className = "link-primary link-offset-2 link-underline-opacity-50";
                                    Temp[i].cells[1].children[0].target = "_blank";
                                    Temp[i].cells[2].innerHTML = Temp[i].cells[2].innerText;
                                    Temp[i].cells[3].innerHTML = Temp[i].cells[3].innerText;
                                }
                                document.querySelector("#rank > tbody").innerHTML = ParsedDocument.querySelector("#rank > tbody").innerHTML;
                            });
                    };
                    RefreshOIRank();
                    if (UtilityEnabled("AutoRefresh")) {
                        addEventListener("focus", RefreshOIRank);
                    }
                }
            }
            else if (UtilityEnabled("ACMRank")) {
                if (document.querySelector("body > div > div.mt-3 > center > h3").innerText != "比赛排名") {
                    document.querySelector("body > div > div.mt-3 > center > h3").innerText =
                        document.querySelector("body > div > div.mt-3 > center > h3").innerText.substring(
                            document.querySelector("body > div > div.mt-3 > center > h3").innerText.indexOf(" -- ") + 4)
                        + "（ACM排名）";
                }
                let RankData = [];
                let RefreshACMRank = async (ProblemCount) => {
                    let LastPositionX = scrollX;
                    let LastPositionY = scrollY;
                    let NewURL = new URL(location.href);
                    NewURL.pathname = "/contestrank2.php";
                    await fetch(NewURL.toString())
                        .then((Response) => {
                            return Response.text()
                        })
                        .then((Response) => {
                            RankData = [];

                            let Table = document.querySelector("#rank"); Table.innerHTML = "";
                            let StartPosition = Response.indexOf("var solutions=") + 14;
                            let EndPosition = Response.indexOf("}];", StartPosition) + 2;
                            if (EndPosition == 1) {
                                Table.innerHTML = "暂时还没有人提交呢";
                            }
                            else {
                                let SubmitRecord = JSON.parse(Response.substring(StartPosition, EndPosition));

                                for (let i = 0; i < SubmitRecord.length; i++) {
                                    let CurrentSubmission = SubmitRecord[i];
                                    let CurrentRow = RankData.find((CurrentRow) => {
                                        if (CurrentRow.Username == CurrentSubmission.user_id) {
                                            return true;
                                        }
                                    });
                                    if (CurrentRow == null) {
                                        CurrentRow = {
                                            Username: CurrentSubmission.user_id,
                                            Nickname: CurrentSubmission.nick,
                                            Solved: 0,
                                            Penalty: 0,
                                            Problem: []
                                        };
                                        RankData.push(CurrentRow);
                                    }
                                    let CurrentProblem = CurrentRow.Problem.find((CurrentRow) => {
                                        if (CurrentRow.Index == CurrentSubmission.num) {
                                            return true;
                                        }
                                    });
                                    if (CurrentProblem == null) {
                                        CurrentProblem = {
                                            Index: CurrentSubmission.num,
                                            Attempts: [],
                                            SolveTime: 0
                                        };
                                        CurrentRow.Problem.push(CurrentProblem);
                                    }
                                    if (CurrentSubmission.result == 4 && CurrentProblem.SolveTime == 0) {
                                        CurrentProblem.SolveTime = parseInt(CurrentSubmission.in_date);
                                        CurrentRow.Solved++;
                                        CurrentRow.Penalty += parseInt(CurrentSubmission.in_date) + CurrentProblem.Attempts.length * 20 * 60;
                                    }
                                    CurrentProblem.Attempts.push({
                                        Time: CurrentSubmission.in_date,
                                        Result: CurrentSubmission.result
                                    });
                                }


                                RankData.sort((a, b) => {
                                    if (a.Solved != b.Solved) {
                                        return a.Solved < b.Solved ? 1 : -1;
                                    } else if (a.Penalty != b.Penalty) {
                                        return a.Penalty > b.Penalty ? 1 : -1;
                                    }
                                    return 0;
                                });

                                let Header = document.createElement("thead"); Table.appendChild(Header);
                                let RowHeader = document.createElement("tr"); Header.appendChild(RowHeader);
                                let MetalHeader = document.createElement("th"); RowHeader.appendChild(MetalHeader); MetalHeader.innerText = "排名"; MetalHeader.style.width = "5%";
                                let UsernameHeader = document.createElement("th"); RowHeader.appendChild(UsernameHeader); UsernameHeader.innerText = "用户"; UsernameHeader.style.width = "10%";
                                let NicknameHeader = document.createElement("th"); RowHeader.appendChild(NicknameHeader); NicknameHeader.innerText = "昵称"; NicknameHeader.style.width = "10%";
                                let NameHeader = document.createElement("th"); RowHeader.appendChild(NameHeader); NameHeader.innerText = "姓名"; NameHeader.style.width = "5%";
                                let SolvedHeader = document.createElement("th"); RowHeader.appendChild(SolvedHeader); SolvedHeader.innerText = "AC数"; SolvedHeader.style.width = "5%";
                                let PenaltyHeader = document.createElement("th"); RowHeader.appendChild(PenaltyHeader); PenaltyHeader.innerText = "罚时"; PenaltyHeader.style.width = "10%";

                                for (let i = 0; i < ProblemCount; i++) {
                                    let ProblemHeader = document.createElement("th"); RowHeader.appendChild(ProblemHeader);
                                    let ProblemLink = document.createElement("a"); ProblemHeader.appendChild(ProblemLink);
                                    ProblemLink.href = "problem.php?cid=" + SearchParams.get("cid") + "&pid=" + i; ProblemLink.innerText = String.fromCharCode(65 + i);
                                    ProblemHeader.classList.add("header"); ProblemHeader.style.width = (50 / ProblemCount) + "%";
                                }

                                let Body = document.createElement("tbody"); Table.appendChild(Body);
                                Body.className = "table-group-divider";
                                for (let i = 0; i < RankData.length; i++) {
                                    let RowData = RankData[i];
                                    let Row = document.createElement("tr"); Body.appendChild(Row);
                                    let MetalCell = document.createElement("td"); Row.appendChild(MetalCell);
                                    let UsernameCell = document.createElement("td"); Row.appendChild(UsernameCell);
                                    let NicknameCell = document.createElement("td"); Row.appendChild(NicknameCell);
                                    let NameCell = document.createElement("td"); Row.appendChild(NameCell);
                                    let SolvedCell = document.createElement("td"); Row.appendChild(SolvedCell);
                                    let PenaltyCell = document.createElement("td"); Row.appendChild(PenaltyCell);

                                    let Medal = document.createElement("span"); MetalCell.appendChild(Medal);
                                    Medal.innerText = i + 1;
                                    Medal.classList.add("badge");
                                    if (i <= RankData.length * 0.05) {
                                        Medal.classList.add("text-bg-danger");
                                    }
                                    else if (i <= RankData.length * 0.15) {
                                        Medal.classList.add("text-bg-warning");
                                    }
                                    else if (i <= RankData.length * 0.4) {
                                        Medal.classList.add("text-bg-primary");
                                    }
                                    else {
                                        Medal.classList.add("text-bg-secondary");
                                    }

                                    let UsernameLink = document.createElement("a"); UsernameCell.appendChild(UsernameLink);
                                    UsernameLink.href = "userinfo.php?user=" + RowData.Username; UsernameLink.innerText = RowData.Username;
                                    UsernameLink.className = "link-primary link-offset-2 link-underline-opacity-50";
                                    if (RowData.Username == document.getElementById("profile").innerText) {
                                        Row.classList.add("table-primary");
                                    }


                                    NicknameCell.innerText = (RowData.Nickname.length < 16 ? RowData.Nickname : RowData.Nickname.substring(0, 15) + "...");

                                    let Names = {
                                        "huangkai": "黄开", "chenlangning": "陈朗宁", "chensiru": "陈斯如", "chentianle": "陈天乐", "chenxuanhe": "陈宣合", "chenzecong": "陈泽聪", "chenzerui": "陈泽睿", "danwenxiao": "单文骁", "dongminghui": "董明辉", "gaochenming": "高晨茗", "guoqingtong": "郭庆桐", "guoruiqun": "郭睿群", "guyuchen": "顾毓辰",
                                        "hanshujian": "韩书简", "heshuhan": "贺书瀚", "hexinyi": "何昕弈", "huangmingxuan": "黄铭宣", "huangruina": "黄睿纳", "huangwei": "黄唯", "huyiyang": "胡以杨", "jiangxingyu": "姜星宇", "jingtaiyu": "荆泰宇", "jinweizhe": "金炜喆", "leijiahan": "雷家涵",
                                        "lianzhongzhe": "连中哲", "liaoyanxu": "廖彦旭", "lingzixiang": "凌梓翔", "linziyi": "林子懿", "liujianhao": "刘健豪", "liujiankun": "刘健坤", "liuxianyong": "刘先勇", "liuxixian": "刘希贤", "liyihan": "李亦涵", "luojinyang": "罗金阳", "lutianfeng": "陆天枫",
                                        "meitianyi": "梅天一", "panyinliang": "潘胤良", "pengyixuan": "彭议萱", "putong": "蒲通", "qianqingyuan": "钱清源", "qidekai": "戚得凯", "shanwenxiao": "单文骁", "shenxichen": "沈熙晨", "shihongxi": "施泓熙", "shimufan": "施慕梵", "shiyichen": "施奕辰",
                                        "shiyunhao": "施云浩", "shuxinmo": "舒馨墨", "suiruochen": "隋若宸", "sunyihan": "孙艺涵", "sunyimiao": "孙义淼", "tangchao": "唐潮", "tangyuhan": "唐钰涵", "tanhaoxuan": "谭皓轩", "taoxianyu": "陶羡榆", "wangkangming": "王康明", "wangminghao": "王明浩",
                                        "wangmingshuo": "王茗铄", "wangpengyu": "王芃雨", "wangsiyuan3": "王思源", "wangtianqi": "王天琦", "wangzetong": "王泽通", "wanxinlian": "万馨联", "wensiyi": "闻思奕", "wujinhong": "吴锦鸿", "wurunze": "吴润泽", "wuyukai": "巫昱恺", "xiangjicheng": "项际诚",
                                        "xiaoguanxun": "肖贯勋", "xiaojiasheng": "肖嘉盛", "xiaruicheng": "夏瑞成", "xiaweimin": "夏蔚民", "xiaxuran": "夏诩然", "xiebingxiu": "谢秉修", "xiebingxiu": "谢秉修", "xieliren": "谢立仁", "xinyihan": "辛轶涵", "xuconghan": "徐从瀚", "xukan": "徐衎",
                                        "xuweiyi": "徐维易", "yanghaochen": "杨皓宸", "yezijiong": "叶梓炅", "youzhouhang": "尤周杭", "yuanruiqing": "袁瑞擎", "yutingjun": "于庭郡", "zhangchenming": "张宸铭", "zhangqiuze": "张秋泽", "zhangshuxuan": "张澍萱", "zhangwenda": "张闻达", "zhangyifu": "张亦夫",
                                        "zhangyouheng": "张佑恒", "zhaochenshen": "赵晨神", "zhaochenwei": "赵晨伟", "zhengyinan": "郑逸楠", "zhonghongyi": "钟弘毅", "zhoujunyu": "周峻瑜", "zhouziyi": "周子逸", "zhouziyou": "周子游", "zhuchenrui2": "朱晨瑞", "zhuruichen": "朱睿宸", "zhuxule": "朱徐乐",
                                        "zhuyikun": "朱奕坤", "leiwenda": "雷文达", "wangyuancheng": "王源成", "zhuyiyang": "朱奕阳", "hanjialin": "韩佳霖"
                                    };
                                    NameCell.innerText = (Names[RowData.Username] == undefined ? "" : Names[RowData.Username]);

                                    SolvedCell.innerText = RowData.Solved;

                                    PenaltyCell.innerText = SecondsToString(RowData.Penalty);

                                    for (let j = 0; j < ProblemCount; j++) {
                                        let Problem = document.createElement("td"); Row.appendChild(Problem);
                                        let ProblemData = RowData.Problem.find((CurrentRow) => {
                                            if (CurrentRow.Index == j) {
                                                return true;
                                            }
                                        });
                                        if (ProblemData == undefined) {
                                            Problem.style.backgroundColor = "rgba(0, 0, 0, 0)";
                                        }
                                        else if (ProblemData.SolveTime != 0) {
                                            Problem.innerText = SecondsToString(ProblemData.SolveTime) + "(" + ProblemData.Attempts.length + ")";
                                            let Color = Math.max(1 / 10 * (10 - ProblemData.Attempts.length), 0.2);
                                            Problem.style.backgroundColor = "rgba(0, 255, 0, " + Color + ")";
                                        }
                                        else {
                                            Problem.innerText = "(" + ProblemData.Attempts.length + ")";
                                            let Color = Math.min(ProblemData.Attempts.length / 10 + 0.2, 1);
                                            Problem.style.backgroundColor = "rgba(255, 0, 0, " + Color + ")";
                                        }
                                        if (UtilityEnabled("DarkMode")) {
                                            Problem.style.color = "white";
                                        }
                                        else {
                                            Problem.style.color = "black";
                                        }
                                    }
                                }

                                TidyTable(Table);

                                scrollTo({
                                    left: LastPositionX,
                                    top: LastPositionY,
                                    behavior: "instant"
                                });
                            }
                        });
                }
                document.getElementById("rank").style.width = "100%";
                let DownloadButton = document.createElement("button");
                document.querySelector("body > div.container > div > center").insertBefore(DownloadButton, document.querySelector("body > div.container > div > center > a"));
                DownloadButton.className = "btn btn-outline-secondary";
                DownloadButton.innerText = "下载排名";
                DownloadButton.style.marginBottom = "20px";
                DownloadButton.addEventListener("click", () => {
                    location.href = "/contestrank.xls.php?cid=" + SearchParams.get("cid");
                });
                let ProblemCount = localStorage.getItem("UserScript-Contest-" + SearchParams.get("cid") + "-ProblemCount");
                RefreshACMRank(ProblemCount);
                if (UtilityEnabled("AutoRefresh")) {
                    addEventListener("focus", () => {
                        RefreshACMRank(ProblemCount);
                    });
                }
            }
            Style.innerHTML += "td {";
            Style.innerHTML += "   white-space: nowrap;";
            Style.innerHTML += "}";
            document.querySelector("body > div.container > div > center").style.paddingBottom = "10px";
            document.querySelector("body > div.container > div > center > a").style.display = "none";
        } else if (location.pathname == "/contestrank-correct.php") {
            if (document.querySelector("#rank") == null) {
                document.querySelector("body > div > div.mt-3").innerHTML = "<center><h3>比赛排名</h3><a></a><table id=\"rank\"></table>";
            }
            if (document.querySelector("body > div > div.mt-3 > center > h3").innerText == "比赛排名") {
                document.querySelector("#rank").innerText = "比赛暂时还没有排名";
            }
            else {
                if (UtilityEnabled("ResetType")) {
                    document.querySelector("body > div > div.mt-3 > center > h3").innerText =
                        document.querySelector("body > div > div.mt-3 > center > h3").innerText.substring(
                            document.querySelector("body > div > div.mt-3 > center > h3").innerText.indexOf(" -- ") + 4)
                        + "（订正排名）";
                    document.querySelector("body > div > div.mt-3 > center > a").remove();
                }
                document.querySelector("#rank > thead > tr > :nth-child(1)").innerText = "排名";
                document.querySelector("#rank > thead > tr > :nth-child(2)").innerText = "用户";
                document.querySelector("#rank > thead > tr > :nth-child(3)").innerText = "昵称";
                document.querySelector("#rank > thead > tr > :nth-child(4)").innerText = "AC数";
                document.querySelector("#rank > thead > tr > :nth-child(5)").innerText = "得分";
                let RefreshCorrectRank = async () => {
                    await fetch(location.href)
                        .then((Response) => {
                            return Response.text()
                        })
                        .then((Response) => {
                            let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                            TidyTable(ParsedDocument.getElementById("rank"));
                            let Temp = ParsedDocument.getElementById("rank").rows;
                            for (var i = 1; i < Temp.length; i++) {
                                let MetalCell = Temp[i].cells[0];
                                let Metal = document.createElement("span");
                                Metal.innerText = MetalCell.innerText;
                                Metal.className = "badge text-bg-primary";
                                MetalCell.innerText = "";
                                MetalCell.appendChild(Metal);
                                Temp[i].cells[1].children[0].className = "link-primary link-offset-2 link-underline-opacity-50";
                                Temp[i].cells[1].children[0].target = "_blank";
                                Temp[i].cells[2].innerHTML = Temp[i].cells[2].innerText;
                                Temp[i].cells[3].innerHTML = Temp[i].cells[3].innerText;
                            }
                            document.querySelector("#rank > tbody").innerHTML = ParsedDocument.querySelector("#rank > tbody").innerHTML;
                        });
                };
                RefreshCorrectRank();
                if (UtilityEnabled("AutoRefresh")) {
                    addEventListener("focus", RefreshCorrectRank);
                }
            }
        } else if (location.pathname == "/submitpage.php") {
            document.querySelector("body > div > div.mt-3").innerHTML = `<center class="mb-3">` +
                `<h3>提交代码</h3>` +
                (SearchParams.get("id") != null ?
                    `题目<span class="blue">${SearchParams.get("id")}</span>` :
                    `比赛<span class="blue">${SearchParams.get("cid") + `</span>&emsp;题目<span class="blue">` + String.fromCharCode(65 + parseInt(SearchParams.get("pid")))}</span>`) +
                `</center>
    <textarea id="CodeInput"></textarea>
    <center class="mt-3">
        <input id="enable_O2" name="enable_O2" type="checkbox"><label for="enable_O2">打开O2开关</label>
        <br>
        <input id="Submit" class="btn btn-info mt-2" type="button" value="提交">
        <div id="ErrorElement" class="mt-2" style="display: none; text-align: left; padding: 10px;">
            <div id="ErrorMessage" style="white-space: pre; background-color: rgba(0, 0, 0, 0.1); padding: 10px; border-radius: 5px;"></div>
            <button id="PassCheck" class="btn btn-outline-secondary mt-2" style="display: none">强制提交</button>
        </div>
    </center>`;
            if (UtilityEnabled("AutoO2")) {
                document.querySelector("#enable_O2").checked = true;
            }
            let CodeMirrorElement;
            (() => {
                CodeMirrorElement = CodeMirror.fromTextArea(document.querySelector("#CodeInput"), {
                    lineNumbers: true,
                    matchBrackets: true,
                    mode: "text/x-c++src",
                    indentUnit: 4,
                    indentWithTabs: true,
                    enterMode: "keep",
                    tabMode: "shift",
                    theme: (UtilityEnabled("DarkMode") ? "darcula" : "default"),
                    extraKeys: {
                        "Ctrl-Space": "autocomplete",
                        "Ctrl-Enter": function (instance) {
                            Submit.click();
                        }
                    }
                })
            })();
            CodeMirrorElement.setSize("100%", "auto");
            CodeMirrorElement.getWrapperElement().style.border = "1px solid #ddd";
            PassCheck.addEventListener("click", async () => {
                document.querySelector("#Submit").disabled = true;
                document.querySelector("#Submit").value = "正在提交...";
                await fetch("http://www.xmoj.tech/submit.php", {
                    "headers": {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    "referrer": location.href,
                    "method": "POST",
                    "body":
                        (SearchParams.get("id") != null ?
                            "id=" + SearchParams.get("id") :
                            "cid=" + SearchParams.get("cid") + "&pid=" + SearchParams.get("pid")) +
                        "&language=1&" +
                        "source=" + encodeURIComponent(CodeMirrorElement.getValue()) + "&" +
                        "enable_O2=on"
                }).then((Response) => {
                    if (Response.redirected) {
                        location.href = Response.url;
                    }
                    else {
                        ErrorElement.style.display = "block";
                        ErrorMessage.style.color = "red";
                        ErrorMessage.innerText = "提交失败！请关闭脚本后重试！";
                        Submit.disabled = false;
                        Submit.value = "提交";
                    }
                })
            });

            Submit.addEventListener("click", async () => {
                PassCheck.style.display = "none";
                ErrorElement.style.display = "none";
                document.querySelector("#Submit").disabled = true;
                document.querySelector("#Submit").value = "正在检查...";
                let Source = CodeMirrorElement.getValue();
                let PID = 0;
                let IOFilename = "";
                if (SearchParams.get("cid") != null && SearchParams.get("pid") != null) {
                    PID = localStorage.getItem("UserScript-Contest-" + SearchParams.get("cid") + "-Problem-" + SearchParams.get("pid") + "-PID")
                }
                else {
                    PID = SearchParams.get("id");
                }
                IOFilename = localStorage.getItem("UserScript-Problem-" + PID + "-IOFilename");
                if (UtilityEnabled("IOFile") && IOFilename != null) {
                    if (Source.indexOf(IOFilename) == -1) {
                        PassCheck.style.display = "";
                        ErrorElement.style.display = "block";
                        ErrorMessage.style.color = "red";
                        ErrorMessage.innerText = "此题输入输出文件名为" + IOFilename + "，请检查是否填错";
                        document.querySelector("#Submit").disabled = false;
                        document.querySelector("#Submit").value = "提交";
                        return false;
                    }
                    else if (RegExp("//.*freopen").test(Source)) {
                        PassCheck.style.display = "";
                        ErrorElement.style.display = "block";
                        ErrorMessage.style.color = "red";
                        ErrorMessage.innerText = "请不要注释freopen语句";
                        document.querySelector("#Submit").disabled = false;
                        document.querySelector("#Submit").value = "提交";
                        return false;
                    }
                }
                if (Source == "") {
                    PassCheck.style.display = "";
                    ErrorElement.style.display = "block";
                    ErrorMessage.style.color = "red";
                    ErrorMessage.innerText = "源代码为空";
                    document.querySelector("#Submit").disabled = false;
                    document.querySelector("#Submit").value = "提交";
                    return false;
                }
                if (UtilityEnabled("CompileError")) {
                    for (let i = 0; i < 5; i++) {
                        let TimeoutController = new AbortController();
                        setTimeout(() => {
                            TimeoutController.abort();
                        }, 2000);
                        await fetch("https://gcc.godbolt.org/api/compiler/g131/compile", {
                            "headers": {
                                "accept": "application/json"
                            },
                            "body": Source,
                            "method": "POST",
                            "signal": TimeoutController.signal
                        })
                            .then((Response) => {
                                return Response.json()
                            })
                            .then((Response) => {
                                let Transferer = new AnsiUp();
                                let CompileError = "";
                                for (let i = 0; i < Response.stderr.length; i++) {
                                    CompileError += Transferer.ansi_to_html(Response.stderr[i].text) + "<br>";
                                }
                                if (CompileError != "") {
                                    PassCheck.style.display = "";
                                    ErrorElement.style.display = "block";
                                    ErrorMessage.style.color = "";
                                    ErrorMessage.innerHTML = "编译错误：<br>" + CompileError;
                                    document.querySelector("#Submit").disabled = false;
                                    document.querySelector("#Submit").value = "提交";
                                    return false;
                                }
                                ErrorElement.style.display = "none";
                            }).catch((Error) => {
                                ErrorElement.style.display = "block";
                                ErrorMessage.style.color = "red";
                                if (i != 4) {
                                    ErrorMessage.innerText = "预编译超时，正在重试(" + (i + 1) + "/5)";
                                } else {
                                    PassCheck.style.display = "";
                                    ErrorMessage.innerText = "预编译超时，请重试或者点击下方按钮强制提交";
                                    document.querySelector("#Submit").disabled = false;
                                    document.querySelector("#Submit").value = "提交";
                                }
                                return false;
                            });
                        if (ErrorElement.style.display == "none") {
                            PassCheck.click();
                            break;
                        }
                    }
                }
                else {
                    PassCheck.click();
                }
            });
        } else if (location.pathname == "/modifypage.php") {
            if (new URL(location.href).searchParams.get("ByUserScript") != null) {
                document.querySelector("body > div > div.mt-3").innerHTML = "";
                await fetch("https://langningchen.github.io/XMOJ-Script/Update.json", { cache: "no-cache" })
                    .then((Response) => {
                        return Response.json();
                    })
                    .then((Response) => {
                        for (let i = Object.keys(Response.UpdateHistory).length - 1; i >= 0; i--) {
                            let Version = Object.keys(Response.UpdateHistory)[i];
                            let Data = Response.UpdateHistory[Version];
                            let UpdateDataCard = document.createElement("div"); document.querySelector("body > div > div.mt-3").appendChild(UpdateDataCard);
                            UpdateDataCard.className = "card mb-3";
                            let UpdateDataCardBody = document.createElement("div"); UpdateDataCard.appendChild(UpdateDataCardBody);
                            UpdateDataCardBody.className = "card-body";
                            let UpdateDataCardTitle = document.createElement("h5"); UpdateDataCardBody.appendChild(UpdateDataCardTitle);
                            UpdateDataCardTitle.className = "card-title";
                            UpdateDataCardTitle.innerText = Version;
                            let UpdateDataCardSubtitle = document.createElement("h6"); UpdateDataCardBody.appendChild(UpdateDataCardSubtitle);
                            UpdateDataCardSubtitle.className = "card-subtitle mb-2 text-muted";
                            UpdateDataCardSubtitle.innerText = new Date(Data.UpdateDate).toLocaleString();
                            let UpdateDataCardText = document.createElement("p"); UpdateDataCardBody.appendChild(UpdateDataCardText);
                            UpdateDataCardText.className = "card-text";
                            let UpdateDataCardList = document.createElement("ul"); UpdateDataCardText.appendChild(UpdateDataCardList);
                            UpdateDataCardList.className = "list-group list-group-flush";
                            for (let j = 0; j < Data.UpdateCommits.length; j++) {
                                let UpdateDataCardListItem = document.createElement("li"); UpdateDataCardList.appendChild(UpdateDataCardListItem);
                                UpdateDataCardListItem.className = "list-group-item";
                                UpdateDataCardListItem.innerHTML =
                                    "(<a href=\"https://github.com/langningchen/XMOJ-Script/commit/" + Data.UpdateCommits[j].Commit + "\" target=\"_blank\">"
                                    + Data.UpdateCommits[j].ShortCommit + "</a>) " +
                                    Data.UpdateCommits[j].Description;
                            }
                            let UpdateDataCardLink = document.createElement("a"); UpdateDataCardBody.appendChild(UpdateDataCardLink);
                            UpdateDataCardLink.className = "card-link";
                            UpdateDataCardLink.href = "https://github.com/langningchen/XMOJ-Script/releases/tag/" + Version;
                            UpdateDataCardLink.target = "_blank";
                            UpdateDataCardLink.innerText = "查看该版本";
                        }
                    });
            }
            else {
                if (UtilityEnabled("ResetType")) {
                    document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(1) > td").innerText = "修改账号";
                    for (let i = 3; i <= 12; i++) {
                        document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(" + i + ") > td:nth-child(2) > input").classList.add("form-control");
                        document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(" + i + ") > td:nth-child(2) > input").style.marginBottom = "5px";
                    }
                    document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(2) > td:nth-child(1)").innerText = "用户ID";
                    let Temp = document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(13) > td:nth-child(2) > input:nth-child(1)");
                    Temp.classList.add("form-control");
                    Temp.style.width = "40%";
                    Temp.style.display = "inline-block";
                    Temp.value = "修改";
                    Temp = document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(13) > td:nth-child(2) > input:nth-child(2)");
                    Temp.classList.add("form-control");
                    Temp.style.width = "40%";
                    Temp.style.display = "inline-block";
                    Temp.value = "重置";
                    document.querySelector("body > div.container > div > form > center > table > tbody > tr:nth-child(13) > td:nth-child(2)").childNodes[1].remove();
                    document.querySelector("body > div.container > div > form > a").remove();
                }
                if (UtilityEnabled("ExportACCode")) {
                    let ExportACCode = document.createElement("button");
                    document.querySelector("body > div.container > div").appendChild(ExportACCode);
                    ExportACCode.innerText = "导出AC代码";
                    ExportACCode.className = "btn btn-outline-secondary";
                    ExportACCode.addEventListener("click", () => {
                        ExportACCode.disabled = true;
                        let ExportProgressBar = document.getElementsByTagName("progress")[0] || document.createElement("progress");
                        ExportProgressBar.removeAttribute("value");
                        ExportProgressBar.removeAttribute("max");
                        document.querySelector("body > div.container > div").appendChild(ExportProgressBar);
                        ExportACCode.innerText = "正在导出...";
                        let Request = new XMLHttpRequest();
                        Request.addEventListener("readystatechange", () => {
                            if (Request.readyState == 4) {
                                if (Request.status == 200) {
                                    let Response = Request.responseText;
                                    let ACCode = Response.split("------------------------------------------------------\r\n");
                                    ExportProgressBar.max = ACCode.length - 1;
                                    let DownloadCode = (i) => {
                                        if (i >= ACCode.length) {
                                            ExportACCode.innerText = "AC代码导出成功";
                                            ExportACCode.disabled = false;
                                            ExportProgressBar.remove();
                                            setTimeout(() => {
                                                ExportACCode.innerText = "导出AC代码";
                                            }, 1000);
                                            return;
                                        }
                                        let CurrentCode = ACCode[i];
                                        if (CurrentCode != "") {
                                            let CurrentQuestionID = CurrentCode.substring(7, 11);
                                            CurrentCode = CurrentCode.substring(14);
                                            ExportProgressBar.value = i + 1;
                                            let DownloadLink = document.createElement("a");
                                            DownloadLink.href = window.URL.createObjectURL(new Blob([CurrentCode]));
                                            DownloadLink.download = CurrentQuestionID + ".cpp";
                                            DownloadLink.click();
                                        }
                                        setTimeout(() => {
                                            DownloadCode(i + 1);
                                        }, 50);
                                    };
                                    DownloadCode(0);
                                } else {
                                    ExportACCode.disabled = false;
                                    ExportACCode.innerText = "AC代码导出失败";
                                    setTimeout(() => {
                                        ExportACCode.innerText = "导出AC代码";
                                    }, 1000);
                                }
                            }
                        });
                        Request.open("GET", "http://www.xmoj.tech/export_ac_code.php", true);
                        Request.send();
                    });
                }
            }
        } else if (location.pathname == "/userinfo.php") {
            if (UtilityEnabled("RemoveUseless")) {
                let Temp = document.getElementById("submission").childNodes;
                for (let i = 0; i < Temp.length; i++) {
                    Temp[i].remove();
                }
            }
            eval(document.querySelector("body > script:nth-child(5)").innerHTML);
            document.querySelector("#statics > tbody > tr:nth-child(1) > td:nth-child(3)").innerText = "AC题目列表";

            let Temp = document.querySelector("#statics > tbody").children;
            for (let i = 0; i < Temp.length; i++) {
                if (Temp[i].children[0] != undefined) {
                    if (Temp[i].children[0].innerText == "Statistics") {
                        Temp[i].children[0].innerText = "统计";
                    }
                    else if (Temp[i].children[0].innerText == "Email:") {
                        Temp[i].children[0].innerText = "电子邮箱";
                    }
                    else {
                        Temp[i].children[1].innerText = Temp[i].children[1].innerText;
                    }
                }
            }
            let UserID, UserName;
            [UserID, UserName] = document.querySelector("#statics > caption").childNodes[0].data.trim().split("--");
            document.querySelector("#statics > caption").remove();
            document.querySelector("#statics > tbody > tr:nth-child(1) > td:nth-child(1)").innerHTML = "用户名：" + UserID;
            document.querySelector("#statics > tbody > tr:nth-child(1) > td:nth-child(2)").innerHTML = "昵称：" + UserName;
        } else if (location.pathname == "/conteststatistics.php") {
            document.querySelector("body > div > div.mt-3 > center > h3").innerText = "比赛统计";
            if (UtilityEnabled("ResetType")) {
                let Temp = document.getElementById("submission").childNodes;
                for (let i = 0; i < Temp.length; i++) {
                    Temp[i].remove();
                }
                eval(document.querySelector("body > div.container > div > center > table:nth-child(4) > script:nth-child(6)").innerHTML);
                document.querySelector("#cs > thead > tr > th:nth-child(1)").innerText = "题目编号";
                document.querySelector("#cs > thead > tr > th:nth-child(10)").remove();
                document.querySelector("#cs > thead > tr > th:nth-child(11)").innerText = "总和";
                document.querySelector("#cs > thead > tr > th:nth-child(12)").remove();
                document.querySelector("#cs > thead > tr > th:nth-child(12)").remove();
                document.querySelector("#cs > thead > tr > th:nth-child(12)").remove();
                document.querySelector("#cs > tbody > tr:last-child > td").innerText = "总和";
                TidyTable(document.getElementById("cs"));
                Temp = document.querySelector("#cs > tbody").children;
                for (let i = 0; i < Temp.length; i++) {
                    let CurrentRowChildren = Temp[i].children;
                    CurrentRowChildren[9].remove();
                    CurrentRowChildren[11].remove();
                    CurrentRowChildren[11].remove();
                    CurrentRowChildren[11].remove();
                    for (let j = 0; j < CurrentRowChildren.length; j++) {
                        if (CurrentRowChildren[j].innerText == "") {
                            CurrentRowChildren[j].innerText = "0";
                        }
                    }
                }
            }
        } else if (location.pathname == "/comparesource.php") {
            if (UtilityEnabled("CompareSource")) {
                if (location.search == "") {
                    document.querySelector("body > div.container > div").innerHTML = "";
                    let LeftCodeText = document.createElement("span");
                    document.querySelector("body > div.container > div").appendChild(LeftCodeText);
                    LeftCodeText.innerText = "左侧代码的运行编号：";
                    let LeftCode = document.createElement("input");
                    document.querySelector("body > div.container > div").appendChild(LeftCode);
                    LeftCode.classList.add("form-control");
                    LeftCode.style.width = "40%";
                    LeftCode.style.marginBottom = "5px";
                    let RightCodeText = document.createElement("span");
                    document.querySelector("body > div.container > div").appendChild(RightCodeText);
                    RightCodeText.innerText = "右侧代码的运行编号：";
                    let RightCode = document.createElement("input");
                    document.querySelector("body > div.container > div").appendChild(RightCode);
                    RightCode.classList.add("form-control");
                    RightCode.style.width = "40%";
                    RightCode.style.marginBottom = "5px";
                    let CompareButton = document.createElement("button");
                    document.querySelector("body > div.container > div").appendChild(CompareButton);
                    CompareButton.innerText = "比较";
                    CompareButton.className = "btn btn-primary";
                    CompareButton.addEventListener("click", () => {
                        location.href = "/comparesource.php?left=" + LeftCode.value + "&right=" + RightCode.value;
                    });
                }
                else {
                    document.querySelector("body > div > div.mt-3").innerHTML = `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" checked id="IgnoreWhitespaces">
                            <label class="form-check-label" for="IgnoreWhitespaces">忽略空白</label>
                        </div>
                        <div id="CompareElement"></div>`;

                    let LeftCode = "";
                    await fetch("/getsource.php?id=" + SearchParams.get("left"))
                        .then((Response) => {
                            return Response.text();
                        }).then((Response) => {
                            LeftCode = Response.substring(0, Response.indexOf("/**************************************************************")).trim();
                        });
                    let RightCode = "";
                    await fetch("/getsource.php?id=" + SearchParams.get("right"))
                        .then((Response) => {
                            return Response.text();
                        }).then((Response) => {
                            RightCode = Response.substring(0, Response.indexOf("/**************************************************************")).trim();
                        });

                    let MergeViewElement = CodeMirror.MergeView(CompareElement, {
                        value: LeftCode,
                        origLeft: null,
                        orig: RightCode,
                        lineNumbers: true,
                        mode: "text/x-c++src",
                        collapseIdentical: "true",
                        readOnly: true,
                        theme: (UtilityEnabled("DarkMode") ? "darcula" : "default"),
                        revertButtons: false,
                        ignoreWhitespace: true
                    });

                    IgnoreWhitespaces.addEventListener("change", () => {
                        MergeViewElement.ignoreWhitespace = ignorews.checked;
                    });
                }
            }
        } else if (location.pathname == "/loginpage.php") {
            if (UtilityEnabled("NewBootstrap")) {
                document.querySelector("#login").innerHTML = `<form id="login" action="login.php" method="post">
            <div class="row g-3 align-items-center mb-3">
                <div class="col-auto">
                <label for="user_id" class="col-form-label">用户名（学号）</label>
                </div>
                <div class="col-auto">
                <input type="text" id="user_id" name="user_id" class="form-control">
                </div>
            </div>
            <div class="row g-3 align-items-center mb-3">
                <div class="col-auto">
                <label for="password" class="col-form-label">密码</label>
                </div>
                <div class="col-auto">
                <input type="password" id="password" name="password" class="form-control">
                </div>
            </div>
            <div class="row g-3 align-items-center mb-3">
                <div class="col-auto">
                <button name="submit" type="button" class="btn btn-primary">登录</button>
                </div>
                <div class="col-auto">
                <a class="btn btn-warning" href="lostpassword.php">忘记密码</a>
                </div>
            </div>
            </form>`;
            }
            let ErrorText = document.createElement("div");
            ErrorText.style.color = "red";
            ErrorText.style.marginBottom = "5px";
            document.querySelector("#login").appendChild(ErrorText);
            let LoginButton = document.getElementsByName("submit")[0];
            LoginButton.addEventListener("click", async () => {
                let Username = document.getElementsByName("user_id")[0].value;
                let Password = document.getElementsByName("password")[0].value;
                if (Username == "" ||
                    Password == "") {
                    ErrorText.innerText = "用户名或密码不能为空";
                } else {
                    await fetch("http://www.xmoj.tech/login.php", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: "user_id=" + encodeURIComponent(Username) +
                            "&password=" + hex_md5(Password)
                    })
                        .then((Response) => {
                            return Response.text();
                        })
                        .then((Response) => {
                            if (UtilityEnabled("LoginFailed")) {
                                if (Response.indexOf("history.go(-2);") != -1) {
                                    if (UtilityEnabled("SavePassword")) {
                                        localStorage.setItem("UserScript-Username", Username);
                                        localStorage.setItem("UserScript-Password", Password);
                                    }
                                    let NewPage = localStorage.getItem("UserScript-LastPage");
                                    if (NewPage == null) {
                                        NewPage = "/index.php";
                                    }
                                    location.href = NewPage;
                                } else {
                                    if (UtilityEnabled("SavePassword")) {
                                        localStorage.removeItem("UserScript-Username");
                                        localStorage.removeItem("UserScript-Password");
                                    }
                                    Response = Response.substring(Response.indexOf("alert('") + 7);
                                    Response = Response.substring(0, Response.indexOf("');"));
                                    if (Response == "UserName or Password Wrong!") {
                                        ErrorText.innerText = "用户名或密码错误！";
                                    }
                                    else {
                                        ErrorText.innerText = Response;
                                    }
                                }
                            }
                            else {
                                document.innerHTML = Response;
                            }
                        });
                }
            });
            if (UtilityEnabled("SavePassword") &&
                localStorage.getItem("UserScript-Username") != null &&
                localStorage.getItem("UserScript-Password") != null) {
                document.querySelector("#login > div:nth-child(1) > div > input").value = localStorage.getItem("UserScript-Username");
                document.querySelector("#login > div:nth-child(2) > div > input").value = localStorage.getItem("UserScript-Password");
                LoginButton.click();
            }
        } else if (location.pathname == "/contest_video.php") {
            if (UtilityEnabled("DownloadPlayback")) {
                let ScriptData = document.querySelector("body > div > div.mt-3 > center > script").innerHTML;
                if (document.getElementById("J_prismPlayer0").innerHTML != "") {
                    document.getElementById("J_prismPlayer0").innerHTML = "";
                    eval(ScriptData);
                }
                ScriptData = ScriptData.substring(ScriptData.indexOf("{"));
                ScriptData = ScriptData.substring(0, ScriptData.indexOf("}") + 1);
                ScriptData = ScriptData.replace(/([a-zA-Z0-9]+) ?:/g, "\"$1\":");
                ScriptData = ScriptData.replace(/'/g, "\"");
                let VideoData = JSON.parse(ScriptData);
                let RandomUUID = () => {
                    let t = "0123456789abcdef";
                    let e = [];
                    for (let r = 0; r < 36; r++)
                        e[r] = t.substr(Math.floor(16 * Math.random()), 1);
                    e[14] = "4";
                    e[19] = t.substr(3 & e[19] | 8, 1);
                    e[8] = e[13] = e[18] = e[23] = "-";
                    return e.join("");
                };
                let URLParams = new URLSearchParams({
                    "AccessKeyId": VideoData.accessKeyId,
                    "Action": "GetPlayInfo",
                    "VideoId": VideoData.vid,
                    "Formats": "",
                    "AuthTimeout": 7200,
                    "Rand": RandomUUID(),
                    "SecurityToken": VideoData.securityToken,
                    "StreamType": "video",
                    "Format": "JSON",
                    "Version": "2017-03-21",
                    "SignatureMethod": "HMAC-SHA1",
                    "SignatureVersion": "1.0",
                    "SignatureNonce": RandomUUID(),
                    "PlayerVersion": "2.9.3",
                    "Channel": "HTML5"
                });
                URLParams.sort();
                await fetch("https://vod." + VideoData.region + ".aliyuncs.com/?" +
                    URLParams.toString() +
                    "&Signature=" +
                    encodeURIComponent(CryptoJS.HmacSHA1("GET&%2F&" + encodeURIComponent(URLParams.toString()),
                        VideoData.accessKeySecret + "&").toString(CryptoJS.enc.Base64)))
                    .then((Response) => {
                        return Response.json();
                    })
                    .then((Response) => {
                        let DownloadButton = document.createElement("a");
                        DownloadButton.className = "btn btn-outline-secondary";
                        DownloadButton.innerText = "下载";
                        DownloadButton.href = Response.PlayInfoList.PlayInfo[0].PlayURL;
                        DownloadButton.download = Response.VideoBase.Title;
                        document.querySelector("body > div > div.mt-3 > center").appendChild(DownloadButton);
                    });
            }
        } else if (location.pathname == "/reinfo.php") {
            if (document.querySelector("#results > div") == undefined) {
                document.querySelector("#results").parentElement.innerHTML = "没有测试点信息";
            }
            else {
                for (let i = 0; i < document.querySelector("#results > div").children.length; i++) {
                    let CurrentElement = document.querySelector("#results > div").children[i].children[0].children[0].children[0];
                    let Temp = CurrentElement.innerText.substring(0, CurrentElement.innerText.length - 2).split("/");
                    CurrentElement.innerText = TimeToStringTime(Temp[0]) + "/" + SizeToStringSize(Temp[1]);
                    CurrentElement = CurrentElement.parentNode.parentNode;
                    let CopyButton = document.createElement("div"); CurrentElement.appendChild(CopyButton);
                    CopyButton.style.display = "none";
                    CopyButton.style.position = "absolute";
                    CopyButton.style.fontSize = "12px";
                    CopyButton.style.margin = "6px";
                    CopyButton.innerText = "点此复制获取数据的语句";
                    CurrentElement.addEventListener("mouseover", () => {
                        let Temp = CurrentElement.children;
                        for (let j = 0; j < Temp.length; j++) {
                            Temp[j].style.display = "none";
                        }
                        Temp[Temp.length - 1].style.display = "";
                    });
                    CurrentElement.addEventListener("mouseout", () => {
                        let Temp = CurrentElement.children;
                        for (let j = 0; j < Temp.length; j++) {
                            Temp[j].style.display = "";
                        }
                        Temp[Temp.length - 1].style.display = "none";
                    });
                    CurrentElement.addEventListener("click", () => {
                        let SolutionID = SearchParams.get("sid");
                        let ContestID = localStorage.getItem("UserScript-Solution-" + SolutionID + "-Contest");
                        if (ContestID == null) {
                            let ProblemID = localStorage.getItem("UserScript-Solution-" + SolutionID + "-Problem");
                            let ProblemName = localStorage.getItem("UserScript-Problem-" + ProblemID + "-Name");
                            let CaseID = CurrentElement.children[1].innerText.substring(1);
                            GM_setClipboard("高老师，能发给我" +
                                ProblemID + "题：" + ProblemName + "，" +
                                "提交编号" + SolutionID + "，" +
                                "#" + CaseID + "测试点" +
                                "的数据吗？谢谢");
                        }
                        else {
                            let ContestName = localStorage.getItem("UserScript-Contest-" + ContestID + "-Name");
                            let ContestProblemID = localStorage.getItem("UserScript-Solution-" + SolutionID + "-PID-Contest");
                            let ProblemID = localStorage.getItem("UserScript-Contest-" + ContestID + "-Problem-" + (ContestProblemID.charCodeAt(0) - 65) + "-PID");
                            let ProblemName = localStorage.getItem("UserScript-Problem-" + ProblemID + "-Name");
                            let CaseID = CurrentElement.children[1].innerText.substring(1);
                            GM_setClipboard("高老师，能发给我" +
                                "比赛" + ContestID + "：" +
                                ContestName + "，" +
                                ContestProblemID + "题(" + ProblemID + ")：" + ProblemName + "，" +
                                "提交编号" + SolutionID + "，" +
                                "#" + CaseID + "测试点" +
                                "的数据吗？谢谢");
                        }
                        CopyButton.innerText = "已复制";
                        setTimeout(() => {
                            CopyButton.innerText = "点此复制获取数据的语句";
                        }, 1000);
                    });
                    CurrentElement.onmouseout();
                }
            }
        } else if (location.pathname == "/downloads.php") {
            let SoftwareList = document.querySelector("body > div > ul");
            SoftwareList.remove();
            SoftwareList = document.createElement("ul");
            SoftwareList.className = "software_list";
            let Container = document.createElement("div"); document.querySelector("body > div").appendChild(Container);
            Container.className = "mt-3";
            Container.appendChild(SoftwareList);
            if (UtilityEnabled("NewDownload")) {
                let Softwares = [{
                    "Name": "Bloodshed Dev-C++",
                    "Image": "https://a.fsdn.com/allura/p/dev-cpp/icon",
                    "URL": "https://sourceforge.net/projects/dev-cpp/"
                }, {
                    "Name": "Orwell Dev-C++",
                    "Image": "https://a.fsdn.com/allura/p/orwelldevcpp/icon",
                    "URL": "https://sourceforge.net/projects/orwelldevcpp/"
                }, {
                    "Name": "Embarcadero Dev-C++",
                    "Image": "https://a.fsdn.com/allura/s/embarcadero-dev-cpp/icon",
                    "URL": "https://sourceforge.net/software/product/Embarcadero-Dev-Cpp/"
                }, {
                    "Name": "RedPanda C++",
                    "Image": "https://a.fsdn.com/allura/p/redpanda-cpp/icon",
                    "URL": "https://sourceforge.net/projects/redpanda-cpp/"
                }, {
                    "Name": "Code::Blocks",
                    "Image": "https://a.fsdn.com/allura/p/codeblocks/icon",
                    "URL": "https://sourceforge.net/projects/codeblocks/"
                }, {
                    "Name": "Visual Studio Code",
                    "Image": "https://code.visualstudio.com/favicon.ico",
                    "URL": "https://code.visualstudio.com/Download"
                }, {
                    "Name": "Lazarus",
                    "Image": "https://a.fsdn.com/allura/p/lazarus/icon",
                    "URL": "https://sourceforge.net/projects/lazarus/"
                }, {
                    "Name": "Geany",
                    "Image": "https://www.geany.org/static/img/geany.svg",
                    "URL": "https://www.geany.org/download/releases/"
                }, {
                    "Name": "NOI Linux",
                    "Image": "https://www.noi.cn/upload/resources/image/2021/07/16/163780.jpg",
                    "URL": "https://www.noi.cn/gynoi/jsgz/2021-07-16/732450.shtml"
                }, {
                    "Name": "Virtual box",
                    "Image": "https://www.virtualbox.org/graphics/vbox_logo2_gradient.png",
                    "URL": "https://www.virtualbox.org/wiki/Downloads"
                }, {
                    "Name": "MinGW",
                    "Image": "https://www.mingw-w64.org/logo.svg",
                    "URL": "https://sourceforge.net/projects/mingw/"
                }];
                for (let i = 0; i < Softwares.length; i++) {
                    SoftwareList.innerHTML +=
                        "<li class=\"software_item\">" +
                        "<a href=\"" + Softwares[i].URL + "\">" +
                        "<div class=\"item-info\">" +
                        "<div class=\"item-img\">" +
                        "<img height=\"50\" src=\"" + Softwares[i].Image + "\" alt=\"点击下载\">" +
                        "</div>" +
                        "<div class=\"item-txt\">" + Softwares[i].Name + "</div>" +
                        "</div>" +
                        "</a>" +
                        "</li>";
                }
            }
        } else if (location.pathname == "/problemstatus.php") {
            document.querySelector("body > div > div.mt-3 > center").insertBefore(document.querySelector("#statics"), document.querySelector("body > div > div.mt-3 > center > table"));
            document.querySelector("body > div > div.mt-3 > center").insertBefore(document.querySelector("#problemstatus"), document.querySelector("body > div > div.mt-3 > center > table"));

            document.querySelector("body > div > div.mt-3 > center > table:nth-child(3)").remove();
            let Temp = document.querySelector("#statics").rows;
            for (let i = 0; i < Temp.length; i++) {
                Temp[i].removeAttribute("class");
                if (Temp[i].children.length == 2) {
                    Temp[i].children[1].innerHTML = Temp[i].children[1].innerText;
                }
            }

            document.querySelector("#problemstatus > thead > tr").innerHTML =
                document.querySelector("#problemstatus > thead > tr").innerHTML.replaceAll("td", "th");
            document.querySelector("#problemstatus > thead > tr > th:nth-child(2)").innerText = "运行编号";
            document.querySelector("#problemstatus > thead > tr > th:nth-child(4)").remove();
            document.querySelector("#problemstatus > thead > tr > th:nth-child(4)").remove();
            document.querySelector("#problemstatus > thead > tr > th:nth-child(4)").remove();
            document.querySelector("#problemstatus > thead > tr > th:nth-child(4)").remove();
            Temp = document.querySelector("#problemstatus > thead > tr").children;
            for (let i = 0; i < Temp.length; i++) {
                Temp[i].removeAttribute("class");
            }
            Temp = document.querySelector("#problemstatus > tbody").children;
            for (let i = 0; i < Temp.length; i++) {
                if (Temp[i].children[5].children[0] != null) {
                    Temp[i].children[1].innerHTML = `<a href="${Temp[i].children[5].children[0].href + `">` + Temp[i].children[1].innerText}</a>`;
                }
                Temp[i].children[3].remove();
                Temp[i].children[3].remove();
                Temp[i].children[3].remove();
                Temp[i].children[3].remove();
            }


            let CurrentPage = parseInt(SearchParams.get("page") || 1);
            let PID = SearchParams.get("id");
            let Pagination = `<nav class="center"><ul class="pagination justify-content-center">`;
            if (CurrentPage != 1) {
                Pagination += `<li class="page-item"><a href="problemstatus.php?id=${PID + `&page=1" class="page-link">&laquo;</a></li><li class="page-item"><a href="problemstatus.php?id=` + PID + `&page=` + (CurrentPage - 1) + `" class="page-link">` + (CurrentPage - 1)}</a></li>`;
            }
            Pagination += `<li class="active page-item"><a href="problemstatus.php?id=${PID + `&page=` + CurrentPage + `" class="page-link">` + CurrentPage}</a></li>`;
            if (document.querySelector("#problemstatus > tbody").children != null && document.querySelector("#problemstatus > tbody").children.length == 20) {
                Pagination += `<li class="page-item"><a href="problemstatus.php?id=${PID + `&page=` + (CurrentPage + 1) + `" class="page-link">` + (CurrentPage + 1) + `</a></li><li class="page-item"><a href="problemstatus.php?id=` + PID + `&page=` + (CurrentPage + 1)}" class="page-link">&raquo;</a></li>`;
            }
            Pagination += `</ul></nav>`;
            document.querySelector("body > div > div.mt-3 > center").innerHTML += Pagination;
        } else if (location.pathname == "/problem_solution.php") {
            if (UtilityEnabled("CopyMD")) {
                await fetch(location.href).then((Response) => {
                    return Response.text();
                }).then((Response) => {
                    let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                    let CopyMDButton = document.createElement("button");
                    CopyMDButton.className = "btn btn-sm btn-outline-secondary copy-btn";
                    CopyMDButton.innerText = "复制";
                    CopyMDButton.style.marginLeft = "10px";
                    CopyMDButton.type = "button";
                    document.querySelector("body > div > div.mt-3 > center > h2").appendChild(CopyMDButton);
                    CopyMDButton.addEventListener("click", () => {
                        GM_setClipboard(ParsedDocument.querySelector("body > div > div > div").innerText.trim().replaceAll("\n\t", "\n").replaceAll("\n\n", "\n").replaceAll("\n\n", "\n"));
                        CopyMDButton.innerText = "复制成功";
                        setTimeout(() => {
                            CopyMDButton.innerText = "复制";
                        }, 1000);
                    });
                });
            }
            let Temp = document.getElementsByClassName("prettyprint");
            for (let i = 0; i < Temp.length; i++) {
                let Code = Temp[i].innerText;
                Temp[i].outerHTML = `<textarea class="prettyprint">${Code}</textarea>`;
            }
            for (let i = 0; i < Temp.length; i++) {
                CodeMirror.fromTextArea(Temp[i], {
                    lineNumbers: true,
                    mode: "text/x-c++src",
                    readOnly: true,
                    theme: (UtilityEnabled("DarkMode") ? "darcula" : "default")
                }).setSize("100%", "auto");
            }
        } else if (location.pathname == "/open_contest.php") {
            let Temp = document.querySelector("body > div > div.mt-3 > div > div.col-md-8").children;
            let NewsData = [];
            for (let i = 0; i < Temp.length; i += 2) {
                let Title = Temp[i].children[0].innerText;
                let Time = 0;
                if (Temp[i].children[1] != null) {
                    Time = Temp[i].children[1].innerText;
                }
                let Body = Temp[i + 1].innerHTML;
                NewsData.push({ "Title": Title, "Time": Time, "Body": Body });
            }
            document.querySelector("body > div > div.mt-3 > div > div.col-md-8").innerHTML = "";
            for (let i = 0; i < NewsData.length; i++) {
                let NewsRow = document.createElement("div");
                NewsRow.className = "cnt-row";
                let NewsRowHead = document.createElement("div");
                NewsRowHead.className = "cnt-row-head title";
                NewsRowHead.innerHTML = NewsData[i].Title;
                if (NewsData[i].Time != 0) {
                    NewsRowHead.innerHTML += "<small class=\"ms-3\">" + NewsData[i].Time + "</small>";
                }
                NewsRow.appendChild(NewsRowHead);
                let NewsRowBody = document.createElement("div");
                NewsRowBody.className = "cnt-row-body";
                NewsRowBody.innerHTML = NewsData[i].Body;
                NewsRow.appendChild(NewsRowBody);
                document.querySelector("body > div > div.mt-3 > div > div.col-md-8").appendChild(NewsRow);
            }
            let MyContestData = document.querySelector("body > div > div.mt-3 > div > div.col-md-4 > div:nth-child(2)").innerHTML;
            let CountDownData = document.querySelector("#countdown_list").innerHTML;
            document.querySelector("body > div > div.mt-3 > div > div.col-md-4").innerHTML = `<div class="cnt-row">
                        <div class="cnt-row-head title">我的月赛</div>
                        <div class="cnt-row-body">${MyContestData}</div>
                    </div>
                    <div class="cnt-row">
                        <div class="cnt-row-head title">倒计时</div>
                        <div class="cnt-row-body">${CountDownData}</div>
                    </div>`;
        } else if (location.pathname == "/showsource.php") {
            let Code = "";
            await fetch("http://www.xmoj.tech/getsource.php?id=" + SearchParams.get("id"))
                .then((Response) => {
                    return Response.text();
                }).then((Response) => {
                    Code = Response.substring(0, Response.indexOf("/**************************************************************")).trim();
                });
            document.querySelector("body > div > div.mt-3").innerHTML = `<textarea>${Code}</textarea>`;
            CodeMirror.fromTextArea(document.querySelector("body > div > div.mt-3 > textarea"), {
                lineNumbers: true,
                mode: "text/x-c++src",
                readOnly: true,
                theme: (UtilityEnabled("DarkMode") ? "darcula" : "default")
            }).setSize("100%", "auto");
        } else if (location.pathname == "/problem_std.php") {
            await fetch("http://www.xmoj.tech/problem_std.php?cid=" + SearchParams.get("cid") + "&pid=" + SearchParams.get("pid"))
                .then((Response) => {
                    return Response.text();
                }).then((Response) => {
                    let ParsedDocument = new DOMParser().parseFromString(Response, "text/html");
                    let Temp = ParsedDocument.getElementsByTagName("pre");
                    document.querySelector("body > div > div.mt-3").innerHTML = "";
                    for (let i = 0; i < Temp.length; i++) {
                        let CodeElement = document.createElement("div");
                        CodeElement.className = "mb-3";
                        document.querySelector("body > div > div.mt-3").appendChild(CodeElement);
                        CodeMirror(CodeElement, {
                            value: Temp[i].innerText,
                            lineNumbers: true,
                            mode: "text/x-c++src",
                            readOnly: true,
                            theme: (UtilityEnabled("DarkMode") ? "darcula" : "default")
                        }).setSize("100%", "auto");
                    }
                });
        } else if (location.pathname == "/mail.php") {
            if (SearchParams.get("other") == null) {
                document.querySelector("body > div > div.mt-3").innerHTML = `<div class="row g-2 align-items-center">
                        <div class="col-auto form-floating">
                            <input class="form-control" id="Username" placeholder=" " spellcheck="false" data-ms-editor="true">
                            <label for="Username">搜索新用户</label>
                        </div>
                        <div class="col-auto form-floating">
                            <button class="btn btn-outline-secondary" id="AddUser">
                                添加
                                <div class="spinner-border spinner-border-sm" role="status" style="display: none;">
                            </button>
                        </div>
                    </div>
                    <table class="table mb-3" id="ReceiveTable">
                        <thead>
                            <tr>
                                <td class="col-2">接收者</td>
                                <td class="col-1">未读消息</td>
                                <td class="col-6">最新消息</td>
                                <td class="col-3">最后联系时间</td>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <div class="alert alert-danger mb-3" role="alert" id="ErrorElement" style="display: none;"></div>`;
                let RefreshMessageList = (Silent = true) => {
                    if (!Silent) {
                        ReceiveTable.children[1].innerHTML = "";
                        for (let i = 0; i < 10; i++) {
                            let Row = document.createElement("tr"); ReceiveTable.children[1].appendChild(Row);
                            for (let j = 0; j < 4; j++) {
                                let Cell = document.createElement("td"); Row.appendChild(Cell);
                                Cell.innerHTML = `<span class="placeholder col-${Math.ceil(Math.random() * 12)}"></span>`;
                            }
                        }
                    }
                    RequestAPI("Mail", "GetMailList", {}, (ResponseData) => {
                        if (ResponseData.Success) {
                            let Data = ResponseData.Data.MailList;
                            ReceiveTable.children[1].innerHTML = "";
                            for (let i = 0; i < Data.length; i++) {
                                let Row = document.createElement("tr"); ReceiveTable.children[1].appendChild(Row);
                                Row.innerHTML = `<td><a href="mail.php?other=${Data[i].OtherUser + `">` + Data[i].OtherUser}</a></td>
                                    <td>${Data[i].UnreadCount}</td>
                                    <td>${Data[i].LastsMessage}</td>
                                    <td>${Data[i].SendTime}</td>`;
                            }
                        }
                        else {
                            ErrorElement.innerText = ResponseData.ErrorMessage;
                            ErrorElement.style.display = "";
                        }
                    });
                };
                Username.addEventListener("input", () => {
                    Username.classList.remove("is-invalid");
                });
                AddUser.addEventListener("click", () => {
                    let UsernameData = Username.value;
                    if (UsernameData == "") {
                        Username.classList.add("is-invalid");
                        return;
                    }
                    AddUser.children[0].style.display = "";
                    AddUser.disabled = true;
                    RequestAPI("Mail", "SendMail", {
                        "ToUser": UsernameData,
                        "Content": "你好，我是" + localStorage.getItem("UserScript-Username")
                    }, (ResponseData) => {
                        AddUser.children[0].style.display = "none";
                        AddUser.disabled = false;
                        if (ResponseData.Success) {
                            RefreshMessageList();
                        }
                        else {
                            ErrorElement.innerText = ResponseData.ErrorMessage;
                            ErrorElement.style.display = "";
                        }
                    });
                });
                RefreshMessageList(false);
                addEventListener("focus", RefreshMessageList);
            }
            else {
                document.querySelector("body > div > div.mt-3").innerHTML = `<div class="row g-2 mb-3">
                        <div class="col-md form-floating">
                            <input class="form-control" id="ToUser" value="${SearchParams.get("other")}" readonly>
                            <label for="ToUser">接收用户</label>
                        </div>
                        <div class="col-md form-floating">
                            <input class="form-control" id="Content" placeholder=" ">
                            <label for="Content">内容</label>
                        </div>
                    </div>
                    <button id="Send" type="submit" class="btn btn-primary mb-1">
                        发送
                        <div class="spinner-border spinner-border-sm" role="status" style="display: none;">
                    </button>
                    <div id="ErrorElement" class="alert alert-danger mb-3" role="alert" style="display: none;"></div>
                    <table class="table mb-3" id="MessageTable">
                        <thead>
                            <tr>
                                <td class="col-2">发送者</td>
                                <td class="col-6">内容</td>
                                <td class="col-2">发送时间</td>
                                <td class="col-2">阅读状态</td>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    `;
                let RefreshMessage = (Silent = true) => {
                    if (!Silent) {
                        MessageTable.children[1].innerHTML = "";
                        for (let i = 0; i < 10; i++) {
                            let Row = document.createElement("tr"); MessageTable.children[1].appendChild(Row);
                            for (let j = 0; j < 4; j++) {
                                let Cell = document.createElement("td"); Row.appendChild(Cell);
                                Cell.innerHTML = `<span class="placeholder col-${Math.ceil(Math.random() * 12)}"></span>`;
                            }
                        }
                    }
                    RequestAPI("Mail", "GetMail", {
                        "OtherUser": SearchParams.get("other")
                    }, (ResponseData) => {
                        if (ResponseData.Success) {
                            let Data = ResponseData.Data.Mail;
                            MessageTable.children[1].innerHTML = "";
                            for (let i = 0; i < Data.length; i++) {
                                let Row = document.createElement("tr"); MessageTable.children[1].appendChild(Row);
                                if (!Data[i].IsRead && Data[i].FromUser != document.querySelector("#profile").innerText) {
                                    Row.className = "table-info";
                                }
                                Row.innerHTML = `<td>${Data[i].FromUser}</td>
                                    <td>${Data[i].Content}</td>
                                    <td>${Data[i].SendTime}</td>
                                    <td>${(Data[i].IsRead ? "已读" : "未读")}</td>`;
                            }
                        }
                        else {
                            ErrorElement.innerText = ResponseData.ErrorMessage;
                            ErrorElement.style.display = "";
                        }
                    });
                };
                Content.addEventListener("input", () => {
                    Content.classList.remove("is-invalid");
                });
                Content.addEventListener("keydown", (Event) => {
                    if (Event.keyCode == 13) {
                        Send.click();
                    }
                });
                Send.addEventListener("click", () => {
                    if (Content.value == "") {
                        Content.classList.add("is-invalid");
                        return;
                    }
                    Send.disabled = true;
                    Send.children[0].style.display = "";
                    let ContentData = Content.value;
                    RequestAPI("Mail", "SendMail", {
                        "ToUser": SearchParams.get("other"),
                        "Content": ContentData
                    }, (ResponseData) => {
                        if (ResponseData.Success) {
                            Content.value = "";
                            Send.disabled = false;
                            Send.children[0].style.display = "none";
                            RefreshMessage();
                        }
                        else {
                            ErrorElement.innerText = ResponseData.ErrorMessage;
                            ErrorElement.style.display = "";
                        }
                    });
                });
                RefreshMessage(false);
                addEventListener("focus", RefreshMessage);
            }
        } else if (location.pathname.indexOf("/discuss3") != -1) {
            Discussion.classList.add("active");
            if (location.pathname == "/discuss3/discuss.php") {
                let ProblemID = SearchParams.get("pid");
                let Page = Number(SearchParams.get("page")) || 1;
                document.querySelector("body > div > div").innerHTML = `<h3>讨论列表${(ProblemID == null ? "" : ` - 题目` + ProblemID)}</h3>
                    <button id="NewPost" type="button" class="btn btn-primary">发布新讨论</button>
                    <nav>
                        <ul class="pagination justify-content-center" id="DiscussPagination">
                            <li class="page-item"><a class="page-link" href="#"><span>&laquo;</span></a></li>
                            <li class="page-item"><a class="page-link" href="#">${Page - 1}</a></li>
                            <li class="page-item"><a class="page-link active" href="#">${Page}</a></li>
                            <li class="page-item"><a class="page-link" href="#">${Page + 1}</a></li>
                            <li class="page-item"><a class="page-link" href="#"><span>&raquo;</span></a></li>
                        </ul>
                    </nav>
                    <div id="ErrorElement" class="alert alert-danger" role="alert" style="display: none;"></div>
                    <table id="PostList" class="table table-hover">
                        <thead>
                            <tr>
                                <th class="col-1">编号</th>
                                <th class="col-2">标题</th>
                                <th class="col-2">作者</th>
                                <th class="col-1">题目编号</th>
                                <th class="col-2">发布时间</th>
                                <th class="col-1">回复数</th>
                                <th class="col-3">最后回复</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>`;
                for (let i = 0; i < 10; i++) {
                    let Row = document.createElement("tr"); PostList.children[1].appendChild(Row);
                    for (let j = 0; j < 7; j++) {
                        let Cell = document.createElement("td"); Row.appendChild(Cell);
                        Cell.innerHTML = `<span class="placeholder col-${Math.ceil(Math.random() * 12)}"></span>`;
                    }
                }
                NewPost.addEventListener("click", () => {
                    if (ProblemID != null) {
                        location.href = "/discuss3/newpost.php?pid=" + ProblemID;
                    }
                    else {
                        location.href = "/discuss3/newpost.php";
                    }
                });
                RequestAPI("BBS", "GetPosts", {
                    "ProblemID": ProblemID,
                    "Page": Page
                }, (ResponseData) => {
                    if (ResponseData.Success == true) {
                        DiscussPagination.children[0].children[0].href = "/discuss3/discuss.php?" + (ProblemID == null ? "" : "pid=" + ProblemID + "&") + "page=1";
                        DiscussPagination.children[1].children[0].href = "/discuss3/discuss.php?" + (ProblemID == null ? "" : "pid=" + ProblemID + "&") + "page=" + (Page - 1);
                        DiscussPagination.children[2].children[0].href = "/discuss3/discuss.php?" + (ProblemID == null ? "" : "pid=" + ProblemID + "&") + "page=" + Page;
                        DiscussPagination.children[3].children[0].href = "/discuss3/discuss.php?" + (ProblemID == null ? "" : "pid=" + ProblemID + "&") + "page=" + (Page + 1);
                        DiscussPagination.children[4].children[0].href = "/discuss3/discuss.php?" + (ProblemID == null ? "" : "pid=" + ProblemID + "&") + "page=" + ResponseData.Data.PageCount;
                        if (Page <= 1) {
                            DiscussPagination.children[0].classList.add("disabled");
                            DiscussPagination.children[1].remove();
                        }
                        if (Page >= ResponseData.Data.PageCount) {
                            DiscussPagination.children[DiscussPagination.children.length - 1].classList.add("disabled");
                            DiscussPagination.children[DiscussPagination.children.length - 2].remove();
                        }
                        let Posts = ResponseData.Data.Posts;
                        PostList.children[1].innerHTML = "";
                        if (Posts.length == 0) {
                            PostList.children[1].innerHTML = `<tr><td colspan="7">暂无数据</td></tr>`;
                        }
                        for (let i = 0; i < Posts.length; i++) {
                            PostList.children[1].innerHTML += `<tr>
                                    <td>${Posts[i].PostID}</td>
                                    <td><a href="/discuss3/thread.php?tid=${Posts[i].PostID}">${Posts[i].Title}</a></td>
                                    <td><a href="/userinfo.php?user=${Posts[i].UserID}">${Posts[i].UserID}</a></td>` +
                                (Posts[i].ProblemID == null ? `<td></td>` : `<td><a href="/problem.php?id=${Posts[i].ProblemID}">${Posts[i].ProblemID}</a></td>`) +
                                `<td>${Posts[i].PostTime}</td>
                                    <td>${Posts[i].ReplyCount}</td>
                                    <td><a href="/userinfo.php?user=${Posts[i].LastReplyUserID}">${Posts[i].LastReplyUserID}</a> ${Posts[i].LastReplyTime}</td>
                                </tr>`;
                        }
                    }
                    else {
                        ErrorElement.innerText = ResponseData.ErrorMessage;
                        ErrorElement.style.display = "block";
                    }
                });
            } else if (location.pathname == "/discuss3/newpost.php") {
                let ProblemID = SearchParams.get("pid");
                document.querySelector("body > div > div").innerHTML = `<h3>发布新讨论` + (ProblemID != null ? ` - 题目` + ProblemID : ``) +
                    `</h3>
            <div class="form-group mb-3">
                <label for="Title" class="mb-1">标题</label>
                <input type="text" class="form-control" id="TitleElement" placeholder="请输入标题">
            </div>
            <div class="form-group mb-3">
                <label for="ContentElement" class="mb-1">内容</label>
                <textarea class="form-control" id="ContentElement" rows="3" placeholder="请输入内容"></textarea>
            </div>
            <button id="SubmitElement" type="button" class="btn btn-primary mb-2">
                发布
                <div class="spinner-border spinner-border-sm" role="status" style="display: none;">
            </button>
            <div id="ErrorElement" class="alert alert-danger" role="alert" style="display: none;"></div>`;
                TitleElement.addEventListener("input", () => {
                    TitleElement.classList.remove("is-invalid");
                });
                ContentElement.addEventListener("input", () => {
                    ContentElement.classList.remove("is-invalid");
                });
                SubmitElement.addEventListener("click", async () => {
                    ErrorElement.style.display = "none";
                    let Title = TitleElement.value;
                    let Content = ContentElement.value;
                    let ProblemID = SearchParams.get("pid");
                    if (Title == "") {
                        TitleElement.classList.add("is-invalid");
                        return;
                    }
                    if (Content == "") {
                        ContentElement.classList.add("is-invalid");
                        return;
                    }
                    SubmitElement.disabled = true;
                    SubmitElement.children[0].style.display = "inline-block";
                    RequestAPI("BBS", "NewPost", {
                        "Title": Title,
                        "Content": Content,
                        "ProblemID": ProblemID
                    }, (ResponseData) => {
                        SubmitElement.disabled = false;
                        SubmitElement.children[0].style.display = "none";
                        if (ResponseData.Success == true) {
                            location.href = "/discuss3/thread.php?tid=" + ResponseData.Data.PostID;
                        }
                        else {
                            ErrorElement.innerText = ResponseData.ErrorMessage;
                            ErrorElement.style.display = "block";
                        }
                    });
                });
            } else if (location.pathname == "/discuss3/thread.php") {
                if (SearchParams.get("tid") == null) {
                    location.href = "/discuss3/discuss.php";
                }
                else {
                    let ThreadID = SearchParams.get("tid");
                    let Page = Number(SearchParams.get("page")) || 1;
                    document.querySelector("body > div > div").innerHTML = `<h3 id="PostTitle"></h3>
                        <div class="row mb-3">
                            <span class="col-4 text-muted">作者：<a id="PostAuthor" href=""></a></span>
                            <span class="col-4 text-muted">发布时间：<span id="PostTime"></span></span>
                            <span class="col-4">
                                <button id="Delete" type="button" class="btn btn-sm btn-danger" style="display: none;">
                                    删除
                                    <div class="spinner-border spinner-border-sm" role="status" style="display: none;">
                                </button>
                            </span>
                        </div>
                        <div id="PostReplies"></div>
                        <nav>
                            <ul class="pagination justify-content-center" id="DiscussPagination">
                                <li class="page-item"><a class="page-link" href="#"><span>&laquo;</span></a></li>
                                <li class="page-item"><a class="page-link" href="#">${(Page - 1)}</a></li>
                                <li class="page-item"><a class="page-link active" href="#">${Page}</a></li>
                                <li class="page-item"><a class="page-link" href="#">${(Page + 1)}</a></li>
                                <li class="page-item"><a class="page-link" href="#"><span>&raquo;</span></a></li>
                            </ul>
                        </nav>
                        <div class="form-group mb-3">
                            <label for="ContentElement" class="mb-1">回复</label>
                            <textarea class="form-control" id="ContentElement" rows="3" placeholder="请输入内容"></textarea>
                        </div>
                        <button id="SubmitElement" type="button" class="btn btn-primary mb-2">
                            发布
                            <div class="spinner-border spinner-border-sm" role="status" style="display: none;">
                        </button>
                        <div id="ErrorElement" class="alert alert-danger" role="alert" style="display: none;"></div>`;
                    ContentElement.addEventListener("keydown", (Event) => {
                        if (Event.ctrlKey && Event.keyCode == 13) {
                            SubmitElement.click();
                        }
                    });
                    let RefreshReply = (Silent = true) => {
                        if (!Silent) {
                            PostTitle.innerHTML = `<span class="placeholder col-${Math.ceil(Math.random() * 6)}"></span>`;
                            PostAuthor.innerHTML = `<span class="placeholder col-${Math.ceil(Math.random() * 6)}"></span>`;
                            PostTime.innerHTML = `<span class="placeholder col-${Math.ceil(Math.random() * 6)}"></span>`;
                            PostReplies.innerHTML = "";
                            for (let i = 0; i < 10; i++) {
                                PostReplies.innerHTML += `<div class="card mb-3">
                                        <div class="card-body">
                                            <div class="row mb-3">
                                                <span class="col-6"><span class="placeholder col-${Math.ceil(Math.random() * 6)}"></span></span>
                                                <span class="col-6"><span class="placeholder col-${Math.ceil(Math.random() * 6)}"></span></span>
                                            </div>
                                            <hr>
                                            <span class="placeholder col-${Math.ceil(Math.random() * 12)}"></span>
                                            <span class="placeholder col-${Math.ceil(Math.random() * 12)}"></span>
                                            <span class="placeholder col-${Math.ceil(Math.random() * 12)}"></span>
                                        </div>
                                    </div>`;
                            }
                        }
                        let OldScrollTop = document.documentElement.scrollTop;
                        RequestAPI("BBS", "GetPost", {
                            "PostID": ThreadID,
                            "Page": Page
                        }, (ResponseData) => {
                            if (ResponseData.Success == true) {
                                if (!Silent) {
                                    DiscussPagination.children[0].children[0].href = "/discuss3/thread.php?tid=" + ThreadID + "&page=1";
                                    DiscussPagination.children[1].children[0].href = "/discuss3/thread.php?tid=" + ThreadID + "&page=" + (Page - 1);
                                    DiscussPagination.children[2].children[0].href = "/discuss3/thread.php?tid=" + ThreadID + "&page=" + Page;
                                    DiscussPagination.children[3].children[0].href = "/discuss3/thread.php?tid=" + ThreadID + "&page=" + (Page + 1);
                                    DiscussPagination.children[4].children[0].href = "/discuss3/thread.php?tid=" + ThreadID + "&page=" + ResponseData.Data.PageCount;
                                    if (Page <= 1) {
                                        DiscussPagination.children[0].classList.add("disabled");
                                        DiscussPagination.children[1].remove();
                                    }
                                    if (Page >= ResponseData.Data.PageCount) {
                                        DiscussPagination.children[DiscussPagination.children.length - 1].classList.add("disabled");
                                        DiscussPagination.children[DiscussPagination.children.length - 2].remove();
                                    }
                                    if (ResponseData.Data.UserID == profile.innerText) {
                                        Delete.style.display = "";
                                    }
                                }
                                PostTitle.innerText = ResponseData.Data.Title;
                                PostAuthor.innerText = ResponseData.Data.UserID;
                                PostAuthor.href = "/userinfo.php?user=" + ResponseData.Data.UserID;
                                PostTime.innerText = ResponseData.Data.PostTime;
                                let Replies = ResponseData.Data.Reply;
                                PostReplies.innerHTML = "";
                                for (let i = 0; i < Replies.length; i++) {
                                    let CardElement = document.createElement("div");
                                    CardElement.className = "card mb-3";
                                    let CardBodyElement = document.createElement("div");
                                    CardBodyElement.className = "card-body row";
                                    let CardBodyRowElement = document.createElement("div");
                                    CardBodyRowElement.className = "row mb-3";
                                    let CardBodyRowSpan1Element = document.createElement("span");
                                    CardBodyRowSpan1Element.className = "col-4 text-muted";
                                    CardBodyRowSpan1Element.innerText = "作者：";
                                    let CardBodyRowSpan1AElement = document.createElement("a");
                                    CardBodyRowSpan1AElement.href = "/userinfo.php?user=" + Replies[i].UserID;
                                    CardBodyRowSpan1AElement.innerText = Replies[i].UserID;
                                    CardBodyRowSpan1Element.appendChild(CardBodyRowSpan1AElement);
                                    let CardBodyRowSpan2Element = document.createElement("span");
                                    CardBodyRowSpan2Element.className = "col-4 text-muted";
                                    CardBodyRowSpan2Element.innerText = "发布时间：";
                                    let CardBodyRowSpan2SpanElement = document.createElement("span");
                                    CardBodyRowSpan2SpanElement.innerText = Replies[i].ReplyTime;
                                    CardBodyRowSpan2Element.appendChild(CardBodyRowSpan2SpanElement);
                                    let CardBodyRowSpan3Element = document.createElement("span");
                                    CardBodyRowSpan3Element.className = "col-4";
                                    let CardBodyRowSpan3Button1Element = document.createElement("button");
                                    CardBodyRowSpan3Button1Element.type = "button";
                                    CardBodyRowSpan3Button1Element.className = "btn btn-sm btn-info";
                                    CardBodyRowSpan3Button1Element.innerText = "回复";
                                    CardBodyRowSpan3Button1Element.addEventListener("click", () => {
                                        ContentElement.value += `@${Replies[i].UserID} `;
                                        ContentElement.focus();
                                    });
                                    CardBodyRowSpan3Element.appendChild(CardBodyRowSpan3Button1Element);
                                    let CardBodyRowSpan3Button2Element = document.createElement("button");
                                    CardBodyRowSpan3Button2Element.type = "button";
                                    CardBodyRowSpan3Button2Element.className = "btn btn-sm btn-danger ms-1";
                                    CardBodyRowSpan3Button2Element.innerText = "删除";
                                    CardBodyRowSpan3Button2Element.style.display = (Replies[i].UserID == profile.innerText ? "" : "none");
                                    CardBodyRowSpan3Button2Element.addEventListener("click", () => {
                                        CardBodyRowSpan3Button2Element.disabled = true;
                                        CardBodyRowSpan3Button2Element.lastChild.style.display = "";
                                        RequestAPI("BBS", "DeleteReply", {
                                            "ReplyID": Replies[i].ReplyID
                                        }, (ResponseData) => {
                                            if (ResponseData.Success == true) {
                                                RefreshReply();
                                            }
                                            else {
                                                CardBodyRowSpan3Button2Element.disabled = false;
                                                CardBodyRowSpan3Button2Element.lastChild.style.display = "none";
                                                ErrorElement.innerText = ResponseData.ErrorMessage;
                                                ErrorElement.style.display = "";
                                            }
                                        });
                                    });
                                    let CardBodyRowSpan3Button2SpinnerElement = document.createElement("div");
                                    CardBodyRowSpan3Button2SpinnerElement.className = "spinner-border spinner-border-sm";
                                    CardBodyRowSpan3Button2SpinnerElement.role = "status";
                                    CardBodyRowSpan3Button2SpinnerElement.style.display = "none";
                                    CardBodyRowSpan3Button2Element.appendChild(CardBodyRowSpan3Button2SpinnerElement);
                                    CardBodyRowSpan3Element.appendChild(CardBodyRowSpan3Button2Element);
                                    CardBodyRowElement.appendChild(CardBodyRowSpan1Element);
                                    CardBodyRowElement.appendChild(CardBodyRowSpan2Element);
                                    CardBodyRowElement.appendChild(CardBodyRowSpan3Element);
                                    CardBodyElement.appendChild(CardBodyRowElement);
                                    let CardBodyHRElement = document.createElement("hr");
                                    CardBodyElement.appendChild(CardBodyHRElement);
                                    let CardBodyPElement = document.createElement("p");
                                    CardBodyPElement.innerHTML = marked.parse(Replies[i].Content);
                                    CardBodyElement.appendChild(CardBodyPElement);
                                    CardElement.appendChild(CardBodyElement);
                                    PostReplies.appendChild(CardElement);
                                }
                                let CodeElements = document.querySelectorAll("pre > code");
                                for (let i = 0; i < CodeElements.length; i++) {
                                    let ModeName = "text/plain";
                                    if (CodeElements[i].className == "language-c") {
                                        ModeName = "text/x-csrc";
                                    }
                                    else if (CodeElements[i].className == "language-cpp") {
                                        ModeName = "text/x-c++src";
                                    }
                                    let Code = CodeElements[i].innerText;
                                    Code = Code.replaceAll("&lt;", "<");
                                    Code = Code.replaceAll("&gt;", ">");
                                    Code = Code.replaceAll("&amp;", "&");
                                    Code = Code.replaceAll("&quot;", "\"");
                                    Code = Code.replaceAll("&apos;", "'");
                                    Code = Code.trim();
                                    CodeMirror(CodeElements[i].parentElement, {
                                        value: Code,
                                        mode: ModeName,
                                        theme: (UtilityEnabled("DarkMode") ? "darcula" : "default"),
                                        lineNumbers: true,
                                        readOnly: true
                                    }).setSize("100%", "auto");
                                    CodeElements[i].remove();
                                }

                                renderMathInElement(document.body, {
                                    delimiters: [
                                        { left: '$$', right: '$$', display: true },
                                        { left: '$', right: '$', display: false }
                                    ],
                                    throwOnError: false
                                });

                                if (Silent) {
                                    scrollTo({
                                        top: OldScrollTop,
                                        behavior: "instant"
                                    });
                                }
                            }
                            else {
                                PostTitle.innerText = "错误：" + ResponseData.ErrorMessage;
                            }
                        });
                    };
                    Delete.addEventListener("click", () => {
                        Delete.disabled = true;
                        Delete.children[0].style.display = "inline-block";
                        RequestAPI("BBS", "DeletePost", {
                            "PostID": SearchParams.get("tid")
                        }, (ResponseData) => {
                            Delete.disabled = false;
                            Delete.children[0].style.display = "none";
                            if (ResponseData.Success == true) {
                                location.href = "/discuss3/discuss.php";
                            }
                            else {
                                ErrorElement.innerText = ResponseData.ErrorMessage;
                                ErrorElement.style.display = "block";
                            }
                        });
                    });
                    SubmitElement.addEventListener("click", async () => {
                        ErrorElement.style.display = "none";
                        SubmitElement.disabled = true;
                        SubmitElement.children[0].style.display = "inline-block";
                        RequestAPI("BBS", "NewReply", {
                            "PostID": SearchParams.get("tid"),
                            "Content": ContentElement.value
                        }, async (ResponseData) => {
                            SubmitElement.disabled = false;
                            SubmitElement.children[0].style.display = "none";
                            if (ResponseData.Success == true) {
                                RefreshReply();
                                ContentElement.value = "";
                                while (PostReplies.innerHTML.indexOf("placeholder") != -1) {
                                    await new Promise((resolve) => {
                                        setTimeout(resolve, 100);
                                    });
                                }
                                ContentElement.focus();
                                ContentElement.scrollIntoView();
                            }
                            else {
                                ErrorElement.innerText = ResponseData.ErrorMessage;
                                ErrorElement.style.display = "block";
                            }
                        });
                    });
                    RefreshReply(false);
                    addEventListener("focus", RefreshReply);
                }
            }
        }
    }
}
