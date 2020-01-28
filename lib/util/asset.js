"use strict";

import * as path from "/lib/util/path.js";

export async function loadTextRelativePath(relativePath, opts) {
    return await fetch(path.fromLocalPath(relativePath),
        (opts || {cache: "no-store"})).
        then(response => { 
            if (response.status !== 200) { 
                latestResponse = null; 
                return null; 
            }
            return response.text();
        }).
        catch(err => { console.error(err); });
};
export {loadTextRelativePath as loadText};

export async function loadTextAbsolutePath(absolutePath, opts) {
    return await fetch(absolutePath, (opts || {cache: "no-store"})).
        then(response => { 
            if (response.status !== 200) { 
                latestResponse = null;
                return null; 
            } 
            return response.text();
        }).
        catch(err => { console.error(err); });
};

export async function loadBinaryRelativePath(relativePath, opts) {
    return await fetch(path.fromLocalPath(relativePath),
        (opts || {cache: "no-store"})).
        then(response => { 
            if (response.status !== 200) {
                latestResponse = response; 
                return null; 
            } 
            return response.arrayBuffer();
        }).
        catch(err => { console.error(err); });
};
export {loadBinaryRelativePath as loadBinary};

export async function loadBinaryAbsolutePath(absolutePath, opts) {
    return await fetch(absolutePath, (opts || {cache: "no-store"})).
        then(response => { 
            if (response.status !== 200) { 
                return null; 
            } 
            return response.arrayBuffer();
        }).
        catch(err => { console.error(err); });
};


export async function requestRelativePath(relativePath, opts) {
    return await fetch(path.fromLocalPath(relativePath),
        (opts || {cache: "no-store"})).
        then(response => { 
            if (response.status !== 200) { 
                return null; 
            } 
            return response;
        }).
        catch(err => { console.error(err); });    
}

export async function requestAbsolutePath(absolutePath, opts) {
    return await fetch(absolutePath, (opts || {cache: "no-store"})).
        then(response => { 
            if (response.status !== 200) {
                return null; 
            } 
            return response;
        }).
        catch(err => { console.error(err); });    
}
