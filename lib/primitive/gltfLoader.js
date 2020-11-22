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
      const bufferViewIndex = this.info.accessors[vertexAccessorIndex].bufferView;
      const clusterSize = accessorTypeToNumMap[this.info.accessors[vertexAccessorIndex].type];
      const typeSize = accessorComponentType[this.info.accessors[vertexAccessorIndex].componentType];
      let byteOffset = this.info.accessors[vertexAccessorIndex].byteOffset === undefined ? 0 : this.info.accessors[vertexAccessorIndex].byteOffset;
      byteOffset += this.info.bufferViews[bufferViewIndex].byteOffset;
      const stride = this.info.bufferViews[bufferViewIndex].byteStride === undefined ? typeSize * clusterSize : this.info.bufferViews[bufferViewIndex].byteStride;

      for (let i = 0; i < count; i++) { // loop through all the element (e.g. vec3, mat4, etc.)
        let point = [];
        for (let j = 0; j < clusterSize; j++) { // pack base components into single element
          let baseComponent = new Float32Array(this.bin.slice(byteOffset + i * stride + j * typeSize, byteOffset + i * stride + j * typeSize + typeSize)); // get the base component from bytes
          point.push(baseComponent);
        }
        this.vertexPos.push(point);
      }
      // console.log("vertexAccessorIndex: " + vertexAccessorIndex);
      // console.log("count: "+count);
      // console.log("bufferViewIndex: "+bufferViewIndex);
      // console.log("clusterSize: " + clusterSize);
      // console.log("typeSize: "+typeSize);
      // console.log("byteOffset: "+byteOffset);
      // console.log("stride: "+stride);
      return this;
    };

    this.normalizeVertexPos = () => {
      // TODO:
    }

    this.init = () => {
      this.name = null;
      this.info = [];
      this.bin = [];
      this.vertexPos = [];
      this.vertexNum = 0;
      this.mx = this.my = this.mz = 0;
      this.rx = this.ry = this.rz = 0;
      this.sx = this.sy = this.sz = 1;
      this.rgb = [.5, .4, .3];
      this.opac = 1;
      this.textureInfo = new TextureInfo();
      this.fxMode = 4;
      this.scale = 1;
      this.flipxy = false;
    }
    this.init();

    this.drawCloudPoint = (shapeFunc, size, mx, my, mz) => { // just a quick demo to show the vertex position we get
      for(let i = 0; i < this.vertexNum; i ++) {
        shapeFunc().move(size * this.vertexPos[i][0] + mx, size * this.vertexPos[i][1] + my, size * this.vertexPos[i][2] + mz).size(0.01).color(this.rgb).fx(this.fxMode);
      }
    }
  }

  this.add = async (gltfPath, binPath) => {
    if (items[n])
      items[n].init();
    else
      items[n] = new Item();
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
    return items[n++];
  }

  let n = 0, items = [];
}
let gltfList = new GltfList();

// export default GltfList;
