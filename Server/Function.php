<?php
require_once("Database.php");
function CreateErrorJSON(string $ErrorMessage): void
{
    die("{\"ErrorMessage\": \"" . $ErrorMessage . "\", \"Success\": false}");
}
function CreateSuccessJSON(object $Data): void
{
    $EncodedData = json_encode($Data);
    if ($EncodedData == false) {
        CreateErrorJSON("无法编码数据：" . json_last_error_msg());
    }
    die("{\"Data\": $EncodedData, \"Success\": true}");
}
function ErrorHandler(int $ErrorLevel, string $ErrorMessage, string $ErrorFile, int $ErrorLine): void
{
    if ($ErrorLevel == E_NOTICE) {
        return;
    }
    CreateErrorJSON("服务器错误：" . $ErrorMessage);
}
set_error_handler("ErrorHandler");
header("Content-Type: application/json; charset=utf-8");
$MYSQLConnection = mysqli_connect($DatabaseHostname, $DatabaseUsername, $DatabasePassword, $DatabaseName);
if (mysqli_connect_errno()) {
    CreateErrorJSON("无法连接到数据库服务器：" . mysqli_connect_error());
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
if (!VerifySession()) {
    CreateErrorJSON("会话验证失败");
}

function VerifySession(): bool
{
    global $PostUserID;
    global $PostSession;
    $Curl = curl_init();
    curl_setopt($Curl, CURLOPT_URL, "http://www.xmoj.tech/template/bs3/profile.php");
    curl_setopt($Curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($Curl, CURLOPT_COOKIE, "PHPSESSID=" . $PostSession);
    $CurlResult = curl_exec($Curl);
    curl_close($Curl);
    if (strpos($CurlResult, "登录") !== false) {
        return false;
    }
    $SessionUserID = substr($CurlResult, strpos($CurlResult, "user_id=") + strlen("user_id="));
    $SessionUserID = substr($SessionUserID, 0, strpos($SessionUserID, "'"));
    if ($SessionUserID !== $PostUserID) {
        return false;
    }
    return true;
}
function IfUserExist($UserName): bool
{
    $Curl = curl_init();
    curl_setopt($Curl, CURLOPT_URL, "http://www.xmoj.tech/userinfo.php?user=" . $UserName);
    curl_setopt($Curl, CURLOPT_RETURNTRANSFER, true);
    $CurlResult = curl_exec($Curl);
    curl_close($Curl);
    return (strpos($CurlResult, "No such User!") === false);
}
function SendEmail($EmailContent): string
{
    global $PostSession, $EmailServer, $EmailUsername, $EmailPassword;
    $Curl = curl_init();
    curl_setopt($Curl, CURLOPT_URL, "http://www.xmoj.tech/modifypage.php");
    curl_setopt($Curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($Curl, CURLOPT_COOKIE, "PHPSESSID=" . $PostSession);
    $CurlResult = curl_exec($Curl);
    curl_close($Curl);
    $Email = substr($CurlResult, strpos($CurlResult, "<input name=\"email\" size=30 type=text value=\"") + 45);
    $Email = substr($Email, 0, strpos($Email, "\""));
    if ($Email == "") {
        return "请先绑定邮箱";
    }

    $EmailContent = "From: " . $EmailUsername . "\r\n" . $EmailContent;
    $File = tmpfile();
    fwrite($File, $EmailContent);
    fseek($File, 0);
    $Curl = curl_init();
    $Recipients = array($Email);
    curl_setopt($Curl, CURLOPT_URL, $EmailServer);
    curl_setopt($Curl, CURLOPT_USE_SSL, true);
    curl_setopt($Curl, CURLOPT_USERNAME, $EmailUsername);
    curl_setopt($Curl, CURLOPT_PASSWORD, $EmailPassword);
    curl_setopt($Curl, CURLOPT_MAIL_FROM, $EmailUsername);
    curl_setopt($Curl, CURLOPT_MAIL_RCPT, $Recipients);
    curl_setopt($Curl, CURLOPT_UPLOAD, true);
    curl_setopt($Curl, CURLOPT_INFILESIZE, strlen($EmailContent));
    curl_setopt($Curl, CURLOPT_INFILE, $File);
    $CurlResult = curl_exec($Curl);
    curl_close($Curl);
    fclose($File);

    if ($CurlResult == false) {
        return "无法发送邮件：" . curl_error($Curl);
    }
    return "";
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
        CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
    }
    if ($Where != null) {
        $MYSQLBind = array();
        $MYSQLBind[] = "";
        foreach ($Where as $Key => $Value) {
            $MYSQLBind[0] .= "s";
            $MYSQLBind[] = &$Where[$Key];
        }
        if (!call_user_func_array("mysqli_stmt_bind_param", array_merge(array($MYSQLPrepare), $MYSQLBind))) {
            CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
        }
    }
    if (!mysqli_stmt_execute($MYSQLPrepare)) {
        CreateErrorJSON("无法读取数据：" . mysqli_stmt_error($MYSQLPrepare));
    }
    $MYSQLResult = mysqli_stmt_get_result($MYSQLPrepare);
    if ($MYSQLResult == false) {
        CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
    }
    $MYSQLRow = mysqli_fetch_assoc($MYSQLResult);
    if ($MYSQLRow == false) {
        CreateErrorJSON("无法读取数据：" . mysqli_error($MYSQLConnection));
    }
    return $MYSQLRow["COUNT(*)"];
}
