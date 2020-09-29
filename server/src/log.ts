import fs from 'fs';
import { Type, deserializeArray } from './plain_to_class';

class LogMessage {
    @Type(() => Date)
    t: Date = new Date();
    m: string = "";
}

let logMessages: Array<LogMessage> = new Array();
const logDirPath: string = '../log/';
const logFilename: string = 'shlock_server.log';
const logPath: string = logDirPath + logFilename;

export const getLogMessages =  ()  => {
    return logMessages;
}

export const log = (str: string) => {
    let msg: LogMessage = new LogMessage();
    msg.m = str;
    logMessages.push(msg);
    fs.promises.appendFile(logPath, JSON.stringify(msg) + ",");
    console.log(str);
}

export const initLogs = () => {
    if (!fs.existsSync(logDirPath)) {
        fs.mkdirSync(logDirPath);
        return;
    }

    if (!fs.existsSync(logPath))
        return;

    const logFile: Buffer = fs.readFileSync(logPath);
    const logString: string = '[' + logFile.slice(0, -1).toString() + ']';
    logMessages = deserializeArray(LogMessage, logString).slice(-30);
}
