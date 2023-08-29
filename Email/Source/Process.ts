import { Result, ThrowErrorIfFailed } from "./Result";
import { Security } from "./Security";
import { Output } from "./Output";

export class Process {
    private RequestData: Request;
    private SecurityChecker: Security = new Security();
    private XMOJEmailKV;
    private ProcessFunctions = {
        SetEmail: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "Email": "string"
            }));
            ThrowErrorIfFailed(this.SecurityChecker.CheckEmail(Data["Email"]));
            this.XMOJEmailKV.put(this.SecurityChecker.GetUsername() + "_EmailHash", MD5(Data["Email"]).toString());
            return new Result(true, "邮箱设置成功");
        },
        GetEmailHash: async (Data: object): Promise<Result> => {
            ThrowErrorIfFailed(this.SecurityChecker.CheckParams(Data, {
                "Username": "string"
            }));
            ThrowErrorIfFailed(await this.SecurityChecker.IfUserExist(Data["Username"]));
            return new Result(true, "获取成功", {
                EmailHash: await this.XMOJEmailKV.get(Data["Username"] + "_EmailHash")
            });
        }
    }
    constructor(RequestData: Request, Environment) {
        this.RequestData = RequestData;
        this.XMOJEmailKV = Environment.XMOJEmailKV;
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
import MD5 from 'crypto-js/md5';
//import { getAnalytics } from 'firebase/analytics';
//import { initializeApp } from 'firebase/app';
//import {} from 'firebase/auth';
// import { firebasekey } from './secret.js';
