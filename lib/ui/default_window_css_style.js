"use strict";

// <link   rel="icon" href="assets/favicon.ico" type="image/x-icon">
// <link   rel="stylesheet" href="assets/css/main.css">
// <link   rel="stylesheet" href="assets/css/glslEditor/glslEditor.css">

        // const linkElement = doc.createElement('link');
        // linkElement.setAttribute('rel', 'stylesheet');
        // linkElement.setAttribute('type', 'text/css');
        // linkElement.setAttribute('href', 'data:text/css;charset=UTF-8,' + encodeURIComponent(myStringOfstyles));

export function init(doc) {
    const docFrag = new DocumentFragment();
    {
        const linkElement = doc.createElement('link');
        linkElement.setAttribute('rel', 'icon');
        linkElement.setAttribute('href', 'assets/favicon.ico');
        linkElement.setAttribute('type', 'image/x-icon');

        docFrag.appendChild(linkElement);
    }
    {
        const linkElement = doc.createElement('link');
        linkElement.setAttribute('rel', 'stylesheet');
        linkElement.setAttribute('href', 'assets/css/main.css');

        docFrag.appendChild(linkElement);
    }
    {
        const linkElement = doc.createElement('link');
        linkElement.setAttribute('rel', 'stylesheet');
        linkElement.setAttribute('href', 'assets/css/glslEditor/glslEditor.css');

        docFrag.appendChild(linkElement);
    }

    doc.head.prepend(docFrag);
}
