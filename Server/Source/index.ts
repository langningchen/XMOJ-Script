import { Process } from "./Process";
import { Database } from "./Database";

export default {
    async fetch(RequestData: Request, Environment, Context) {
        let Processor = new Process(RequestData, Environment);
        return new Response(JSON.stringify(await Processor.Process()), {
            headers: {
                "content-type": "application/json;charset=UTF-8"
            }
        });
    },
    async scheduled(Event, Environment, Context) {
        Context.waitUntil(new Database(Environment.DB).Delete("short_message", {
            "send_time": {
                "Operator": "<=",
                "Value": new Date().getTime() - 1000 * 60 * 60 * 24 * 7
            }
        }));
    },
};
