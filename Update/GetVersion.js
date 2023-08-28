import { readFileSync } from "fs";
import { execSync } from "child_process";

const JSONFileName = "./Update.json";
const JSFileName = "./XMOJ.user.js";
var JSONFileContent = readFileSync(JSONFileName, "utf8");
var JSFileContent = readFileSync(JSFileName, "utf8");

var JSONObject = JSON.parse(JSONFileContent);

var LastJSONVersion = Object.keys(JSONObject.UpdateHistory)[Object.keys(JSONObject.UpdateHistory).length - 1];
var LastJSVersion = JSFileContent.match(/@version\s+(\d+\.\d+\.\d+)/)[1];
if (LastJSONVersion != LastJSVersion) {
    console.log("Error: XMOJ.user.js and Update.json have different versions.");
    console.log("XMOJ.user.js: " + LastJSVersion);
    console.log("Update.json: " + LastJSONVersion);
    process.exit(1);
}
console.log("Latest version: " + LastJSONVersion);
execSync("echo version=" + LastJSONVersion + " >> $GITHUB_OUTPUT");
