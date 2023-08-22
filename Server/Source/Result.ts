export class Result {
    public Success: boolean;
    public Data: object;
    public Message: string;
    constructor(Success: boolean = false, Message: string = "Unknown error", Data: object = {}) {
        this.Success = Success;
        this.Message = Message;
        this.Data = Data;
    }
    public toString(): string {
        return JSON.stringify({
            Success: this.Success,
            Data: this.Data,
            Message: this.Message
        });
    }
}

export const ThrowErrorIfFailed = (CurrentResult: Result): Object => {
    if (CurrentResult.Success === false) {
        throw CurrentResult;
    }
    return CurrentResult.Data;
}
