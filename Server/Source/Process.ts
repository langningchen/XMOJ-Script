import { Result, ThrowErrorIfFailed } from "./Result";
import { Database } from "./Database";
import { Output } from "./Output";
import { CaptchaSecretKey } from "./Secret"
import * as cheerio from "cheerio";

export class Process {
    private AdminUserList: Array<string> = ["chenlangning", "zhuchenrui2", "shanwenxiao", "admin"];
    private Username: string;
    private SessionID: string;
    private RemoteIP: string;
    private XMOJDatabase: Database;
    private RequestData: Request;
    private Fetch = async (RequestURL: URL): Promise<Response> => {
        Output.Log("Fetch: " + RequestURL.toString());
        let Abort = new AbortController();
        setTimeout(() => {
            Abort.abort();
        }, 5000);
        let RequestData = new Request(RequestURL, {
            headers: {
                "Cookie": "PHPSESSID=" + this.SessionID
            },
            signal: Abort.signal
        });
        return await fetch(RequestData);
    }
    public CheckParams = (Data: object, Checklist: object): Result => {
        for (let i in Data) {
            if (Checklist[i] === undefined) {
                return new Result(false, "参数" + i + "未知");
            }
            const AvailableTypes = ["string", "number", "bigint", "boolean", "symbol", "undefined", "object", "function"];
            if (AvailableTypes.indexOf(Checklist[i]) === -1) {
                return new Result(false, "参数类型" + Checklist[i] + "未知");
            }
            if (typeof Data[i] !== Checklist[i]) {
                return new Result(false, "参数" + i + "期望类型" + Checklist[i] + "实际类型" + typeof Data[i]);
            }
        }
        for (let i in Checklist) {
            if (Data[i] === undefined) {
                return new Result(false, "参数" + i + "未找到");
            }
        }
        return new Result(true, "参数检测通过");
    }
    public CheckToken = async (Data: object): Promise<Result> => {
        ThrowErrorIfFailed(this.CheckParams(Data, {
            "SessionID": "string",
            "Username": "string"
        }));
        this.SessionID = Data["SessionID"];
        this.Username = Data["Username"];
        // return new Result(true, "令牌检测跳过");

        let CurrentSessionData = ThrowErrorIfFailed(await this.XMOJDatabase.Select("phpsessid", ["user_id", "create_time"], {
            token: this.SessionID
        }));
        if (CurrentSessionData.toString() !== "") {
            if (CurrentSessionData[0]["user_id"] === this.Username &&
                CurrentSessionData[0]["create_time"] + 1000 * 60 * 60 * 24 * 7 > new Date().getTime()) {
                return new Result(true, "令牌匹配");
            }
            else {
                ThrowErrorIfFailed(await this.XMOJDatabase.Delete("phpsessid", {
                    token: this.SessionID
                }));
                Output.Log("Session " + this.SessionID + " expired");
            }
        }

        let SessionUsername: string = await this.Fetch(new URL("http://www.xmoj.tech/template/bs3/profile.php"))
            .then((Response) => {
                return Response.text();
            }).then((Response) => {
                let SessionUsername = Response.substring(Response.indexOf("user_id=") + 8);
                SessionUsername = SessionUsername.substring(0, SessionUsername.indexOf("'"));
                return SessionUsername;
            }).catch((Error) => {
                Output.Error("Check token failed: " + Error + "\n" +
                    "PHPSessionID: \"" + this.SessionID + "\"\n" +
                    "Username    : \"" + this.Username + "\"\n");
                return "";
            });
        if (SessionUsername == "") {
            Output.Debug("Check token failed: Session invalid\n" +
                "PHPSessionID: \"" + this.SessionID + "\"\n");
            return new Result(false, "令牌不合法");
        }
        if (SessionUsername != this.Username) {
            Output.Debug("Check token failed: Session and username not match \n" +
                "PHPSessionID   : \"" + this.SessionID + "\"\n" +
                "SessionUsername: \"" + SessionUsername + "\"\n" +
                "Username       : \"" + this.Username + "\"\n");
            return new Result(false, "令牌不匹配");
        }

        ThrowErrorIfFailed(await this.XMOJDatabase.Insert("phpsessid", {
            token: this.SessionID,
            user_id: this.Username,
            create_time: new Date().getTime()
        }));
        Output.Log("Record session: " + this.SessionID + " for " + this.Username);

        return new Result(true, "令牌匹配");
    }
    public IfUserExist = async (Username: string): Promise<Result> => {
        return await this.Fetch(new URL("http://www.xmoj.tech/userinfo.php?user=" + Username))
            .then((Response) => {
                return Response.text();
            }).then((Response) => {
                return new Result(true, "用户检查成功", {
                    "Exist": Response.indexOf("No such User!") === -1
                });
            }).catch((Error) => {
                Output.Error("Check user exist failed: " + Error + "\n" +
                    "Username: \"" + Username + "\"\n");
                return new Result(false, "用户检查失败");
            });
    }
    public IsAdmin = (): boolean => {
        return this.AdminUserList.indexOf(this.Username) !== -1;
    }
    public VerifyCaptcha = async (CaptchaToken: string): Promise<Result> => {
        const ErrorDescriptions: Object = {
            "missing-input-secret": "密钥为空",
            "invalid-input-secret": "密钥不正确",
            "missing-input-response": "验证码令牌为空",
            "invalid-input-response": "验证码令牌不正确或已过期",
            "invalid-widget-id": "解析出的组件编号不正确",
            "invalid-parsed-secret": "解析出的密钥不正确",
            "bad-request": "请求格式错误",
            "timeout-or-duplicate": "相同验证码已经校验过",
            "internal-error": "服务器错误"
        };
        // return new Result(true, "验证码检测跳过");
        if (CaptchaToken === "") {
            return new Result(false, "验证码没有完成");
        }
        let VerifyFormData = new FormData();
        VerifyFormData.append("secret", CaptchaSecretKey);
        VerifyFormData.append("response", CaptchaToken);
        VerifyFormData.append("remoteip", this.RemoteIP);
        const VerifyResult = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            body: JSON.stringify({
                secret: CaptchaSecretKey,
                response: CaptchaToken,
                remoteip: this.RemoteIP
            }),
            headers: {
                "Content-Type": "application/json"
            },
            method: 'POST',
        }).then((Response) => {
            return Response.json();
        });
        if (VerifyResult["success"]) {
            return new Result(true, "验证码通过");
        }
        else {
            let ErrorString: string = "验证没有通过：";
            for (let i = 0; i < VerifyResult["error-codes"].length; i++) {
                ErrorString += (ErrorDescriptions[VerifyResult["error-codes"][i]] == null ? VerifyResult["error-codes"][i] : ErrorDescriptions[VerifyResult["error-codes"][i]]) + " ";
            }
            ErrorString = ErrorString.trimEnd();
            return new Result(false, ErrorString);
        }
    }
    public GetProblemScore = async (ProblemID: number): Promise<number> => {
        return await this.Fetch(new URL("http://www.xmoj.tech/status.php?user_id=" + this.Username + "&problem_id=" + ProblemID))
            .then((Response) => {
                return Response.text();
            }).then((Response) => {
                let ParsedDocument: cheerio.CheerioAPI = cheerio.load(Response);
                let ResultTable = ParsedDocument("#result-tab");
                if (ResultTable.length == 0) {
                    Output.Error("Get problem score failed: Cannot find table element\n" +
                        "ProblemID: \"" + ProblemID + "\"\n" +
                        "Username : \"" + this.Username + "\"\n");
                    ThrowErrorIfFailed(new Result(false, "获取题目分数失败"));
                }
                let MaxScore: number = 0;
                let ResultTableBody = ResultTable.children().eq(1);
                for (let i = 0; i < ResultTableBody.children().length; i++) {
                    let ResultRow = ResultTableBody.children().eq(i);
                    if (ResultRow.children().eq(4).text().trim() === "正确") {
                        return 100;
                    }
                    else if (ResultRow.children().eq(4).children().length == 2) {
                        let ScoreSpan = ResultRow.children().eq(4).children().eq(1);
                        if (ScoreSpan.length == 0) {
                            Output.Error("Get problem score failed: Cannot find score span\n" +
                                "ProblemID: \"" + ProblemID + "\"\n" +
                                "Username : \"" + this.Username + "\"\n");
                            ThrowErrorIfFailed(new Result(false, "获取题目分数失败"));
                        }
                        let Score: string = ScoreSpan.text().trim();
                        MaxScore = Math.max(MaxScore, parseInt(Score.substring(0, Score.length - 1)));
                    }
                }
                return MaxScore;
            }).catch((Error) => {
                Output.Error("Get user score failed: " + Error + "\n" +
                    "ProblemID: \"" + ProblemID + "\"\n" +
                    "Username : \"" + this.Username + "\"\n");
                ThrowErrorIfFailed(new Result(false, "获取题目分数失败"));
                return 0;
            });
    }
    private AddBBSMention = async (ToUserID: string, PostID: number): Promise<void> => {
        if (ToUserID === this.Username) {
            return;
        }
        if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_mention", {
            to_user_id: ToUserID,
            post_id: PostID
        }))["TableSize"] === 0) {
            ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_mention", {
                to_user_id: ToUserID,
                post_id: PostID,
                bbs_mention_time: new Date().getTime()
            }));
        }
        else {
            ThrowErrorIfFailed(await this.XMOJDatabase.Update("bbs_mention", {
                bbs_mention_time: new Date().getTime()
            }, {
                to_user_id: ToUserID,
                post_id: PostID
            }));
        }
    };
    private AddMailMention = async (FromUserID: string, ToUserID: string): Promise<void> => {
        if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("short_message_mention", {
            from_user_id: FromUserID,
            to_user_id: ToUserID
        }))["TableSize"] === 0) {
            ThrowErrorIfFailed(await this.XMOJDatabase.Insert("short_message_mention", {
                from_user_id: FromUserID,
                to_user_id: ToUserID,
                mail_mention_time: new Date().getTime()
            }));
        }
        else {
            ThrowErrorIfFailed(await this.XMOJDatabase.Update("short_message_mention", {
                mail_mention_time: new Date().getTime()
            }, {
                from_user_id: FromUserID,
                to_user_id: ToUserID
            }));
        }
    };
    private ProcessFunctions = {
        NewPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ProblemID": "number",
                "Title": "string",
                "Content": "string",
                "CaptchaSecretKey": "string"
            }));
            ThrowErrorIfFailed(await this.VerifyCaptcha(Data["CaptchaSecretKey"]));
            let PostID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_post", {
                user_id: this.Username,
                problem_id: Data["ProblemID"],
                title: Data["Title"],
                post_time: new Date().getTime()
            }))["InsertID"];
            let ReplyID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_reply", {
                user_id: this.Username,
                post_id: PostID,
                content: Data["Content"],
                reply_time: new Date().getTime()
            }))["InsertID"];
            return new Result(true, "创建讨论成功", {
                PostID: PostID,
                ReplyID: ReplyID
            });
        },
        NewReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "PostID": "number",
                "Content": "string",
                "CaptchaSecretKey": "string"
            }));
            ThrowErrorIfFailed(await this.VerifyCaptcha(Data["CaptchaSecretKey"]));

            let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", ["title", "user_id"], { post_id: Data["PostID"] }));
            if (Post.toString() == "") {
                return new Result(false, "未找到讨论");
            }

            Data["Content"] = Data["Content"].trim();
            if (Data["Content"] === "") {
                return new Result(false, "内容不能为空");
            }
            let MentionPeople = new Array<string>();
            let StringToReplace = new Array<string>();
            for (let Match of String(Data["Content"]).matchAll(/@([a-zA-Z0-9]+)/g)) {
                if (ThrowErrorIfFailed(await this.IfUserExist(Match[1]))["Exist"]) {
                    MentionPeople.push(Match[1]);
                    StringToReplace.push(" <a class=\"link-info\" href=\"http://www.xmoj.tech/userinfo.php?user=" + Match[1] + "\">@" + Match[1] + "</a> ");
                }
                else {
                    StringToReplace.push("@" + Match[1]);
                }
            }
            Data["Content"] = String(Data["Content"]).replace(/@([a-zA-Z0-9]+)/g, (Match) => {
                return StringToReplace.shift() || "";
            });
            MentionPeople = Array.from(new Set(MentionPeople));
            let ReplyID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_reply", {
                user_id: this.Username,
                post_id: Data["PostID"],
                content: Data["Content"],
                reply_time: new Date().getTime()
            }))["InsertID"];

            for (let i in MentionPeople) {
                await this.AddBBSMention(MentionPeople[i], Data["PostID"]);
            }

            if (Post[0]["user_id"] !== this.Username) {
                await this.AddBBSMention(Post[0]["user_id"], Data["PostID"]);
            }

            return new Result(true, "创建回复成功", {
                ReplyID: ReplyID
            });
        },
        GetPosts: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ProblemID": "number",
                "Page": "number"
            }));
            let ResponseData = {
                Posts: new Array<Object>,
                PageCount: Math.ceil(ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_post"))["TableSize"] / 10)
            };
            if (ResponseData.PageCount === 0) {
                return new Result(true, "获得讨论列表成功", ResponseData);
            }
            if (Data["Page"] < 1 || Data["Page"] > ResponseData.PageCount) {
                return new Result(false, "参数页数不在范围1~" + ResponseData.PageCount + "内");
            }
            let Posts = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", [], (Data["ProblemID"] === 0 ? undefined : { problem_id: Data["ProblemID"] }), {
                Order: "post_id",
                OrderIncreasing: false,
                Limit: 10,
                Offset: (Data["Page"] - 1) * 10
            }));
            for (let i in Posts) {
                let Post = Posts[i];
                let ReplyCount: number = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", { post_id: Post["post_id"] }))["TableSize"];
                let LastReply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id", "reply_time"], { post_id: Post["post_id"] }, {
                    Order: "reply_time",
                    OrderIncreasing: false,
                    Limit: 1
                }));
                if (ReplyCount === 0) {
                    await this.XMOJDatabase.Delete("bbs_post", {
                        post_id: Post["post_id"]
                    });
                    continue;
                }

                let LockData = {
                    Locked: false,
                    LockPerson: "",
                    LockTime: 0
                };
                let Locked = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_lock", [], {
                    post_id: Post["post_id"]
                }));
                if (Locked.toString() !== "") {
                    LockData.Locked = true;
                    LockData.LockPerson = Locked[0]["lock_person"];
                    LockData.LockTime = Locked[0]["lock_time"];
                }

                ResponseData.Posts.push({
                    PostID: Post["post_id"],
                    UserID: Post["user_id"],
                    ProblemID: Post["problem_id"],
                    Title: Post["title"],
                    PostTime: Post["post_time"],
                    ReplyCount: ReplyCount,
                    LastReplyUserID: LastReply[0]["user_id"],
                    LastReplyTime: LastReply[0]["reply_time"],
                    Lock: LockData
                });
            }
            return new Result(true, "获得讨论列表成功", ResponseData);
        },
        GetPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "PostID": "number",
                "Page": "number"
            }));
            let ResponseData = {
                UserID: "",
                ProblemID: 0,
                Title: "",
                PostTime: 0,
                Reply: new Array<Object>(),
                PageCount: 0,
                Lock: {
                    Locked: false,
                    LockPerson: "",
                    LockTime: 0
                }
            };
            let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", [], {
                post_id: Data["PostID"]
            }));
            if (Post.toString() == "") {
                return new Result(false, "未找到讨论");
            }
            ResponseData.PageCount = Math.ceil(ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", { post_id: Data["PostID"] }))["TableSize"] / 10);
            if (ResponseData.PageCount === 0) {
                return new Result(true, "获得讨论成功", ResponseData);
            }
            if (Data["Page"] < 1 || Data["Page"] > ResponseData.PageCount) {
                return new Result(false, "参数页数不在范围1~" + ResponseData.PageCount + "内");
            }
            ResponseData.UserID = Post[0]["user_id"];
            ResponseData.ProblemID = Post[0]["problem_id"];
            ResponseData.Title = Post[0]["title"];
            ResponseData.PostTime = Post[0]["post_time"];

            let Locked = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_lock", [], {
                post_id: Data["PostID"]
            }));
            if (Locked.toString() !== "") {
                ResponseData.Lock.Locked = true;
                ResponseData.Lock.LockPerson = Locked[0]["lock_person"];
                ResponseData.Lock.LockTime = Locked[0]["lock_time"];
            }

            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", [], { post_id: Data["PostID"] }, {
                Order: "reply_time",
                OrderIncreasing: true,
                Limit: 10,
                Offset: (Data["Page"] - 1) * 10
            }));
            for (let i in Reply) {
                let ReplyItem = Reply[i];
                ResponseData.Reply.push({
                    ReplyID: ReplyItem["reply_id"],
                    UserID: ReplyItem["user_id"],
                    Content: ReplyItem["content"],
                    ReplyTime: ReplyItem["reply_time"]
                });
            }
            return new Result(true, "获得讨论成功", ResponseData);
        },
        LockPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "PostID": "number"
            }));
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_post", {
                post_id: Data["PostID"]
            }))["TableSize"] === 0) {
                return new Result(false, "未找到讨论");
            }
            if (!this.IsAdmin()) {
                return new Result(false, "没有权限锁定此讨论");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_lock", {
                post_id: Data["PostID"]
            }))["TableSize"] === 1) {
                return new Result(false, "讨论已经被锁定");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_lock", {
                post_id: Data["PostID"],
                lock_person: this.Username,
                lock_time: new Date().getTime()
            }));
            return new Result(true, "讨论锁定成功");
        },
        UnlockPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "PostID": "number"
            }));
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_post", {
                post_id: Data["PostID"]
            }))["TableSize"] === 0) {
                return new Result(false, "未找到讨论");
            }
            if (!this.IsAdmin()) {
                return new Result(false, "没有权限锁定此讨论");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_lock", {
                post_id: Data["PostID"]
            }))["TableSize"] === 0) {
                return new Result(false, "讨论已经被解锁");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Delete("bbs_lock", {
                post_id: Data["PostID"]
            }));
            return new Result(true, "讨论解锁成功");
        },
        EditReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ReplyID": "number",
                "Content": "string"
            }));
            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["post_id", "user_id"], {
                reply_id: Data["ReplyID"]
            }));
            if (Reply.toString() === "") {
                return new Result(false, "未找到回复");
            }
            if (!this.IsAdmin() && Reply[0]["user_id"] !== this.Username) {
                return new Result(false, "没有权限编辑此回复");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_post", {
                post_id: Reply[0]["post_id"]
            }))["TableSize"] === 0) {
                return new Result(false, "未找到讨论");
            }

            if (!this.IsAdmin() && ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_lock", {
                post_id: Reply[0]["post_id"]
            }))["TableSize"] === 1) {
                return new Result(false, "讨论已被锁定");
            }

            Data["Content"] = Data["Content"].trim();
            if (Data["Content"] === "") {
                return new Result(false, "内容不能为空");
            }
            let MentionPeople = new Array<string>();
            let StringToReplace = new Array<string>();
            for (let Match of String(Data["Content"]).matchAll(/@([a-zA-Z0-9]+)/g)) {
                if (ThrowErrorIfFailed(await this.IfUserExist(Match[1]))["Exist"]) {
                    MentionPeople.push(Match[1]);
                    StringToReplace.push(" <a class=\"link-info\" href=\"http://www.xmoj.tech/userinfo.php?user=" + Match[1] + "\">@" + Match[1] + "</a> ");
                }
                else {
                    StringToReplace.push("@" + Match[1]);
                }
            }
            Data["Content"] = String(Data["Content"]).replace(/@([a-zA-Z0-9]+)/g, (Match) => {
                return StringToReplace.shift() || "";
            });
            Data["Content"] = String(Data["Content"]).trim() + "\n<br><span class=\"text-muted\" style=\"font-size: 12px\">已于 " + new Date().toLocaleString() + " 编辑</span>";
            await this.XMOJDatabase.Update("bbs_reply", {
                content: Data["Content"]
            }, {
                reply_id: Data["ReplyID"]
            });
            for (let i in MentionPeople) {
                await this.AddBBSMention(MentionPeople[i], Reply[0]["post_id"]);
            }
            return new Result(true, "编辑回复成功");
        },
        DeletePost: async (Data: object, CheckUserID: boolean = true): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "PostID": "number"
            }));
            let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", ["user_id"], {
                post_id: Data["PostID"]
            }));
            if (Post.toString() === "") {
                return new Result(false, "未找到讨论");
            }
            if (!this.IsAdmin() && ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_lock", {
                post_id: Data["PostID"]
            }))["TableSize"] === 1) {
                return new Result(false, "讨论已被锁定");
            }
            if (!this.IsAdmin() && CheckUserID && Post[0]["user_id"] !== this.Username) {
                return new Result(false, "没有权限删除此讨论");
            }
            let Replies = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["reply_id"], {
                post_id: Data["PostID"]
            }));
            for (let i in Replies) {
                await this.XMOJDatabase.Delete("bbs_reply", {
                    reply_id: Replies[i]["reply_id"]
                });
            }
            await this.XMOJDatabase.Delete("bbs_post", { post_id: Data["PostID"] });
            return new Result(true, "删除讨论成功");
        },
        DeleteReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ReplyID": "number"
            }));
            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id", "post_id"], { reply_id: Data["ReplyID"] }));
            if (Reply.toString() === "") {
                return new Result(false, "未找到回复");
            }
            if (!this.IsAdmin() && ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_lock", {
                post_id: Reply[0]["post_id"]
            }))["TableSize"] === 1) {
                return new Result(false, "讨论已被锁定");
            }
            if (!this.IsAdmin() && Reply[0]["user_id"] !== this.Username) {
                return new Result(false, "没有权限删除此回复");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", {
                post_id: Reply[0]["post_id"]
            }))["TableSize"] === 1) {
                await this.ProcessFunctions.DeletePost({ PostID: Reply[0]["post_id"] }, false);
            }
            await this.XMOJDatabase.Delete("bbs_reply", { reply_id: Data["ReplyID"] });
            return new Result(true, "删除回复成功");
        },
        GetBBSMentionList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {}));
            let ResponseData = {
                MentionList: new Array<Object>()
            };
            let Mentions = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_mention", ["bbs_mention_id", "post_id", "bbs_mention_time"], {
                to_user_id: this.Username
            }));
            for (let i in Mentions) {
                let Mention = Mentions[i];
                let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", ["user_id", "title"], { post_id: Mention["post_id"] }));
                if (Post.toString() === "") {
                    continue;
                }
                ResponseData.MentionList.push({
                    MentionID: Mention["bbs_mention_id"],
                    PostID: Mention["post_id"],
                    PostTitle: Post[0]["title"],
                    MentionTime: Mention["bbs_mention_time"]
                });
            }
            return new Result(true, "获得讨论提及列表成功", ResponseData);
        },
        GetMailMentionList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {}));
            let ResponseData = {
                MentionList: new Array<Object>()
            };
            let Mentions = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message_mention", ["mail_mention_id", "from_user_id", "mail_mention_time"], {
                to_user_id: this.Username
            }));
            for (let i in Mentions) {
                let Mention = Mentions[i];
                ResponseData.MentionList.push({
                    MentionID: Mention["mail_mention_id"],
                    FromUserID: Mention["from_user_id"],
                    MentionTime: Mention["mail_mention_time"]
                });
            }
            return new Result(true, "获得短消息提及列表成功", ResponseData);
        },
        ReadBBSMention: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "MentionID": "number"
            }));
            let MentionData = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_mention", ["to_user_id"], {
                bbs_mention_id: Data["MentionID"]
            }));
            if (MentionData.toString() === "") {
                return new Result(false, "未找到提及");
            }
            if (MentionData[0]["to_user_id"] !== this.Username) {
                return new Result(false, "没有权限阅读此提及");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Delete("bbs_mention", {
                bbs_mention_id: Data["MentionID"]
            }));
            return new Result(true, "阅读讨论提及成功");
        },
        ReadMailMention: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "MentionID": "number"
            }));
            let MentionData = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message_mention", ["to_user_id"], {
                mail_mention_id: Data["MentionID"]
            }));
            if (MentionData.toString() === "") {
                return new Result(false, "未找到提及");
            }
            if (MentionData[0]["to_user_id"] !== this.Username) {
                return new Result(false, "没有权限阅读此提及");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Delete("short_message_mention", {
                mail_mention_id: Data["MentionID"]
            }));
            return new Result(true, "阅读短消息提及成功");
        },
        GetMailList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {}));
            let ResponseData = {
                MailList: new Array<Object>()
            };
            let OtherUsernameList = new Array<string>();
            let Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["message_from"], { message_to: this.Username }, {}, true));
            for (let i in Mails) {
                OtherUsernameList.push(Mails[i]["message_from"]);
            }
            Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["message_to"], { message_from: this.Username }, {}, true));
            for (let i in Mails) {
                OtherUsernameList.push(Mails[i]["message_to"]);
            }
            OtherUsernameList = Array.from(new Set(OtherUsernameList));
            for (let i in OtherUsernameList) {
                let LastMessageFrom = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["content", "send_time"], {
                    message_from: OtherUsernameList[i],
                    message_to: this.Username
                }, {
                    Order: "send_time",
                    OrderIncreasing: false,
                    Limit: 1
                }));
                let LastMessageTo = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["content", "send_time"], {
                    message_from: this.Username,
                    message_to: OtherUsernameList[i]
                }, {
                    Order: "send_time",
                    OrderIncreasing: false,
                    Limit: 1
                }));
                let LastMessage;
                if (LastMessageFrom.toString() === "") {
                    LastMessage = LastMessageTo;
                }
                else if (LastMessageTo.toString() === "") {
                    LastMessage = LastMessageFrom;
                }
                else {
                    LastMessage = LastMessageFrom[0]["send_time"] > LastMessageTo[0]["send_time"] ? LastMessageFrom : LastMessageTo;
                }
                let UnreadCount = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("short_message", {
                    message_from: OtherUsernameList[i],
                    message_to: this.Username,
                    is_read: 0
                }));
                ResponseData.MailList.push({
                    OtherUser: OtherUsernameList[i],
                    LastsMessage: LastMessage[0]["content"],
                    SendTime: LastMessage[0]["send_time"],
                    UnreadCount: UnreadCount["TableSize"]
                });
            }
            ResponseData.MailList.sort((a, b) => {
                return a["SendTime"] < b["SendTime"] ? 1 : -1;
            });
            return new Result(true, "获得短消息列表成功", ResponseData);
        },
        SendMail: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ToUser": "string",
                "Content": "string"
            }));
            if (ThrowErrorIfFailed(await this.IfUserExist(Data["ToUser"]))["Exist"] === false) {
                return new Result(false, "未找到用户");
            }
            if (Data["ToUser"] === this.Username) {
                return new Result(false, "无法给自己发送短消息");
            }
            let MessageID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("short_message", {
                message_from: this.Username,
                message_to: Data["ToUser"],
                content: Data["Content"],
                send_time: new Date().getTime()
            }))["InsertID"];
            await this.AddMailMention(this.Username, Data["ToUser"]);
            return new Result(true, "发送短消息成功", {
                MessageID: MessageID
            });
        },
        GetMail: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "OtherUser": "string"
            }));
            let ResponseData = {
                Mail: new Array<Object>()
            };
            let Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", [], {
                message_from: Data["OtherUser"],
                message_to: this.Username
            }, {
                Order: "send_time",
                OrderIncreasing: false
            }));
            for (let i in Mails) {
                let Mail = Mails[i];
                ResponseData.Mail.push({
                    MessageID: Mail["message_id"],
                    FromUser: Mail["message_from"],
                    ToUser: Mail["message_to"],
                    Content: Mail["content"],
                    SendTime: Mail["send_time"],
                    IsRead: Mail["is_read"]
                });
            }
            Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", [], {
                message_from: this.Username,
                message_to: Data["OtherUser"]
            }, {
                Order: "send_time",
                OrderIncreasing: false
            }));
            for (let i in Mails) {
                let Mail = Mails[i];
                ResponseData.Mail.push({
                    MessageID: Mail["message_id"],
                    FromUser: Mail["message_from"],
                    ToUser: Mail["message_to"],
                    Content: Mail["content"],
                    SendTime: Mail["send_time"],
                    IsRead: Mail["is_read"]
                });
            }
            ResponseData.Mail.sort((a, b) => {
                return a["SendTime"] < b["SendTime"] ? 1 : -1;
            });
            await this.XMOJDatabase.Update("short_message", {
                is_read: 1
            }, {
                message_from: Data["OtherUser"],
                message_to: this.Username
            });
            return new Result(true, "获得短消息成功", ResponseData);
        },
        UploadStd: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ProblemID": "number"
            }));
            let ProblemID = Data["ProblemID"];
            if (await this.GetProblemScore(ProblemID) !== 100) {
                return new Result(false, "没有权限上传此标程");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("std_answer", {
                problem_id: ProblemID
            }))["TableSize"] !== 0) {
                return new Result(true, "此题已经有人上传标程");
            }
            var StdCode: string = "";
            var PageIndex: number = 0;
            while (StdCode === "") {
                await this.Fetch(new URL("http://www.xmoj.tech/problemstatus.php?id=" + ProblemID + "&page=" + PageIndex))
                    .then((Response) => {
                        return Response.text();
                    }).then(async (Response) => {
                        if (Response.indexOf("[NEXT]") === -1) {
                            StdCode = "这道题没有标程（即用户std没有AC这道题）";
                            return;
                        }
                        let ParsedDocument: cheerio.CheerioAPI = cheerio.load(Response);
                        let SubmitTable = ParsedDocument("#problemstatus");
                        if (SubmitTable.length == 0) {
                            Output.Error("Get Std code failed: Cannot find submit table\n" +
                                "ProblemID: \"" + ProblemID + "\"\n" +
                                "Username : \"" + this.Username + "\"\n");
                            ThrowErrorIfFailed(new Result(false, "获取标程失败"));
                        }
                        let SubmitTableBody = SubmitTable.children().eq(1);
                        for (let i = 1; i < SubmitTableBody.children().length; i++) {
                            let SubmitRow = SubmitTableBody.children().eq(i);
                            if (SubmitRow.children().eq(2).text().trim() === "std") {
                                let SID: string = SubmitRow.children().eq(1).text();
                                if (SID.indexOf("(") != -1) {
                                    SID = SID.substring(0, SID.indexOf("("));
                                }
                                await this.Fetch(new URL("http://www.xmoj.tech/getsource.php?id=" + SID))
                                    .then((Response) => {
                                        return Response.text();
                                    })
                                    .then((Response) => {
                                        Response = Response.substring(0, Response.indexOf("<!--not cached-->")).trim();
                                        if (Response === "I am sorry, You could not view this code!") {
                                            Output.Error("Get Std code failed: Cannot view code\n" +
                                                "ProblemID: \"" + ProblemID + "\"\n" +
                                                "Username : \"" + this.Username + "\"\n");
                                            ThrowErrorIfFailed(new Result(false, "获取标程失败"));
                                        }
                                        Response = Response.substring(0, Response.indexOf("/**************************************************************")).trim();
                                        StdCode = Response;
                                    });
                            }
                        }
                    }).catch((Error) => {
                        Output.Error("Get Std code failed: " + Error + "\n" +
                            "ProblemID: \"" + ProblemID + "\"\n" +
                            "Username : \"" + this.Username + "\"\n");
                        ThrowErrorIfFailed(new Result(false, "获取标程失败"));
                    });
                PageIndex++;
            }

            ThrowErrorIfFailed(await this.XMOJDatabase.Insert("std_answer", {
                problem_id: Data["ProblemID"],
                std_code: StdCode
            }));
            return new Result(true, "标程上传成功");
        },
        GetStdList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {}));
            let ResponseData = {
                StdList: new Array<number>()
            };
            let StdList = ThrowErrorIfFailed(await this.XMOJDatabase.Select("std_answer", ["problem_id"]));
            for (let i in StdList) {
                ResponseData.StdList.push(StdList[i]["problem_id"]);
            }
            return new Result(true, "获得标程列表成功", ResponseData);
        },
        GetStd: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "ProblemID": "number"
            }));
            if (await this.GetProblemScore(Data["ProblemID"]) < 50) {
                return new Result(false, "没有权限获取此标程");
            }
            let Std = ThrowErrorIfFailed(await this.XMOJDatabase.Select("std_answer", ["std_code"], {
                problem_id: Data["ProblemID"]
            }));
            if (Std.toString() === "") {
                return new Result(false, "此题还没有人上传标程");
            }
            return new Result(true, "获得标程成功", {
                "StdCode": Std[0]["std_code"]
            });
        },
        NewBadge: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "UserID": "string"
            }));
            if (!this.IsAdmin()) {
                return new Result(false, "没有权限创建此标签");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Insert("badge", {
                user_id: Data["UserID"]
            }));
            return new Result(true, "创建标签成功");
        },
        EditBadge: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "UserID": "string",
                "BackgroundColor": "string",
                "Color": "string",
                "Content": "string"
            }));
            if (!this.IsAdmin() && Data["UserID"] !== this.Username) {
                return new Result(false, "没有权限编辑此标签");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("badge", {
                user_id: Data["UserID"]
            }))["TableSize"] === 0) {
                return new Result(false, "未找到标签");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Update("badge", {
                background_color: Data["BackgroundColor"],
                color: Data["Color"],
                content: Data["Content"]
            }, {
                user_id: Data["UserID"]
            }));
            return new Result(true, "编辑标签成功");
        },
        GetBadge: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "UserID": "string"
            }));
            let BadgeData = ThrowErrorIfFailed(await this.XMOJDatabase.Select("badge", ["background_color", "color", "content"], {
                user_id: Data["UserID"]
            }));
            if (BadgeData.toString() == "") {
                return new Result(false, "未找到标签");
            }
            return new Result(true, "获得标签成功", {
                Content: BadgeData[0]["content"],
                BackgroundColor: BadgeData[0]["background_color"],
                Color: BadgeData[0]["color"]
            });
        },
        DeleteBadge: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.CheckParams(Data, {
                "UserID": "string"
            }));
            if (!this.IsAdmin()) {
                return new Result(false, "没有权限删除此标签");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Delete("badge", {
                user_id: Data["UserID"]
            }));
            return new Result(true, "删除标签成功");
        }
    };
    constructor(RequestData: Request, Environment) {
        this.XMOJDatabase = new Database(Environment.DB);
        this.RequestData = RequestData;
        this.RemoteIP = RequestData.headers.get("CF-Connecting-IP") || "";
    }
    public async Process(): Promise<Result> {
        try {
            let PathName = new URL(this.RequestData.url).pathname;
            PathName = PathName === "/" ? "/index" : PathName;
            PathName = PathName.substring(1);
            if (this.ProcessFunctions[PathName] === undefined) {
                throw new Result(false, "访问的页面不存在");
            }
            if (this.RequestData.method !== "POST") {
                throw new Result(false, "不允许此请求方式");
            }
            if (this.RequestData.headers.get("content-type") !== "application/json") {
                throw new Result(false, "不允许此资源类型");
            }
            let RequestJSON: object;
            try {
                RequestJSON = await this.RequestData.json();
            }
            catch (Error) {
                throw new Result(false, "请求格式有误");
            }
            ThrowErrorIfFailed(this.CheckParams(RequestJSON, {
                "Authentication": "object",
                "Data": "object"
            }));
            var TokenFailedCount = 0;
            while (true) {
                if ((await this.CheckToken(RequestJSON["Authentication"])).Data["Success"]) {
                    break;
                }
                TokenFailedCount++;
                if (TokenFailedCount >= 2) {
                    ThrowErrorIfFailed(await this.CheckToken(RequestJSON["Authentication"]));
                    break;
                }
            }
            throw await this.ProcessFunctions[PathName](RequestJSON["Data"]);
        }
        catch (ResponseData) {
            if (!(ResponseData instanceof Result)) {
                Output.Error(ResponseData);
                ResponseData = new Result(false, "服务器运行错误：" + String(ResponseData).split("\n")[0]);
            }
            return ResponseData;
        }
    }
}
