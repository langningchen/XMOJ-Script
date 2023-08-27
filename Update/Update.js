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
// execSync("echo version=" + LatestVersion + " >> $GITHUB_OUTPUT");
JSONObject.UpdateHistory[LatestVersion] = {
    "UpdateDate": Date.now(),
    "Prerelease": true,
    "UpdateCommits": []
};

var LastTag = execSync("git describe --tags --abbrev=0").toString().trim();
var Commits = execSync("git log --pretty=format:'%h %H %s' " + LastTag + "..HEAD").toString().split("\n");
Commits.pop();
console.log("Commits (" + Commits.length + "):");
for (var i = 0; i < Commits.length; i++) {
    var Commit = Commits[i].split(" ");
    var ShortCommitHash = Commit[0];
    var LongCommitHash = Commit[1];
    var CommitDescription = Commit.slice(2).join(" ");
    if (CommitDescription.indexOf("Merge branch") != -1) {
        continue;
    }
    JSONObject.UpdateHistory[LatestVersion].UpdateCommits.push({
        "ShortCommit": ShortCommitHash,
        "Commit": LongCommitHash,
        "Description": CommitDescription
    });
    console.log("    Commit " + i + "(" + ShortCommitHash + "): " + CommitDescription);
}
writeFileSync(JSONFileName, JSON.stringify(JSONObject), "utf8");

var NewJSFileContent = JSFileContent.replace(/@version(\s+)\d+\.\d+\.\d+/, "@version$1" + LatestVersion);
writeFileSync(JSFileName, NewJSFileContent, "utf8");

console.log("Update.json and XMOJ.user.js have been updated.");
