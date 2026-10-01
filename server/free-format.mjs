import {gzipSync,gunzipSync} from 'node:zlib';
import {isUtf8} from 'node:buffer';

// The wrapper changes storage only. Decoded native documents and history stay exact.
export const FREE_LIMIT=128*1024*1024;
const formats=new Set(['freegma-board','freegma-workspace','freegma-package']);
const invalid=()=>{throw Object.assign(new Error('Invalid or oversized packed .free file.'),{status:400});};
function packedValue(value,bytes){
  if(!formats.has(value?.format)||bytes.length<8192||bytes.length>FREE_LIMIT)return value;
  const data=gzipSync(bytes,{level:3}).toString('base64');
  const packed={format:'freegma-packed',formatVersion:1,encoding:'gzip-base64',contentType:value.format,uncompressedBytes:bytes.length,...(value.format==='freegma-package'?{kind:value.kind}:{}),data};
  return Buffer.byteLength(JSON.stringify(packed))<bytes.length*.8?packed:value;
}
export const packFree=value=>packedValue(value,Buffer.from(JSON.stringify(value)));
export function unpackFree(value,{maxBytes=FREE_LIMIT}={}){
  if(value?.format!=='freegma-packed')return {value,bytes:null};
  if(value.formatVersion!==1||value.encoding!=='gzip-base64'||!formats.has(value.contentType)||!Number.isSafeInteger(value.uncompressedBytes)||value.uncompressedBytes<1||value.uncompressedBytes>maxBytes||typeof value.data!=='string'||value.data.length>Math.ceil(maxBytes/3)*4||value.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(value.data))invalid();
  try{
    const compressed=Buffer.from(value.data,'base64');if(!compressed.length||compressed.toString('base64')!==value.data)invalid();
    const bytes=gunzipSync(compressed,{maxOutputLength:value.uncompressedBytes});if(bytes.length!==value.uncompressedBytes||!isUtf8(bytes))invalid();
    const decoded=JSON.parse(bytes.toString('utf8'));
    if(decoded?.format!==value.contentType||decoded.formatVersion!==1||(value.contentType==='freegma-package'&&(!['board','workspace'].includes(value.kind)||decoded.kind!==value.kind)))invalid();
    return {value:decoded,bytes:bytes.length};
  }catch{invalid();}
}
export function encodeFreeData(value){const native=Buffer.from(JSON.stringify(value)),packed=packedValue(value,native);return {native,bytes:packed===value?Buffer.concat([native,Buffer.from('\n')]):Buffer.from(JSON.stringify(packed)+'\n')};}
export const encodeFree=value=>encodeFreeData(value).bytes;
export const decodeFree=bytes=>unpackFree(JSON.parse(bytes.toString('utf8')));
