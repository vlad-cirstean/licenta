class Edfs {
    async init(endpoint) {
        this.edfs = require('edfs').attachToEndpoint(endpoint);
        this.dossier = await this.createDossier();
    }

    async createDossier() {
        return new Promise((resolve, reject) => {
            this.edfs.createRawDossier((err, dossier) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(dossier);
                }
            });
        });
    }


    async writeFile(path, content) {
        return new Promise((resolve, reject) => {
            this.dossier.writeFile(path, JSON.stringify(content), {ignoreMounts: false}, (err, archiveDigest) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(archiveDigest);
                }
            });
        });
    }

    async readFile(path) {
        return new Promise((resolve, reject) => {
            this.dossier.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(data));
                }
            });
        });
    }

    async mount(path, seed) {
        const mounts = await this.listMountedDossiers('');
        let alreadyMounted = false;
        for (const i of mounts) {
            if (i.identifier === seed) {
                alreadyMounted = true;
            }
        }
        if (!alreadyMounted) {
            return new Promise((resolve, reject) => {
                this.dossier.mount(path, seed, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Dossier successfully mounted');
                        resolve();
                    }
                });
            });
        } else {
            console.log('Dossier already mounted');
            return Promise.resolve();
        }
    }

    async newDocument(content) {
        const dossier = await this.createDossier();
        return new Promise((resolve, reject) => {
            dossier.writeFile('content', JSON.stringify(content), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(dossier.getSeed());
                }
            });
        });
    }

    async deleteDocument(path) {
        return new Promise((resolve, reject) => {
            this.dossier.delete(path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Folder successfully deleted.');
                    resolve();
                }
            });
        });
    }

    async listMountedDossiers(path) {
        return new Promise((resolve, reject) => {
            this.dossier.listMountedDossiers(path, (err, mountedDossiersList) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(mountedDossiersList);
                }
            });
        });
    }
}
