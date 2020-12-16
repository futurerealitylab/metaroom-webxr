"use strict";

const accessorTypeToNumMap = {
  'SCALAR': 1,
  'VEC2': 2,
  'VEC3': 3,
  'VEC4': 4,
  'MAT2': 4,
  'MAT3': 9,
  'MAT4': 16
};

const accessorComponentType = {
  '5120': 1, // BYTE
  '5121': 1, // UNSIGNED_BYTE
  '5122': 2, // SHORT
  '5123': 2, // UNSIGNED_SHORT
  '5125': 4, // UNSIGNED_INT
  '5126': 4, // FLOAT
};

let GltfList = function() {
  let Item = function() {
    this.getVertexPos = () => {
      const vertexAccessorIndex = this.info.meshes[0].primitives[0].attributes.POSITION;
      const count = this.info.accessors[vertexAccessorIndex].count;
      this.vertexNum = count;
      this.getData(vertexAccessorIndex, this.vertexPos);
      return this;
    }

    this.getIndices = () => {
      const indiceAccessorIndex = this.info.meshes[0].primitives[0].indices;
      if(indiceAccessorIndex === undefined) return this;
      const count = this.info.accessors[indiceAccessorIndex].count;
      this.indiceNum = count;
      this.getData(indiceAccessorIndex, this.indices);
//      indexBuffer = gl.createBuffer();
      return this;
    }

    this.getNormal = () => {
      const normalAccessorIndex = this.info.meshes[0].primitives[0].attributes.NORMAL;
      if(normalAccessorIndex === undefined) return this;
      this.getData(normalAccessorIndex, this.normal);
      return this;

    }

    this.getTangent = () => {
      const tangentAccessorIndex = this.info.meshes[0].primitives[0].attributes.TANGENT;
      if(tangentAccessorIndex === undefined) return this;
      this.getData(tangentAccessorIndex, this.tangent);
      return this;
    }

    this.getUV = () => {
      const uvAccessorIndex = this.info.meshes[0].primitives[0].attributes.TEXCOORD_0;
      if(uvAccessorIndex === undefined) return this;
      this.getData(uvAccessorIndex, this.uv);
      return this;
    }

    this.normalizeVertexPos = () => {
      // TODO: normilize model size using the min/max value of the vertex position
    }

    this.getData = (vertexAccessorIndex, a) => {
      const count = this.info.accessors[vertexAccessorIndex].count;
      const bufferViewIndex = this.info.accessors[vertexAccessorIndex].bufferView;
      const clusterSize = accessorTypeToNumMap[this.info.accessors[vertexAccessorIndex].type];
      const componentType = this.info.accessors[vertexAccessorIndex].componentType;
      const typeSize = accessorComponentType[componentType];
      let byteOffset = this.info.accessors[vertexAccessorIndex].byteOffset === undefined ? 0 : this.info.accessors[vertexAccessorIndex].byteOffset;
      byteOffset += this.info.bufferViews[bufferViewIndex].byteOffset;
      const stride = this.info.bufferViews[bufferViewIndex].byteStride === undefined ? typeSize * clusterSize : this.info.bufferViews[bufferViewIndex].byteStride;

      switch (componentType) {
        case 5120: // BYTE
          for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
            let point = [];
            for (let j = 0; j < clusterSize; j++) { // pack base components into single element
              let baseComponent = new Int8Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
              point.push(baseComponent);
            }
            a.push(point);
          }
          break;
        case 5121: // UNSIGNED_BYTE
          for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
            let point = [];
            for (let j = 0; j < clusterSize; j++) { // pack base components into single element
              let baseComponent = new Uint8Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
              point.push(baseComponent);
            }
            a.push(point);
          }
          break;
        case 5122: // SHORT
          for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
            let point = [];
            for (let j = 0; j < clusterSize; j++) { // pack base components into single element
              let baseComponent = new Int16Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
              point.push(baseComponent);
            }
            a.push(point);
          }
          break;
        case 5123: // UNSIGNED_SHORT
          for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
            let point = [];
            for (let j = 0; j < clusterSize; j++) { // pack base components into single element
              let baseComponent = new Uint16Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
              point.push(baseComponent);
            }
            a.push(point);
          }
          break;
        case 5125: // UNSIGNED_INT
          for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
            let point = [];
            for (let j = 0; j < clusterSize; j++) { // pack base components into single element
              let baseComponent = new Uint32Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
              point.push(baseComponent);
            }
            a.push(point);
          }
          break;
        case 5126: // FLOAT
          for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
            let point = [];
            for (let j = 0; j < clusterSize; j++) { // pack base components into single element
              let baseComponent = new Float32Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
              point.push(baseComponent);
            }
            a.push(point);
          }
          break;
      }
      return this;
    }

    this.uploadVertexBuffer = () => {
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexPos), gl.STATIC_DRAW);
      return this.vertexBuffer;
    }

    this.uploadIndexBuffer = () => {
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
      return this.indexBuffer;
    }

    this.init = () => {
      this.name = null;
      this.info = [];
      this.bin = [];
      this.vertexPos = [];
      this.vertexNum = 0;
      this.indices = [];
      this.indiceNum = 0;
      this.normal = [];
      this.tangent = [];
      this.uv = [];
      this.mx = this.my = this.mz = 0;
      this.rx = this.ry = this.rz = 0;
      this.sx = this.sy = this.sz = 1;
      this.rgb = [.5, .4, .3];
      this.opac = 1;
      this.textureInfo = new TextureInfo();
      this.fxMode = 0;
      this.scale = 1;
      this.vertexBuffer = null;
      this.indexBuffer = null;
    }
    this.init();

    this.drawPointCloud = (shapeFunc, size, mx, my, mz) => { // just a quick demo to show the vertex position we get
      for (let i = 0; i < this.vertexNum; i++) {
        shapeFunc().move(size * this.vertexPos[i][0] + mx, size * this.vertexPos[i][1] + my, size * this.vertexPos[i][2] + mz).size(0.01).color(this.rgb).fx(this.fxMode);
      }
    }

    this.drawMeshData = () => {
      let a = [];
      for(let i = 0; i < this.indiceNum; i++) {
        for(let j = 0; j < 3; j ++) {
          a.push(this.vertexPos[this.indices[i]][j]);
        }
        for(let j = 0; j < 3; j ++) {
          if(this.normal.length != 0)
            a.push(this.normal[this.indices[i]][j]);
          else a.push(0);
        }
        for(let j = 0; j < 3; j ++) {
          if(this.tangent.length != 0)
            a.push(this.tangent[this.indices[i]][j]);
          else a.push(0);
        }
        if(this.uv.length != 0) {
          a.push(this.uv[this.indices[i]][0]);
          a.push(this.uv[this.indices[i]][1]);
        } else {
          a.push(2*i);
          a.push(2*i + 1);
        }
      }
      return a;
    }

  }

  this.add = async (gltfPath, binPath, name) => {
    if (items[n])
      items[n].init();
    else
      items[n] = new Item();
    if(name != undefined) items[n].name = name;
    items[n].info = await fetch(gltfPath)
      .then(response => response.json())
      .then(info => {
        return info;
      });

    items[n].bin = await fetch(binPath)
      .then(response => response.arrayBuffer())
      .then(data => {
        return data;
      });
    items[n].getVertexPos();
    items[n].getIndices();
    items[n].getNormal();
    items[n].getTangent();
    items[n].getUV();
    // eval(`let ${items[n].name} = () => renderList.add(items[n].drawMeshData())`);
    return items[n++];
  }

  let n = 0,
    items = [];
}
let gltfList = new GltfList();

// export default GltfList;
