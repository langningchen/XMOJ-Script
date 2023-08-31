import { Result, ThrowErrorIfFailed } from "./Result";
import { CaptchaSecretKey } from "./Secret"
import { Output } from "./Output";
import * as cheerio from 'cheerio';

export class Security {
    private Username: string;
    private SessionID: string;
    private RemoteIP: string;
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
    public HTMLEscape = (HTML: string): string => {
        return HTML.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    public GetUsername = (): string => {
        return this.Username;
    }
    public SetRemoteIP = (RemoteIP: string): void => {
        this.RemoteIP = RemoteIP;
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
    public CheckEmail = (Email: string): Result => {
        if (/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(Email)) {
            return new Result(true, "邮箱格式正确");
        }
        else {
            return new Result(false, "邮箱格式错误");
        }
    }
    public GetProblemScore = async (ProblemID: number): Promise<number> => {
        return await this.Fetch(new URL("http://www.xmoj.tech/status.php?user_id=" + this.GetUsername() + "&problem_id=" + ProblemID))
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
    public IsProblemExists = async (ProblemID: number): Promise<boolean> => {
        return await this.Fetch(new URL("http://www.xmoj.tech/problem.php?id=" + ProblemID))
            .then((Response) => {
                return Response.text();
            }).then((Response) => {
                return Response.indexOf("题目不可用") === -1;
            }).catch((Error) => {
                Output.Error("Check if problem exist failed: " + Error + "\n" +
                    "ProblemID: \"" + ProblemID + "\"\n" +
                    "Username : \"" + this.Username + "\"\n");
                ThrowErrorIfFailed(new Result(false, "检查题目是否存在失败"));
                return false;
            });
    }
    public GetStdCode = async (ProblemID: number): Promise<string> => {
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
        return StdCode;
    }
};
