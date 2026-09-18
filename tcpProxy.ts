import net from 'net';
import { docker } from './config/docker.config';
import { config } from './config/app.config';

const activeTcpServers = new Map<number, net.Server>();

export function parseSniFromClientHello(buffer: Buffer): string | null {
    try {
        if (buffer.length < 5 || buffer[0] !== 0x16) return null;
        let offset = 5;
        if (buffer[offset] !== 0x01) return null;
        offset += 38;
        const sessionIdLen = buffer[offset] || 0;
        offset += 1 + sessionIdLen;
        const cipherSuitesLen = buffer.readUInt16BE(offset);
        offset += 2 + cipherSuitesLen;
        const compMethodsLen = buffer[offset] || 0;
        offset += 1 + compMethodsLen;
        if (offset + 2 > buffer.length) return null;
        const extensionsLen = buffer.readUInt16BE(offset);
        offset += 2;
        const maxOffset = offset + extensionsLen;
        while (offset + 4 <= maxOffset && offset + 4 <= buffer.length) {
            const extType = buffer.readUInt16BE(offset);
            const extLen = buffer.readUInt16BE(offset + 2);
            offset += 4;
            if (extType === 0x0000) {
                if (offset + 2 > buffer.length) return null;
                let listOffset = offset + 2;
                while (listOffset + 3 <= offset + extLen) {
                    const nameType = buffer[listOffset];
                    const nameLen = buffer.readUInt16BE(listOffset + 1);
                    listOffset += 3;
                    if (nameType === 0) {
                        return buffer.toString('utf8', listOffset, listOffset + nameLen);
                    }
                    listOffset += nameLen;
                }
            }
            offset += extLen;
        }
    } catch {
        return null;
    }
    return null;
}

export function ensureTcpSniListener(port: number) {
    if (activeTcpServers.has(port)) return;
    const server = net.createServer((clientSocket) => {
        clientSocket.once('data', async (initialData) => {
            const buf = Buffer.isBuffer(initialData) ? initialData : Buffer.from(initialData);
            const sniHostname = parseSniFromClientHello(buf);
            const hostHeader = sniHostname || '';
            const containerName = hostHeader.split('.')[0];
            if (!containerName) {
                clientSocket.destroy();
                return;
            }
            try {
                const containerRef = docker.getContainer(containerName);
                const inspectData = await containerRef.inspect();
                if (!inspectData.State.Running) {
                    clientSocket.destroy();
                    return;
                }
                const networkSettings = inspectData.NetworkSettings.Networks[config.dockerNetwork];
                const internalIp: string = networkSettings?.IPAddress || (inspectData.NetworkSettings as any)?.IPAddress || "";
                if (!internalIp) {
                    clientSocket.destroy();
                    return;
                }
                const targetSocket = net.connect(port, internalIp, () => {
                    targetSocket.write(buf);
                    clientSocket.pipe(targetSocket).pipe(clientSocket);
                });
                targetSocket.on('error', () => clientSocket.destroy());
                clientSocket.on('error', () => targetSocket.destroy());
            } catch (err: any) {
                console.error("[TCP Proxy] Failed routing for '" + containerName + "' on port " + port + ":", err.message);
                clientSocket.destroy();
            }
        });
    });
    server.listen(port, "0.0.0.0", () => {
        console.log("[TCP Proxy] Generic TCP SNI proxy listening on port " + port);
    });
    activeTcpServers.set(port, server);
}
