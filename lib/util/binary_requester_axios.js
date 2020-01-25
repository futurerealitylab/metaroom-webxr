"use strict";

if (!axios) {
    throw new Error("Must include the axios script to import");
}

export const loaderInterface = {
    procs : {
        request : function(url, opts, self) {
            return axios.get(url, opts);
        },
        getData : function(result, self) {
            return result.data;
        }
    }
}
