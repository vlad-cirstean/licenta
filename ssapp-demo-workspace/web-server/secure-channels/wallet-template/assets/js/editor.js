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
        this.text = [];
        this.counter = 1;
        this.editor = new Quill(id, {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            }
        });


        this.editor.on('text-change', (delta, oldDelta, source) => {
            // console.log(delta, oldDelta, id);

            if (source !== 'user' || !delta) {
                return;
            }
            this.localCommand(delta);
        });
    }

    remoteCommand(commands) {
        try {
            this.editor.updateContents(commands);
        } catch (e) {
            console.error(e);
        }
    }

    localCommand(commands) {
        this.dispatchEvent(new CustomEvent('command', {detail: commands}));
    }

    setContents(commands) {
        this.editor.setContents(commands);
    }


    getContents() {
        return this.editor.getContents();
    }

}
