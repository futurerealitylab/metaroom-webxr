class Toonr {
    constructor() {
        this.offsets = {};
        this.links = {};

        this.bus = EventBus();
        this.streamid = -1;
        this.creationStreamID = -1;
        this.skeletonStreams = {};
    }

    registerStream(streamid) {

        this.creationStreamID = MR.EventBus.subscribe("toon:create", (payload) => {
            const skeletonIDs = payload["skeletons"].keys();

            for (const uid in skeletonIDs) {

                const skeleton = payload["skeletons"][uid];
                // TODO:
                // handle case with missing fields
                this.links[uid] = skeleton['links'];
                this.names[uid] = skeleton['names'];

            }
        });

        this.streamid = MR.EventBus.subscribe("toon", this.streamCallback);
    }

    streamCallback(payload) {

        const skeletonIDs = payload["skeletons"];

        for (const uid in skeletonIDs) {

            const skeleton = payload[uid];
            const frames = skeleton['frames'];

            this.bus.publish(uid, frames);
        }
    }

    // each stream can contain multiple skeletons, publish only to a skeleton
    registerSkeleton(uid, offset = [0, 0, 0]) {
        this.skeletonStreams[uid] = this.bus.subscribe(uid, this.skeletonCallback);
        this.offsets[uid] = offset;
    }

    skeletonCallback(uid, payload) {
        console.log(uid);
    }

}