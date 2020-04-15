class Char {
    constructor(value, position, counter) {
        this.value = value;
        this.position = position;
        this.counter = counter;
    }
}

class Crdt extends EventTarget {
    constructor(textArea) {
        super();
        this.text = [];
        this.counter = 1;
        this.editor = CodeMirror.fromTextArea(textArea, {lineWrapping: true});

        this.editor.on('change', (instance, obj) => {
            if (obj.origin === 'setValue' || obj.origin === 'replaceRange') {
                return;
            } else if (obj.removed[0] && obj.removed[0].length) {
                for (let i = obj.from.ch; i < obj.from.ch + obj.removed[0].length; ++i) {
                    this.deleteAtIndex(obj.from.ch);
                }
            } else if (obj.text[0] && obj.text[0].length) {
                for (let i = obj.from.ch; i < obj.from.ch + obj.text[0].length; ++i) {
                    this.insertAtIndex(i, obj.text[0].charAt(i - obj.from.ch));
                }
            }
        });
    }

    insertAtIndex(index, value) {
        ++this.counter;
        let char = {};
        if (index >= this.text.length) {
            char = new Char(value, this.text.length, this.counter);
            this.text.push(char);
        } else {
            const next = this.text[index].position;
            const prev = (this.text[index - 1] && this.text[index - 1].position) || 0;
            const pos = ((next + prev) / 2)
            char = new Char(value, pos, this.counter);
            this.text.splice(index, 0, char);
        }
        this.dispatchEvent(new CustomEvent('insert', {detail: char}));
    }

    deleteAtIndex(index) {
        const char = this.text[index];
        if (this.text[index]) {
            this.text.splice(index, 1);
            this.dispatchEvent(new CustomEvent('delete', {detail: char}));
        }
    }

    deleteChar(char) {
        for (let i = 0; i < this.text.length && this.text[i].position <= char.position; ++i) {
            if (this.text[i].position === char.position) {
                this.text.splice(i, 1);
                this.editor.replaceRange('', {line: 0, ch: i}, {line: 0, ch: i+1},'replaceRange');
                break;
            }
        }
    }

    insertChar(char) {
        let i = 0;
        if (this.text.length !== 0) {
            let next = this.text[i];
            while (next && char.position > next.position) {
                ++i;
                next = this.text[i];
            }
        }
        this.text.splice(i, 0, char);
        this.editor.replaceRange(char.value, {line: 0, ch: i}, {line: 0, ch: i},'replaceRange');
    }

    toString() {
        return this.text.map(i => i.value).join('');
    }

}
