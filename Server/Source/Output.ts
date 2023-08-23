export class Output {
    public static Debug(Message: any): void {
        // console.debug("\x1b[36m%s\x1b[0m", Message);
    }
    public static Log(Message: any): void {
        console.log("\x1b[32m%s\x1b[0m", Message);
    }
    public static Warn(Message: any): void {
        console.warn("\x1b[33m%s\x1b[0m", Message);
    }
    public static Error(Message: any): void {
        console.error("\x1b[31m%s\x1b[0m", Message);
    }
}
