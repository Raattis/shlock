import fs from 'fs'
import { ChatState } from './state'
import { log } from './log'
import { deserialize } from './shared/plain_to_class'

const stateDirPath: string = "../state/";
const stateFilename: string = "chat_state.json";
const stateFilePath: string = stateDirPath + stateFilename;

const fsExists = async (path: string) => {
    return await fs.promises.access(stateDirPath).then(() => true).catch(() => false);
}

let _savingQueued = false;
const writeChatState = async (state: ChatState) => {
    const dirExists: Boolean = await fsExists(stateDirPath);
    if (!dirExists) {
        log("mkdir " + stateDirPath);
        fs.mkdirSync(stateDirPath);
        return;
    }

    const stateString: string = JSON.stringify(state);
    await fs.promises.writeFile(stateFilePath, stateString)
        .catch(() => log("Couldn't write to '" + stateFilePath + "'"))

    log("Saving done!");
    _savingQueued = false;
}

export const queueSaving = (state: ChatState) => {
    if (_savingQueued)
        return;

    _savingQueued = true;
    setTimeout(() => { writeChatState(state); }, 3000);
}

export const readChatState = async () => {
    const dirExists: Boolean = await fsExists(stateDirPath);
    if (!dirExists)
        return;

    const fileExists: Boolean = await fsExists(stateFilePath);
    if (!fileExists)
        return;

    const fileBuffer: Buffer = await fs.promises.readFile(stateFilePath);
    return deserialize(ChatState, fileBuffer.toString());
}
