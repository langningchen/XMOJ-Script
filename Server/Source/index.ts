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
        let XMOJDatabase = new Database(Environment.DB);
        Context.waitUntil(new Promise<void>(async (Resolve) => {
            await XMOJDatabase.Delete("short_message", {
                "send_time": {
                    "Operator": "<=",
                    "Value": new Date().getTime() - 1000 * 60 * 60 * 24 * 7
                }
            });
            await XMOJDatabase.Delete("phpsessid", {
                "create_time": {
                    "Operator": "<=",
                    "Value": new Date().getTime() - 1000 * 60 * 60 * 24 * 7
                }
            });
            Resolve();
        }));
    },
};
