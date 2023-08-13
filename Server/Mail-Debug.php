<?php
require_once("Function.php");
function GetMailList(): object
{
    global $MYSQLConnection;
    global $PostUserID;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `message_from`, `content`, `send_time` FROM `short_message` WHERE `message_to`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "s", $PostUserID)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $Result = mysqli_stmt_get_result($MYSQLPrepare);
    $Return = array();
    while ($Row = mysqli_fetch_assoc($Result)) {
        $Return[] = (object)array(
            "OtherUser" => $Row["message_from"],
            "LastsMessage" => $Row["content"],
            "SendTime" => $Row["send_time"]
        );
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `message_to`, `content`, `send_time` FROM `short_message` WHERE `message_from`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "s", $PostUserID)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $Result = mysqli_stmt_get_result($MYSQLPrepare);
    while ($Row = mysqli_fetch_assoc($Result)) {
        $Return[] = (object)array(
            "OtherUser" => $Row["message_to"],
            "LastsMessage" => $Row["content"],
            "SendTime" => $Row["send_time"]
        );
    }

    for ($i = 0; $i < count($Return); $i++) {
        for ($j = $i + 1; $j < count($Return); $j++) {
            if ($Return[$i]->OtherUser == $Return[$j]->OtherUser) {
                if ($Return[$i]->SendTime < $Return[$j]->SendTime) {
                    $Return[$i]->LastsMessage = $Return[$j]->LastsMessage;
                    $Return[$i]->SendTime = $Return[$j]->SendTime;
                }
                array_splice($Return, $j, 1);
                $j--;
            }
        }
    }
    usort($Return, function ($a, $b) {
        return $a->SendTime < $b->SendTime;
    });

    for ($i = 0; $i < count($Return); $i++) {
        $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT COUNT(*) FROM `short_message` WHERE `message_from`=? AND `message_to`=? AND `is_read`=0;");
        if ($MYSQLPrepare == false) {
            CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
        }
        if (!mysqli_stmt_bind_param($MYSQLPrepare, "ss", $Return[$i]->OtherUser, $PostUserID)) {
            CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
        }
        if (!mysqli_stmt_execute($MYSQLPrepare)) {
            CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
        }
        $Result = mysqli_stmt_get_result($MYSQLPrepare);
        $Row = mysqli_fetch_assoc($Result);
        $Return[$i]->UnreadCount = $Row["COUNT(*)"];
    }

    return (object)array(
        "MailList" => $Return
    );
}
function SendMail(string $ToUser, string $Content): string
{
    if (!IfUserExist($ToUser)) {
        CreateErrorJSON("没有此用户");
    }
    global $MYSQLConnection;
    global $PostUserID;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `short_message` (`message_from`, `message_to`, `content`) VALUES (?, ?, ?);");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法写入数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "sss", $PostUserID, $ToUser, $Content)) {
        CreateErrorJSON("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法写入数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    return mysqli_insert_id($MYSQLConnection);
}
function GetMail(string $OtherUser): object
{
    global $MYSQLConnection;
    global $PostUserID;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT * FROM `short_message` WHERE (`message_from`=? AND `message_to`=?) OR (`message_from`=? AND `message_to`=?) ORDER BY `send_time` DESC;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "ssss", $PostUserID, $OtherUser, $OtherUser, $PostUserID)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $Result = mysqli_stmt_get_result($MYSQLPrepare);
    $Return = array();
    while ($Row = mysqli_fetch_assoc($Result)) {
        $Return[] = (object)array(
            "MessageID" => $Row["message_id"],
            "FromUser" => $Row["message_from"],
            "ToUser" => $Row["message_to"],
            "Content" => $Row["content"],
            "SendTime" => $Row["send_time"],
            "IsRead" => $Row["is_read"]
        );
    }

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "UPDATE `short_message` SET `is_read`=1 WHERE `message_from`=? AND `message_to`=?;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "ss", $OtherUser, $PostUserID)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }

    return (object)array(
        "Mail" => $Return
    );
}
function GetUnreadList(): object
{
    global $MYSQLConnection;
    global $PostUserID;
    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "SELECT `message_from` FROM `short_message` WHERE `message_to`=? AND `is_read`=0;");
    if ($MYSQLPrepare == false) {
        CreateErrorJSON("无法读取数据: " . mysqli_error($MYSQLConnection));
    }
    if (!mysqli_stmt_bind_param($MYSQLPrepare, "s", $PostUserID)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据: " . mysqli_stmt_error($MYSQLPrepare));
    }
    $Result = mysqli_stmt_get_result($MYSQLPrepare);
    $Return = array();
    while ($Row = mysqli_fetch_assoc($Result)) {
        $Return[] = (object)array(
            "OtherUser" => $Row["message_from"]
        );
    }

    $Return = array_unique($Return, SORT_REGULAR);

    return (object)array(
        "UnreadList" => $Return
    );
}
if ($PostAction == "GetMailList") {
    CreateSuccessJSON(GetMailList());
} else if ($PostAction == "SendMail") {
    $PostToUser = $_POST["ToUser"];
    $PostContent = $_POST["Content"];
    if (!is_string($PostToUser) || !is_string($PostContent)) {
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
    CreateSuccessJSON((object)array(
        "MailID" => SendMail($PostToUser, $PostContent)
    ));
} else if ($PostAction == "GetMail") {
    $PostOtherUser = $_POST["OtherUser"];
    if (!is_string($PostOtherUser)) {
        CreateErrorJSON("传入的参数不正确");
    }
    CreateSuccessJSON(GetMail($PostOtherUser));
} else if ($PostAction == "GetUnreadList") {
    CreateSuccessJSON(GetUnreadList());
} else {
    CreateErrorJSON("传入的参数不正确");
}
