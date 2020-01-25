"use strict";

const pr      = function() {}; //console.log;
const passert = console.assert;
const pwarn   = console.warn;
const perr    = console.error;

const DIRECTIVE_INCLUDE  = 'include';
const DIRECTIVE_VERTEX   = 'vertex';
const DIRECTIVE_FRAGMENT = 'fragment';
const DIRECTIVE_SHARED   = 'shared';
const DIRECTIVE_SHADER_STAGES = [DIRECTIVE_VERTEX, DIRECTIVE_FRAGMENT];

function ShaderLibIncludeRecord(idxBegin, idxEndExclusive, libSource, libName, libRecord) {
  this.idxBegin        = idxBegin;
  this.idxEndExclusive = idxEndExclusive;
  this.libSource       = libSource;
  this.libName         = libName;
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
        shaderSections.push("\n#line 1 0\n");
        shaderSections.push(include.libSource);
        const line = shaderBase.substring(0, include.idxBegin).split('\n').length;
        shaderSections.push("\n#line " + line + " 0\n");
        shaderBaseCursor = include.idxEndExclusive;
      }
      if (shaderBaseCursor < shaderBase.length) {
        shaderSections.push(shaderBase.substring(shaderBaseCursor));
      } 

      output.isValid = true;
      output.shaderSource = shaderSections.join('');

      pr(output.shaderSource);

  }

  return output;
}



function preprocessShaderSource(string, libMap, alreadyIncludedSet, directiveState) {
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

   const output = {isValid : false, shaderSource : null, includedLibs : alreadyIncludedSet};

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
      passert(pstate.i < pstate.len);
      if (pstate.i >= pstate.len) {
        return;
      }
      let whiteChar = pstate.stream.charAt(pstate.i);
      while (whiteChar === ' ' || 
              whiteChar === '\t' || 
              whiteChar === '\n' || 
              whiteChar === '\r') {
        pstate.i += 1;
        
        passert(pstate.i < pstate.len);
        if (pstate.i >= pstate.len) {
            return;
        }

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
              
              if (pstate.i >= pstate.len) {
                return output;
              }
              pr(pstate.i, pstate.len);
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

                if (cursor >= pstate.len) {
                    perr("NO DIRECTIVE");
                    return output;
                }
            }
            const directiveToken = pstate.stream.substring(pstate.i , cursor);
            pr("directive found: " + directiveToken);

            switch (directiveToken) { 
            default: { // unhandled pre-processor directive found
              const newlinePos = seek(pstate, '\n');
              if (newlinePos == -1) {
                pwarn("WARNING: No newline at assumed EOF");
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

              passert(pstateChar(pstate) === '<');
              if (pstateChar(pstate) !== '<') {
                return output;
              }


              // extract the library name
              pstate.i += 1;

              const includeEndPos = seek(pstate, '>');
              const newlineEndPosSyntaxTest = seek(pstate, '\n');

              if (includeEndPos == -1 
              || 
              (newlineEndPosSyntaxTest > -1 && (newlineEndPosSyntaxTest < includeEndPos))
              ) {
                pr("ERROR: include syntax");
                return output;
              }

              const libName = pstate.stream.substring(pstate.i, includeEndPos).trim();

              const libRecord = libMap.get(libName);
              if (libRecord) {
                if (alreadyIncludedSet.has(libName)) {
                    pstate.includes.push(new ShaderLibIncludeRecord(directivePos, includeEndPos + 1, '', null, null));
                } else {
                    pr("including lib=<" + libName + ">");
                    
                    alreadyIncludedSet.add(libName);

                    const subInclude = preprocessShaderSource(libRecord, libMap, alreadyIncludedSet, directiveState);
                    if (!subInclude.isValid) {
                        return output;
                    }

                    pstate.includes.push(new ShaderLibIncludeRecord(directivePos, includeEndPos + 1, subInclude.shaderSource, libName, libRecord))
                }

              } else {
                perr("ERROR: [Metaroom Shader Preprocessor] cannot find lib=<" + libName + ">");
                output.errRecord = "ERROR: 0:/: '#include<" + libName + ">' : [Metaroom Shader Preprocessor] cannot find library to include"
                return output;
              }

              pstate.i = includeEndPos;
              // seek to newline or EOF
              const endPos = seek(pstate, '\n');
              if (endPos == -1) {
                pwarn("WARNING: No newline at assumed EOF");

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

                pr(pstate.stream.substring(directivePos, pstate.i));

                passert(directiveState.braceCount === 0);
                if (directiveState.braceCount !== 0) {
                    return output;
                }
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
                if (directiveState.braceCount !== 0) {
                    return output;
                }
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
                  pwarn("WARNING: No newline at assumed EOF");

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
                  perr("ERROR block comment doesn't end");
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
_util.preprocessShaderSource = preprocessShaderSource;
_util.pcc = _util.preprocessShaderSource;
