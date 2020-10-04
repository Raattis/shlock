import { log, initLogs } from './log'
import { app } from './app'
import { initChat } from './chat'

const portToList = 8081;

app.listen(portToList, () => {
    initLogs();
    initChat(portToList);
    log('Listening on port ' + portToList + '.');
});
