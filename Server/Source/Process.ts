import { Result, ThrowErrorIfFailed } from "./Result";
import { Database } from "./Database";
import { Security } from "./Security";
import { Output } from "./Output";

const AdminUserList: Array<string> = ["chenlangning", "zhuchenrui2"];

export class Process {
    private XMOJDatabase: Database;
    private RequestData: Request;
    private SecurityChecker: Security = new Security();
    private ProcessFunctions = {
        NewPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ProblemID": "number",
                "Title": "string",
                "Content": "string",
                "CaptchaSecretKey": "string"
            }));
            ThrowErrorIfFailed(await this.SecurityChecker.VerifyCaptcha(Data["CaptchaSecretKey"]));
            let PostID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_post", {
                user_id: this.SecurityChecker.GetUsername(),
                problem_id: Data["ProblemID"],
                title: this.SecurityChecker.HTMLEscape(Data["Title"])
            }))["InsertID"];
            let ReplyID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_reply", {
                user_id: this.SecurityChecker.GetUsername(),
                post_id: PostID,
                content: this.SecurityChecker.HTMLEscape(Data["Content"])
            }))["InsertID"];
            return new Result(true, "创建讨论成功", {
                PostID: PostID,
                ReplyID: ReplyID
            });
        },
        NewReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "PostID": "number",
                "Content": "string",
                "CaptchaSecretKey": "string"
            }));
            ThrowErrorIfFailed(await this.SecurityChecker.VerifyCaptcha(Data["CaptchaSecretKey"]));
            Data["Content"] = this.SecurityChecker.HTMLEscape(Data["Content"]);
            Data["Content"] = Data["Content"].trim();
            if (Data["Content"] === "") {
                return new Result(false, "内容不能为空");
            }
            let MentionPeople = new Array<String>();
            let StringToReplace = new Array<string>();
            for (let Match of String(Data["Content"]).matchAll(/@([a-zA-Z0-9]+)/g)) {
                if (ThrowErrorIfFailed(await this.SecurityChecker.IfUserExist(Match[1]))["Exist"]) {
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
            let ReplyID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("bbs_reply", {
                user_id: this.SecurityChecker.GetUsername(),
                post_id: Data["PostID"],
                content: Data["Content"]
            }))["InsertID"];

            for (let i in MentionPeople) {
                await this.XMOJDatabase.Insert("bbs_mention", {
                    user_id: MentionPeople[i],
                    reply_id: ReplyID
                });
            }

            return new Result(true, "创建回复成功", {
                ReplyID: ReplyID
            });
        },
        GetPosts: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
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
                    await this.XMOJDatabase.Delete("bbs_post", { post_id: Post["post_id"] });
                    continue;
                }
                ResponseData.Posts.push({
                    PostID: Post["post_id"],
                    UserID: Post["user_id"],
                    ProblemID: Post["problem_id"],
                    Title: Post["title"],
                    PostTime: Post["post_time"],
                    ReplyCount: ReplyCount,
                    LastReplyUserID: LastReply[0]["user_id"],
                    LastReplyTime: LastReply[0]["reply_time"]
                });
            }
            return new Result(true, "获得讨论列表成功", ResponseData);
        },
        GetPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "PostID": "number",
                "Page": "number"
            }));
            let ResponseData = {
                UserID: "",
                ProblemID: 0,
                Title: "",
                PostTime: "",
                Reply: new Array<Object>(),
                PageCount: 0
            };
            let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", [], { post_id: Data["PostID"] }));
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
        EditReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ReplyID": "number",
                "Content": "string"
            }));
            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id"], { reply_id: Data["ReplyID"] }));
            if (Reply.toString() == "") {
                return new Result(false, "未找到回复");
            }
            if (AdminUserList.indexOf(this.SecurityChecker.GetUsername()) === -1 && Reply[0]["user_id"] != this.SecurityChecker.GetUsername()) {
                return new Result(false, "没有权限编辑此回复");
            }
            Data["Content"] = this.SecurityChecker.HTMLEscape(Data["Content"]);
            Data["Content"] = Data["Content"].trim();
            if (Data["Content"] === "") {
                return new Result(false, "内容不能为空");
            }
            let MentionPeople = new Array<String>();
            let StringToReplace = new Array<string>();
            for (let Match of String(Data["Content"]).matchAll(/@([a-zA-Z0-9]+)/g)) {
                if (ThrowErrorIfFailed(await this.SecurityChecker.IfUserExist(Match[1]))["Exist"]) {
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
            await this.XMOJDatabase.Delete("bbs_mention", {
                reply_id: Data["ReplyID"]
            });
            for (let i in MentionPeople) {
                await this.XMOJDatabase.Insert("bbs_mention", {
                    user_id: MentionPeople[i],
                    reply_id: Data["ReplyID"]
                });
            }
            return new Result(true, "编辑回复成功");
        },
        DeletePost: async (Data: object, CheckUserID: boolean = true): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "PostID": "number"
            }));
            let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", ["user_id"], { post_id: Data["PostID"] }));
            if (Post.toString() == "") {
                return new Result(false, "未找到讨论");
            }
            if (AdminUserList.indexOf(this.SecurityChecker.GetUsername()) === -1 && CheckUserID && Post[0]["user_id"] != this.SecurityChecker.GetUsername()) {
                return new Result(false, "没有权限删除此讨论");
            }
            let Replies = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["reply_id"], { post_id: Data["PostID"] }));
            for (let i in Replies) {
                await this.XMOJDatabase.Delete("bbs_reply", { reply_id: Replies[i]["reply_id"] });
            }
            await this.XMOJDatabase.Delete("bbs_post", { post_id: Data["PostID"] });
            return new Result(true, "删除讨论成功");
        },
        DeleteReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ReplyID": "number"
            }));
            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id", "post_id"], { reply_id: Data["ReplyID"] }));
            if (Reply.toString() == "") {
                return new Result(false, "未找到回复");
            }
            if (AdminUserList.indexOf(this.SecurityChecker.GetUsername()) === -1 && Reply[0]["user_id"] != this.SecurityChecker.GetUsername()) {
                return new Result(false, "没有权限删除此回复");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", { post_id: Reply[0]["post_id"] }))["TableSize"] === 1) {
                await this.ProcessFunctions.DeletePost({ PostID: Reply[0]["post_id"] }, false);
            }
            await this.XMOJDatabase.Delete("bbs_reply", { reply_id: Data["ReplyID"] });
            return new Result(true, "删除回复成功");
        },
        GetMentionList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {}));
            let ResponseData = {
                MentionList: new Array<Object>()
            };
            let Mentions = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_mention", ["mention_id", "reply_id"], {
                user_id: this.SecurityChecker.GetUsername()
            }));
            for (let i in Mentions) {
                let Mention = Mentions[i];
                let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["post_id", "user_id", "reply_time"], {
                    reply_id: Mention["reply_id"]
                }));
                if (Reply.toString() == "") {
                    await this.XMOJDatabase.Delete("bbs_mention", {
                        mention_id: Mention["mention_id"]
                    });
                    continue;
                }
                let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", ["title"], {
                    post_id: Reply[0]["post_id"]
                }));
                if (Post.toString() == "") {
                    await this.XMOJDatabase.Delete("bbs_mention", {
                        mention_id: Mention["mention_id"]
                    });
                    continue;
                }
                let Page = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", {
                    post_id: Reply[0]["post_id"],
                    reply_time: {
                        Operator: "<",
                        Value: Reply[0]["reply_time"]
                    }
                }));
                if (Page.toString() == "") {
                    await this.XMOJDatabase.Delete("bbs_mention", {
                        mention_id: Mention["mention_id"]
                    });
                    continue;
                }
                ResponseData.MentionList.push({
                    MentionID: Mention["mention_id"],
                    ReplyID: Mention["reply_id"],
                    PostID: Reply[0]["post_id"],
                    UserID: Reply[0]["user_id"],
                    Title: Post[0]["title"],
                    Page: Math.ceil(Page["TableSize"] / 10),
                });
            }
            return new Result(true, "获得提及列表成功", ResponseData);
        },
        ReadMention: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "MentionID": "number"
            }));
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_mention", {
                mention_id: Data["MentionID"]
            }))["TableSize"] === 0) {
                return new Result(false, "未找到提及");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Delete("bbs_mention", {
                mention_id: Data["MentionID"]
            }));
            return new Result(true, "阅读提及成功");
        },
        GetMailList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {}));
            let ResponseData = {
                MailList: new Array<Object>()
            };
            let Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["message_from", "content", "send_time"], { message_to: this.SecurityChecker.GetUsername() }));
            for (let i in Mails) {
                let Mail = Mails[i];
                let UnreadCount = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("short_message", {
                    message_from: Mail["message_from"],
                    message_to: this.SecurityChecker.GetUsername(),
                    is_read: 0
                }));
                ResponseData.MailList.push({
                    OtherUser: Mail["message_from"],
                    LastsMessage: Mail["content"],
                    SendTime: Mail["send_time"],
                    UnreadCount: UnreadCount["TableSize"]
                });
            }
            Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["message_to", "content", "send_time"], { message_from: this.SecurityChecker.GetUsername() }));
            for (let i in Mails) {
                let Mail = Mails[i];
                let UnreadCount = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("short_message", {
                    message_from: Mail["message_to"],
                    message_to: this.SecurityChecker.GetUsername(),
                    is_read: 0
                }));
                ResponseData.MailList.push({
                    OtherUser: Mail["message_to"],
                    LastsMessage: Mail["content"],
                    SendTime: Mail["send_time"],
                    UnreadCount: UnreadCount["TableSize"]
                });
            }
            for (let i = 0; i < ResponseData.MailList.length; i++) {
                for (let j = i + 1; j < ResponseData.MailList.length; j++) {
                    if (ResponseData.MailList[i]["OtherUser"] === ResponseData.MailList[j]["OtherUser"]) {
                        if (ResponseData.MailList[i]["SendTime"] < ResponseData.MailList[j]["SendTime"]) {
                            ResponseData.MailList[i] = ResponseData.MailList[j];
                        }
                        ResponseData.MailList.splice(j, 1);
                        j--;
                    }
                }
            }
            ResponseData.MailList.sort((a, b) => {
                return a["SendTime"] < b["SendTime"] ? 1 : -1;
            });
            for (let i in ResponseData.MailList) {
                ResponseData.MailList[i]["UnreadCount"] = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("short_message", {
                    message_from: ResponseData.MailList[i]["OtherUser"],
                    message_to: this.SecurityChecker.GetUsername(),
                    is_read: 0
                }))["TableSize"];
            }
            return new Result(true, "获得短消息列表成功", ResponseData);
        },
        SendMail: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ToUser": "string",
                "Content": "string"
            }));
            if (ThrowErrorIfFailed(await this.SecurityChecker.IfUserExist(Data["ToUser"]))["Exist"] === false) {
                return new Result(false, "未找到用户");
            }
            if (Data["ToUser"] === this.SecurityChecker.GetUsername()) {
                return new Result(false, "无法给自己发送短消息");
            }
            let MessageID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("short_message", {
                message_from: this.SecurityChecker.GetUsername(),
                message_to: Data["ToUser"],
                content: Data["Content"]
            }))["InsertID"];
            return new Result(true, "发送短消息成功", {
                MessageID: MessageID
            });
        },
        GetMail: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "OtherUser": "string"
            }));
            let ResponseData = {
                Mail: new Array<Object>()
            };
            let Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", [], {
                message_from: Data["OtherUser"],
                message_to: this.SecurityChecker.GetUsername()
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
                message_from: this.SecurityChecker.GetUsername(),
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
                message_to: this.SecurityChecker.GetUsername()
            });
            return new Result(true, "获得短消息成功", ResponseData);
        },
        GetUnreadList: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {}));
            let ResponseData = {
                UnreadList: new Array<Object>()
            };
            let Mails = ThrowErrorIfFailed(await this.XMOJDatabase.Select("short_message", ["message_from"], {
                message_to: this.SecurityChecker.GetUsername(),
                is_read: 0
            }));
            for (let i in Mails) {
                let Mail = Mails[i];
                ResponseData.UnreadList.push({
                    OtherUser: Mail["message_from"]
                });
            }
            ResponseData.UnreadList = Array.from(new Set(ResponseData.UnreadList));
            return new Result(true, "阅读短消息成功", ResponseData);
        }
    };
    constructor(RequestData: Request, Environment) {
        this.XMOJDatabase = new Database(Environment.DB);
        this.RequestData = RequestData;
        this.SecurityChecker.SetRemoteIP(RequestData.headers.get("CF-Connecting-IP") || "");
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
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(RequestJSON, {
                "Authentication": "object",
                "Data": "object"
            }));
            var TokenFailedCount = 0;
            while (true) {
                if ((await this.SecurityChecker.CheckToken(RequestJSON["Authentication"])).Data["Success"]) {
                    break;
                }
                TokenFailedCount++;
                if (TokenFailedCount >= 2) {
                    ThrowErrorIfFailed(await this.SecurityChecker.CheckToken(RequestJSON["Authentication"]));
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
