import MD5 from 'crypto-js/md5';
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { firebasekey } from './secret.ts';
export interface Env {
	db: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			if (request.url.endsWith('/postemail')) {
				if (request.method != 'POST') {
					return new Response(JSON.stringify({ sucuess: false, error: 'Invalid request method' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				//save the request body as a string
				let body: JSON = await request.json();
				let email: string = body['email'],
					username: string = body['username'];
				//check if any of the required fields are missing
				if (!body['email'] || !body['username'] || !body['cookie']) {
					return new Response(JSON.stringify({ sucuess: false, error: 'Missing required fields' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				//check if the user is authorized
				let authHeader = new Headers();
				authHeader.append('Cookie', 'PHPSESSID=' + body['cookie']);
				let loginCheck = await fetch(new Request('http://www.xmoj.tech/template/bs3/profile.php'), { headers: authHeader });
				//return new Response(await loginCheck.text());
				let res = await loginCheck.text();
				let userId = res.substring(res.search('user_id=') + 8);
				userId = userId.substring(0, userId.search("'"));
				console.log(userId);
				if (userId == '') {
					return new Response(JSON.stringify({ sucuess: false, error: 'Forbidden' }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				if (userId != username) {
					return new Response(JSON.stringify({ sucuess: false, error: 'Forbidden' }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				//use regex to check whether body is a valid email
				const emailRegex = new RegExp('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$');
				if (!emailRegex.test(email)) {
					return new Response(JSON.stringify({ sucuess: false, error: 'Invalid email' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				//email verification using firebase
				const firebaseConfig = {
					apiKey: firebasekey,
					authDomain: 'xmoj-verification.firebaseapp.com',
					projectId: 'xmoj-verification',
					storageBucket: 'xmoj-verification.appspot.com',
					messagingSenderId: '792060272492',
					appId: '1:792060272492:web:60d3af9a126eecc02b9d49',
					measurementId: 'G-W9SQNRHKGT',
				};
				// Initialize Firebase
				const app = initializeApp(firebaseConfig);
				const analytics = getAnalytics(app);

				//hash the email using MD5
				email = MD5(email).toString();
				//save the email to the database
				await env.db.prepare('INSERT INTO email (userID, emailHash) VALUES (?1, ?2)').bind(username, email).run();
				return new Response(JSON.stringify({ sucuess: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} else if (request.url.endsWith('/getemail')) {
				if (request.method != 'POST') {
					return new Response(JSON.stringify({ sucuess: false, error: 'Invalid request method' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				//save the request body as a string
				let body: JSON = await request.json();
				let username: string = body['username'];
				//check if any of the required fields are missing
				if (!body['username']) {
					return new Response(JSON.stringify({ sucuess: false, error: 'Missing required fields' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				//get the email from the database
				let email = (await env.db.prepare('SELECT emailHash FROM email WHERE userID = ?1').bind(username).run()).results[0].emailHash;
				return new Response(JSON.stringify({ sucuess: true, email: email }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} else {
				return new Response(JSON.stringify({ sucuess: false, error: 'Invalid request' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		} catch (e) {
			return new Response(JSON.stringify({ sucuess: false, error: e }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	},
};
