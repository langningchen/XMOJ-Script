<?php
require_once("Database.php");
$MYSQLConnection = mysqli_connect($DatabaseHostname, $DatabaseUsername, $DatabasePassword, $DatabaseName);
function VerifySession(string $Session, string $UserID): bool
{
    $Curl = curl_init();
    curl_setopt($Curl, CURLOPT_URL, "http://www.xmoj.tech/template/bs3/profile.php");
    curl_setopt($Curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($Curl, CURLOPT_COOKIE, "PHPSESSID=" . $Session);
    $CurlResult = curl_exec($Curl);
    curl_close($Curl);
    if (strpos($CurlResult, "登录") !== false) {
        return false;
    }
    $SessionUserID = substr(
        $CurlResult,
        strpos($CurlResult, "document.getElementById(\"profile\").innerHTML = \"") +
            strlen("document.getElementById(\"profile\").innerHTML = \"")
    );
    $SessionUserID = substr($SessionUserID, 0, strpos($SessionUserID, "\";"));
    if ($SessionUserID !== $UserID) {
        return false;
    }
    return true;
}
function NewPost(string $Title, string $UserID, ?int $ProblemID): int
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_post` (`user_id`, `problem_id`, `title`) VALUES (?, ?, ?);");
    mysqli_stmt_bind_param($MYSQLPrepare, "iis", $UserID, $ProblemID, $Title);
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        die("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    return mysqli_insert_id($MYSQLConnection);
}
function NewReply(int $PostID, string $UserID, string $Content): int
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_reply` (`post_id`, `user_id`) VALUES (?, ?);");
    mysqli_stmt_bind_param($MYSQLPrepare, "ii", $PostID, $UserID);
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        die("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    return mysqli_insert_id($MYSQLConnection);
}
if (mysqli_connect_errno()) {
    die("无法连接到数据库服务器: " . mysqli_connect_error());
}
$PostAction = $_POST["Action"];
if (!is_string($PostAction)) {
    die("传入的参数不正确");
}
if ($PostAction == "NewPost") {
    $PostTitle = $_POST["Title"];
    $PostContent = $_POST["Content"];
    $PostUserID = $_POST["UserID"];
    $PostSession = $_POST["Session"];
    $PostProblemID = $_POST["ProblemID"];
    if (
        !is_string($PostTitle) || !is_string($PostContent) || !is_string($PostUserID) || !is_string($PostSession) ||
        (!is_null($PostProblemID) && !is_numeric($PostProblemID))
    ) {
        die("传入的参数不正确");
    }
    $PostTitle = trim($PostTitle);
    $PostContent = trim($PostContent);
    if ($PostTitle == "") {
        die("标题不能为空");
    }
    if ($PostContent == "") {
        die("内容不能为空");
    }
    if (!VerifySession($PostSession, $PostUserID)) {
        die("会话验证失败");
    }
    $PostTitle = htmlspecialchars($PostTitle);
    $PostContent = htmlspecialchars($PostContent);
    $PostID = NewPost($PostTitle, $PostUserID, $PostProblemID);
    $ReplyID = NewReply($PostID, $PostUserID, $PostContent);
    header("location: http://www.xmoj.tech/discuss3/thread.php?tid=" . $PostID);
    echo "发表成功";
} else if ($PostAction == "NewReply") {
    $PostContent = $_POST["Content"];
    $PostUserID = $_POST["UserID"];
    $PostSession = $_POST["Session"];
    $PostPostID = $_POST["PostID"];
    if (!is_string($PostContent) || !is_string($PostUserID) || !is_string($PostSession) || !is_numeric($PostPostID)) {
        die("传入的参数不正确");
    }
    if (!VerifySession($PostSession, $PostUserID)) {
        die("会话验证失败");
    }
    $PostContent = htmlspecialchars($PostContent);
    $ReplyID = NewReply($PostPostID, $PostUserID, $PostContent);
    header("location: http://www.xmoj.tech/discuss3/thread.php?tid=" . $PostPostID);
    echo "发表成功";
} else {
    die("传入的参数不正确");
}
