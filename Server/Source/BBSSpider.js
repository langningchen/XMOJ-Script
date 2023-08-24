let Data = {
    bbs_post: [],
    bbs_reply: []
};
const PostCount = 207;
const GetPost = async (i) => {
    if (i > PostCount) {
        console.log(Data);
        let DataBlob = new Blob([JSON.stringify(Data)], { type: "text/plain" });
        let DownloadLink = document.createElement("a");
        DownloadLink.download = "BBSSpider.json";
        DownloadLink.href = URL.createObjectURL(DataBlob);
        DownloadLink.click();
        return;
    }
    console.log(i + " / " + PostCount + " " + ((i - 1) / PostCount * 100).toFixed(2) + "%");
    await fetch("http://www.xmoj.tech/discuss3/thread.php?tid=" + i)
        .then((Response) => {
            return Response.text();
        })
        .then((Response) => {
            let Document = new DOMParser().parseFromString(Response, "text/html");
            if (Document.querySelector("body > div > div > center > div > table > tbody > tr.evenrow > td > div:nth-child(2) > a") == null)
                return;
            Data.bbs_post.push({
                post_id: Number(i),
                user_id: String(Document.querySelector("body > div > div > center > div > table > tbody > tr.evenrow > td > div:nth-child(2) > a").innerHTML.trim()),
                problem_id: Number(Document.querySelector("body > div > div > center > div > table > tbody > tr.toprow > td > a").innerHTML.trim().substring(8)),
                title: String(Document.querySelector("body > div > div > center > div > table > tbody > tr.toprow > td").childNodes[2].data.substring(4)),
                post_time: new Date(Document.querySelector("body > div > div > center > div > table > tbody > tr.evenrow > td > div:nth-child(2)").childNodes[1].data.substring(3)).getTime() - 8 * 60 * 60 * 1000
            });
            Data.bbs_reply.push({
                post_id: Number(i),
                user_id: String(Document.querySelector("body > div > div > center > div > table > tbody > tr.evenrow > td > div:nth-child(2) > a").innerHTML.trim()),
                content: String(Document.querySelector("body > div > div > center > div > table > tbody > tr.evenrow > td > div.content").innerText.trim()),
                reply_time: new Date(Document.querySelector("body > div > div > center > div > table > tbody > tr.evenrow > td > div:nth-child(2)").childNodes[1].data.substring(3)).getTime() - 8 * 60 * 60 * 1000
            });
            let ReplyElement = Document.querySelector("body > div > div > center > div > table > tbody").children;
            for (let j = 2; j < ReplyElement.length; j++) {
                Data.bbs_reply.push({
                    post_id: Number(i),
                    user_id: String(ReplyElement[j].querySelector("td > div:nth-child(2) > a").innerHTML.trim()),
                    content: String(ReplyElement[j].querySelector("td > div.content").innerText.trim()),
                    reply_time: new Date(ReplyElement[j].querySelector("td > div:nth-child(2)").childNodes[1].data.substring(3)).getTime() - 8 * 60 * 60 * 1000
                });
            }
        });
    await GetPost(i + 1);
};
GetPost(1);
