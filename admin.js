// Portfolio admin. Configure with your Supabase Project URL and anon/public key.
// Never use a Supabase service_role key in browser code.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
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
}
function renderList(target,items) {
  const host=$(target); host.replaceChildren();
  if(!items.length){host.textContent="Nothing uploaded yet.";return;}
  for(const item of items){
    const row=document.createElement("div");row.className="item";
    const info=document.createElement("div");const title=document.createElement("strong");title.textContent=item.title;
    const sub=document.createElement("small");sub.textContent=(item.category||item.kind)+" · "+(item.featured?"Featured":"Standard");
    info.append(title,sub);
    const del=document.createElement("button");del.textContent="DELETE";del.addEventListener("click",()=>removeItem(item));
    row.append(info,del);host.append(row);
  }
}
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
    for(const file of files){
      const filePath=await upload(file,"photos");
      await saveItem({kind:"photo",title:data.get("title").trim(),category:data.get("category").trim(),description:data.get("description").trim(),file_path:filePath,featured:data.get("featured")==="on"});
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
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  $("#filmsPanel").hidden=tab.dataset.tab!=="films";$("#photosPanel").hidden=tab.dataset.tab!=="photos";
}));
if(db) db.auth.getSession().then(({data})=>{if(data.session)showDashboard();});
