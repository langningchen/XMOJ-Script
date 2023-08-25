DROP TABLE IF EXISTS bbs_post;

CREATE TABLE bbs_post (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL,
    problem_id INT NOT NULL,
    title TEXT NOT NULL,
    post_time TIMESTAMP NOT NULL DEFAULT current_timestamp
);

DROP TABLE IF EXISTS bbs_reply;

CREATE TABLE bbs_reply (
    reply_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    post_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    reply_time TIMESTAMP NOT NULL DEFAULT current_timestamp
);

DROP TABLE IF EXISTS bbs_mention;

CREATE TABLE bbs_mention (
    mention_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    reply_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    mention_time TIMESTAMP NOT NULL DEFAULT current_timestamp
);

DROP TABLE IF EXISTS short_message;

CREATE TABLE short_message (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    message_from TEXT NOT NULL,
    message_to TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    send_time TIMESTAMP NOT NULL DEFAULT current_timestamp
);
