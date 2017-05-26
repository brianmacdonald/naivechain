import bodyParser from 'body-parser';
import CryptoJS from 'crypto-js';
import express from 'express';
import WebSocket from 'ws';

import Block from './Block';
import ChainManager from './ChainManager';
import Genesis from './Genesis';
import MessageType from './MessageType';

class Server {

    constructor(manager, http_port, p2p_port, initialPeers) {
        this.manager = manager;
        this.http_port = http_port;
        this.p2p_port = p2p_port;
        this.initialPeers = initialPeers;
        this.sockets = [];
    }

    run() {
        this.runWebServer();
        this.runP2PServer();
        Server.connectToPeers(this.initialPeers);
    }

    runWebServer() {
        let app = express();
        app.use(bodyParser.json());

        app.get('/blocks', (req, res) => res.send(JSON.stringify(this.manager.blockchain)));
        app.get('/mineBlock', (req, res) => {
            var newBlock = this.manager.generateNextBlock(req.body.data);
            this.manager.addBlock(newBlock);
            Server.broadcast(this.sockets, Server.responseLatestMsg());
            console.log('block added: ' + JSON.stringify(newBlock));
            res.send();
        });
        app.get('/peers', (req, res) => {
            res.send(this.sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
        });
        app.post('/addPeer', (req, res) => {
            Server.connectToPeers([req.body.peer]);
            res.send();
        });
        app.listen(this.http_port, () => console.log('Listening http on port: ' + this.http_port));
    };

    runP2PServer() {
        let p2pServer = new WebSocket.Server({port: this.p2p_port});
        p2pServer.on('connection', ws => Server.initConnection(this.manager, this.sockets, ws));
        console.log('listening websocket p2p port on: ' + this.p2p_port);
    }

    static initConnection(manager, sockets, ws) {
        sockets.push(ws);
        Server.initMessageHandler(manager, ws);
        Server.initErrorHandler(sockets, ws);
        Server.write(ws, Server.queryChainLengthMsg());
    };

    static initErrorHandler(sockets, ws) {
        var closeConnection = (ws) => {
            console.log('connection failed to peer: ' + ws.url);
            sockets.splice(sockets.indexOf(ws), 1);
        };
        ws.on('close', () => closeConnection(ws));
        ws.on('error', () => closeConnection(ws));
    };

    static connectToPeers(newPeers) {
        newPeers.forEach((peer) => {
            var ws = new WebSocket(peer);
            ws.on('open', () => Server.initConnection(ws));
            ws.on('error', () => {
                console.log('connection failed')
            });
        });
    };

    static handleBlockchainResponse(manager, message) {
        let receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index)),
            latestBlockReceived = receivedBlocks[receivedBlocks.length - 1],
            latestBlockHeld = getLatestBlock();
        if (latestBlockReceived.index > latestBlockHeld.index) {
            console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                console.log("We can append the received block to our chain");
                manager.blockchain.push(latestBlockReceived);
                Server.broadcast(this.sockets, Server.responseLatestMsg());
            } else if (receivedBlocks.length === 1) {
                console.log("We have to query the chain from our peer");
                Server.broadcast(this.sockets, this.queryAllMsg());
            } else {
                console.log("Received blockchain is longer than current blockchain");
                manager.replaceChain(receivedBlocks, Server.responseChainMsg(manager.blockchain));
            }
        } else {
            console.log('received blockchain is not longer than received blockchain. Do nothing');
        }
    };

    static initMessageHandler(manager, ws) {
        ws.on('message', (data) => {
            var message = JSON.parse(data);
            console.log('Received message' + JSON.stringify(message));
            if (message.type === MessageType.QUERY_LATEST) {
                Server.write(ws, Server.responseLatestMsg());
            } else if (message.type === MessageType.QUERY_ALL) {
                Server.write(ws, Server.responseChainMsg(manager.blockchain));
            } else if (message.type === MessageType.RESPONSE_BLOCKCHAIN) {
                Server.handleBlockchainResponse(manager, message);
            }
        });
    };

    static responseLatestMsg() {
        return {
            'type': MessageType.RESPONSE_BLOCKCHAIN,
            'data': JSON.stringify([ChainManager.getLatestBlock()])
        };
    };

    static queryChainLengthMsg() {
        return {
            'type': MessageType.QUERY_LATEST
        }
    }

    static queryAllMsg() {
        return {'type': MessageType.QUERY_ALL};
    }

    static responseChainMsg(blockchain) {
        return {'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain)};
    }

    static write(ws, message) {
        return ws.send(JSON.stringify(message));
    }

    static broadcast(sockets, message) {
        return sockets.forEach(socket => Server.write(socket, message));
    }


}

module.exports = Server;
