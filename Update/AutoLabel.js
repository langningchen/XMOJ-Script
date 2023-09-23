import * as github from '@actions/github';
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
Data = Data.replaceAll(/\/[a-zA-Z-]+/g, (match) => {
    let Label = match.substring(1);
    console.log("Add label " + Label);
    // Octokit.issues.addLabels({
    //     owner: Owner,
    //     repo: Repo,
    //     issue_number: IssueNumber,
    //     labels: [Label]
    // });
    return "";
});
Octokit.issues.updateComment({
    owner: Owner,
    repo: Repo,
    comment_id: CommentID,
    body: Data
});

if (User === "langningchen") {
    Octokit.issues.removeLabel({
        owner: Owner,
        repo: Repo,
        issue_number: IssueNumber,
        name: "need-triage"
    });
}
