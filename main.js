import Server from './Server';
import ChainManager from './ChainManager'

var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];


let server = new Server(ChainManager, http_port, p2p_port, initialPeers);
server.run();