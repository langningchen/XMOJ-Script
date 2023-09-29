import * as github from '@actions/github';

const TrustedUsers = [
    "langningchen",
    "boomzero",
    "PythonSmall-Q"
];
const LabelList = [
    "addon-script",
    "bug",
    "Cloudflare-related",
    "dependency",
    "designing",
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

const AddLabel = (Label) => {
    if (github.context.payload.issue.labels.find((label) => label.name === Label)) {
        console.log("Label " + Label + " already exists");
        return false;
    }
    if (!LabelList.includes(Label)) {
        console.log("Label " + Label + " not exists");
        return false;
    }
    console.log("Add label " + Label);
    Octokit.issues.addLabels({
        owner: Owner,
        repo: Repo,
        issue_number: IssueNumber,
        labels: [Label]
    });
    return true;
};
const RemoveLabel = (Label) => {
    if (!github.context.payload.issue.labels.find((label) => label.name === Label)) {
        console.log("Label " + Label + " not exists");
        return false;
    }
    console.log("Remove label " + Label);
    Octokit.issues.removeLabel({
        owner: Owner,
        repo: Repo,
        issue_number: IssueNumber,
        name: Label
    });
    return true;
};

if (!TrustedUsers.includes(User)) {
    console.log("Not trusted user " + User);
    process.exit(0);
}

let NewData = Data.replaceAll(/\/[a-zA-Z-_]+/g, (match) => {
    console.log("Found command " + match);
    let Label = match.substring(1);
    if (Label.startsWith("-")) {
        Label = Label.substring(1);
        if (RemoveLabel(Label)) {
            return "";
        }
    } else {
        if (AddLabel(Label)) {
            if (Label === "needs-triage") {
                Octokit.issues.addAssignees({
                    owner: Owner,
                    repo: Repo,
                    issue_number: IssueNumber,
                    assignees: [Owner]
                });
            }
            else if (Label === "wontfix" || Label === "duplicate" || Label === "invalid") {
                Octokit.issues.update({
                    owner: Owner,
                    repo: Repo,
                    issue_number: IssueNumber,
                    state: "closed",
                    state_reason: "not_planned"
                });

                RemoveLabel("good-first-issue");
                RemoveLabel("hacktoberfest-accepted");
                RemoveLabel("help-wanted");
                RemoveLabel("investigating");
                RemoveLabel("needs-triage");
                RemoveLabel("priority-high");
                RemoveLabel("priority-low");
                RemoveLabel("question");
                RemoveLabel("review-needed");
                RemoveLabel("server");
                RemoveLabel("working-on-it");
            }
            return "";
        }
    }
    return match;
});

if (User === "langningchen") {
    if (RemoveLabel("needs-triage")) {
        AddLabel("investigating");
        Octokit.issues.listMilestones({
            owner: Owner,
            repo: Repo,
            state: "open"
        }).then((response) => {
            if (response.data.length !== 0) {
                Octokit.issues.update({
                    owner: Owner,
                    repo: Repo,
                    issue_number: IssueNumber,
                    milestone: response.data[response.data.length - 1].number
                });
            }
        });
    }
}

console.log("NewData    : " + NewData);

if (NewData === Data) {
    console.log("No label modified");
} else if (NewData.trim() === "") {
    Octokit.issues.deleteComment({
        owner: Owner,
        repo: Repo,
        comment_id: CommentID
    });
} else {
    Octokit.issues.updateComment({
        owner: Owner,
        repo: Repo,
        comment_id: CommentID,
        body: NewData
    });
}
