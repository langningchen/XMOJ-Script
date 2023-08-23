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
                return new Result(false, "Unknown param \"" + i + "\"");
            }
            const AvailableTypes = ["string", "number", "bigint", "boolean", "symbol", "undefined", "object", "function"];
            if (AvailableTypes.indexOf(Checklist[i]) === -1) {
                return new Result(false, "Unknown except value type \"" + Checklist[i] + "\"");
            }
            if (typeof Data[i] !== Checklist[i]) {
                return new Result(false, "Param \"" + i + "\" except value type \"" + Checklist[i] + "\" but got value type \"" + typeof Data[i] + "\"");
            }
        }
        for (let i in Checklist) {
            if (Data[i] === undefined) {
                return new Result(false, "Param \"" + i + "\" not found");
            }
        }
        return new Result(true, "Check passed");
    }
    public CheckToken = async (Data: object): Promise<Result> => {
        ThrowErrorIfFailed(this.CheckParams(Data, {
            "SessionID": "string",
            "Username": "string"
        }));
        this.SessionID = Data["SessionID"];
        this.Username = Data["Username"];
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
            return new Result(false, "Session invalid");
        }
        if (SessionUsername != this.Username) {
            Output.Debug("Check token failed: Session and username not match \n" +
                "PHPSessionID   : \"" + this.SessionID + "\"\n" +
                "SessionUsername: \"" + SessionUsername + "\"\n" +
                "Username       : \"" + this.Username + "\"\n");
            return new Result(false, "Session and username not match");
        }
        return new Result(true, "Session valid");
    }
    public IfUserExist = async (Username: string): Promise<Result> => {
        return await this.Fetch(new URL("http://www.xmoj.tech/userinfo.php?user=" + Username))
            .then((Response) => {
                return Response.text();
            }).then((Response) => {
                return new Result(true, "Check user exist success", {
                    "Exist": Response.indexOf("No such User!") === -1
                });
            }).catch((Error) => {
                Output.Error("Check user exist failed: " + Error + "\n" +
                    "Username: \"" + Username + "\"\n");
                return new Result(false, "Check user exist failed");
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
            "missing-input-secret": "The secret parameter was not passed.",
            "invalid-input-secret": "The secret parameter was invalid or did not exist.",
            "missing-input-response": "The response parameter was not passed.",
            "invalid-input-response": "The response parameter is invalid or has expired.",
            "invalid-widget-id": "The widget ID extracted from the parsed site secret key was invalid or did not exist.",
            "invalid-parsed-secret": "The secret extracted from the parsed site secret key was invalid.",
            "bad-request": "The request was rejected because it was malformed.",
            "timeout-or-duplicate": "The response parameter has already been validated before.",
            "internal-error": "An internal error happened while validating the response. The request can be retried."
        };
        if (CaptchaToken === "") {
            return new Result(false, "Please solve the captcha");
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
            return new Result(true, "Captcha check success");
        }
        else {
            let ErrorString: string = "";
            for (let i = 0; i < VerifyResult["error-codes"].length; i++) {
                ErrorString += (ErrorDescriptions[VerifyResult["error-codes"][i]] == null ? VerifyResult["error-codes"][i] : ErrorDescriptions[VerifyResult["error-codes"][i]]);
            }
            return new Result(false, ErrorString);
        }
    }
};
