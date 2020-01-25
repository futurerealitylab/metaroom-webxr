"use strict";

export class BinaryRequester {
    constructor(args) {
        this.request = args.procs.request;
        this.getData = args.procs.getData;
    }

    static async getInterface(name = "assetutil") {
        switch (name) {
        case "axios": {
            try {
                const loaderModule = await import (
                    "./binary_requester_axios.js"
                );
                return loaderModule.loaderInterface;
            } catch (err) {
                console.error(err);
            }
            // fallthrough
        }
        case "assetutil": {
            const loaderModule = await import(
                "./binary_requester_assetutil.js"
            )
            return loaderModule.loaderInterface;
        }
        }

        return null;
    }

    static async make(name) {
        return new BinaryRequester(
            await BinaryRequester.getInterface(name)
        );
    }
}
