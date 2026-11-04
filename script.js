const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");

menuButton?.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

const SUPABASE_URL = "https://cjmsflkhhhbyecgiyxil.supabase.co";
const SUPABASE_KEY = "sb_publishable_WcsHFWd7-tcO39b0MxBMTg_ngI9TYzB";
const MEDIA_BUCKET = "portfolio-media";

function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) return resolve(window.supabase);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => resolve(window.supabase);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadPortfolioItems() {
  const pageKind = document.body.dataset.portfolioKind;\n  const grid = document.querySelector(".work-grid") || document.querySelector(".film-gallery") || document.querySelector(".photo-gallery");
  const note = document.querySelector(".coming-soon");
  if (!grid) return;
  try {
    const sdk = await loadSupabase();
    const client = sdk.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await client.from("portfolio_items")
      .select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const visibleItems = pageKind === "film" ? data.filter(item => item.kind === "film") : pageKind === "photo" ? data.filter(item => item.kind === "photo") : data;\n    if (!visibleItems?.length) return;

    grid.replaceChildren();
    note?.remove();
    const storage = client.storage.from(MEDIA_BUCKET);
    const mediaUrl = (path) => path ? storage.getPublicUrl(path).data.publicUrl : "";

    visibleItems.forEach((item, index) => {
      const card = document.createElement("a");
      card.className = pageKind === "photo" ? "photo-tile uploaded-photo-tile" : "work-card uploaded-card";
      const target = item.kind === "film"
        ? (item.video_url || mediaUrl(item.file_path))
        : mediaUrl(item.file_path);
      if (pageKind === "photo") { card.type = "button"; card.dataset.category = (item.category || "people").toLowerCase(); } else { card.href = target || "#work"; }
      if (item.kind === "film" && target && pageKind !== "film") {
        card.target = "_blank";
        card.rel = "noopener noreferrer";
      }
      const image = document.createElement("div");
      image.className = pageKind === "photo" ? "photo-tile-art uploaded-image" : "work-image uploaded-image";
      const poster = mediaUrl(item.poster_path) || (item.kind === "photo" ? mediaUrl(item.file_path) : "");
      if (poster) {
        const img = document.createElement("img");
        img.src = poster;
        img.alt = item.title;
        img.loading = "lazy";
        image.appendChild(img);
      } else {
        image.classList.add("uploaded-no-image");
      }
      const tag = document.createElement("span");
      tag.className = "image-tag";
      tag.textContent = (item.kind === "film" ? "FILM" : "PHOTOGRAPHY") + " / " + String(index + 1).padStart(2, "0");
      const title = document.createElement("b");
      title.textContent = item.title;
      const arrow = document.createElement("span");
      arrow.className = "image-arrow";
      arrow.textContent = "↗";
      if (pageKind === "photo") { image.append(tag); } else { image.append(tag, title, arrow); }
      const meta = document.createElement("div");
      meta.className = "work-meta";
      const name = document.createElement("strong");
      name.textContent = item.title;
      const category = document.createElement("span");
      category.textContent = item.category || (item.kind === "film" ? "Film" : "Photography");
      meta.append(name, category);
      if (pageKind === "photo") { const label = document.createElement("span"); label.textContent = item.title.toUpperCase(); card.append(image, label); } else { card.append(image, meta); }
      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Portfolio gallery could not load:", error);
  }
}

loadPortfolioItems();
