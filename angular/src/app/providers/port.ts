import { InjectionToken } from '@angular/core';

export const PORT = new InjectionToken('PORT', {
    factory() {
        let port = (
            window as typeof window & { process: { argv: string[] } }
        ).process.argv.find((str: string) => str.startsWith('--port='));
        if (!port) {
            return '8000';
        }
        port = port.split('=')[1];
        return port;
    },
});
