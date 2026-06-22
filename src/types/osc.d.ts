declare module 'osc' {
    interface OscArgument {
        type: string;
        value: number | string | boolean;
    }

    interface OscMessage {
        address: string;
        args: OscArgument[];
    }

    interface UDPPortOptions {
        localAddress?: string;
        localPort?: number;
        remoteAddress?: string;
        remotePort?: number;
        broadcast?: boolean;
        multicastTTL?: number;
        multicastMembership?: string[];
        metadata?: boolean;
    }

    class UDPPort {
        constructor(options: UDPPortOptions);
        open(): void;
        close(): void;
        send(message: OscMessage, address?: string, port?: number): void;
        on(event: 'ready', listener: () => void): this;
        on(event: 'message', listener: (message: OscMessage) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
    }
}