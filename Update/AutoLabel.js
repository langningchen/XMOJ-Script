import * as github from '@actions/github';

const TrustedUsers= [
    "langningchen",
    "boomzero",
    "PythonSmall-Q"
];
const LabelList = [
    "addon-script",
    "bug",
    "Cloudflare-related",
    "dependency",
    "documentation",
    "duplicate",
    "enhancement",
    "frozen",
    "github_actions",
    "GitHub-related",
    "good-first-issue",
    "hacktoberfest-accepted",
    "help-wanted",
    "invalid",
    "investigating",
    "needs-triage",
    "priority-high",
    "priority-low",
    "question",
    "review-needed",
    "server",
    "stale",
    "update-script",
    "user-script",
    "website",
    "wontfix",
    "working-on-it"
];

let Data = github.context.payload.comment.body;
let Octokit = github.getOctokit(process.argv[2]);
let Owner = github.context.repo.owner;
let Repo = github.context.repo.repo;
let IssueNumber = github.context.payload.issue.number;
let CommentID = github.context.payload.comment.id;
let User = github.context.payload.comment.user.login;
console.log("Data       : " + Data);
console.log("Owner      : " + Owner);
console.log("Repo       : " + Repo);
console.log("IssueNumber: " + IssueNumber);
console.log("CommentID  : " + CommentID);
console.log("User       : " + User);

if (!TrustedUsers.includes(User)) {
    console.log("Not trusted user " + User);
    process.exit(0);
}

let NewData = Data.replaceAll(/\/-[a-zA-Z-]+/g, (match) => {
    console.log("Found command " + match);
    let Label = match.substring(2);
    if (github.context.payload.issue.labels.find((label) => label.name === Label)) {
        console.log("Remove label " + Label);
        Octokit.issues.removeLabel({
            owner: Owner,
            repo: Repo,
            issue_number: IssueNumber,
            name: Label
        });
        return "";
    }
    return match;
});

NewData = NewData.replaceAll(/\/[a-zA-Z-]+/g, (match) => {
    console.log("Found command " + match);
    let Label = match.substring(1);
    if (LabelList.includes(Label)) {
        console.log("Add label " + Label);
        Octokit.issues.addLabels({
            owner: Owner,
            repo: Repo,
            issue_number: IssueNumber,
            labels: [Label]
        });
        return "";
    }
    return match;
});

if (NewData === "") {
    NewData = "[]()";
}
console.log("NewData    : " + NewData);

if (NewData === Data) {
    console.log("No label modified");
}
else {
    Octokit.issues.updateComment({
        owner: Owner,
        repo: Repo,
        comment_id: CommentID,
        body: NewData
    });
}

if (User === "langningchen") {
    if (github.context.payload.issue.labels.find((label) => label.name === "need-triage")) {
        console.log("Remove label need-triage");
        Octokit.issues.removeLabel({
            owner: Owner,
            repo: Repo,
            issue_number: IssueNumber,
            name: "need-triage"
        });
    }
}
