const toolbarOptions = [
    [{'header': [1, 2, 3, 4, 5, 6, false]}],
    [{'font': []}],
    ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
        {'script': 'sub'}, {'script': 'super'}, {'color': []}, {'background': []}],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    [{'size': ['small', false, 'large', 'huge']}],
    [{'align': []}],
    ['image', 'link'],
    ['clean']
];

class Editor extends EventTarget {
    constructor(id) {
        super();
        this.editor = new Quill(id, {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            }
        });
        this.offset = 0;
        this.content = [];

        this.editor.on('text-change', (delta, oldDelta, source) => {
            if (source !== 'user' || !delta) {
                return;
            }
            this.localCommand(delta);
        });
    }

    setOffset(offset) {
        this.offset = offset;
    }

    setNull(nullContent) {
        this.nullContent = nullContent;
    }

    remoteCommand(commands) {
        const cursor = this.editor.getSelection();
        this.orderCommands(commands);
        let content = this.content.map(i => i.commands);
        this.editor.setContents(this.nullContent);

        for (const i of content) {
            this.editor.updateContents(i);
        }

        if (cursor) {
            this.editor.setSelection(cursor.index);
        }

    }

    localCommand(commands) {
        this.orderCommands(this.addTimestamp(commands));
        this.dispatchEvent(new CustomEvent('command', {detail: this.addTimestamp(commands)}));
    }

    setContents(commands) {
        this.editor.setContents(commands.commands);
        this.content = [];
        this.content.push(commands);
    }


    getContents() {
        return this.addTimestamp(this.editor.getContents());
    }

    addTimestamp(commands) {
        return {
            timestamp: Date.now() + this.offset,
            commands
        };
    }

    orderCommands(commands) {
        this.content.push(commands);
        this.content.sort((a, b) => a.timestamp - b.timestamp);
    }
}
