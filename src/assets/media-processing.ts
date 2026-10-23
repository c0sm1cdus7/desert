import { parseBuffer } from "music-metadata";
import type { AssetFile, PlayableAssetMetadata, PrivateAssetMetadata } from "./types.ts";
import type { PrivateAssetStore } from "./storage.ts";
import { optimizeImageBytes } from "./image-processing.ts";

function completeMp3Duration(data:Buffer):number {
  const fail=()=>{throw new Error("UNSUPPORTED_MEDIA_ASSET");};
  let offset=0,frames=0,duration=0;
  if(data.toString("ascii",0,3)==="ID3") {
    if(data.length<10||[6,7,8,9].some(i=>data[i]!>127)) fail();
    offset=10+(data[6]!<<21)+(data[7]!<<14)+(data[8]!<<7)+data[9]!+((data[5]!&16)?10:0);
  }
  while(offset<data.length) {
    if(data.length-offset===128&&data.toString("ascii",offset,offset+3)==="TAG") {offset=data.length;break;}
    if(offset+4>data.length||data[offset]!==255||(data[offset+1]!&224)!==224) fail();
    const version=(data[offset+1]!>>3)&3,layer=(data[offset+1]!>>1)&3,index=data[offset+2]!>>4,rateIndex=(data[offset+2]!>>2)&3;
    if(version===1||layer!==1||index===0||index===15||rateIndex===3) fail();
    const rate=[44100,48000,32000][rateIndex]!/(version===3?1:version===2?2:4);
    const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[index]!;
    const length=Math.floor((version===3?144:72)*bitrate*1000/rate)+((data[offset+2]!>>1)&1);
    if(length<4||offset+length>data.length) fail();
    offset+=length; frames++; duration+=(version===3?1152:576)/rate;
  }
  if(frames<2||offset!==data.length) fail();
  return duration;
}

/** Sniff only the finite installed formats. Names and browser-provided MIME are never authority. */
export async function inspectPlayableBytes(bytes:Uint8Array):Promise<Omit<PlayableAssetMetadata,"original"|"renditions">> {
  const data=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const fail=()=>{throw new Error("UNSUPPORTED_MEDIA_ASSET");};
  let mime:"video/mp4"|"audio/mpeg"|"audio/wav";
  if(data.length>=12&&data.toString("ascii",0,4)==="RIFF"&&data.toString("ascii",8,12)==="WAVE") {
    if(data.readUInt32LE(4)+8!==data.length) fail();
    let offset=12,found=false;
    while(offset<data.length) {
      if(offset+8>data.length) fail();
      const size=data.readUInt32LE(offset+4),end=offset+8+size;
      if(end>data.length) fail();
      if(data.toString("ascii",offset,offset+4)==="data"&&size>0) found=true;
      offset=end+(size%2);
    }
    if(!found||offset!==data.length) fail(); mime="audio/wav";
  } else if(data.length>=12&&data.toString("ascii",4,8)==="ftyp") {
    let offset=0,media=false,movie=false;
    while(offset<data.length) {
      if(offset+8>data.length) fail();
      const size=data.readUInt32BE(offset),type=data.toString("ascii",offset+4,offset+8);
      // Every box, including recorded fragments, must fit within the bounded original.
      if(size<8||offset+size>data.length) fail();
      if(type==="mdat"&&size>8) media=true;
      if(type==="moov"&&size>8) movie=true;
      offset+=size;
    }
    if(!media||!movie||offset!==data.length) fail(); mime="video/mp4";
  } else if(data.length>=4&&(data.toString("ascii",0,3)==="ID3"||(data[0]===0xff&&(data[1]!&0xe0)===0xe0))) mime="audio/mpeg";
  else return fail();
  const metadata=await parseBuffer(data,{mimeType:mime,size:data.length},{duration:true,skipCovers:true})
    .catch(()=>fail());
  const format=metadata.format,tracks=format.trackInfo;
  const duration=mime==="audio/mpeg"?completeMp3Duration(data):Math.max(format.duration??0,...tracks.map(track=>track.duration??0));
  if(!Number.isFinite(duration)||duration<=0||duration>24*60*60) fail();
  const video=tracks.filter(track=>track.video);
  if(video.length) {
    if(mime!=="video/mp4"||video.length!==1||!tracks.every(track=>["avc1","avc3","mp4a"].includes(track.codecId??""))) fail();
    const width=video[0]!.video!.pixelWidth,height=video[0]!.video!.pixelHeight;
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||!width||!height||width*height>80_000_000) fail();
    return {media:"video",mediaType:"video/mp4",duration,width:width!,height:height!};
  }
  if(!format.numberOfChannels||format.numberOfChannels>8||!format.sampleRate||format.sampleRate>384000) fail();
  if(mime==="video/mp4"&&!tracks.every(track=>track.codecId==="mp4a")) fail();
  if(mime==="audio/wav"&&!/PCM/i.test(format.codec??"")) fail();
  if(mime==="audio/mpeg"&&!/MPEG.*[3]|layer 3/i.test(format.codec??"")) fail();
  return {media:"audio",mediaType:mime==="video/mp4"?"audio/mp4":mime,duration};
}

export async function optimizeMediaBytes(store:PrivateAssetStore,reference:string,original:AssetFile):Promise<PrivateAssetMetadata> {
  const bytes=await store.read(reference,"original",original);
  if((bytes[0]===0xff&&bytes[1]===0xd8)||bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    ||(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")) {
    return optimizeImageBytes(store,reference,original);
  }
  return {...await inspectPlayableBytes(bytes),original,renditions:[]};
}
