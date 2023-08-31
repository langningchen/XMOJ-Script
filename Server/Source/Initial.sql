DROP TABLE IF EXISTS bbs_post;

CREATE TABLE bbs_post (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL,
    problem_id INT NOT NULL,
    title TEXT NOT NULL,
    post_time INTEGER NOT NULL
);

DROP TABLE IF EXISTS bbs_reply;

CREATE TABLE bbs_reply (
    reply_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    post_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    reply_time INTEGER NOT NULL
);

DROP TABLE IF EXISTS mention;

CREATE TABLE mention (
    mention_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    mention_url TEXT NOT NULL,
    mention_time TIMESTAMP NOT NULL,
    other_data TEXT NOT NULL
);

DROP TABLE IF EXISTS short_message;

CREATE TABLE short_message (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    message_from TEXT NOT NULL,
    message_to TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    send_time INTEGER NOT NULL
);

DROP TABLE IF EXISTS std_answer;

CREATE TABLE std_answer (
    problem_id INTEGER PRIMARY KEY NOT NULL,
    std_code TEXT
);

DROP TABLE IF EXISTS badge;

CREATE TABLE badge (
    user_id TEXT PRIMARY KEY NOT NULL,
    background_color TEXT NOT NULL DEFAULT "",
    color TEXT NOT NULL DEFAULT "",
    content TEXT NOT NULL DEFAULT ""
);
