import { Result, ThrowErrorIfFailed } from "./Result";
import { Output } from "./Output";

export class Database {
    private RawDatabase: D1Database = null;
    constructor(RawDatabase: D1Database) {
        this.RawDatabase = RawDatabase;
    }
    private async Query(QueryString: string, BindData: string[]): Promise<Result> {
        Output.Debug("Executing SQL query: \n" +
            "    Query    : \"" + QueryString + "\"\n" +
            "    Arguments: " + JSON.stringify(BindData) + "\n");
        try {
            let SQLResult = await this.RawDatabase.prepare(QueryString).bind(...BindData).all()
            Output.Debug("SQL query returned with result: \n" +
                "    Result: \"" + JSON.stringify(SQLResult) + "\"\n");
            return new Result(true, "SQL query success", SQLResult);
        } catch (ErrorDetail) {
            Output.Warn("Error while executing SQL query: \n" +
                "    Query    : \"" + QueryString + "\"\n" +
                "    Arguments: " + JSON.stringify(BindData) + "\n" +
                "    Error    : \"" + ErrorDetail) + "\"\n";
            return new Result(false, String(ErrorDetail));
        }
    }
    public async Insert(Table: string, Data: object): Promise<Result> {
        let QueryString = "INSERT INTO `" + Table + "` (";
        for (let i in Data) {
            QueryString += "`" + i + "`, ";
        }
        QueryString = QueryString.substring(0, QueryString.length - 2);
        QueryString += ") VALUES (";
        for (let i in Data) {
            QueryString += "?, ";
        }
        QueryString = QueryString.substring(0, QueryString.length - 2);
        QueryString += ");";
        let BindData = Array();
        for (let i in Data) {
            BindData.push(Data[i]);
        }
        return new Result(true, "SQL insert success", {
            "InsertID": ThrowErrorIfFailed(await this.Query(QueryString, BindData))["meta"]["last_row_id"]
        });
    }
    public async Select(Table: string, Data: string[], Condition?: object, Other?: object): Promise<Result> {
        let QueryString = "SELECT ";
        if (Data.length == 0) {
            QueryString += "*";
        }
        else {
            for (let i in Data) {
                QueryString += "`" + Data[i] + "`, ";
            }
            QueryString = QueryString.substring(0, QueryString.length - 2);
        }
        QueryString += " FROM `" + Table + "`";
        if (Condition !== undefined) {
            QueryString += " WHERE ";
            for (let i in Condition) {
                if (typeof Condition[i] != "object") {
                    QueryString += "`" + i + "` = ? AND ";
                }
                else {
                    QueryString += "`" + i + "` " + Condition[i]["Operator"] + " ? AND ";
                }
            }
            QueryString = QueryString.substring(0, QueryString.length - 5);
        }
        if (Other !== undefined) {
            if ((Other["Order"] !== undefined && Other["OrderIncreasing"] === undefined) ||
                (Other["Order"] === undefined && Other["OrderIncreasing"] !== undefined)) {
                return new Result(false, "Order and OrderIncreasing must be both defined or undefined");
            }
            if (Other["Order"] !== undefined && Other["OrderIncreasing"] !== undefined) {
                QueryString += " ORDER BY `" + Other["Order"] + "` " + (Other["OrderIncreasing"] ? "ASC" : "DESC");
            }
            if (Other["Limit"] !== undefined) {
                QueryString += " LIMIT " + Other["Limit"];
            }
            if (Other["Offset"] !== undefined) {
                QueryString += " OFFSET " + Other["Offset"];
            }
        }
        QueryString += ";";
        let BindData = Array();
        for (let i in Condition) {
            if (typeof Condition[i] != "object") {
                BindData.push(Condition[i]);
            }
            else {
                BindData.push(Condition[i]["Value"]);
            }
        }
        return new Result(true, "SQL select success", ThrowErrorIfFailed(await this.Query(QueryString, BindData))["results"]);
    }
    public async Update(Table: string, Data: object, Condition?: object): Promise<Result> {
        let QueryString = "UPDATE `" + Table + "` SET ";
        for (let i in Data) {
            QueryString += "`" + i + "` = ?, ";
        }
        QueryString = QueryString.substring(0, QueryString.length - 2);
        if (Condition !== undefined) {
            QueryString += " WHERE ";
            for (let i in Condition) {
                if (typeof Condition[i] != "object") {
                    QueryString += "`" + i + "` = ? AND ";
                }
                else {
                    QueryString += "`" + i + "` " + Condition[i]["Operator"] + " ? AND ";
                }
            }
            QueryString = QueryString.substring(0, QueryString.length - 5);
        }
        QueryString += ";";
        let BindData = Array();
        for (let i in Data) {
            BindData.push(Data[i]);
        }
        for (let i in Condition) {
            if (typeof Condition[i] != "object") {
                BindData.push(Condition[i]);
            }
            else {
                BindData.push(Condition[i]["Value"]);
            }
        }
        return new Result(true, "SQL update success", ThrowErrorIfFailed(await this.Query(QueryString, BindData))["results"]);
    }
    public async GetTableSize(Table: string, Condition?: object): Promise<Result> {
        let QueryString = "SELECT COUNT(*) FROM `" + Table + "`";
        if (Condition !== undefined) {
            QueryString += " WHERE ";
            for (let i in Condition) {
                if (typeof Condition[i] != "object") {
                    QueryString += "`" + i + "` = ? AND ";
                }
                else {
                    QueryString += "`" + i + "` " + Condition[i]["Operator"] + " ? AND ";
                }
            }
            QueryString = QueryString.substring(0, QueryString.length - 5);
        }
        QueryString += ";";
        let BindData = Array();
        for (let i in Condition) {
            if (typeof Condition[i] != "object") {
                BindData.push(Condition[i]);
            }
            else {
                BindData.push(Condition[i]["Value"]);
            }
        }
        return new Result(true, "SQL get size success", {
            "TableSize": ThrowErrorIfFailed(await this.Query(QueryString, BindData))["results"][0]["COUNT(*)"]
        });
    }
    public async Delete(Table: string, Condition?: object): Promise<Result> {
        let QueryString = "DELETE FROM `" + Table + "`";
        if (Condition !== undefined) {
            QueryString += " WHERE ";
            for (let i in Condition) {
                if (typeof Condition[i] != "object") {
                    QueryString += "`" + i + "` = ? AND ";
                }
                else {
                    QueryString += "`" + i + "` " + Condition[i]["Operator"] + " ? AND ";
                }
            }
            QueryString = QueryString.substring(0, QueryString.length - 4);
        }
        QueryString += ";";
        let BindData = Array();
        for (let i in Condition) {
            if (typeof Condition[i] != "object") {
                BindData.push(Condition[i]);
            }
            else {
                BindData.push(Condition[i]["Value"]);
            }
        }
        return new Result(true, "SQL delete success", ThrowErrorIfFailed(await this.Query(QueryString, BindData))["results"]);
    }
}
