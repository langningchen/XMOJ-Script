import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const JSONFileName = "./Update.json";
const JSFileName = "./XMOJ.user.js";
var JSONFileContent = readFileSync(JSONFileName, "utf8");
var JSFileContent = readFileSync(JSFileName, "utf8");

var JSONObject = JSON.parse(JSONFileContent);

var LastJSONVersion = Object.keys(JSONObject.UpdateHistory)[Object.keys(JSONObject.UpdateHistory).length - 1];
var LastJSVersion = JSFileContent.match(/@version\s+(\d+\.\d+\.\d+)/)[1];
if (LastJSONVersion.split(".")[2] != LastJSVersion.split(".")[2]) {
    console.log("Error: XMOJ.user.js and Update.json have different patch versions.");
    console.log("XMOJ.user.js: " + LastJSVersion.split(".")[2]);
    console.log("Update.json: " + LastJSONVersion.split(".")[2]);
    process.exit(1);
}
console.log("Last version: " + LastJSONVersion);
var LastVersion = LastJSVersion.split(".");
var LatestVersion = LastVersion[0] + "." + LastVersion[1] + "." + (parseInt(LastVersion[2]) + 1);
console.log("Latest version: " + LatestVersion);
execSync("echo version=" + LatestVersion + " >> $GITHUB_OUTPUT");
JSONObject.UpdateHistory[LatestVersion] = {
    "UpdateDate": Date.now(),
    "Prerelease": false,
    "UpdateContents": []
};

for (var i = Object.keys(JSONObject.UpdateHistory).length - 1; i >= 0; i--) {
    var Version = Object.keys(JSONObject.UpdateHistory)[i];
    if (JSONObject.UpdateHistory[Version].Prerelease == false) {
        break;
    }
    for (var j = 0; j < JSONObject.UpdateHistory[Version].UpdateContents.length; j++) {
        JSONObject.UpdateHistory[LatestVersion].UpdateContents.push(JSONObject.UpdateHistory[Version].UpdateContents[j]);
    }
}

writeFileSync(JSONFileName, JSON.stringify(JSONObject, null, 4), "utf8");

var NewJSFileContent = JSFileContent.replace(/@version(\s+)\d+\.\d+\.\d+/, "@version$1" + LatestVersion);
writeFileSync(JSFileName, NewJSFileContent, "utf8");

console.log("Update.json and XMOJ.user.js have been updated.");
