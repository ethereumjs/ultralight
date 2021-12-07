export class IOException extends Error {
    constructor(message?: string) {
        super(message)
    }

    printStackTrace() {
        
    }

    getMessage() {

    }
}

// export type IOException = unknown
export class InterruptedException extends IOException {}
export class ArrayIndexOutOfBoundsException extends IOException {};

