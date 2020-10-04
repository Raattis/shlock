import React from 'react';

interface IProps {
    onSend: (msg: string) => void;
    onSetName: (name: string) => void;
    onJoinChannel: (channelName: string) => void;
    onRefresh: () => void;
    name: string;
}

const TextInput = (props: IProps) => {
    interface InputEvent {
        preventDefault: () => void;
    }

    const getString = (e: InputEvent): string => {
        e.preventDefault();
        const input: HTMLInputElement = (document.getElementById("textInputField") as HTMLInputElement);
        const value: string = input.value;
        console.log("getString -> " + value);
        (document.getElementById("inputForm") as HTMLFormElement).reset();
        return value;
    }


    let name: string = props.name;
    if (!name || name.length === 0)
        name = "<no name>";

    return (
        <form id="inputForm" onSubmit={e => props.onSend(getString(e))}>
            <label>{props.name}:</label>
            <input id="textInputField" type="text" placeholder="Message..." /><br />
            <button onClick={e => props.onSend(getString(e))}>Send</button>
            <button onClick={e => props.onJoinChannel(getString(e))}>Join</button>
            <button onClick={e => props.onSetName(getString(e))}>Set name</button>
            <button onClick={e => { e.preventDefault(); props.onRefresh() }}>Refresh</button>
        </form>
    );
}

export default TextInput;
