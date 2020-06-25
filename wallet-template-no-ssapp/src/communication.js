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
        this.activePeers = {};
        console.log('I am:' + id, this.peers);

        const self = this;
        this.peer.on('connection', (connection) => {
            console.log('new connection');
            this.incomingConnections.push(connection);
            connection.on('data', (data) => self._handleMessages(connection, data));
            connection.on('error', (e) => console.error(e));
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
                this.incomingConnections = this.incomingConnections.filter(peer => peer.open);
                this.incomingConnections.forEach(i => {
                    i.send(`pskeditor:heartbeat`);
                });
            } else if (Date.now() - this.lastHeartbeat > 5000) {
                console.log('missed heartbeat');
                this.stop();
                this.start(id, peers);
            } else {
                this.masterConnection.send(`pskeditor:active:${Date.now()}`);
            }
            const activePeers = Object.entries(this.activePeers).filter(i => Date.now() - i[1] < 3000).map(i => i[0]);
            this.dispatchEvent(new CustomEvent('activePeers', {detail: activePeers}));

        }, 2000);
    }


    send(data) {
        const message = 'pskeditor:ops:' + JSON.stringify(data);
        if (this.isMaster()) {
            this.fanout(data);
        } else {
            this.masterConnection.send(message);
        }
    }

    fanout(data, peer) {
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
        this.peer && this.peer.disconnect();
    }

    isMaster() {
        return this.master === this.id;
    }

    disconnect() {
        this.peer.disconnect();
    }

    _handleMessages(connection, data) {
        const peer = connection.peer;
        console.log(data + ' from peer: ' + connection.peer);
        if (data === 'pskeditor:candidate') {
            if (this.master) {
                connection.send(`pskeditor:master:${this.master}`);
            }
        } else if (data.includes('pskeditor:master')) {
            this.master = data.replace('pskeditor:master:', '');
            this._stopConnections(this.master);
            if (!this.isMaster()) {
                this.masterConnection = this.peer.connect(this.master);
            }
        } else if (data === 'pskeditor:heartbeat') {
            this.lastHeartbeat = Date.now();
        } else if (data.includes('pskeditor:active')) {
            if (this.isMaster()) {
                const time = data.replace('pskeditor:active:', '');
                this.activePeers[connection.peer] = Date.now();
                for (const conn of [...this.outgoingConnections, ...this.incomingConnections]) {
                    if (conn.peer === peer) {
                        conn.send(`pskeditor:time:${time}:${Date.now()}`);
                    }
                }
            }
        } else if (data.includes('pskeditor:ops')) {
            const ops = JSON.parse(data.replace('pskeditor:ops:', ''));
            this.dispatchEvent(new CustomEvent('remoteCommand', {detail: {ops, peer}}));
        } else if (data.includes('pskeditor:time')) {
            if (!this.isMaster()) {
                const receivedTime = data.match(/^pskeditor:time:(\d+):(\d+)$/);
                const now = Date.now();
                const offset = receivedTime[2] - receivedTime[1] - Math.round((now - receivedTime[1]) / 2);
                this.dispatchEvent(new CustomEvent('time', {detail: offset}));
            }
        }
    }
}
