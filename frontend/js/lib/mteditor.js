"use strict";

const MREditor = (function() {
	
	const _outEnabled = {};
	const _outDisabled = {};

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

	function resetState() {

	}
	_out.resetState = resetState;

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

	  field.rows = text.length + 1;
	  field.cols = cols;
	}
 

	function resetState() {
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

	function init(args) {

		this.defaultShaderCompilationFunction = 
		args.defaultShaderCompilationFunction || this.onNeedsCompilationDefault;

		document.addEventListener('input', function (event) {
	  		if (event.target.tagName.toLowerCase() !== 'textarea') return;
	  		autoExpand(event.target);
		}, false);

		resetState();
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

	const TEXT_COLOR_NO_ERROR = "#d3b58d"; //'#BFBFBF';
	const TEXT_COLOR_ERROR    = '#dddda0';
	const BG_COLOR_NO_ERROR   = 'black';
	const BG_COLOR_ERROR      = 'black';

    function registerShaderLibrariesForLiveEditing(_gl, key, args) {
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
            record = {args : args, originals : {}, textAreas : {}, logs: {}, errorMessageNodes : {}, program : null, compile : null};
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
                hOuter.appendChild(tOuter);
                HEADER_DIV.appendChild(hOuter);

            SHADER_DIV.appendChild(HEADER_DIV);

                // create hideable container
                const SHADER_STAGE_DIV = doc.createElement("div");
                SHADER_STAGE_DIV.setAttribute("id", key + "hideable container");

            SHADER_DIV.appendChild(SHADER_STAGE_DIV);

                let shaderInfoIsHidden = false;
                hOuter.style.color = 'white';
                HEADER_DIV.style.cursor = 'pointer';
                HEADER_DIV.onclick = () => {
                    const isHidden = !propHiddenState.get('main');
                    propHiddenState.set('main', isHidden);
                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(SHADER_STAGE_DIV);
                        if (errorState) {
                            return;
                        }
                        hOuter.style.color = 'gray';

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(SHADER_STAGE_DIV);
                        if (errorState) {
                            return;
                        }
                        hOuter.style.color = 'white';

                        return;
                    }
                    default: {
                        return;
                    }
                    }
                }

                let errorState = false;
                HEADER_DIV.onmouseover = (event) => {
                    const isHidden = propHiddenState.get('main');

                    if (hOuter.style.color !== 'red') {
                        hOuter.style.color = (isHidden) ? 'white' : 'gray';
                    } else {
                        hOuter.style.color = 'gray'
                    }
                };
                HEADER_DIV.onmouseleave = (event) => {
                	if (errorState) {
                		hOuter.style.color = 'red';
                		return;
                	}
                    if (hOuter.style.color !== 'red') {
                        hOuter.style.color = (propHiddenState.get('main') === true) ? 'gray' :
                                                       'white';
                    }
                }

        
        const propHiddenState = new Map();
        propHiddenState.set("main", false);

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

                    	const lineNumber = parseInt(errSections[2].trim());

	                    const token = errSections[3].trim();

                    	if (lineNumber) {
	                    	const colNumber = 1 + splitTextArea[lineNumber - 1].indexOf(
	                    		token.substring(1, token.length - 1)
	                    	);

	                    	if (colNumber > 0) {
		                        errMsgNode.nodeValue = "ERROR : L-" + lineNumber + ",C-" + colNumber + " : " +
		                        	token + " : " + errSections[4];
	                        } else {
		                        errMsgNode.nodeValue = "ERROR : L-" + lineNumber + " : " +
		                        	token + " : " + errSections[4];                        	
	                        }
                    	} else {
	                        errMsgNode.nodeValue = "ERROR : L-/: " +
	                        	token + " : " + errSections[4];                      		
                    	}

                        textAreaElements[prop].parentElement.style.color = 'red';
                        hasError = true;
                    }
                }
            }
            if (hasError) {
                hOuter.style.color = 'red';
                errorState = true;
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
                        textAreaElements[prop].parentElement.style.color = 
                        (propHiddenState.get(key + prop)) ? 'gray' : 'white';
                    }
                }
            }
            hOuter.style.color = (shaderInfoIsHidden) ? 'gray' : 'white';
            GFX.clearErrRecord();
        }
        record.logs.clearLogErrors = clearLogErrors;

        for (var prop in args) {
            if (Object.prototype.hasOwnProperty.call(args, prop)) {
                let text = '';
                let code = '';

                code = args[prop];
                text = code.split('\n');
                if (text === '') {
                    continue;
                }

                propHiddenState.set(key + prop, false);


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

                let parentElement = thisTextArea.parentElement;



                h.style.cursor = 'pointer';
                h.onmouseover = (event) => {
                    const isHidden = propHiddenState.get(key + prop);

                    if (parentElement.style.color !== 'red') {
                        parentElement.style.color = (isHidden) ? 'white' : 'gray';
                    }
                };
                h.onmouseleave = (event) => {
                    if (parentElement.style.color !== 'red') {
                        parentElement.style.color = (propHiddenState.get(key + prop) === true) ? 'gray' :
                                                       'white';
                    }
                };

                h.onclick = () => {
                    const isHidden = !propHiddenState.get(key + prop);
                    propHiddenState.set(key + prop, isHidden);

                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(thisTextArea);
                        HTMLUtil.hideElement(hErr);
                        if (textAreaElements[prop].parentElement.style.color == 'red') {
                            return;
                        }
                        parentElement.style.color = 'gray';

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(thisTextArea);
                        HTMLUtil.showElement(hErr);
                        if (textAreaElements[prop].parentElement.style.color == 'red') {
                            return;
                        }
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
                thisTextArea.style.color = TEXT_COLOR_NO_ERROR

                const textarea = thisTextArea;

                textarea.style.display = "block";

                thisTextArea.addEventListener('keyup', (event) => {
                	event.preventDefault();
                    for (let prop in record.args) {
                        if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                            const textE = textAreaElements[prop]; 
                            if (textE) {
                                record.args[prop] = textE.value;
                                // if (libMap && prop != 'vertex' && prop != 'fragment') {
                                //     libMap.set(prop, textE.value);
                                // }
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
                        //record.args[prop] = thisTextArea.value;


                        for (let prop in record.args) {
                            if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                                const textE = textAreaElements[prop]; 
                                if (textE) {
                                    record.args[prop] = textE.value;
                                    // if (libMap && prop != 'vertex' && prop != 'fragment') {
                                    //     libMap.set(prop, textE.value);
                                    // }
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
                    }

                });
            }
        }

        function compile() {
            for (let prop in record.args) {
                if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                    const textE = textAreaElements[prop]; 
                    if (textE) {
                        record.args[prop] = textE.value;
                        //if (libMap && prop != 'vertex' && prop != 'fragment') {
                        //    libMap.set(prop, textE.value);
                        //}
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

                errorState = false;

                textAreaElements.vertex.style.color = TEXT_COLOR_NO_ERROR;
                textAreaElements.fragment.style.color = TEXT_COLOR_NO_ERROR;
                textAreaElements.vertex.style.backgroundColor = BG_COLOR_NO_ERROR;
                textAreaElements.fragment.style.backgroundColor = BG_COLOR_NO_ERROR;
            } else if (hasError) {
                record.logs.clearLogErrors();
                record.logs.logError(errRecord);

                errorState = true;

                textAreaElements.vertex.style.color = TEXT_COLOR_ERROR;
                textAreaElements.fragment.style.color = TEXT_COLOR_ERROR;
                textAreaElements.vertex.style.backgroundColor = BG_COLOR_ERROR;
                textAreaElements.fragment.style.backgroundColor = BG_COLOR_ERROR;
            }


            if (!hasError) {
            	if (!onAfterCompilation) {
            		console.warn("onAfterCompilation unspecified");
            	} else {
            		onAfterCompilation(program, userData);
            	}
            }
        }
        record.compile = compile;

        if ((options && options.doCompilationAfterFirstSetup) || !options) {
            compile();             
        }

        return compile;
    }

    _out.registerShaderForLiveEditing = registerShaderForLiveEditing;

	return _out;
}());