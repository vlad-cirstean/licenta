class Communication extends EventTarget {
    constructor() {
        super();
        this._clearState();
    }

    _clearState() {
        this.id = null;
        this.peers = [];
        this.master = null;
        this.masterConnection = null;
        this.lastHeartbeat = Date.now();
        this.incomingConnections = [];
        this.outgoingConnections = [];
        this.interval = null;

    }

    start(id, peers) {
        this._clearState();
        this.id = id;
        this.peers = peers;
        this.peer = new Peer(id, {
            host: 'localhost',
            port: 9000,
            path: '/myapp'
        });
        console.log('I am:' + id, this.peers);

        const self = this;
        this.peer.on('connection', (connection) => {
            console.log('new connection');
            this.incomingConnections.push(connection);
            connection.on('data', (data) => self._handleMessages(connection, data));
        });

        for (const peer of this.peers) {
            if (peer !== this.id) {
                console.log('connecting to: ' + peer);
                const connection = this.peer.connect(peer);
                connection.on('open', function () {
                    self.outgoingConnections.push(connection);
                    connection.on('data', (data) => self._handleMessages(connection, data));
                    connection.send('pskeditor:candidate');
                });
            }
        }

        this.interval = setInterval(() => {
            if (!this.master) {
                this.master = this.id;
            } else if (this.isMaster()) {
                console.log('sending heartbeats');
                this.incomingConnections.forEach(i => {
                    i.send('pskeditor:heartbeat');
                });
            } else if (Date.now() - this.lastHeartbeat > 4000) {
                console.log('missed heartbeat');
            }

        }, 2000);
    }

    send(data) {
        console.log(this.isMaster());
        const message = 'pskeditor:ops:' + JSON.stringify(data);
        if (this.isMaster()) {
            this.fanout(data);
        } else {
            this.masterConnection.send(message);
        }
    }

    fanout(data, peer) {
        console.log(peer);
        const message = 'pskeditor:ops:' + JSON.stringify(data);
        if (this.isMaster()) {
            this.incomingConnections.forEach(i => i.peer !== peer && i.send(message));
            this.outgoingConnections.forEach(i => i.peer !== peer && i.send(message));
        }
    }

    _stopConnections(ignore) {
        this.incomingConnections.forEach(i => i.peer !== ignore && i.close());
        this.outgoingConnections.forEach(i => i.peer !== ignore && i.close());
    }

    stop() {
        clearInterval(this.interval);
        this._stopConnections();
    }

    isMaster() {
        return this.master === this.id;
    }

    disconnect() {
        this.peer.disconnect();
    }

    _handleMessages(connection, data) {
        const peer = connection.peer;
        console.log(peer);
        if (data === 'pskeditor:candidate') {
            if (this.master) {
                connection.send(`pskeditor:master:${this.master}`);
            }
        } else if (data.includes('pskeditor:master')) {
            this.master = data.replace('pskeditor:master:', '');
            this._stopConnections(this.master);
            this.masterConnection = this.peer.connect(this.master);
        } else if (data === 'pskeditor:heartbeat') {
            this.lastHeartbeat = Date.now();
        } else if (data.includes('pskeditor:ops')) {
            const ops = JSON.parse(data.replace('pskeditor:ops:', ''));
            this.dispatchEvent(new CustomEvent('remoteCommand', {detail: {ops, peer}}));
        }
        console.log(data + ' from peer:' + connection.peer);
    }
}
