<?php
require_once("Database.php");
ob_implicit_flush(true);
$MYSQLConnection = mysqli_connect($DatabaseHostname, $DatabaseUsername, $DatabasePassword, $DatabaseName);
mysqli_query($MYSQLConnection, "TRUNCATE TABLE `bbs_post`;");
mysqli_query($MYSQLConnection, "TRUNCATE TABLE `bbs_reply`;");
$BBSData = file_get_contents("BBSSpider.json");
$BBSData = json_decode($BBSData, true);
for ($i = 0; $i < count($BBSData["bbs_post"]); $i++) {
    global $MYSQLConnection;
    $PostID = $BBSData["bbs_post"][$i]["post_id"];
    $Title = $BBSData["bbs_post"][$i]["title"];
    $UserID = $BBSData["bbs_post"][$i]["user_id"];
    $ProblemID = $BBSData["bbs_post"][$i]["problem_id"];
    $PostTime = $BBSData["bbs_post"][$i]["post_time"];
    $Title = htmlspecialchars($Title);
    $PostTime = date("Y-m-d H:i:s", $PostTime / 1000);

    $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_post` (`title`, `user_id`, `problem_id`, `post_time`) VALUES (?, ?, ?, ?);");
    mysqli_stmt_bind_param($MYSQLPrepare, "ssss", $Title, $UserID, $ProblemID, $PostTime);
    if (mysqli_stmt_execute($MYSQLPrepare)) {
        echo "BBS Post " . ($i + 1) . ": $Title ($UserID $ProblemID $PostTime) imported successfully.<br>";
    } else {
        echo "<font color=\"red\">Error importing BBS Post $i: " . mysqli_error($MYSQLConnection) . "</font><br>";
    }
    $MYSQLPostID = mysqli_insert_id($MYSQLConnection);
    for ($j = 0; $j < count($BBSData["bbs_reply"]); $j++) {
        if ($BBSData["bbs_reply"][$j]["post_id"] == $PostID) {
            $UserID = $BBSData["bbs_reply"][$j]["user_id"];
            $Content = $BBSData["bbs_reply"][$j]["content"];
            $ReplyTime = $BBSData["bbs_reply"][$j]["reply_time"];
            $Content = "```\n" . htmlspecialchars(trim($Content)) . "\n```";
            $ReplyTime = date("Y-m-d H:i:s", $ReplyTime / 1000);

            $MYSQLPrepare = mysqli_prepare($MYSQLConnection, "INSERT INTO `bbs_reply` (`post_id`, `user_id`, `content`, `reply_time`) VALUES (?, ?, ?, ?);");
            mysqli_stmt_bind_param($MYSQLPrepare, "isss", $MYSQLPostID, $UserID, $Content, $ReplyTime);
            if (mysqli_stmt_execute($MYSQLPrepare)) {
                echo "&nbsp;&nbsp;&nbsp;&nbsp;BBS Reply " . ($j + 1) . " ($UserID $ReplyTime) imported successfully.<br>";
            } else {
                echo "&nbsp;&nbsp;&nbsp;&nbsp;<font color=\"red\">Error importing BBS Reply $j: " . mysqli_error($MYSQLConnection) . "</font><br>";
            }
        }
    }
}
unlink("BBSSpider.json");
unlink("BBSSpider.php");
