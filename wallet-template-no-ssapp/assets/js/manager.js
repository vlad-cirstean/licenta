class Manager {
    constructor() {
        this.documents = [];
        this.current = null;
        this.elementsList = document.getElementById('list-id');
        this.editField = document.getElementById('file-metadata');
        this.editField.addEventListener('input', (e) => {
            this.current.name = this.editField.value;
        });

        this.editor = new Editor('#editor');
        this.nullEditorValue = this.editor.getContents();
        this.editor.setNull(this.nullEditorValue);
        this.editor.addEventListener('command', (e) => {
            this.communication.send(e.detail);
        });

        this.communication = new Communication();
        this.communication.addEventListener('remoteCommand', (e) => {
            this.editor.remoteCommand(e.detail.ops);
            this.communication.fanout(e.detail.ops, e.detail.peer);
        });
        this.communication.addEventListener('activePeers', (e) => {
            this.current.activePeers = e.detail;
            this.showPeers();
        });
        this.offset = 0;
        this.communication.addEventListener('time', (e) => {
            const offset = e.detail;
            this.editor.setOffset(offset);
            console.log('Time offset: ' + offset);
        });

        this.importField = document.getElementById('import');
    }

    async init() {
        this.edfs = new Edfs();
        await this.edfs.init('http://127.0.0.1:8080');

        await this.loadDocuments();
    }

    async newDocument() {
        const content = this.nullEditorValue;
        const id = await this.edfs.newDocument(content);
        const document = {
            name: id,
            id,
            userId: uuidv4()
        };
        this.documents.unshift(document);
        await this.saveDocument();
        const metadata = {
            name: document.name,
            peers: [document.userId]
        };
        await this.edfs.mount(`/${id}`, id);
        await this.edfs.writeFile(`/${id}/metadata`, metadata);
        await this.changeCurrent(id);
    }


    async changeCurrent(id) {
        if (this.documents.length === 0) {
            return this.newDocument();
        } else if (!id) {
            const i = this.documents[0];
            this.current = i;
            this.editField.value = i.name;
        } else {
            for (const i of this.documents) {
                if (i.id === id) {
                    this.current = i;
                    this.editField.value = i.name;
                    break;
                }
            }
        }
        await this.loadDocumentContent();
    }

    async loadDocumentContent() {
        const {id} = this.current;
        console.log('Loading document: ' + id);
        await this.edfs.mount(`/${id}`, id);
        const document = await this.edfs.readFile(`/${id}/content`);
        this.editor.setContents(document);
        const metadata = await this.edfs.readFile(`/${id}/metadata`);
        this.current.name = metadata.name;
        this.editField.value = metadata.name;
        this.current.peers = metadata.peers;

        this.communication.stop();
        this.communication.start(this.current.userId, metadata.peers);

        this.showPeers();
        this.createSidebarElements();
    }

    showPeers() {
        const e = document.getElementById('peers-id');
        e.innerHTML = '';

        if (!this.current.activePeers) {
            this.current.activePeers = [];
        }

        if (this.communication.isMaster()) {
            const newElement = document.createElement('h6');
            newElement.classList.add('dropdown-header');
            newElement.innerText = 'Active peers';
            e.appendChild(newElement);

            const peersNumber = document.getElementById('peersNumber');
            peersNumber.innerText = this.current.activePeers.length || 0;

            for (const i of this.current.activePeers) {
                const newElement = document.createElement('a');
                newElement.classList.add('dropdown-item');
                newElement.innerText = i;
                e.appendChild(newElement);
            }
        }

        const newElement = document.createElement('h6');
        newElement.classList.add('dropdown-header');
        newElement.innerText = 'Peers';
        e.appendChild(newElement);

        for (const i of this.current.peers || []) {
            if (!this.current.activePeers.includes(i)) {
                const newElement = document.createElement('a');
                newElement.classList.add('dropdown-item');
                newElement.innerText = i;
                e.appendChild(newElement);
            }
        }
    }


    async saveDocument() {
        this.documents = this.documents.map(i => i.id === this.current && this.current.id ? this.current : i);
        await this.saveDocuments();

        const content = this.editor.getContents();
        if (this.current && this.communication) {
            const {id, name} = this.current;
            await this.edfs.writeFile(`/${id}/content`, content);
            const metadata = await this.edfs.readFile(`/${id}/metadata`);
            metadata.name = name;
            await this.edfs.writeFile(`/${id}/metadata`, metadata);
            console.log('saved');
        }
        this.createSidebarElements();
    }

    deleteDocument() {
        if (!this.current) {
            return;
        }
        this.documents = this.documents.filter(i => i.id !== this.current.id);
        this.current = null;
        this.saveDocuments();
        this.changeCurrent();
    }

    async loadDocuments() {
        let seed = JSON.parse(localStorage.getItem('SEED'));
        if (!seed) {
            const dossier = await this.edfs.createWallet([]);
            this.edfs.setDossier(dossier);
            seed = dossier.getSeed();
            localStorage.setItem('SEED', JSON.stringify(seed));
        } else {
            const dossier = await this.edfs.loadDossier(seed);
            this.edfs.setDossier(dossier);
        }

        const documents = await this.edfs.readFile('documents');
        this.documents = documents || [];
        this.changeCurrent();
    }

    createSidebarElements() {
        if (!this.current || !this.current.id) {
            return;
        }
        const e = document.getElementById('elements-container-id');
        if (e) {
            e.remove();
        }

        const container = document.createElement('div');
        container.id = 'elements-container-id';
        for (const i of this.documents) {
            const newElement = document.createElement('div');
            newElement.classList.add('list-item');
            newElement.onclick = () => manager.changeCurrent(i.id);
            if (i.id === this.current.id) {
                newElement.classList.add('list-item-active');
            }

            const newSpan = document.createElement('span');
            newSpan.classList.add('list-item-span');
            newSpan.innerText = i.name || 'error';

            newElement.appendChild(newSpan);
            container.appendChild(newElement);
        }

        this.elementsList.appendChild(container);
    }

    async saveDocuments() {
        if (!this.documents) {
            return console.error('Data is required.');
        }
        await this.edfs.writeFile('documents', this.documents);
    }


    copyToClipboard() {
        const el = document.createElement('textarea');
        el.value = this.current.id;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };


    async importDocument() {
        const id = this.importField.value;
        const document = {
            name: id,
            id,
            userId: uuidv4()
        };
        this.documents.unshift(document);
        await this.changeCurrent(document.id);
        const metadata = await this.edfs.readFile(`/${id}/metadata`);
        if (!metadata.peers.includes(document.userId)) {
            metadata.peers.push(document.userId);
        }
        await this.edfs.writeFile(`/${id}/metadata`, metadata);
        await this.saveDocuments();
    }
}
