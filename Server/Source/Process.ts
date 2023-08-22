import { Result, ThrowErrorIfFailed } from "./Result";
import { Database } from "./Database";
import { Security } from "./Security";

export class Process {
    private XMOJDatabase: Database;
    private RequestData: Request;
    private SecurityChecker: Security = new Security();
    private ProcessFunctions = {
        NewPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ProblemID": "number",
                "Title": "string",
                "Content": "string"
            }));
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
            return new Result(true, "Success", {
                PostID: PostID,
                ReplyID: ReplyID
            });
        },
        NewReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "PostID": "number",
                "Content": "string"
            }));
            Data["Content"] = this.SecurityChecker.HTMLEscape(Data["Content"]);
            Data["Content"] = Data["Content"].trim();
            if (Data["Content"] === "") {
                return new Result(false, "Content cannot be empty");
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

            return new Result(true, "Success", {
                ReplyID: ReplyID
            });
        },
        GetPosts: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ProblemID": "number",
                "Page": "number"
            }));
            var ResponseData = {
                Posts: new Array<Object>,
                PageCount: Math.ceil(ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_post"))["TableSize"] / 10)
            };
            if (ResponseData.PageCount === 0) {
                return new Result(true, "Success", ResponseData);
            }
            if (Data["Page"] < 1 || Data["Page"] > ResponseData.PageCount) {
                return new Result(false, "Param \"Page\" does not in range 1~" + ResponseData.PageCount);
            }
            var Posts = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", [], (Data["ProblemID"] === 0 ? undefined : { problem_id: Data["ProblemID"] }), {
                Order: "post_id",
                OrderIncreasing: false,
                Limit: 10,
                Offset: (Data["Page"] - 1) * 10
            }));
            for (var i in Posts) {
                var Post = Posts[i];
                var ReplyCount: number = ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", { post_id: Post["post_id"] }))["TableSize"];
                var LastReply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id", "reply_time"], { post_id: Post["post_id"] }, {
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
            return new Result(true, "Success", ResponseData);
        },
        GetPost: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "PostID": "number",
                "Page": "number"
            }));
            var ResponseData = {
                UserID: "",
                ProblemID: 0,
                Title: "",
                PostTime: "",
                Reply: new Array<Object>(),
                PageCount: 0
            };
            var Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", [], { post_id: Data["PostID"] }));
            if (Post.toString() == "") {
                return new Result(false, "Post not found");
            }
            ResponseData.PageCount = Math.ceil(ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", { post_id: Data["PostID"] }))["TableSize"] / 10);
            if (ResponseData.PageCount === 0) {
                return new Result(true, "Success", ResponseData);
            }
            if (Data["Page"] < 1 || Data["Page"] > ResponseData.PageCount) {
                return new Result(false, "Param \"Page\" does not in range 1~" + ResponseData.PageCount);
            }
            ResponseData.UserID = Post[0]["user_id"];
            ResponseData.ProblemID = Post[0]["problem_id"];
            ResponseData.Title = Post[0]["title"];
            ResponseData.PostTime = Post[0]["post_time"];
            var Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", [], { post_id: Data["PostID"] }, {
                Order: "reply_time",
                OrderIncreasing: false,
                Limit: 10,
                Offset: (Data["Page"] - 1) * 10
            }));
            for (var i in Reply) {
                var ReplyItem = Reply[i];
                ResponseData.Reply.push({
                    ReplyID: ReplyItem["reply_id"],
                    UserID: ReplyItem["user_id"],
                    Content: ReplyItem["content"],
                    ReplyTime: ReplyItem["reply_time"]
                });
            }
            return new Result(true, "Success", ResponseData);
        },
        EditReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ReplyID": "number",
                "Content": "string"
            }));
            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id"], { reply_id: Data["ReplyID"] }));
            if (Reply.toString() == "") {
                return new Result(false, "Reply not found");
            }
            if (Reply[0]["user_id"] != this.SecurityChecker.GetUsername()) {
                return new Result(false, "Permission denied");
            }
            Data["Content"] = this.SecurityChecker.HTMLEscape(Data["Content"]);
            Data["Content"] = Data["Content"].trim();
            if (Data["Content"] === "") {
                return new Result(false, "Content cannot be empty");
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
            Data["Content"] = Data["Content"] + "<br><span class=\"text-muted\" style=\"font-size: 12px\">已于 " + new Date().toLocaleString() + " 编辑 </span>";
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
            return new Result(true, "Success");
        },
        DeletePost: async (Data: object, CheckUserID: boolean = true): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "PostID": "number"
            }));
            let Post = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_post", ["user_id"], { post_id: Data["PostID"] }));
            if (Post.toString() == "") {
                return new Result(false, "Post not found");
            }
            if (CheckUserID && Post[0]["user_id"] != this.SecurityChecker.GetUsername()) {
                return new Result(false, "Permission denied");
            }
            let Replies = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["reply_id"], { post_id: Data["PostID"] }));
            for (let i in Replies) {
                await this.XMOJDatabase.Delete("bbs_reply", { reply_id: Replies[i]["reply_id"] });
            }
            await this.XMOJDatabase.Delete("bbs_post", { post_id: Data["PostID"] });
            return new Result(true, "Success");
        },
        DeleteReply: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ReplyID": "number"
            }));
            let Reply = ThrowErrorIfFailed(await this.XMOJDatabase.Select("bbs_reply", ["user_id", "post_id"], { reply_id: Data["ReplyID"] }));
            if (Reply.toString() == "") {
                return new Result(false, "Reply not found");
            }
            if (Reply[0]["user_id"] != this.SecurityChecker.GetUsername()) {
                return new Result(false, "Permission denied");
            }
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_reply", { post_id: Reply[0]["post_id"] }))["TableSize"] === 1) {
                await this.ProcessFunctions.DeletePost({ PostID: Reply[0]["post_id"] }, false);
            }
            await this.XMOJDatabase.Delete("bbs_reply", { reply_id: Data["ReplyID"] });
            return new Result(true, "Success");
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
                        Operator: "<=",
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
            return new Result(true, "Success", ResponseData);
        },
        ReadMention: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "MentionID": "number"
            }));
            if (ThrowErrorIfFailed(await this.XMOJDatabase.GetTableSize("bbs_mention", {
                mention_id: Data["MentionID"]
            }))["TableSize"] === 0) {
                return new Result(false, "Mention not found");
            }
            ThrowErrorIfFailed(await this.XMOJDatabase.Delete("bbs_mention", {
                mention_id: Data["MentionID"]
            }));
            return new Result(true, "Success");
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
            return new Result(true, "Success", ResponseData);
        },
        SendMail: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "ToUser": "string",
                "Content": "string"
            }));
            if (ThrowErrorIfFailed(await this.SecurityChecker.IfUserExist(Data["ToUser"]))["Exist"] === false) {
                return new Result(false, "User not found");
            }
            if (Data["ToUser"] === this.SecurityChecker.GetUsername()) {
                return new Result(false, "Cannot send mail to yourself");
            }
            let MessageID = ThrowErrorIfFailed(await this.XMOJDatabase.Insert("short_message", {
                message_from: this.SecurityChecker.GetUsername(),
                message_to: Data["ToUser"],
                content: Data["Content"]
            }))["InsertID"];
            return new Result(true, "Success", {
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
            return new Result(true, "Success", ResponseData);
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
            return new Result(true, "Success", ResponseData);
        }
    };
    constructor(RequestData: Request, Environment) {
        this.XMOJDatabase = new Database(Environment.DB);
        this.RequestData = RequestData;
    }
    public async Process(): Promise<Result> {
        try {
            var PathName = new URL(this.RequestData.url).pathname;
            PathName = PathName === "/" ? "/index" : PathName;
            PathName = PathName.substring(1);
            if (this.ProcessFunctions[PathName] === undefined) {
                throw new Result(false, "Not Found");
            }
            if (this.RequestData.method !== "POST") {
                throw new Result(false, "Method Not Allowed: " + this.RequestData.method);
            }
            if (this.RequestData.headers.get("content-type") !== "application/json") {
                throw new Result(false, "Unsupported Media Type \"" + this.RequestData.headers.get("content-type") + "\"");
            }
            var RequestJSON: object;
            try {
                RequestJSON = await this.RequestData.json();
            }
            catch (Error) {
                throw new Result(false, "Bad Request");
            }
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(RequestJSON, {
                "Authentication": "object",
                "Data": "object"
            }));
            ThrowErrorIfFailed(await this.SecurityChecker.CheckToken(RequestJSON["Authentication"]));
            throw await this.ProcessFunctions[PathName](RequestJSON["Data"]);
        }
        catch (ResponseData) {
            if (!(ResponseData instanceof Result)) {
                console.error(ResponseData);
                ResponseData = new Result(false, "Internal Server Error: " + String(ResponseData).split("\n")[0]);
            }
            return ResponseData;
        }
    }
}
