export interface Env {
	db: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method != 'POST') {
			return new Response(JSON.stringify({ sucuess: false, error: 'Invalid request method' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		//save the request body as a string
		let body: JSON = await request.json();
		const email: string = body['email'],
			username: string = body['username'];
		//check if any of the required fields are missing
		if (!body['email'] || !body['username']) {
			return new Response(JSON.stringify({ sucuess: false, error: 'Missing required fields' }), {
				status: 400,
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
		//save the email to the database
		await env.db.prepare('INSERT INTO email (userID, emailHash) VAL	UES (?1, ?2)').bind(username, email).run();
		return new Response(JSON.stringify({ sucuess: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	},
};
