import { ChatState } from './state'
import { queueSaving, readChatState } from './state_saving'
import { log, getLogMessages } from './log'
import { app } from './app'
import { UserState, JoinChannel, SendMessage, ChannelMessages, PingMessage, ClearMessage, Message } from './shared/shared_state';

const makeUserState = (userName: string, chatState: ChatState) => {
    const userState: UserState = new UserState();
    userState.name = userName;
    userState.channelMessages = chatState.channels.filter(c => !!c.user_names.find(u => u === userName));
    return userState;
}

export const initChat = async (listeningToPort: number) => {
    const portNumber = listeningToPort;

    let chatState: ChatState = new ChatState();
    try {
        let result: ChatState | undefined = await readChatState();
        if (result) {
            chatState = result;
            log("Chat state loaded.");
        }
    }
    catch
    {
        log("Failed to read saved chat state.");
    }

    const joinChannel = (join: JoinChannel) => {
        if (!chatState.users.find(u => u.name === join.user_name)) {
            chatState.users.push({ name: join.user_name, ping: new Date() });
        }

        if (!chatState.channels.find(c => c.name === join.channel_name)) {
            let channel: ChannelMessages = new ChannelMessages();
            channel.name = join.channel_name;
            chatState.channels.push(channel);
        }

        chatState.channels.filter(c => c.name === join.channel_name).forEach(c => { if (!c.user_names.find(u => u === join.user_name)) c.user_names.push(join.user_name) });
        queueSaving(chatState);
        log("User " + join.user_name + " joined " + join.channel_name + "");
    }

    const sendMessage = (msg: SendMessage) => {
        chatState.channels.filter(c => c.name === msg.channel_name).forEach(c => c.messages.push({ sender_name: msg.sender_name, msg: msg.message, date: new Date() }));
        queueSaving(chatState);
        log("User " + msg.sender_name + " sent message " + msg.message + " to " + msg.channel_name + "");
    }

    const ping = (pingMessage: PingMessage) => {
        let user = chatState.users.find(u => u.name === pingMessage.user_name);
        if (user) {
            user.ping = new Date();
        }
    }

    app.post('/join', (req, res) => {
        const join: JoinChannel = req.body;
        joinChannel(join);
        res.send("JOIN-OK");
    });

    app.post('/msg', (req, res) => {
        const msg: SendMessage = req.body;
        sendMessage(msg);
        res.send("MSG-OK");
    });

    app.post('/ping', (req, res) => {
        const pingMessage: PingMessage = req.body;
        ping(pingMessage);
        const response: string = JSON.stringify(makeUserState(pingMessage.user_name, chatState));
        res.send(response);
    });

    app.get('/clear', (req, res) => {
        chatState = new ChatState();
        res.send("CLEAR-OK");
    });

    app.get('/ping/:user', (req, res) => {
        const pingMessage: PingMessage = { user_name: req.params["user"] };
        ping(pingMessage);
        log("User " + pingMessage.user_name + " pinged.");
        res.send(getLogPage());
    })

    app.get('/msg/:user/:channel/:msg', (req, res) => {
        const user_name: string = req.params["user"];
        const channel_name: string = req.params["channel"];
        const msg: string = req.params["msg"];
        sendMessage({ sender_name: user_name, channel_name: channel_name, message: msg })
        queueSaving(chatState);
        res.send(JSON.stringify(chatState));
    });

    app.get('/join/:user/:channel', (req, res) => {
        const user_name: string = req.params["user"];
        const channel_name: string = req.params["channel"];
        joinChannel({ user_name: user_name, channel_name: channel_name });
        queueSaving(chatState);
        res.send(JSON.stringify(chatState));
    });

    const getLogPage = () => {
        const escapeHtml = (s: string) => {
            return s
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        let output = "";
        output += `<!DOCTYPE html>\n<html>\n<head><title>server@${portNumber}</title></head>\n`;
        output += `<body><h1>Server running on port ${portNumber}</h1>\n`;
        output += `<p>Connect with the <b>shlock_client</b></p>\n`;
        output += `<p>Logs:</p><table><tr><th>Time</th><th>Message</th></tr>\n`;

        getLogMessages().slice(-10).reverse().forEach(e => {
            output += `<tr><td><b>[${e.t.toISOString().replace('T', ' ').slice(0, -5)}]</b></td><td>`;
            output += `${escapeHtml(e.m)}</td></tr>\n`
        });
        output += "</table>\n</body>\n</html>";

        return output;
    }

    app.get('/', (req, res) => {
        res.send(getLogPage());
    });
}
