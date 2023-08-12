<?php
function CreateErrorJSON(string $ErrorMessage): void
{
    die("{\"ErrorMessage\": \"" . $ErrorMessage . "\", \"Success\": false}");
}
function CreateSuccessJSON(object $Data): void
{
    $EncodedData = json_encode($Data);
    if ($EncodedData == false) {
        CreateErrorJSON("无法编码数据: " . json_last_error_msg());
    }
    die("{\"Data\": $EncodedData, \"Success\": true}");
}
function ErrorHandler(int $ErrorLevel, string $ErrorMessage, string $ErrorFile, int $ErrorLine): void
{
    if ($ErrorLevel == E_NOTICE) {
        return;
    }
    CreateErrorJSON("服务器错误: " . $ErrorMessage);
}
set_error_handler("ErrorHandler");
header("Content-Type: application/json; charset=utf-8");

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
    $SessionUserID = substr($CurlResult, strpos($CurlResult, "user_id=") + strlen("user_id="));
    $SessionUserID = substr($SessionUserID, 0, strpos($SessionUserID, "'"));
    if ($SessionUserID !== $UserID) {
        return false;
    }
    return true;
}
function NewPost(string $Title, string $UserID, $ProblemID): int
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_post` (`user_id`, `problem_id`, `title`) VALUES (?, ?, ?);");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法写入数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "sis", $UserID, $ProblemID, $Title)) {
        CreateErrorJSON("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    return mysqli_insert_id($MYSQLConnection);
}
function NewReply(int $PostID, string $UserID, string $Content): int
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_reply` (`post_id`, `user_id`, `content`) VALUES (?, ?, ?);");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法写入数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "iss", $PostID, $UserID, $Content)) {
        CreateErrorJSON("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    return mysqli_insert_id($MYSQLConnection);
}
function GetPosts($Page, $ProblemID): object
{
    global $MYSQLConnection;
    $MYSQLPrepare = null;
    $Page = ($Page - 1) * 10;
    if ($ProblemID != null) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_post` WHERE `problem_id`=? ORDER BY `post_time` DESC LIMIT 10 OFFSET ?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "ii", $ProblemID, $Page)) {
            CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
        }
    } else {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_post` ORDER BY `post_time` DESC LIMIT 10 OFFSET ?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $Page)) {
            CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
        }
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    $Response = array();
    while ($MYSQLRow = mysqli_fetch_assoc($MYSQLResult)) {
        $Response[] = array(
            "PostID" => $MYSQLRow["post_id"],
            "UserID" => $MYSQLRow["user_id"],
            "ProblemID" => $MYSQLRow["problem_id"],
            "Title" => $MYSQLRow["title"],
            "PostTime" => $MYSQLRow["post_time"]
        );
    }
    return (object) array(
        "Posts" => $Response,
        "PageCount" => ceil(GetTableSize("bbs_post") / 10)
    );
}
function GetPost(int $Page, int $PostID): object
{
    global $MYSQLConnection;
    $Page = ($Page - 1) * 10;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_post` WHERE `post_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    $ResponseUserID = $MYSQLRow["user_id"];
    $ResponseProblemID = $MYSQLRow["problem_id"];
    $ResponseTitle = $MYSQLRow["title"];
    $ResponsePostTime = $MYSQLRow["post_time"];

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_reply` WHERE `post_id`=? ORDER BY `reply_time` DESC LIMIT 10 OFFSET ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "ii", $PostID, $Page)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    $ResponseReply = array();
    while ($MYSQLRow = mysqli_fetch_assoc($MYSQLResult)) {
        $ResponseReply[] = array(
            "ReplyID" => $MYSQLRow["reply_id"],
            "UserID" => $MYSQLRow["user_id"],
            "Content" => $MYSQLRow["content"],
            "ReplyTime" => $MYSQLRow["reply_time"]
        );
    }

    return (object)array(
        "UserID" => $ResponseUserID,
        "ProblemID" => $ResponseProblemID,
        "Title" => $ResponseTitle,
        "PostTime" => $ResponsePostTime,
        "Reply" => $ResponseReply,
        "PageCount" => ceil(GetTableSize("bbs_reply", array("post_id" => $PostID)) / 10)
    );
}
function DeletePost(int $PostID, bool $CheckUserID = true): void
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `user_id` FROM `bbs_post` WHERE `post_id` = ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if ($CheckUserID && $MYSQLRow["user_id"] != $_POST["UserID"]) {
        CreateErrorJSON("无法删除数据: 权限不足");
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_reply` WHERE `post_id` = ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    while ($MYSQLRow = mysqli_fetch_assoc($MYSQLResult)) {
        DeleteReply($MYSQLRow["reply_id"], false);
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "DELETE FROM `bbs_post` WHERE `post_id` = ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
}
function DeleteReply(int $ReplyID, bool $CheckUserID = true): void
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `user_id`, `post_id` FROM `bbs_reply` WHERE `reply_id` = ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $ReplyID)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if ($CheckUserID && $MYSQLRow["user_id"] != $_POST["UserID"]) {
        CreateErrorJSON("无法删除数据: 权限不足");
    }

    if (GetTableSize("bbs_reply", array("post_id" => $MYSQLRow["post_id"])) == 1) {
        DeletePost($MYSQLRow["post_id"], false);
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "DELETE FROM `bbs_reply` WHERE `reply_id` = ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $ReplyID)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
}
function GetTableSize(string $TableName, array $Where = null): int
{
    global $MYSQLConnection;
    $MYSQLQuery = "SELECT COUNT(*) FROM `$TableName`";
    if ($Where != null) {
        $MYSQLQuery .= " WHERE ";
        $First = true;
        foreach ($Where as $Key => $Value) {
            if ($First) {
                $First = false;
            } else {
                $MYSQLQuery .= " AND ";
            }
            $MYSQLQuery .= "`$Key`=?";
        }
    }
    $MYSQLQuery .= ";";
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, $MYSQLQuery);
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if ($Where != null) {
        $MYSQLBind = array();
        $MYSQLBind[] = "";
        foreach ($Where as $Key => $Value) {
            $MYSQLBind[0] .= "s";
            $MYSQLBind[] = &$Where[$Key];
        }
        if (!call_user_func_array("mysqli_stmt_bind_param", array_merge(array($MYSQLPrepare), $MYSQLBind))) {
            CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
        }
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    return $MYSQLRow["COUNT(*)"];
}
if (mysqli_connect_errno()) {
    CreateErrorJSON("无法连接到数据库服务器: " . mysqli_connect_error());
}
$PostAction = $_POST["Action"];
if (!is_string($PostAction)) {
    CreateErrorJSON("传入的参数不正确");
}
$PostUserID = $_POST["UserID"];
$PostSession = $_POST["Session"];
if (!is_string($PostUserID) || !is_string($PostSession)) {
    CreateErrorJSON("传入的参数不正确");
}
if (!VerifySession($PostSession, $PostUserID)) {
    CreateErrorJSON("会话验证失败");
}
if ($PostAction == "NewPost") {
    $PostTitle = $_POST["Title"];
    $PostContent = $_POST["Content"];
    $PostProblemID = $_POST["ProblemID"];
    if (!is_string($PostTitle) || !is_string($PostContent) || ($PostProblemID != null && !is_numeric($PostProblemID))) {
        CreateErrorJSON("传入的参数不正确");
    }
    $PostTitle = trim($PostTitle);
    $PostContent = trim($PostContent);
    if ($PostTitle == "") {
        CreateErrorJSON("标题不能为空");
    }
    if ($PostContent == "") {
        CreateErrorJSON("内容不能为空");
    }
    $PostTitle = htmlspecialchars($PostTitle);
    $PostContent = htmlspecialchars($PostContent);
    $PostID = NewPost($PostTitle, $PostUserID, $PostProblemID);
    NewReply($PostID, $PostUserID, $PostContent);
    CreateSuccessJSON((object)array("PostID" => $PostID));
} else if ($PostAction == "NewReply") {
    $PostContent = $_POST["Content"];
    $PostPostID = $_POST["PostID"];
    if (!is_string($PostContent) || !is_string($PostUserID) || !is_string($PostSession) || !is_numeric($PostPostID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    if (!VerifySession($PostSession, $PostUserID)) {
        CreateErrorJSON("会话验证失败");
    }
    $PostContent = htmlspecialchars($PostContent);
    $ReplyID = NewReply($PostPostID, $PostUserID, $PostContent);
    CreateSuccessJSON((object)array("ReplyID" => $ReplyID));
} else if ($PostAction == "GetPosts") {
    $PostProblemID = $_POST["ProblemID"];
    $PostPage = $_POST["Page"];
    if (!is_numeric($PostPage) || ($PostProblemID != null && !is_numeric($PostProblemID))) {
        CreateErrorJSON("传入的参数不正确");
    }
    CreateSuccessJSON(GetPosts($PostPage, $PostProblemID));
} else if ($PostAction == "GetPost") {
    $PostPostID = $_POST["PostID"];
    $PostPage = $_POST["Page"];
    if (!is_numeric($PostPage) || !is_numeric($PostPostID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    CreateSuccessJSON(GetPost($PostPage, $PostPostID));
} else if ($PostAction == "DeletePost") {
    $PostPostID = $_POST["PostID"];
    if (!is_numeric($PostPostID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    DeletePost($PostPostID);
    CreateSuccessJSON((object)array());
} else if ($PostAction == "DeleteReply") {
    $PostReplyID = $_POST["ReplyID"];
    if (!is_numeric($PostReplyID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    DeleteReply($PostReplyID);
    CreateSuccessJSON((object)array());
} else {
    CreateErrorJSON("传入的参数不正确");
}
