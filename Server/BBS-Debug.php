<?php
require_once("Function.php");
function NewPost(string $Title, $ProblemID): int
{
    global $MYSQLConnection, $PostUserID;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_post` (`user_id`, `problem_id`, `title`) VALUES (?, ?, ?);");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法写入数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "sis", $PostUserID, $ProblemID, $Title)) {
        CreateErrorJSON("无法写入数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法写入数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    return mysqli_insert_id($MYSQLConnection);
}
function NewReply(int $PostID, string $Content): int
{
    global $PostUserID;
    $MentionPeople = array();
    $Content = preg_replace_callback("/@([a-zA-Z0-9]+)/", function ($Matches) use (&$MentionPeople) {
        if (IfUserExist($Matches[1])) {
            $MentionPeople[] = $Matches[1];
            return " <a class=\"link-info\" href=\"http://www.xmoj.tech/userinfo.php?user=" . $Matches[1] . "\">@" . $Matches[1] . "</a> ";
        } else {
            return "@" . $Matches[1];
        }
    }, $Content);

    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_reply` (`post_id`, `user_id`, `content`) VALUES (?, ?, ?);");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法写入数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "iss", $PostID, $PostUserID, $Content)) {
        CreateErrorJSON("无法写入数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法写入数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $ReplyID = mysqli_insert_id($MYSQLConnection);

    for ($i = 0; $i < count($MentionPeople); $i++) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_mention` (`user_id`, `reply_id`) VALUES (?, ?);");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法写入数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "si", $MentionPeople[$i], $ReplyID)) {
            CreateErrorJSON("无法写入数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法写入数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
    }
    return $ReplyID;
}
function GetPosts($Page, $ProblemID): object
{
    global $MYSQLConnection;
    $MYSQLPrepare = null;
    $Page = ($Page - 1) * 10;
    if ($ProblemID != null) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_post` WHERE `problem_id`=? ORDER BY `post_time` DESC LIMIT 10 OFFSET ?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "ii", $ProblemID, $Page)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
    } else {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_post` ORDER BY `post_time` DESC LIMIT 10 OFFSET ?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $Page)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
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

    for ($i = 0; $i < count($Response); $i++) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT COUNT(*) FROM `bbs_reply` WHERE `post_id`=?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $Response[$i]["PostID"])) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
        $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
        if ($MYSQLRow == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        $Response[$i]["ReplyCount"] = $MYSQLRow["COUNT(*)"];

        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `user_id`, `reply_time` FROM `bbs_reply` WHERE `post_id`=? ORDER BY `reply_time` DESC LIMIT 1;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $Response[$i]["PostID"])) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
        $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
        if ($MYSQLRow == false) {
            DeletePost($Response[$i]["PostID"], false);
            continue;
        }
        $Response[$i]["LastReplyUserID"] = $MYSQLRow["user_id"];
        $Response[$i]["LastReplyTime"] = $MYSQLRow["reply_time"];
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
        CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("没有此讨论");
    }
    $ResponseUserID = $MYSQLRow["user_id"];
    $ResponseProblemID = $MYSQLRow["problem_id"];
    $ResponseTitle = $MYSQLRow["title"];
    $ResponsePostTime = $MYSQLRow["post_time"];

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_reply` WHERE `post_id`=? ORDER BY `reply_time` DESC LIMIT 10 OFFSET ?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "ii", $PostID, $Page)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
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
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `user_id` FROM `bbs_post` WHERE `post_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("没有此讨论");
    }
    if ($CheckUserID && $MYSQLRow["user_id"] != $_POST["UserID"]) {
        CreateErrorJSON("无法删除数据: 权限不足");
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `bbs_reply` WHERE `post_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    while ($MYSQLRow = mysqli_fetch_assoc($MYSQLResult)) {
        DeleteReply($MYSQLRow["reply_id"], false);
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "DELETE FROM `bbs_post` WHERE `post_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $PostID)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
}
function DeleteReply(int $ReplyID, bool $CheckUserID = true): void
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `user_id`, `post_id` FROM `bbs_reply` WHERE `reply_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $ReplyID)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("没有此回复");
    }
    if ($CheckUserID && $MYSQLRow["user_id"] != $_POST["UserID"]) {
        CreateErrorJSON("无法删除数据: 权限不足");
    }

    if (GetTableSize("bbs_reply", array("post_id" => $MYSQLRow["post_id"])) == 1) {
        DeletePost($MYSQLRow["post_id"], false);
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "DELETE FROM `bbs_reply` WHERE `reply_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $ReplyID)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
}
function GetMentionList(): object
{
    global $MYSQLConnection, $PostUserID;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `mention_id`, `reply_id` FROM `bbs_mention` WHERE `user_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "s", $PostUserID)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    $Response = array();
    while ($MYSQLRow = mysqli_fetch_assoc($MYSQLResult)) {
        $Response[] = array(
            "MentionID" => $MYSQLRow["mention_id"],
            "ReplyID" =>  $MYSQLRow["reply_id"]
        );
    }

    for ($i = 0; $i < count($Response); $i++) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `post_id`, `user_id` FROM `bbs_reply` WHERE `reply_id`=?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $Response[$i]["ReplyID"])) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
        $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
        if ($MYSQLRow == false) {
            ReadMention($Response[$i]["MentionID"]);
            continue;
        }
        $Response[$i]["PostID"] = $MYSQLRow["post_id"];
        $Response[$i]["UserID"] = $MYSQLRow["user_id"];

        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT COUNT(*) FROM `bbs_reply` WHERE `post_id`=? AND `reply_id`>?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "ii", $Response[$i]["PostID"], $Response[$i]["ReplyID"])) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
        $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
        if ($MYSQLRow == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        $Response[$i]["Page"] = ceil($MYSQLRow["COUNT(*)"] / 10);
    }

    for ($i = 0; $i < count($Response); $i++) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `title` FROM `bbs_post` WHERE `post_id`=?;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $Response[$i]["PostID"])) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
        $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
        $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
        if ($MYSQLRow == false) {
            ReadMention($Response[$i]["MentionID"]);
            continue;
        }
        $Response[$i]["Title"] = $MYSQLRow["title"];
    }

    return (object)array(
        "MentionList" => $Response
    );
}
function ReadMention(int $MentionID): void
{
    global $MYSQLConnection;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "DELETE FROM `bbs_mention` WHERE `mention_id`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法删除数据：" . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "i", $MentionID)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法删除数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
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
    $PostID = NewPost($PostTitle, $PostProblemID);
    if (strlen($PostTitle) > 50) {
        CreateErrorJSON("标题过长");
    }
    if (strlen($PostContent) > 1000) {
        CreateErrorJSON("内容过长");
    }
    NewReply($PostID, $PostContent);
    CreateSuccessJSON((object)array("PostID" => $PostID));
} else if ($PostAction == "NewReply") {
    $PostContent = $_POST["Content"];
    $PostPostID = $_POST["PostID"];
    if (!is_string($PostContent) || !is_numeric($PostPostID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    $PostContent = trim($PostContent);
    if ($PostContent == "") {
        CreateErrorJSON("内容不能为空");
    }
    $PostContent = htmlspecialchars($PostContent);
    if (strlen($PostContent) > 1000) {
        CreateErrorJSON("内容过长");
    }
    $ReplyID = NewReply($PostPostID, $PostContent);
    CreateSuccessJSON((object)array("ReplyID" => $ReplyID));
} else if ($PostAction == "GetPostCount") {
    $PostProblemID = $_POST["ProblemID"];
    if (!is_numeric($PostProblemID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    CreateSuccessJSON((object)array(
        "DiscussCount" => GetTableSize("bbs_post", array("problem_id" => $PostProblemID))
    ));
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
} else if ($PostAction == "GetMentionList") {
    CreateSuccessJSON(GetMentionList());
} else if ($PostAction == "ReadMention") {
    $PostMentionID = $_POST["MentionID"];
    if (!is_numeric($PostMentionID)) {
        CreateErrorJSON("传入的参数不正确");
    }
    ReadMention($PostMentionID);
    CreateSuccessJSON((object)array());
} else {
    CreateErrorJSON("传入的参数不正确");
}
