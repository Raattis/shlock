import express from 'express'
import { ChatState, User, Channel, Message } from './state'
import { queueSaving, readChatState } from './state_saving'
import { log, getLogMessages } from './log'
import { app } from './app'

export const initChat = async (listeningToPort : number) =>
{
    const portNumber = listeningToPort;

    let chatState : ChatState = new ChatState();
    try
    {
        let result : ChatState | undefined = await readChatState();
        if (result){
            chatState = result;
            log("Chat state loaded.");
        }
    }
    catch
    {
        log("Failed to read saved chat state.");
    }

    class JoinChannel
    {
        user_name : string = "";
        channel_name : string = "";
    }
    
    const joinChannel = (join : JoinChannel) => {
        if (!chatState.users.find(u => u.name === join.user_name)) {
            chatState.users.push({name:join.user_name, ping:new Date()});
        }

        if (!chatState.channels.find(c => c.name === join.channel_name)){
            let channel:Channel = new Channel();
            channel.name = join.channel_name;
            chatState.channels.push(channel);
        }

        chatState.channels.filter(c => c.name === join.channel_name).forEach(c => {if (!c.user_names.find(u => u === join.user_name)) c.user_names.push(join.user_name)});
        queueSaving(chatState);
        log("User " + join.user_name + " joined " + join.channel_name + "");
    }

    class ChannelMessage
    {
        channel_name : string = "";
        sender_name : string = "";
        message : string = "";
    }
    
    const sendMessage = (msg : ChannelMessage) => {
        chatState.channels.filter(c => c.name === msg.channel_name).forEach(c => c.messages.push({sender_name:msg.sender_name, msg:msg.message, date:new Date()}));
        queueSaving(chatState);
        log("User " + msg.sender_name + " sent message " + msg.message + " to " + msg.channel_name + "");
    }

    const ping = (user_name : string)=>{
        let user =  chatState.users.find(u => u.name === user_name);
        if (user){
            user.ping = new Date();
        }
    }
    
    app.post('/join', (req, res) => {
        const join: JoinChannel = req.body;
        joinChannel(join);
        res.send(JSON.stringify(chatState));
    });
    
    app.post('/msg', (req, res) => {
        const msg: ChannelMessage = req.body;
        sendMessage(msg);
        res.send(JSON.stringify(chatState));
    });
    
    app.post('/ping', (req, res) => {
        const user_name: string = req.body;
        ping(user_name);
        res.send(JSON.stringify(chatState));
    });

    app.get('/ping/:user', (req, res)=>{
        const user_name: string = req.params["user"];
        ping(user_name);
        log("User " + user_name + " pinged.");
        res.send(getLogPage());
    })
    
    app.get('/msg/:user/:channel/:msg', (req, res) => {
        const user_name: string = req.params["user"];
        const channel_name: string = req.params["channel"];
        const msg: string = req.params["msg"];
        sendMessage({sender_name:user_name, channel_name:channel_name, message:msg})
        queueSaving(chatState);
        res.send(JSON.stringify(chatState));
    });

    app.get('/join/:user/:channel', (req, res) => {
        const user_name: string = req.params["user"];
        const channel_name: string = req.params["channel"];
        joinChannel({user_name:user_name, channel_name:channel_name});
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
