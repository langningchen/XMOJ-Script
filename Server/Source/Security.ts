import { Result, ThrowErrorIfFailed } from "./Result";

export class Security {
    private Username: string;
    private SessionID: string;
    private Fetch = async (RequestURL: URL): Promise<Response> => {
        var Abort = new AbortController();
        setTimeout(() => {
            Abort.abort();
        }, 3000);
        var RequestData = new Request(RequestURL, {
            headers: {
                "Cookie": "PHPSESSID=" + this.SessionID
            },
            signal: Abort.signal
        });
        return await fetch(RequestData);
    }
    public CheckParams = (Data: object, Checklist: object): Result => {
        for (var i in Data) {
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
        for (var i in Checklist) {
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
        var SessionUsername: string = await this.Fetch(new URL("http://www.xmoj.tech/template/bs3/profile.php"))
            .then((Response) => {
                return Response.text();
            }).then((Response) => {
                var SessionUsername = Response.substring(Response.indexOf("user_id=") + 8);
                SessionUsername = SessionUsername.substring(0, SessionUsername.indexOf("'"));
                return SessionUsername;
            }).catch((Error) => {
                console.error("Check token failed: " + Error + "\n" +
                    "PHPSessionID   : \"" + this.SessionID + "\"\n" +
                    "Username       : \"" + this.Username + "\"\n");
                return "";
            });
        if (SessionUsername == "") {
            console.debug("Check token failed: Session invalid\n" +
                "PHPSessionID: \"" + this.SessionID + "\"\n");
            return new Result(false, "Session invalid");
        }
        if (SessionUsername != this.Username) {
            console.debug("Check token failed: Session and username not match \n" +
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
                console.error("Check user exist failed: " + Error + "\n" +
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
};
