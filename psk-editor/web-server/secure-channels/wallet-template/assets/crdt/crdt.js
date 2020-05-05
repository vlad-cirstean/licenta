class Char {
    constructor(value, position, counter, attributes) {
        this.value = value;
        this.attributes = attributes || {};
        this.position = position;
        this.counter = counter;
    }
}

class Crdt extends EventTarget {
    constructor(id) {
        super();
        this.text = [];
        this.counter = 1;
        this.editor = new Quill(id, {
            theme: 'snow'
        });

        this.text.push(new Char('\n', Number.MAX_SAFE_INTEGER, this.counter, {}));
        ++this.counter;

        this.editor.on('text-change', (delta, oldDelta, source) => {
            console.log(delta, oldDelta, id);

            if (source !== 'user' || !delta || !delta.ops) {
                return;
            }

            // console.log(delta, oldDelta, id);


            let position = 0;

            for (const instruction of delta.ops) {
                if (instruction.retain && instruction.attributes) {
                    for (let i = 0; i < instruction.retain; ++i) {
                        const char = this.getAtIndex(position + i);
                        if (char.position === Number.MAX_SAFE_INTEGER) {
                            this.text[this.text.length - 1].attributes = instruction.attributes;
                            this.dispatchEvent(new CustomEvent('insert', {detail: char}));
                        } else {
                            this.deleteAtIndex(position + i);
                            this.insertAtIndex(char.position, char.value, instruction.attributes);
                        }
                    }
                } else if (instruction.retain) {
                    position = instruction.retain;
                } else if (instruction.insert) {
                    for (let i = 0; i < instruction.insert.length; ++i) {
                        this.insertAtIndex(position + i, instruction.insert.charAt(i), instruction.attributes);
                    }
                    position += instruction.insert.length;
                } else if (instruction.delete) {
                    for (let i = 0; i < instruction.delete; ++i) {
                        this.deleteAtIndex(position);
                    }
                }
            }

        });
    }

    insertAtIndex(index, value, attributes) {
        ++this.counter;
        let char = {};
        if (index >= this.text.length - 1) {
            char = new Char(value, this.text.length - 1, this.counter, attributes);
            this.text.splice(this.text.length - 1, 0, char);
        } else {
            const next = this.text[index].position;
            const prev = (this.text[index - 1] && this.text[index - 1].position) || 0;
            const pos = ((next + prev) / 2);
            char = new Char(value, pos, this.counter, attributes);
            this.text.splice(index, 0, char);
        }
        this.dispatchEvent(new CustomEvent('insert', {detail: char}));
    }

    deleteAtIndex(index) {
        const char = this.text[index];
        if (char) {
            this.text.splice(index, 1);
            this.dispatchEvent(new CustomEvent('delete', {detail: char}));
        }
    }

    getAtIndex(index) {
        const char = this.text[index];
        return char;
    }

    deleteChar(char) {
        for (let i = 0; i < this.text.length && this.text[i].position <= char.position; ++i) {
            if (this.text[i].position === char.position) {
                this.text.splice(i, 1);
                this.editor.deleteText(i, 1);
                break;
            }
        }
    }

    insertChar(char) {
        if (char.position === Number.MAX_SAFE_INTEGER) {
            this.text[this.text.length - 1].attributes = char.attributes;
            const Delta = Quill.import('delta');
            this.editor.updateContents(new Delta()
                .retain(this.text.length - 1)
                .retain(1, char.attributes)
            );
            return;
        }
        let i = 0;
        if (this.text.length !== 0) {
            let next = this.text[i];
            while (next && char.position > next.position) {
                ++i;
                next = this.text[i];
            }
        }
        this.text.splice(i, 0, char);
        this.editor.insertText(i, char.value, char.attributes);
    }

    toString() {
        return this.text.map(i => i.value).join('');
    }

}
