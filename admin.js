// Portfolio admin. Uses the Supabase publishable key (safe for browser use with RLS).
// Never use a Supabase service_role or secret key in browser code.
const SUPABASE_URL = "https://cjmsflkhhhbyecgiyxil.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WcsHFWd7-tcO39b0MxBMTg_ngI9TYzB";
const BUCKET = "portfolio-media";
const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
const $ = (s) => document.querySelector(s);
const setupNotice = $("#setupNotice");
const loginPanel = $("#loginPanel");
const dashboard = $("#dashboard");
let db = null;
if (configured && window.supabase) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  setupNotice.hidden = true;
} else {
  $("#loginMessage").textContent = "Connect Supabase to activate sign-in and uploads.";
}
function message(id, text) { $(id).textContent = text; }
function safeName(name) { return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(-100); }
function publicUrl(path) { return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; }
async function optimisePhoto(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 2400;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob) return file;
    const base = file.name.replace(/\\.[^.]+$/, "");
    return new File([blob], base + ".webp", { type: "image/webp", lastModified: Date.now() });
  } catch (error) {
    console.warn("Photo optimisation unavailable; uploading original:", error);
    return file;
  }
}
async function upload(file, folder) {
  const path = folder + "/" + crypto.randomUUID() + "-" + safeName(file.name);
  const { error } = await db.storage.from(BUCKET).upload(path,file,{cacheControl:"31536000",upsert:false,contentType:file.type});
  if(error) throw error;
  return path;
}
async function refresh() {
  const {data,error}=await db.from("portfolio_items").select("*").order("created_at",{ascending:false});
  if(error) throw error;
  renderList("#filmList",data.filter(x=>x.kind==="film"));
  renderList("#photoList",data.filter(x=>x.kind==="photo"));
  const {data:covers,error:coverError}=await db.from("portfolio_covers").select("*").order("created_at",{ascending:false});
  if(coverError) throw coverError;
  renderCoverList(covers||[]);
}
function renderList(target,items) {
  const host=$(target); host.replaceChildren();
  if(!items.length){host.textContent="Nothing uploaded yet.";return;}
  for(const item of items){
    const row=document.createElement("div");row.className="item";
    const info=document.createElement("div");const title=document.createElement("strong");title.textContent=item.title;
    const sub=document.createElement("small");sub.textContent=(item.category||item.kind)+(item.collection?" · "+item.collection:"")+" · "+(item.featured?"Featured":"Standard");
    info.append(title,sub);
    const del=document.createElement("button");del.textContent="DELETE";del.addEventListener("click",()=>removeItem(item));
    row.append(info,del);host.append(row);
  }
}
function renderCoverList(items){const host=$("#coverList");host.replaceChildren();if(!items.length){host.textContent="No cover images uploaded yet.";return;}for(const item of items){const row=document.createElement("div");row.className="item";const info=document.createElement("div");const title=document.createElement("strong");title.textContent=item.placement.replaceAll("_"," ").toUpperCase();const sub=document.createElement("small");sub.textContent=(item.category||"")+(item.collection?" · "+item.collection:"");info.append(title,sub);const del=document.createElement("button");del.textContent="DELETE";del.addEventListener("click",async()=>{if(!confirm("Delete this cover image?"))return;try{const {error:storageError}=await db.storage.from(BUCKET).remove([item.file_path]);if(storageError)throw storageError;const {error}=await db.from("portfolio_covers").delete().eq("id",item.id);if(error)throw error;await refresh();}catch(e){alert("Could not delete cover: "+e.message);}});row.append(info,del);host.append(row);}}
async function handleCover(event){event.preventDefault();const form=event.currentTarget,data=new FormData(form),btn=form.querySelector("button[type=submit]");btn.disabled=true;message("#coverMessage","Uploading cover image…");try{const placement=data.get("placement"),category=(data.get("category")||"").trim(),collection=(data.get("collection")||"").trim();if(placement==="photo_category"&&!category)throw new Error("Choose a category.");if(placement==="photo_collection"&&(!category||!collection))throw new Error("Choose a category and enter a collection name.");const key=placement==="photo_category"?"photo_category:"+category:placement==="photo_collection"?"photo_collection:"+category+":"+collection:placement;const file=await optimisePhoto(data.get("cover"));const filePath=await upload(file,"covers");const {data:existing,error:lookupError}=await db.from("portfolio_covers").select("id,file_path").eq("cover_key",key).maybeSingle();if(lookupError)throw lookupError;const values={cover_key:key,placement,category:category||null,collection:collection||null,file_path:filePath};const result=existing?await db.from("portfolio_covers").update(values).eq("id",existing.id):await db.from("portfolio_covers").insert(values);if(result.error)throw result.error;if(existing?.file_path)await db.storage.from(BUCKET).remove([existing.file_path]);form.reset();message("#coverMessage","Cover image saved.");await refresh();}catch(e){message("#coverMessage","Error: "+e.message);}finally{btn.disabled=false;}}
async function removeItem(item){
  if(!confirm("Delete “"+item.title+"” from the portfolio?")) return;
  try{
    const paths=[item.file_path,item.poster_path].filter(Boolean);
    if(paths.length){const {error}=await db.storage.from(BUCKET).remove(paths);if(error)throw error;}
    const {error}=await db.from("portfolio_items").delete().eq("id",item.id);if(error)throw error;
    await refresh();
  }catch(e){alert("Could not delete: "+e.message);}
}
async function saveItem(values){
  const {error}=await db.from("portfolio_items").insert(values);
  if(error) throw error;
  await refresh();
}
async function handleFilm(event){
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const btn=form.querySelector("button[type=submit]");
  btn.disabled=true;message("#filmMessage","Saving film…");
  try{
    const video=data.get("video_file");const poster=data.get("poster");
    const filePath=video?.size?await upload(video,"films"):null;
    const posterPath=poster?.size?await upload(poster,"posters"):null;
    const videoUrl=(data.get("video_url")||"").trim();
    if(!videoUrl&&!filePath)throw new Error("Add a video link or choose a video file.");
    await saveItem({kind:"film",title:data.get("title").trim(),category:data.get("category").trim(),description:data.get("description").trim(),video_url:videoUrl||null,file_path:filePath,poster_path:posterPath,featured:data.get("featured")==="on"});
    form.reset();message("#filmMessage","Film saved to your portfolio.");
  }catch(e){message("#filmMessage","Error: "+e.message);}
  finally{btn.disabled=false;}
}
async function handlePhotos(event){
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const files=[...form.elements.photos.files];const btn=form.querySelector("button[type=submit]");
  btn.disabled=true;message("#photoMessage","Uploading "+files.length+" photograph(s)…");
  try{
    if(!files.length)throw new Error("Choose at least one photograph.");
    for(const originalFile of files){
      const file = await optimisePhoto(originalFile);
      const filePath=await upload(file,"photos");
      await saveItem({kind:"photo",title:(data.get("title").trim()||file.name.replace(/\.[^.]+$/, "")),collection:data.get("collection").trim(),category:data.get("category").trim(),description:data.get("description").trim(),file_path:filePath,featured:data.get("featured")==="on"});
    }
    form.reset();message("#photoMessage",files.length+" photograph(s) uploaded.");
  }catch(e){message("#photoMessage","Error: "+e.message);}
  finally{btn.disabled=false;}
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return;
  message("#loginMessage","Signing in…");
  const {error}=await db.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});
  if(error){message("#loginMessage",error.message);return;}await showDashboard();
});
async function showDashboard(){
  loginPanel.hidden=true;dashboard.hidden=false;
  try{await refresh();}catch(e){message("#filmMessage","Could not load content: "+e.message);}
}
$("#logoutButton").addEventListener("click",async()=>{await db.auth.signOut();dashboard.hidden=true;loginPanel.hidden=false;});
$("#filmForm").addEventListener("submit",handleFilm);
$("#photoForm").addEventListener("submit",handlePhotos);
$("#coverForm").addEventListener("submit",handleCover);
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  $("#filmsPanel").hidden=tab.dataset.tab!=="films";$("#photosPanel").hidden=tab.dataset.tab!=="photos";$("#coversPanel").hidden=tab.dataset.tab!=="covers";
}));
if(db) db.auth.getSession().then(({data})=>{if(data.session)showDashboard();});
