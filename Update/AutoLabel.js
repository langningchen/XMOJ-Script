import * as github from '@actions/github';

const IgnoreUsers = [
    "cloudflare-pages[bot]"
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

if (IgnoreUsers.includes(User)) {
    console.log("Ignore user " + User);
    return;
}

let NewData = Data.replaceAll(/\/[a-zA-Z-]+/g, (match) => {
    let Label = match.substring(1);
    console.log("Add label " + Label);
    Octokit.issues.addLabels({
        owner: Owner,
        repo: Repo,
        issue_number: IssueNumber,
        labels: [Label]
    });
    return "";
});

console.log("NewData    : " + NewData);

if (NewData === Data) {
    console.log("No label added");
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
    Octokit.issues.removeLabel({
        owner: Owner,
        repo: Repo,
        issue_number: IssueNumber,
        name: "need-triage"
    });
}
