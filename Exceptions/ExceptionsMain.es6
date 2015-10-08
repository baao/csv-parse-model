/************************************************************************
 *  PROJECT: priceoptAPI
 *  CREATED ON: 06.10.15 14:06
 *  AUTHOR: Michael
 ************************************************************************/
"use strict";
export default class Exceptions {
    constructor(message) {
        Error.call(this, message);
        this.message = message;
        Error.captureStackTrace(this, this.constructor);
        Object.defineProperty(this, 'name', {
            configurable: true,
            enumerable: false,
            value: this.constructor.name
        });
    }
}

Exceptions.prototype = new Error();

export class NotFoundError extends Exceptions {
    constructor(message) {
        super(message);
        this.message = message;
    }
}

export class ModelNotFoundError extends Exceptions {
    constructor(message) {
        super(message);
        this.message = message;
    }
}

export class NoInputFile extends Exceptions {
    constructor(message) {
        super(message);
        this.message = message;
    }
}

