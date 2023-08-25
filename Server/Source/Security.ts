import { Result, ThrowErrorIfFailed } from "./Result";
import { CaptchaSecretKey } from "./Secret"
import { Output } from "./Output";

export class Security {
    private Username: string;
    private SessionID: string;
    private RemoteIP: string;
    private Fetch = async (RequestURL: URL): Promise<Response> => {
        let Abort = new AbortController();
        setTimeout(() => {
            Abort.abort();
        }, 3000);
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
                    "PHPSessionID   : \"" + this.SessionID + "\"\n" +
                    "Username       : \"" + this.Username + "\"\n");
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
};
