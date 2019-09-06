"use strict";

const MREditor = (function() {
	
	const _outEnabled = {};
	const _outDisabled = {};

    const TEXT_COLOR_NO_ERROR = "#d3b58d"; //'#BFBFBF';
    const TEXT_COLOR_ERROR    = '#dddda0';
    const ERR_COLOR_MESSAGE   = 'red';
    const BG_COLOR_NO_ERROR   = 'black';
    const BG_COLOR_ERROR      = 'black';

    let globalErrorMsgNode;
    let globalErrorMsgNodeText;
    let globalErrorMsgState = {vertex : "", fragment : ""};

	class Editor {
		constructor() {
			this.libMap = null;
			this.tempCompiledShader = null;
			this.libToShaderMap = new Map();
		}
	}
	const _out = new Editor();
	MR.editor = _out;

	function hookIntoGFXLib(gfxLib__) {

	}
	_out.hookIntoGFXLib = hookIntoGFXLib;


	function disable() {

	}
	_out.disable = disable;

	function enable() {

	}
	_out.enable = enable;

	_out.shaderMap = null;


	function autoExpand(field) {
	  // field.style.height = "inherit";

	  // var computed = window.getComputedStyle(field);

	  // var height = parseInt(computed.getPropertyValue('border-top-width'), 10) +
	  //              parseInt(computed.getPropertyValue('padding-top'), 10) +
	  //              field.scrollHeight +
	  //              parseInt(computed.getPropertyValue('padding-bottom'), 10) +
	  //              parseInt(computed.getPropertyValue('border-bottom-width'), 10);


	  // field.style.height = height + 'px';

	  let text = field.value.split('\n');
	  let cols = 0;
	  for (let i = 0; i < text.length; i += 1) {
	      cols = Math.max(cols, text[i].length);
	  }

	  field.rows = text.length;
	  field.cols = cols;
	}
 

    function watchFiles(arr, status = {}) {
        if (!arr) {
            status.message = "ERR_NO_FILES_SPECIFIED";
            console.error("No files specified");
            return false;
        }
        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        MR.server.sock.send(JSON.stringify({"MR_Message" : "Watch_Files", "files" : arr}));
    }

    function unwatchFiles(arr, status = {}) {
        if (!arr) {
            status.message = "ERR_NO_FILES_SPECIFIED";
            console.error("No files specified");
            return false;
        }
        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }        

        MR.server.sock.send(JSON.stringify({"MR_Message" : "Unwatch_Files", "files" : arr}));
    }

	function resetState() {
        if (MREditor.shaderMap) {   
            let toUnwatch = [];
            for (let record of MREditor.shaderMap.values()) {
                for (let prop in record.paths) {
                    if (Object.prototype.hasOwnProperty.call(record.paths, prop)) {
                        toUnwatch.push(record.paths[prop]);
                    }
                }
            }
            if (toUnwatch.length > 0) {
                unwatchFiles(toUnwatch);
            }

            for (let prop in globalErrorMsgState) {
                globalErrorMsgState[prop] = "";
            }
            globalErrorMsgNodeText.nodeValue = "";
        }
		{
		  _out.shaderMap = new Map();
		  const _tareas = document.getElementById("text-areas");
		  if (!_tareas) {
		    return;
		  }
		  const _children = _tareas.children;
		  for (let i = 0; i < _children.length; i += 1) {
		    let _subtareas = _children[i];
		    while (_subtareas && _subtareas.firstChild) {
		        _subtareas.removeChild(_subtareas.firstChild);
		    }
		  }
		}
		{
		  if (wrangler.externalWindow) {
		    const _tareas = wrangler.externalWindow.document.getElementById("text-areas");
		    if (!_tareas) {
		      return;
		    }
		    const _children = _tareas.children;
		    for (let i = 0; i < _children.length; i += 1) {
		      let _subtareas = _children[i];
		      while (_subtareas && _subtareas.firstChild) {
		          _subtareas.removeChild(_subtareas.firstChild);
		      }
		    }
		  }
		}

		_out.libMap = null;
		_out.libGroupMap = null;

		GFX.tempCompiledShaderDirty = false;
		GFX.tempPreprocessorErrRecord = null;
		GFX.tempCompiledShader = null;
	}
	_out.resetState = resetState;

        const saveCallback = (event) => {
            let ok = true;
            let i = 0;
            let msgs = [];
            const keys = MREditor.shaderMap.keys();
            let kcount = 0;
            const status = {};
            for (const k of MREditor.shaderMap.keys()) {
                ok = ok && saveShaderToFile(k, status);
                
                if (status.message === "ERR_SERVER_UNAVAILABLE") {
                    MR.wrangler.menu.save.name = "save failed, server unavailable";
                    const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);

                    MR.wrangler.menu.save.el.style.color = "red";

                    setTimeout(() => {
                        MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                        MR.wrangler.menu.save.el.style = oldStyle;
                    }, 1000);

                    MR.server.subs.subscribeOneShot('open', saveCallback);
                    // attempt to re-connect
                    MR.initServer();



                    return;
                }

                msgs.push(k);
                kcount += 1;
            }

            if (ok && kcount > 0) {

                const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);

                //MR.wrangler.menu.save.button.innerHTML = msg;
                MR.wrangler.menu.save.el.style.color = "#66ff00";
                MR.wrangler.menu.save.name = "saved " + msgs[i];
                const intervalID = setInterval(() => {;
                    MR.wrangler.menu.save.el.style = oldStyle;

                    i += 1;

                    if (i === msgs.length) {
                        MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                        clearInterval(intervalID);
                    } else {
                        MR.wrangler.menu.save.name = "saved " + msgs[i];
                    }

                }, 500);
            } else {
                if (kcount == 0) {
                    msgs = ["nothing to save"];
                } else {
                    msgs = ["save failed, fix errors first"];
                }
                MR.wrangler.menu.save.name = msgs[0];
                const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);

                MR.wrangler.menu.save.el.style.color = "red";

                setTimeout(() => {
                    MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                    MR.wrangler.menu.save.el.style = oldStyle;
                }, 1000);
            }
        };


	function init(args) {

		this.defaultShaderCompilationFunction = 
		args.defaultShaderCompilationFunction || this.onNeedsCompilationDefault;

		this.getExternalWindow = args.externalWindowGetter;

		const doc = (this.getExternalWindow) ? this.getExternalWindow().document : document;

		doc.addEventListener('input', function (event) {
	  		if (event.target.tagName.toLowerCase() !== 'textarea') return;
	  		autoExpand(event.target);
		}, false);

		resetState();



        const showHideState = {
            idx   : 0,
            text  : ["Show", "Hide"],
            style : ["none", "block"],
            classes : ["hidden", "shown"]
        };
        MR.wrangler.menu.hide = new MenuItem(
            MR.wrangler.menu.el, 'ge_menu', 'Hide', 
            (event) => {

                MR.wrangler.menu.hide.name = 
                    showHideState.text[showHideState.idx];
                document.getElementById('text-areas').style.display = 
                    showHideState.style[showHideState.idx];

                showHideState.idx ^= 1;

                const classes = showHideState.classes;
                globalErrorMsgNode.classList.remove(classes[1 - showHideState.idx]);
                globalErrorMsgNode.classList.add(classes[showHideState.idx]);

                MR.wrangler.codeIsHidden = (showHideState.idx === 1);
            }
        );
        MR.wrangler.codeIsHidden = false;

        document.getElementById("text-areas").style.paddingBottom = 
            (MR.wrangler.menu.el.getBoundingClientRect().height * 1.5) + "px";



        // TODO
        // MR.wrangler.menu.reset = new MenuItem(
        //     MR.wrangler.menu.el, 'ge_menu', 'Reset Shaders',
        //     (event) => {
        //         const shaderIt = MREditor.shaderMap.entries();
        //         for (let shader of shaderIt) {
        //             const shaderRecord = shader[1];
        //             const originals = shaderRecord.originals;
        //             const headers =  shaderRecord.headers;
        //             const textAreas = shaderRecord.textAreas;

        //             shaderRecord.logs.clearLogErrors();
        //             shaderRecord.hasError = false;

        //             {
        //                 const errorStates = shaderRecord.errorStates;
        //                 for (let entry of errorStates) {
        //                     entry[1] = false;
        //                 }
        //             }

        //             for (let prop in originals) {
        //                 if (Object.prototype.hasOwnProperty.call(originals, prop)) {
        //                     const tArea = textAreas[prop];
        //                     if (tArea) {
        //                         tArea.value = originals[prop];
        //                         tArea.style.backgroundColor = BG_COLOR_NO_ERROR;
        //                         tArea.style.color = TEXT_COLOR_NO_ERROR
        //                     }
        //                 }
        //             }

        //             shaderRecord.compile();
        //         }
        //     }
        // );

        // TODO(KTR): don't show the button when the server is unavailable
        // MR.wrangler.menu.instaniateServerDependentMenuArray = [];
        // MR.wrangler.menu.instaniateServerDependentMenuArray.push(() => {
        //     MR.wrangler.menu.save = new MenuItem(MR.wrangler.menu.el, 'ge_menu', 'Save', saveCallback);
        //     document.addEventListener("keydown", function(e) {
        //       if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)  && e.keyCode == 83) {
        //         e.preventDefault();
        //         saveCallback(e);
        //       }
        //     }, false);
        // });
        MR.wrangler.menu.save = new MenuItem(MR.wrangler.menu.el, 'ge_menu', 'Save', saveCallback);
        document.addEventListener("keydown", function(e) {
          if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)  && e.keyCode == 83) {
            e.preventDefault();
            saveCallback(e);
          }
        }, false);

        const header = doc.createElement("H1");
        header.classList.add("status_info");
        header.classList.add("hidden");
        header.classList.add("fixed");
        header.style.color = ERR_COLOR_MESSAGE;
        const text   = doc.createTextNode('');
        header.appendChild(text);
        const textAreas = document.getElementById('text-areas');

        textAreas.parentNode.insertBefore(header, textAreas);

        globalErrorMsgNode = header;
        globalErrorMsgNodeText = text;
	}
	_out.init = init;

	function createShaderProgramFromStringsAndHandleErrors(vertex, fragment) {
		GFX.tempCompiledShader = GFX.createShaderProgramFromStrings(
			vertex,
			fragment
		);
		GFX.tempCompiledShaderDirty = true;
	}
	_out.createShaderProgramFromStringsAndHandleErrors = createShaderProgramFromStringsAndHandleErrors;

	function preprocessAndCreateShaderProgramFromStringsAndHandleErrors(vertex, fragment, libMap) {
		
        const vertRecord = GFX.preprocessShader(vertex,   libMap);
        const fragRecord = GFX.preprocessShader(fragment, libMap);

        if (!vertRecord.isValid || !fragRecord.isValid) {
        	GFX.tempErrorDirty = true;
        	GFX.tempPreprocessorErrRecord = {program : null, errRecord : {
                vertex : vertRecord.errRecord, 
                fragment : fragRecord.errRecord
            }};

            GFX.tempCompiledShaderDirty = true;
            return;
        }

		GFX.tempCompiledShader = GFX.createShaderProgramFromStrings(
			vertex,
			fragment
		);
		GFX.tempCompiledShaderDirty = true;
	}
	_out.preprocessAndCreateShaderProgramFromStringsAndHandleErrors = preprocessAndCreateShaderProgramFromStringsAndHandleErrors;


    function loadAndRegisterShaderLibrariesForLiveEditing(_gl, key, args, options) {
        return _out.registerShaderLibrariesForLiveEditing(_gl, key, args, options);
    }
    _out.loadAndRegisterShaderLibrariesForLiveEditing = loadAndRegisterShaderLibrariesForLiveEditing;

    function registerShaderLibrariesForLiveEditing(_gl, key, args, options) {
        if (!args) {
            console.warn("No libraries object specified. Libraries section will be empty.");
            return;
        }

        if (!this.libMap) {
        	this.libMap = new Map();
        }
        const libMap = this.libMap;



        // let record = libMap.get(key);
        // if (!record) {
        // 	record = {args : args, originals : [], textAreas : [], assocShaders : new Map()};
        // 	libMap.set(key, record);
        // }

        if (!this.libGroupMap) {
        	this.libGroupMap = new Map();
        }
        const libGroupMap = this.libGroupMap;
        let record = libGroupMap.get(key);
        if (!record) {
        	record = {
        		args : args, originals : {}, textAreas : {}, 
        		assocShaderCompileCallbacks : new Map()
        	};
        	libGroupMap.set(key, record);
        }
       
        for (let i = 0; i < args.length; i += 1) {
        	const codeKey = args[i].key;
        	const codeTxt = args[i].code;

        	record.originals[codeKey] = codeTxt;

        	libMap.set(codeKey, codeTxt);
        }

        const doc = (MR.wrangler.externalWindow) ? MR.wrangler.externalWindow.document : document;

        const textAreas = doc.getElementById("shader-libs-container");

        const textAreaElements = record.textAreas;

        	// create shader lib container
            const SHADER_DIV = doc.createElement("div");
            SHADER_DIV.setAttribute("id", key + "-shader-lib-container");
            textAreas.appendChild(SHADER_DIV);

                // create header
                const HEADER_DIV = doc.createElement("div");
                HEADER_DIV.setAttribute("id", key + "lib header");
                SHADER_DIV.appendChild(HEADER_DIV); 
                const hOuter = doc.createElement("H1");
                const tOuter = doc.createTextNode(key + '\n');
                hOuter.appendChild(tOuter);
                HEADER_DIV.appendChild(hOuter);

            SHADER_DIV.appendChild(HEADER_DIV);

                // create hideable container
                const SHADER_LIB_GROUP_DIV = doc.createElement("div");
                SHADER_LIB_GROUP_DIV.setAttribute("id", key + "hideable container lib");

          	SHADER_DIV.appendChild(SHADER_LIB_GROUP_DIV);

          		let shaderInfoIsHidden = false;
          		hOuter.style.color = 'white';
                HEADER_DIV.style.cursor = 'pointer';
                HEADER_DIV.onclick = () => {
                    const isHidden = !propHiddenState.get('main');
                    propHiddenState.set('main', isHidden);
                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(SHADER_LIB_GROUP_DIV);
                        hOuter.style.color = 'gray';

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(SHADER_LIB_GROUP_DIV);
                        hOuter.style.color = 'white';

                        return;
                    }
                    default: {
                        return;
                    }
                    }
                }

                HEADER_DIV.onmouseover = (event) => {
                	const isHidden = propHiddenState.get("main");
                    hOuter.style.color = (isHidden) ? 'white' : 'gray';
                };
                HEADER_DIV.onmouseleave = (event) => {

                    hOuter.style.color = (propHiddenState.get('main') === true) ? 'gray' :
                                                       'white';
                }

        const propHiddenState = new Map();
        propHiddenState.set("main", false);

        for (let i = 0; i < args.length; i += 1) {
        	const arg = args[i];
        	let text = '';
        	let code = '';

        	code = arg.code;
        	text = code.split('\n');
        	const prop = arg.key;

        	propHiddenState.set(key + prop, false);

        	let DIV = doc.createElement("div");
        	DIV.setAttribute("id", key + " : " + prop + "_div");

            let h = doc.createElement("H1");                // Create a <h1> element
            let t = doc.createTextNode(key + " : " + prop + '\n');
            h.appendChild(t);

            DIV.appendChild(h);

            SHADER_LIB_GROUP_DIV.appendChild(DIV);

            const thisTextArea = doc.createElement("textarea");
            thisTextArea.spellcheck = false;
            textAreaElements[prop] = thisTextArea;
            DIV.appendChild(thisTextArea);
            thisTextArea.setAttribute("id", key + "_" + prop + "_textArea");
            thisTextArea.setAttribute("class", "tabSupport");
            thisTextArea.style.wrap = "off";

            let parentElement = thisTextArea.parentElement;

            h.style.cursor = 'pointer';
            h.onmouseover = (event) => {
                const isHidden = propHiddenState.get(key + prop);

                parentElement.style.color = (isHidden) ? 'white' : 'gray';
            };
            h.onmouseleave = (event) => {
                parentElement.style.color = (propHiddenState.get(key + prop) === true) ? 'gray' :
                                                   'white';
            };

            h.onclick = () => {
                const isHidden = !propHiddenState.get(key + prop);
                propHiddenState.set(key + prop, isHidden);

                switch (isHidden) {
                case true: {
                    HTMLUtil.hideElement(thisTextArea);
                    parentElement.style.color = 'gray';

                    return;
                }
                case false: {
                    HTMLUtil.showElement(thisTextArea);
                    parentElement.style.color = 'white';
                    return;
                }
                default: {
                    return;
                }
                }
            };

            let cols = 0;
            for (let i = 0; i < text.length; i += 1) {
                cols = Math.max(cols, text[i].length);
            }

            thisTextArea.rows = text.length + 1;
            thisTextArea.cols = cols;
            thisTextArea.value = code;
            thisTextArea.style.backgroundColor = BG_COLOR_NO_ERROR;
            thisTextArea.style.color = TEXT_COLOR_NO_ERROR;

            const textarea = thisTextArea;

            textarea.style.display = "block";

            thisTextArea.addEventListener('keyup', (event) => {

            	event.preventDefault();

                switch (event.key) {
                case "`": {
                }
                case "ArrowUp": {
                }
                case "ArrowDown": {
                }
                case "ArrowLeft": {
                }
                case "ArrowRight": {
                    return;
                }
                default: {
                    break;
                }
                }

                for (let i = 0; i < record.args.length; i += 1) {
                    const textE = textAreaElements[prop]; 
                    if (textE) {
                        record.args[i][prop] = textE.value;
                        libMap.set(prop, textE.value);
                    }
                } 

                console.warn("TODO: Only re-compile dependent shaders");

 


                for (const v of this.shaderMap.values()) {
			 		v.compile();
				}
            });
            thisTextArea.addEventListener('keydown', (event) => {
                const cursor = textarea.selectionStart;
                if(event.key == "Tab") {
                    event.preventDefault();
                    doc.execCommand("insertText", false, '    ');//appends a tab and makes the browser's default undo/redo aware and automatically moves cursor
                } else if (event.key == "Enter") {
                    event.preventDefault();
                    doc.execCommand("insertText", false, '\n');
                } else if (event.key == '`') {
                    event.preventDefault();

                    return;

                    for (let i = 0; i < record.args.length; i += 1) {
                        const textE = textAreaElements[prop]; 
                        if (textE) {
                            record.args[i][prop] = textE.value;
                            libMap.set(prop, textE.value);
                        }
                    } 

                    console.warn("TODO: Only re-compile dependent shaders");


	                for (const v of this.shaderMap.values()) {
				 		v.compile();
					}
                }

            });
        }


    }
    _out.registerShaderLibrariesForLiveEditing = registerShaderLibrariesForLiveEditing;



    function onNeedsCompilationDefault(args, libMap, userData) {
        const vertex    = args.vertex;
        const fragment  = args.fragment;

        const vertRecord = GFX.preprocessShader(vertex,   libMap);
        const fragRecord = GFX.preprocessShader(fragment, libMap);

        if (!vertRecord.isValid || !fragRecord.isValid) {
            return {program : null, errRecord : {
                vertex : vertRecord.errRecord, 
                fragment : fragRecord.errRecord
            }};
        }
        
        const errRecord = {};
        const program = GFX.createShaderProgramFromStrings(
            vertRecord.shaderSource, 
            fragRecord.shaderSource, 
            errRecord
        );

        return {program : program, errRecord : errRecord}
    }
    _out.onNeedsCompilationDefault = onNeedsCompilationDefault;

    function onNeedsCompilationNoPreprocessorDefault(args, libMap, userData) {
        const vertex    = args.vertex;
        const fragment  = args.fragment;
        
        const errRecord = {};
        const program = GFX.createShaderProgramFromStrings(
            vertRecord.shaderSource, 
            fragRecord.shaderSource, 
            errRecord
        );

        return {program : program, errRecord : errRecord};        
    }
    _out.onNeedsCompilationNoPreprocessorDefault = onNeedsCompilationNoPreprocessorDefault;

    function saveLibsToFile(key) {
        if (!key) {
            console.error("No shader key specified");
            return;
        }        
    }

    _out.defaultShaderOutputPath = "worlds/saved_editor_shaders";



    function saveShaderToFile(key, status = {}) {
        console.log("Saving:", key);
        if (!key) {
            status.message = "ERR_NO_KEY_SPECIFIED";
            console.error("No shader key specified");
            return false;
        }

        const record = MREditor.shaderMap.get(key);
        if (!record) {
            status.message = "ERR_NO_SHADER_RECORD";
            console.error("Shader not on record");
            return false;
        }

        if (record.hasError) {
            status.message = "ERR_SHADER_HAS_ERROR";
            console.warn("Writing canceled, shader has error");
            return false;
        }

        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        const options = record.options;

        let writeQueue = [];
        function enqueueWrite(q, text, path, opts) {
            //console.log("writing", text, "to", getPath(relativePath));

            q.push({path : path, text : text, opts : opts});
        }
        function submitWrite(q) {
            MR.server.sock.send(JSON.stringify({"MR_Message" : "Write_Files", "files" : q}));
        }

        for (let prop in record.args) {
            if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                const textE = record.textAreas[prop];
                if (textE) {
                    let saveTo = _out.defaultShaderOutputPath;
                    let guardAgainstOverwrite = true;
                    if (options && options.paths && options.paths[prop]) {
                        guardAgainstOverwrite = false;

                        const parentPath = getCurrentPath(window.location.pathname);
                        // const localPath = options.saveTo[prop];
                        // console.log("parentPath:", parentPath);
                        // console.log("local file to save:", options.saveTo[prop]);
                        // console.log("origin:", window.location.origin);
                        
                        saveTo = getPath(options.paths[prop]);

                        const origin = window.location.origin;
                        const originIdx = saveTo.indexOf(origin);
                        saveTo = saveTo.substring(originIdx + origin.length + 1);
                        // console.log("remove origin:", saveTo);

                        if (parentPath !== '/' && parentPath !== '\\') {
                            const parentIdx = saveTo.indexOf(parentPath);
                            saveTo = saveTo.substring(parentIdx + parentPath.length);
                        }
                    } else {
                        saveTo += "/" + prop + ".glsl";
                    }

                    console.log("Destination:", saveTo);

                    enqueueWrite(writeQueue, textE.value, saveTo, {guardAgainstOverwrite : guardAgainstOverwrite});
                }

            }
        }
        if (writeQueue.length > 0) {
            submitWrite(writeQueue);
        }

        return true;
    }
    _out.saveShaderToFile = saveShaderToFile;


    async function loadAndRegisterShaderForLiveEditing(_gl, key, callbacks, options) {
        if (!options || !options.paths || !options.paths.vertex || !options.paths.fragment) {
            return Promise.reject("No paths provided");
        }
        return new Promise(async (resolve, reject) => {
            try {
                const vsrc = await assetutil.loadText(options.paths.vertex);
                const fsrc = await assetutil.loadText(options.paths.fragment);
                console.log(vsrc, fsrc);
                resolve(_out.registerShaderForLiveEditing(
                    _gl, key, 
                    {vertex : vsrc, fragment : fsrc}, 
                    callbacks, 
                    options
                ));
            } catch (err) {
                reject(err);
            }
            

        });
    }
    _out.loadAndRegisterShaderForLiveEditing = loadAndRegisterShaderForLiveEditing;

    function registerShaderForLiveEditing(_gl, key, args, callbacks, options) {
        if (!key) {
            console.error("No shader key specified");
            return;
        }

        const onNeedsCompilation = callbacks.onNeedsCompilation || this.defaultShaderCompilationFunction;

        const onAfterCompilation = callbacks.onAfterCompilation;
        const userData = (options && options.userData) ? options.userData : null;


        // TODO(KTR): make a div per shader program in addition to the blocks per shader pass

        const libMap = this.libMap || null;

        let record = MREditor.shaderMap.get(key);
        if (!record) {
            record = {
                args : args, 
                originals : {}, 
                textAreas : {}, 
                logs: {}, 
                errorMessageNodes : {}, 
                program : null, 
                compile : null, 
                options : options, 
                hasError : false,
                errorStates : {},
                headers : {},
                paths : {}
            };

            MREditor.shaderMap.set(key, record);
            for (let prop in args) {
                if (Object.prototype.hasOwnProperty.call(args, prop)) {
                    record.originals[prop] = args[prop];
                }
            }
        }


        const doc = (MR.wrangler.externalWindow) ? MR.wrangler.externalWindow.document : document;
        const textAreas = doc.getElementById("shader-programs-container");
        const textAreaElements = record.textAreas;

            // create shader container
            const SHADER_DIV = doc.createElement("div");
            SHADER_DIV.setAttribute("id", key + "-shader-container");
            textAreas.appendChild(SHADER_DIV);

                // create header
                const HEADER_DIV = doc.createElement("div");
                HEADER_DIV.setAttribute("id", key + "header");
                SHADER_DIV.appendChild(HEADER_DIV); 
                const hOuter = doc.createElement("H1");
                const tOuter = doc.createTextNode(key + '\n');
                hOuter.classList = "shader_section_success";
                hOuter.appendChild(tOuter);
                HEADER_DIV.appendChild(hOuter);

            SHADER_DIV.appendChild(HEADER_DIV);

                // create hideable container
                const SHADER_STAGE_DIV = doc.createElement("div");
                SHADER_STAGE_DIV.setAttribute("id", key + "hideable container");

            SHADER_DIV.appendChild(SHADER_STAGE_DIV);


                HEADER_DIV.onclick = () => {
                    const isHidden = !propHiddenState.get('main');
                    propHiddenState.set('main', isHidden);
                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(SHADER_STAGE_DIV);
                        hOuter.classList = (propErrorState.get("main")) ? 
                                            "shader_section_error_inactive" :
                                            "shader_section_success_inactive"

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(SHADER_STAGE_DIV);
                        hOuter.classList = (propErrorState.get("main")) ? 
                                            "shader_section_error" :
                                            "shader_section_success"

                        return;
                    }
                    default: {
                        return;
                    }
                    }
                }

        
        const propHiddenState = new Map();
        const propErrorState = new Map();
        record.errorStates = propErrorState;
        propHiddenState.set("main", false);
        propErrorState.set("main", false);

        const logError = function(args) {
            const errorMessageNodes = record.errorMessageNodes;
            let hasError = false;
            for (let prop in args) {
                if (Object.prototype.hasOwnProperty.call(args, prop)) {
                    const errMsgNode = errorMessageNodes[prop]

                    if (errMsgNode) {
                    	const textArea = record.textAreas[prop];
                    	const splitTextArea = textArea.value.split('\n');
                    	const errText = args[prop];
                    	if (!errText) {
                    		continue;
                    	}
                    	const errSections = errText.split(':');

                        if (errSections.length < 3) {
                            errMsgNode.nodeValue = "ERROR : " + errSections[1];
                        } else {
                        	const lineNumber = parseInt(errSections[2].trim());

    	                    const token = errSections[3].trim();

                        	if (lineNumber) {
    	                    	const colNumber = 1 + splitTextArea[lineNumber - 1].indexOf(
    	                    		token.substring(1, token.length - 1)
    	                    	);

    	                    	if (colNumber > 0) {
    		                        errMsgNode.nodeValue = "ERROR : Line-" + lineNumber + ",Column-" + colNumber + " : " +
    		                        	token + " : " + errSections[4];
    	                        } else {
    		                        errMsgNode.nodeValue = "ERROR : Line-" + lineNumber + " : " +
    		                        	token + " : " + errSections[4];                        	
    	                        }
                        	} else {
    	                        errMsgNode.nodeValue = "ERROR : Line-unavailable: " +
    	                        	token + " : " + errSections[4];                      		
                        	}
                        }

                        globalErrorMsgState[prop] = errMsgNode.nodeValue + 
                            "\t in FILE : " + 
                            ((record.paths[prop]) ? record.paths[prop]: '') + '\n';

                        textAreaElements[prop].parentElement.style.color = 'red';
                        hasError = true;
                    }
                }
            }
            if (hasError) {
                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_error_inactive" :
                                    "shader_section_error";
                record.hasError = true;

                let errMsg = '';
                for (let msgProp in globalErrorMsgState) {
                    errMsg += globalErrorMsgState[msgProp];
                }
                globalErrorMsgNodeText.nodeValue = errMsg;
            } else {
                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_success_inactive" :
                                    "shader_section_success";

                record.hasError = false;
                globalErrorMsgNodeText.nodeValue = '';
            }
        }
        record.logs.logError = logError;

        function clearLogErrors() {
            const errorMessageNodes = record.errorMessageNodes;
            let hasError = false;
            for (let prop in errorMessageNodes) {
                if (Object.prototype.hasOwnProperty.call(errorMessageNodes, prop)) {
                    const errMsgNode = errorMessageNodes[prop]
                    if (errMsgNode) {
                        errMsgNode.nodeValue = '';
                    }
                }
            }
            GFX.clearErrRecord();
            for (let prop in globalErrorMsgState) {
                globalErrorMsgState[prop] = "";
            }
        }
        record.logs.clearLogErrors = clearLogErrors;

        for (let prop in args) {
            if (Object.prototype.hasOwnProperty.call(args, prop)) {
                let text = '';
                let code = '';

                code = args[prop];
                text = code.split('\n');
                if (text === '') {
                    continue;
                }

                propHiddenState.set(key + prop, false);
                propErrorState.set(key + prop, false);

                let DIV = doc.createElement("div");
                DIV.setAttribute("id", key + " : " + prop + "_div");

                let h = doc.createElement("H1");                // Create a <h1> element
                let t = doc.createTextNode(key + " : " + prop + '\n');
                h.appendChild(t);

                let hErr = doc.createElement('H1');
                hErr.style.color = 'red';
                let tErr = doc.createTextNode('');
                hErr.appendChild(tErr);

                record.errorMessageNodes[prop] = tErr;

                DIV.appendChild(h);
                DIV.appendChild(hErr);

                SHADER_STAGE_DIV.appendChild(DIV);

                const thisTextArea = doc.createElement("textarea");
                thisTextArea.spellcheck = false;
                textAreaElements[prop] = thisTextArea;
                DIV.appendChild(thisTextArea);
                thisTextArea.setAttribute("id", key + "_" + prop + "_textArea");
                thisTextArea.setAttribute("class", "tabSupport");
                thisTextArea.style.wrap = "off";

                let parentElement = thisTextArea.parentElement;
                h.classList = "shader_section_success";

                console.log("setting header for", prop);
                record.headers[prop] = h;


                h.onclick = () => {
                    const isHidden = !propHiddenState.get(key + prop);
                    propHiddenState.set(key + prop, isHidden);

                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(thisTextArea);
                        HTMLUtil.hideElement(hErr);

                        h.classList = (propErrorState.get(key + prop)) ? 
                                            "shader_section_error_inactive" :
                                            "shader_section_success_inactive"

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(thisTextArea);
                        HTMLUtil.showElement(hErr);

                        h.classList = (propErrorState.get(key + prop)) ? 
                                            "shader_section_error" :
                                            "shader_section_success"
                        return;
                    }
                    default: {
                        return;
                    }
                    }
                };
                


                 
                let cols = 0;
                for (let i = 0; i < text.length; i += 1) {
                    cols = Math.max(cols, text[i].length);
                }

                thisTextArea.rows = text.length + 1;
                thisTextArea.cols = cols;
                thisTextArea.value = code;
                thisTextArea.style.backgroundColor = BG_COLOR_NO_ERROR;
                thisTextArea.style.color = TEXT_COLOR_NO_ERROR

                const textarea = thisTextArea;

                textarea.style.display = "block";

                thisTextArea.addEventListener('keyup', (event) => {

                	event.preventDefault();

                    switch (event.key) {
                    case "`": {
                    }
                    case "ArrowUp": {
                    }
                    case "ArrowDown": {
                    }
                    case "ArrowLeft": {
                    }
                    case "ArrowRight": {
                        return;
                    }
                    default: {
                        break;
                    }
                    }

                    for (let prop in record.args) {
                        if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                            const textE = textAreaElements[prop]; 
                            if (textE) {
                                record.args[prop] = textE.value;
                            }

                        }
                    } 

			        if (this.libGroupMap) {
			        	for (const record of this.libGroupMap.values()) {
					        for (let i = 0; i < record.args.length; i += 1) {
					            const textE = record.textAreas[record.args[i].key]; 
					            if (textE) {
					                record.args[i][record.args[i].key] = textE.value;
					                libMap.set(record.args[i].key, textE.value);
					            }
					        }
				    	}
			    	}

                    compile();
                })
                thisTextArea.addEventListener('keydown', (event) => {
                    const cursor = textarea.selectionStart;
                    if(event.key == "Tab") {
                        event.preventDefault();
                        doc.execCommand("insertText", false, '    ');//appends a tab and makes the browser's default undo/redo aware and automatically moves cursor
                    } else if (event.key == "Enter") {
                        event.preventDefault();
                        doc.execCommand("insertText", false, '\n');
                    } else if (event.key == '`') {
                        event.preventDefault();
                        return;
                    }

                });
            }
        }



        { //// watch files
            const toWatch = [];
            for (let prop in args) {
                let saveTo = _out.defaultShaderOutputPath;
                if (options && options.paths && options.paths[prop]) {
                    const parentPath = getCurrentPath(window.location.pathname);
                    
                    saveTo = getPath(options.paths[prop]);

                    const origin = window.location.origin;
                    const originIdx = saveTo.indexOf(origin);
                    saveTo = saveTo.substring(originIdx + origin.length + 1);

                    if (parentPath !== '/' && parentPath !== '\\') {
                        const parentIdx = saveTo.indexOf(parentPath);
                        saveTo = saveTo.substring(parentIdx + parentPath.length);
                    }

                    record.paths[prop] = saveTo;


                    toWatch.push(saveTo);
                    MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
                        if (args.file !== filename) {
                            console.log("file does not match");
                            return;
                        }
                        console.log("updating file");

                        const textE = textAreaElements[prop]; 
                        if (textE) {
                            record.args[prop] = args.content;
                            textE.value = args.content;
                            record.compile();
                        }
                    }, saveTo);
                }
            }
            console.log(record.paths);
            if (toWatch.length > 0) {
                watchFiles(toWatch);
            }
        } ////

        function compile() {
            for (let prop in record.args) {
                if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                    const textE = textAreaElements[prop]; 
                    if (textE) {
                        record.args[prop] = textE.value;
                    }

                }
            } 

            let hasError  = false;
            let status    = null;
            let program   = null;
            let errRecord = null;
            if (onNeedsCompilation) {
                status = onNeedsCompilation(record.args, libMap);
                if (!status) {
                    if (GFX.tempCompiledShaderDirty) {
                        GFX.tempCompiledShaderDirty = false;

                        program = GFX.tempCompiledShader;
                        if (!program) {
                            hasError = true;
                            if (GFX.tempErrorDirty) {
                            	GFX.tempErrorDirty = false;
                            	errRecord = GFX.tempPreprocessorErrRecord;
                            	GFX.tempPreprocessorErrRecord = null;
                            } else {
                            	errRecord = GFX.errRecord;
                        	}
                        } else {
                            GFX.tempCompiledShader = null;
                        }
                    }
                } else {
                    hasError = (status.program == null);
                    errRecord = status.errRecord || GFX.errRecord;
                    program  = status.program;
                }
            } else {
                db.warn("onNeedsCompilation unspecified");
            }

            if (!hasError) {
                record.logs.clearLogErrors();

                const oldProgram = record.program;
                gl.useProgram(program);
                gl.deleteProgram(oldProgram);

                record.program = program;

                record.hasError = false;

                textAreaElements.vertex.style.color             = TEXT_COLOR_NO_ERROR;
                textAreaElements.fragment.style.color           = TEXT_COLOR_NO_ERROR;
                textAreaElements.vertex.style.backgroundColor   = BG_COLOR_NO_ERROR;
                textAreaElements.fragment.style.backgroundColor = BG_COLOR_NO_ERROR;

                if (!onAfterCompilation) {
                    console.warn("onAfterCompilation unspecified");
                } else {
                    onAfterCompilation(program, userData);
                }

                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_success_inactive" :
                                    "shader_section_success";

                if (propErrorState.get("main") === true) {
                    propErrorState.set("main", false);

                    for (let prop in record.args) {
                        if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                            propErrorState.set(key + prop, false);
                            record.headers[prop].classList = propHiddenState.get(key + prop) ? 
                                                "shader_section_success_inactive" :
                                                "shader_section_success";
                        }
                    }
                }

                globalErrorMsgNodeText.nodeValue = '';

            } else if (hasError) {

                globalErrorMsgNodeText.nodeValue = '';

                record.logs.clearLogErrors();
                record.logs.logError(errRecord);

                record.hasError = true;

                textAreaElements.vertex.style.color             = TEXT_COLOR_ERROR;
                textAreaElements.fragment.style.color           = TEXT_COLOR_ERROR;
                textAreaElements.vertex.style.backgroundColor   = BG_COLOR_ERROR;
                textAreaElements.fragment.style.backgroundColor = BG_COLOR_ERROR;

                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_error_inactive" :
                                    "shader_section_error";

                propErrorState.set("main", true);


                for (let prop in record.args) {
                    if (!Object.prototype.hasOwnProperty.call(record.args, prop)) {
                        continue;
                    }
                    if (Object.prototype.hasOwnProperty.call(errRecord, prop)) {
                        propErrorState.set(key + prop, true);
                        record.headers[prop].classList = propHiddenState.get(key + prop) ? 
                                    "shader_section_error_inactive" :
                                    "shader_section_error";
                    } else {
                        propErrorState.set(key + prop, false);
                        record.headers[prop].classList = propHiddenState.get(key + prop) ? 
                                    "shader_section_success_inactive" :
                                    "shader_section_success";
                    }
                }
            }
        }
        record.compile = compile;

        if ((options && (options.doCompilationAfterFirstSetup !== false)) || !options) {
            compile();             
        }

        return compile;
    }

    _out.registerShaderForLiveEditing = registerShaderForLiveEditing;

	return _out;
}());

export {MREditor};
