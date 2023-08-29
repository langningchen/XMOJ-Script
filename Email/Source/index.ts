import { Process } from "./Process";

export default {
	async fetch(RequestData: Request, Environment, ctx) {
		let Processor = new Process(RequestData, Environment);
		Environment.XMOJEmailKV.get("KEY");
		return new Response(JSON.stringify(await Processor.Process()), {
			headers: {
				"content-type": "application/json;charset=UTF-8"
			}
		});
	}
};
