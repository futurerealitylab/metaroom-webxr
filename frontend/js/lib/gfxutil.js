"use strict";



const GFX = (function() {
    const _util = {};

    // shader and GL utilities

    class GLContextResult {
        constructor(isValid, _gl, _version) {
            this.isValid = isValid;
            this.gl      = _gl;
            this.version = _version;
        }
    }

    function initGLContext(target, contextNames, contextOptions) {
        for (let i = 0; i < contextNames.length; ++i) {
            const glCtx = target.getContext(contextNames[i], contextOptions);
            if (glCtx != null) { // non-null indicates success
                return new GLContextResult(true, glCtx, contextNames[i]);
            }
        }
        return new GLContextResult(false);
    }
    _util.initGLContext = initGLContext;

    function addShader(program, type, src, errRecord) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const msg = gl.getShaderInfoLog(shader);

            let shaderTypename = '';
            switch (type) {
            case gl.VERTEX_SHADER: {
                shaderTypename = "vertex";
                break;
            }
            case gl.FRAGMENT_SHADER: {
                shaderTypename = "fragment";
                break;
            }
            default:
                break;
            }
            console.error("Cannot compile " + shaderTypename + " shader:\n\n" + msg);

            errRecord[shaderTypename] = msg;
            return null;
        } else {
            gl.attachShader(program, shader);
            return shader;
        }
    }
    _util.addShader = addShader;

    function createShaderProgramFromStrings(vertSrc, fragSrc, errRecord) {
        const program = gl.createProgram();
        const vshader = GFX.addShader(program, gl.VERTEX_SHADER, vertSrc, errRecord);
        const fshader = GFX.addShader(program, gl.FRAGMENT_SHADER, fragSrc, errRecord);

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(program);
            console.error("Cannot link program:\n\n" + msg);

            errRecord.link = msg;

            gl.deleteShader(vshader);
            gl.deleteShader(fshader);

            gl.deleteProgram(program);

            return null;
        } else {
            gl.detachShader(program, vshader);
            gl.detachShader(program, fshader);
            gl.deleteShader(vshader);
            gl.deleteShader(fshader);
        }

        return program;
    }
    _util.createShaderProgramFromStrings = createShaderProgramFromStrings;

    function createShaderProgramFromCompiledShaders(vshader, fshader) {
        const program = gl.createProgram();

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(program);
            console.error("Cannot link program:\n\n" + msg);

            gl.deleteProgram(program);

            return null;
        }

        return program;
    }
    _util.createShaderProgramFromCompiledShaders = createShaderProgramFromCompiledShaders;

    function createShaderProgramFromStringsAndGetIndivShaders(vertSrc, fragSrc) {
        const program = gl.createProgram();
        const vshader = GFX.addShader(program, gl.VERTEX_SHADER, vertSrc);
        const fshader = GFX.addShader(program, gl.FRAGMENT_SHADER, fragSrc);

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(program);
            console.warn("Cannot link program:\n\n" + msg);
            return null;
        }

        return {program : program, vshader : vshader, fshader : fshader};
    }
    _util.createShaderProgramFromStringsAndGetIndivShaders = createShaderProgramFromStringsAndGetIndivShaders;

    function getAndStoreAttributeLocations(_gl, program, data, suffix = "Loc") {
        const dataCount = _gl.getProgramParameter(program, _gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < dataCount; i += 1) {
            const info = _gl.getActiveAttrib(program, i);
            const idx = _gl.getAttribLocation(program, info.name);
            data[info.name + suffix] = idx;
        }
    }
    _util.getAndStoreAttributeLocations = getAndStoreAttributeLocations;

    function getAndStoreIndividualUniformLocations(_gl, program, data, suffix = "Loc") {
        const dataCount = _gl.getProgramParameter(program, _gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < dataCount; i += 1) {
            const info = _gl.getActiveUniform(program, i);
            const idx = _gl.getUniformLocation(program, info.name);
            data[info.name + suffix] = idx;
        }
    }
    _util.getAndStoreIndividualUniformLocations = getAndStoreIndividualUniformLocations;


    const pr      = console.log;
    const passert = console.assert;
    const pwarn   = console.warn;
    const perr    = console.error;

    const DIRECTIVE_INCLUDE  = 'include';
    const DIRECTIVE_VERTEX   = 'vertex';
    const DIRECTIVE_FRAGMENT = 'fragment';
    const DIRECTIVE_SHARED   = 'shared';
    const DIRECTIVE_SHADER_STAGES = [DIRECTIVE_VERTEX, DIRECTIVE_FRAGMENT];

    function ShaderLibIncludeRecord(idxBegin, idxEndExclusive, libRecord) {
      this.idxBegin        = idxBegin;
      this.idxEndExclusive = idxEndExclusive;
      this.libRecord       = libRecord;
    }
    function ShaderLibIncluderState(stream) {
      this.stream = stream;
      this.i = 0;
      this.len = stream.length;
      this.inRegularComment = false;
      this.inBlockComment = false;
      this.preprocessor = false;

      this.includes = [];
    }
    function DirectiveState() {
        this.braceCount = 0;
        this.type = '';
        this.inProgressStack = [];
        this.directivesUsed = new Set();
    }
    function pstateCharAt(pstate, i) {
        return pstate.stream.charAt(i);
    }
    function pstateChar(pstate) {
        return pstate.stream.charAt(pstate.i);
    }

    function assembleShader(pstate, output) {
      const shaderBase = pstate.stream;

      // // handle vertex, fragment
      // {
      //   pwarn("shader stage directives not yet fully implemented, ignoring directives");


      //   const stageCount = DIRECTIVE_SHADER_STAGES.length;
      //   for (let i = 0; i < stageCount; i += 1) {
      //       const stage = pstate[DIRECTIVE_SHADER_STAGES[i]];
      //       if (!stage) {
      //           continue;
      //       }
      //   }
      // }
      // handle include 
      {
          const includes = pstate.includes;

          const count = includes.length;
          if (count == 0) {
            output.isValid = true;
            output.shaderSource = shaderBase;
            return output;
          }

          const shaderSections = [];
          let shaderBaseCursor = 0;
          for (let i = 0; i < count; i += 1) {
            const include = includes[i];

            shaderSections.push(shaderBase.substring(shaderBaseCursor, include.idxBegin));
            shaderSections.push(include.libRecord);
            shaderBaseCursor = include.idxEndExclusive;
          }
          if (shaderBaseCursor < shaderBase.length) {
            shaderSections.push(shaderBase.substring(shaderBaseCursor));
          } 

          output.isValid = true;
          output.shaderSource = shaderSections.join('');

          console.log(output.shaderSource);

      }

      return output;
    }



    function preprocessShader(string, libMap, alreadyIncludedSet, directiveState) {
        if (!libMap) {
            libMap = new Map();
        }
        if (!alreadyIncludedSet) {
            alreadyIncludedSet = new Set();
        }
        if (!directiveState) {
            directiveState = new DirectiveState();
        }

       const pstate = new ShaderLibIncluderState(string);

       const output = {isValid : false, shaderSource : null};

       function seek(pstate, symbol) {
          return pstate.stream.indexOf(symbol, pstate.i);
       }

       function seekCommit(pstate, symbol) {
          const symbolIdx = pstate.stream.indexOf(symbol, pstate.i); 
          if (symbolIdx !== -1) {
            pstate.i = symbolIdx;
          }
          return pstate.stream.indexOf(symbol, pstate.i);
       }

       function inComment(pstate) {
          return pstate.inRegularComment || pstate.inBlockComment;
       }

       function skipWhitespace(pstate) {
          console.assert(pstate.i < pstate.len);
          let whiteChar = pstate.stream.charAt(pstate.i);
          while (whiteChar === ' ' || 
                  whiteChar === '\t' || 
                  whiteChar === '\n' || 
                  whiteChar === '\r') {
            pstate.i += 1;
            
            console.assert(pstate.i < pstate.len);

            whiteChar = pstate.stream.charAt(pstate.i);
          } 
        }

       let prevC = '';
       while (pstate.i < pstate.len) {
          const c = pstate.stream.charAt(pstate.i);
          switch (c) {
              case '#': {
                if (prevC != '' && prevC != '\n' && prevC != '\r' && prevC != '\t' && prevC != ' ') {
                    break;
                }
                pstate.preprocessor = true;
                pr(pstate.i, '# preprocessor_directive_begin');

                const directivePos = pstate.i;

                // find keyword
                let whiteChar = '';
                do {
                  pstate.i += 1;
                  
                  console.assert(pstate.i < pstate.len);

                  whiteChar = pstate.stream.charAt(pstate.i);
                } while (whiteChar === ' ' || 
                        whiteChar === '\t');


                // look for include directive

                const tokenBeginIdx = pstate.i;

                // const isIncludeDirective = 
                //   (pstate.stream.substring(pstate.i, pstate.i + 7) === 'include');


                let cursor = pstate.i;
                let charAt = pstateCharAt(pstate, cursor);
                while (charAt !== ' '  &&
                       charAt !== '\n' &&
                       charAt !== '\r' &&
                       charAt !== '\t' &&
                       charAt !== '<' &&
                       charAt !== '{') {
                    cursor += 1;
                    charAt = pstateCharAt(pstate, cursor);
                }
                const directiveToken = pstate.stream.substring(pstate.i , cursor);
                pr("directive found: " + directiveToken);

                switch (directiveToken) { 
                default: { // unhandled pre-processor directive found
                  const newlinePos = seek(pstate, '\n');
                  if (newlinePos == -1) {
                    console.warn("WARNING: No newline at assumed EOF");
                    assembleShader(pstate, out);
                    return out;
                  } else {
                    pstate.i = newlinePos - 1;
                    prevC = pstate.stream.charAt(pstate.i);
                  }
                  break;
                } 
                case DIRECTIVE_INCLUDE: { // include directive found
                  const includePos = pstate.i;
                  // go to index of 'e' in "include"
                  pstate.i = includePos + 7;
                  // seek past whitespace

                  skipWhitespace(pstate);

                  console.assert(pstateChar(pstate) === '<');


                  // extract the library name
                  pstate.i += 1;

                  const includeEndPos = seek(pstate, '>');
                  const newlineEndPosSyntaxTest = seek(pstate, '\n');

                  if (includeEndPos == -1 || newlineEndPosSyntaxTest < includeEndPos) {
                    pr("ERROR: include syntax");
                    return output;
                  }

                  const libName = pstate.stream.substring(pstate.i, includeEndPos).trim();

                  const libRecord = libMap.get(libName);
                  if (libRecord) {
                    if (alreadyIncludedSet.has(libName)) {
                        pstate.includes.push(new ShaderLibIncludeRecord(directivePos, includeEndPos + 1, ''));
                    } else {
                        pr("including lib=<" + libName + ">");
                        
                        alreadyIncludedSet.add(libName);

                        const subInclude = preprocessShader(libRecord, libMap, alreadyIncludedSet, directiveState);
                        if (!subInclude.isValid) {
                            return output;
                        }

                        pstate.includes.push(new ShaderLibIncludeRecord(directivePos, includeEndPos + 1, subInclude.shaderSource))
                    }

                  } else {
                    console.error("ERROR: [Metaroom Shader Preprocessor] cannot find lib=<" + libName + ">");
                    return output;
                  }

                  pstate.i = includeEndPos;
                  // seek to newline or EOF
                  const endPos = seek(pstate, '\n');
                  if (endPos == -1) {
                    console.warn("WARNING: No newline at assumed EOF");

                    assembleShader(pstate, output);
                    return output;
                  } else {
                    pstate.i = endPos - 1;
                    prevC = pstate.stream.charAt(pstate.i);
                  }
                  break;
                }
                case DIRECTIVE_VERTEX: {
                    pwarn(DIRECTIVE_VERTEX + " directive not fully implemented");

                    if (directiveState.directivesUsed.has(DIRECTIVE_VERTEX)) {
                        perr("CANNOT USE DIRECTIVE " + DIRECTIVE_VERTEX + " MORE THAN ONCE");
                        return output;
                    }
                    if (-1 !== directiveState.inProgressStack.indexOf(DIRECTIVE_FRAGMENT)) {
                        perr("CANNOT NEST SHADER STAGES");
                        return output;
                    }

                    directiveState.directivesUsed.add(DIRECTIVE_VERTEX);
                    directiveState.inProgressStack.push(DIRECTIVE_VERTEX);

                    directiveState.beginIdx = directivePos;


                    seekCommit(pstate, '{');

                    directiveState.openingBracketIdx = pstate.i; 

                    console.log(pstate.stream.substring(directivePos, pstate.i));

                    passert(directiveState.braceCount === 0);
                    directiveState.braceCount = 1;

                    break;
                }
                case DIRECTIVE_FRAGMENT: {
                    pwarn(DIRECTIVE_FRAGMENT + " directive not fully implemented");

                    if (directiveState.directivesUsed.has(DIRECTIVE_FRAGMENT)) {
                        perr("CANNOT USE DIRECTIVE " + DIRECTIVE_FRAGMENT + " MORE THAN ONCE");
                        return output;
                    }
                    if (-1 !==  directiveState.inProgressStack.indexOf(DIRECTIVE_VERTEX)) {
                        perr("CANNOT NEST SHADER STAGES");
                        return output;
                    }
                    
                    directiveState.directivesUsed.add(DIRECTIVE_FRAGMENT);
                    directiveState.inProgressStack.push(DIRECTIVE_FRAGMENT);

                    directiveState.beginIdx = directivePos;

                    seekCommit(pstate, '{');

                    directiveState.openingBracketIdx = pstate.i; 

                    passert(directiveState.braceCount === 0);
                    directiveState.braceCount = 1;

                    break;
                }
                case DIRECTIVE_SHARED: {
                    perr(DIRECTIVE_SHARED + " directive not implemented");
                    break;
                }
                break;
              }
              }
              case '/': {
                //pr(pstate.i, c);
                if (prevC == '/') {
                  pr('begin regular comment');
                  pstate.inRegularComment = true;

                  if (pstate.inRegularComment) {
                    let pos = seek(pstate, '\n');
                    if (pos != -1) {
                      pstate.i = pos + 1;
                      pstate.inRegularComment = false;
                      prevC = '\n';

                      pr("endRegularComment at: " + pstate.i);

                      continue;
                    } else {
                      // assumed end of file
                      console.warn("WARNING: No newline at assumed EOF");

                      assembleShader(pstate, output);
                      return output;
                    }
                  }
                }
                break;
              }                 
              case '*': {
                //pr(pstate.i, c);
                if (prevC == '/') {
                  pr('begin block comment');
                  pstate.inBlockComment = true;

                  if (pstate.inBlockComment) {
                    let pos = seek(pstate, '*/');
                    if (pos != -1) {
                      pstate.i = pos + 2;
                      pstate.inBlockComment = false;
                      prevC = '/';

                      pr("endBlockComment");

                      continue;
                    }
                    else {
                      console.error("ERROR block comment doesn't end");
                      return output;
                    }

                  }
                }
                break;
              }
              case '{': {
                pr("begin brace found");
                if (directiveState.braceCount > 0) {
                    directiveState.braceCount += 1;
                }
                break;
              }
              case '}': {
                pr("end brace found");
                pr(directiveState.braceCount);
                if (directiveState.braceCount > 0) {
                    directiveState.braceCount -= 1;

                    if (directiveState.braceCount === 0) {
                        const directiveType = directiveState.inProgressStack.pop();
                        const beginIdx = directiveState.beginIdx;
                        const endIdx   = pstate.i;

                        pstate[directiveType] = {beginIdx : beginIdx, endIdxExclusive : endIdx + 1};

                        pr(directiveType + " block found: " + pstate.stream.substring(beginIdx, endIdx + 1));

                    }
                }
                break;
              }
              case '<': {
                break;
              }
              case '>': {
                break;
              }
              case '\n': {
                if (pstate.preprocessor) {
                  // pr(pstate.i, '# preprocessor_directive_end');
                }
                pstate.preprocessor = false;
                break;
              }
              default: {
                break;
              }
          }
          pstate.i += 1;
          prevC = c;
       }

        assembleShader(pstate, output);
        return output;
    }
    _util.preprocessShader = preprocessShader;
    _util.scc = _util.preprocessShader;

    function glAttachResourceTracking(GL, version) {

        let funcNames = null;
        let deleteFuncNames = null;
        GL.deletionProcMap = new Map();

        if (version = 'webgl2') {
            /* WebGL2
            createBuffer: ƒ createBuffer()
            createFramebuffer: ƒ createFramebuffer()
            createProgram: ƒ createProgram()
            createQuery: ƒ createQuery()
            createRenderbuffer: ƒ createRenderbuffer()
            createSampler: ƒ createSampler()
            createShader: ƒ createShader()
            createTexture: ƒ createTexture()
            createTransformFeedback: ƒ createTransformFeedback()
            createVertexArray: ƒ createVertexArray()
            */

            funcNames = [
              'createBuffer',
              'createFramebuffer',
              'createProgram',
              'createQuery',
              'createRenderbuffer',
              'createSampler',
              'createShader',
              'createTexture',
              'createTransformFeedback',
              'createVertexArray'
            ];

            deleteFuncNames = [
              'deleteBuffer',
              'deleteFramebuffer',
              'deleteProgram',
              'deleteQuery',
              'deleteRenderbuffer',
              'deleteSampler',
              'deleteShader',
              'deleteTexture',
              'deleteTransformFeedback',
              'deleteVertexArray'
            ];

            for (let i = 0; i < funcNames.length; i += 1) {
              GL.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
            }

        }
        else {

            /* WebGL1
            createBuffer: ƒ createBuffer()
            createFramebuffer: ƒ createFramebuffer()
            createProgram: ƒ createProgram()
            createRenderbuffer: ƒ createRenderbuffer()
            createShader: ƒ createShader()
            createTexture: ƒ createTexture()
            */

            funcNames = [
              'createBuffer',
              'createFramebuffer',
              'createProgram',
              'createRenderbuffer',
              'createShader',
              'createTexture'
            ];

            deleteFuncNames = [
              'deleteBuffer',
              'deleteFramebuffer',
              'deleteProgram',
              'deleteRenderbuffer',
              'deleteShader',
              'deleteTexture'
            ];

            for (let i = 0; i < funcNames.length; i += 1) {
              GL.deletionProcMap.set(funcNames[i], deleteFuncNames[i]);
            }

        }

        const len = funcNames.length;

        GFX.resourceDeletionQueue = [];

        for (let i = 0; i < len; i += 1) {
            const funcName = funcNames[i];
            GL['_' + funcName] = GL[funcName];
            GL[funcName] = function(arg) {
                const out = GL['_' + funcName](arg);

                GFX.resourceDeletionQueue.push(function() {
                    //console.log("calling " + GL.deletionProcMap.get(funcName));
                    GL[GL.deletionProcMap.get(funcName)](out);
                });

                return out;

            }.bind(GL);
        }
    }
    _util.glAttachResourceTracking = glAttachResourceTracking;

    function glFreeResources(GL) {

        GL.disable(GL.CULL_FACE);
        GL.disable(GL.DEPTH_TEST);
        GL.disable(GL.BLEND);

        //console.log("-unbinding texture units ...");
        const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);
        for (let unit = 0; unit < maxTextureUnitCount; unit += 1) {
            GL.activeTexture(GL.TEXTURE0 + unit);
            GL.bindTexture(GL.TEXTURE_2D, null);
            GL.bindTexture(GL.TEXTURE_CUBE_MAP, null);
        }

        // unbind all binding points
        //console.log("-unbinding buffers ...");
        GL.bindBuffer(GL.ARRAY_BUFFER, null);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null)
        GL.bindRenderbuffer(GL.RENDERBUFFER, null);
        GL.bindFramebuffer(GL.FRAMEBUFFER, null);

        if (this._version = 'webgl2') {
            GL.bindBuffer(GL.COPY_READ_BUFFER, null);
            GL.bindBuffer(GL.COPY_WRITE_BUFFER, null);
            GL.bindBuffer(GL.TRANSFORM_FEEDBACK_BUFFER, null);
            GL.bindBuffer(GL.UNIFORM_BUFFER, null);
            GL.bindBuffer(GL.PIXEL_PACK_BUFFER, null);
            GL.bindBuffer(GL.PIXEL_UNPACK_BUFFER, null);
            GL.bindVertexArray(null);
        }

        // free resources
        //console.log("-freeing resources ...");
        const Q = GFX.resourceDeletionQueue;
        const len = Q.length;
        for (let i = 0; i < len; i += 1) {
            const deletionProc = Q.pop();
            deletionProc();
        }

        // clear attributes
        //console.log("-clearing attributes ...");
        const tempBuf = GL._createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, tempBuf);
        const maxAttributeCount = GL.getParameter(GL.MAX_VERTEX_ATTRIBS);
        for (let a = 0; a < maxAttributeCount; a += 1) {
            GL.vertexAttribPointer(a, 1, GL.FLOAT, false, 0, 0);
        }
        GL.deleteBuffer(tempBuf);
        //console.log("Done!");
    }
    _util.glFreeResources = glFreeResources;







    function registerShaderForLiveEditing(_gl, key, args, callback, libMap) {
        console.assert(key);

        // TODO(KTR): make a div per shader program in addition to the blocks per shader pass

        let record = MR.shaderMap.get(key);
        if (!record) {
            record = {args : args, prevVals : {}, textAreas : {}, errorMessageNodes : {}};
            MR.shaderMap.set(key, record);
            for (var prop in args) {
                if (Object.prototype.hasOwnProperty.call(args, prop)) {
                    record.prevVals[prop] = args[prop];
                }
            }
        }
        else {

        }


        function spacer(color, width, height) {
           return '<table bgcolor=' + color +
                        ' width='   + width +
                        ' height='  + height + '><tr><td>&nbsp;</td></tr></table>';
        }

        const textAreas = document.getElementById("text-areas");

        textAreas.innerHTML = '';

        const textAreaElements = record.textAreas;

        for (let prop in args) {
            if (Object.prototype.hasOwnProperty.call(args, prop)) {
                // const innerHTML = ['',
                // '<center><font size=6, color=#b0b0b0>' + key + ' ' + prop + '</center>',
                // '<TABLE cellspacing=0 cellpadding=0><TR>',
                // '<td width=50></td><td><font color=red size=5><div id=errorMessage>&nbsp;</div></font></td>',
                // '</TR><TR>',
                // '<table cellspacing=10>',
                // '<tr>',
                // //'</td><td valign=top>' + document.body.innerHTML + '</td>',
                // '<td valign=top><font size=2 color=red><div id=errorMarker>&nbsp;</div></font></td>',
                // '<td valign=top>',
                // '<textArea id=textArea' + textAreaID + ' spellcheck=false ',
                // 'style="font:20px courier;outline-width:0;border-style:none;resize:none;overflow:scroll;"',
                // '></textArea>',
                // '</tr></table>',
                // '</TR></TABLE>'
                // ].join('');

                let DIV = document.createElement("div");
                DIV.setAttribute("id", key + " : " + prop + "_div");

                let h = document.createElement("H1");                // Create a <h1> element
                let t = document.createTextNode(key + " : " + prop + '\n');
                h.appendChild(t);

                let hErr = document.createElement('H1');
                hErr.style.color = 'red';
                let tErr = document.createTextNode('');
                hErr.appendChild(tErr);

                record.errorMessageNodes[prop] = tErr;

                DIV.appendChild(h);
                DIV.appendChild(hErr);

                textAreas.appendChild(DIV);

                const thisTextArea = document.createElement("textarea");
                thisTextArea.spellcheck = false;
                textAreaElements[prop] = thisTextArea;
                DIV.appendChild(thisTextArea);
                thisTextArea.setAttribute("id", key + "_" + prop + "_textArea");
                thisTextArea.setAttribute("class", "tabSupport");

                let parentElement = thisTextArea.parentElement;

                h.style.cursor = 'pointer';
                h.onclick = (function(event) {
                    let isHidden = false;

                    return function() {
                        isHidden = !isHidden;
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
                    }
                }());

                let text = args[prop].split('\n');
                let cols = 0;
                for (let i = 0; i < text.length; i += 1) {
                    cols = Math.max(cols, text[i].length);
                }

                thisTextArea.rows = text.length + 1;
                thisTextArea.cols = cols;
                thisTextArea.value = args[prop];
                thisTextArea.style.backgroundColor = '#808080';

                const textarea = thisTextArea;

                textarea.style.display = "block";


                thisTextArea.addEventListener('keydown', function (event) {
                    const cursor = textarea.selectionStart;
                    if(event.key == "Tab"){
                        event.preventDefault();
                        document.execCommand("insertText", false, '\t');//appends a tab and makes the browser's default undo/redo aware and automatically moves cursor
                    } else if (event.key == "Enter") {
                        event.preventDefault();
                        document.execCommand("insertText", false, '\n');
                    } else if (event.key == '`') {
                        event.preventDefault();
                        //record.args[prop] = thisTextArea.value;


                        for (let prop in record.args) {
                            if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                                const textE = textAreaElements[prop]; 
                                if (textE) {
                                    record.args[prop] = textE.value;
                                    if (libMap && prop != 'vertex' && prop != 'fragment') {
                                        libMap.set(prop, textE.value);
                                    }
                                }

                            }
                        } 

                        callback(record.args, libMap); 
                    }

                });
                // thisTextArea.onkeyup = () => {
                //     record.args[prop] = thisTextArea.value;
                //     callback(record.args); 
                // };
                

                const logError = function(args) {
                    const errorMessageNodes = record.errorMessageNodes;
                    for (let prop in args) {
                        if (Object.prototype.hasOwnProperty.call(args, prop)) {
                            const errMsgNode = errorMessageNodes[prop]
                            if (errMsgNode) {
                                errMsgNode.nodeValue = args[prop];
                                textAreaElements[prop].parentElement.style.color = 'red';
                            }
                        }
                    }
                };
                record.args.logError = logError;

                record.args.clearLogErrors = function() {
                    const errorMessageNodes = record.errorMessageNodes;
                    for (let prop in errorMessageNodes) {
                        if (Object.prototype.hasOwnProperty.call(errorMessageNodes, prop)) {
                            const errMsgNode = errorMessageNodes[prop]
                            if (errMsgNode) {
                                errMsgNode.nodeValue = '';
                                textAreaElements[prop].parentElement.style.color = 
                                (textAreaElements[prop].parentElement.style.display == 'none') ? 'gray' : 'white';
                                //DIV.parentElement.style.color = 'white';
                            }
                        }
                    }                    
                };
            }
        }
    }

    _util.registerShaderForLiveEditing = registerShaderForLiveEditing;

    return _util;

}());
