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
    "documentation",
    "duplicate",
    "enhancement",
    "frozen",
    "github_actions",
    "GitHub-related",
    "good-first-issue",
    "good first issue",
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
const LatestMilestone = Octokit.issues.listMilestones({
    owner: Owner,
    repo: Repo,
    state: "open"
}).then((response) => {
    if (response.data.length !== 0) {
        return response.data[response.data.length - 1].number;
    }
    return null;
});

let Data = github.context.payload.comment.body;
let Octokit = github.getOctokit(process.argv[2]);
let Owner = github.context.repo.owner;
let Repo = github.context.repo.repo;
let IssueNumber = github.context.payload.issue.number;
let CommentID = github.context.payload.comment.id;
let User = github.context.payload.comment.user.login;
let Labels = github.context.payload.issue.labels.map((label) => label.name);
let Milestone = github.context.payload.issue.milestone.number;
console.log("Data       : " + Data);
console.log("Owner      : " + Owner);
console.log("Repo       : " + Repo);
console.log("IssueNumber: " + IssueNumber);
console.log("CommentID  : " + CommentID);
console.log("User       : " + User);
console.log("Labels     : " + CurrentLabels);
console.log("Milestone  : " + Milestone);

const AddLabel = (Label) => {
    if (Labels.includes(Label)) {
        console.log("Label " + Label + " already exists");
        return false;
    }
    if (!LabelList.includes(Label)) {
        console.log("Label " + Label + " not exists");
        return false;
    }
    Labels.push(Label);
    return true;
};
const RemoveLabel = (Label) => {
    if (!Labels.includes(Label)) {
        console.log("Label " + Label + " not exists");
        return false;
    }
    Labels = Labels.filter((label) => label !== Label);
    return true;
};
const ClearLabel = () => {
    Labels = [];
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

                ClearLabel();
                AddLabel(Label);
                Milestone = null;
            }
            return "";
        }
    }
    return match;
});

if (User === "langningchen") {
    if (RemoveLabel("needs-triage")) {
        AddLabel("investigating");
        Milestone = LatestMilestone;
    }
}

console.log("----------------------------------------");
console.log("NewData    : " + NewData);
console.log("NewLabels  : " + Labels);

NewData = NewData.trim();
if (NewData === "") {
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

Octokit.issues.update({
    owner: Owner,
    repo: Repo,
    issue_number: IssueNumber,
    labels: Labels,
    milestone: Milestone
});
