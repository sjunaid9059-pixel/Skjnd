const $=id=>document.getElementById(id);
const urlBox=$("url"), result=$("result"), msg=$("msg"), shareBox=$("shareBox"), shareUrl=$("shareUrl");

function cleanUrl(v){
  v=(v||"").trim().replace(/^["']|["']$/g,"");
  // Fix accidental duplicate protocol such as https://https://example...
  v=v.replace(/^https?:\/\/https?:\/\//i,"https://");
  v=v.replace(/\/+$/,"");
  if(!/^https?:\/\/.+/i.test(v)) return null;
  return v;
}
function b64dec(v){
  try{v=v.replace(/-/g,"+").replace(/_/g,"/");v+="=".repeat((4-v.length%4)%4);return decodeURIComponent(escape(atob(v)))}catch{return null}
}
function b64enc(v){return btoa(unescape(encodeURIComponent(v))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}

function getUrls(){
  const raw=urlBox.value.trim();
  if(!raw) throw new Error("Enter a Firebase Realtime Database URL.");
  // Simple URL is the primary format.
  if(!raw.startsWith("[") && !raw.startsWith("{") && !raw.startsWith("MERGED:::")){
    const u=cleanUrl(raw);
    if(u)return [u];
  }
  // Backward compatibility with old panel links / JSON.
  let v=raw, d=b64dec(v); if(d)v=d;
  if(v.startsWith("MERGED:::"))v=v.slice(9);
  try{
    const arr=JSON.parse(v);
    const out=(Array.isArray(arr)?arr:[arr]).map(x=>typeof x==="string"?x:x.url).map(cleanUrl).filter(Boolean);
    if(out.length)return out;
  }catch{}
  const u=cleanUrl(raw); if(u)return [u];
  throw new Error("Invalid Firebase URL. Example: https://lodaroll-default-rtdb.firebaseio.com");
}
function setMsg(t,e=false){msg.textContent=t;msg.style.color=e?"#ffaaa8":""}

async function load(){
  result.innerHTML="";
  let urls;try{urls=getUrls()}catch(e){setMsg(e.message,true);return}
  setMsg("Loading...");
  let ok=0;
  for(const u of urls){
    const card=document.createElement("article");
    card.innerHTML=`<div class="db">FIREBASE DATABASE</div><div class="url"></div><pre>Loading...</pre>`;
    card.querySelector(".url").textContent=u;result.appendChild(card);
    const pre=card.querySelector("pre");
    try{
      const r=await fetch(u+"/.json",{headers:{Accept:"application/json"}});
      const text=await r.text();
      if(!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0,300)}`);
      let data;try{data=JSON.parse(text)}catch{data=text}
      pre.textContent=JSON.stringify(data,null,2);ok++;
    }catch(e){
      pre.className="error";
      pre.textContent=`Unable to read this Firebase database.\n\n${e.message}\n\nIf this is HTTP 404, verify that this exact Firebase Realtime Database URL exists. If it exists but is private, its Rules must allow this browser request.`;
    }
  }
  setMsg(`Finished: ${ok}/${urls.length} endpoint${urls.length>1?"s":""} loaded.`);
}
function makeShare(){
  let urls;try{urls=getUrls()}catch(e){setMsg(e.message,true);return}
  const encoded=b64enc("MERGED:::"+JSON.stringify(urls));
  const link=location.origin+location.pathname+"?s="+encodeURIComponent(encoded);
  shareUrl.value=link;shareBox.classList.remove("hidden");history.replaceState(null,"","?s="+encodeURIComponent(encoded));setMsg("Share link created.");
}
$("load").onclick=load;$("share").onclick=makeShare;
$("clear").onclick=()=>{urlBox.value="";result.innerHTML="";shareBox.classList.add("hidden");setMsg("")};
$("copy").onclick=async()=>{await navigator.clipboard.writeText(shareUrl.value);$("copy").textContent="Copied";setTimeout(()=>$("copy").textContent="Copy",1000)};

const s=new URLSearchParams(location.search).get("s");
if(s){const d=b64dec(s);if(d){let v=d.startsWith("MERGED:::")?d.slice(9):d;try{const a=JSON.parse(v);urlBox.value=(Array.isArray(a)?a:[a]).map(x=>typeof x==="string"?x:x.url).filter(Boolean).join("\n")}catch{urlBox.value=d}}else urlBox.value=s;load()}
