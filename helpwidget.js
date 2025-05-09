// helpwidget.js
window.helpWidget = (function() {
  let initialized = false;
  const zendeskSubdomain = "manuonline";
  const zendeskApi = `https://${zendeskSubdomain}.zendesk.com/api/v2/help_center`;

  // Public API
  return {
    init,
    refresh
  };

  // ————————
  // Initialize once
  // ————————
  async function init() {
    if (initialized) return;
    initialized = true;

    bindSearchHandlers();
    await showRelevantArticles();
    await loadCategories();
  }

  // ————————————————
  // Force a fresh re-init
  // ————————————————
  async function refresh() {
    initialized = false;
    await init();
  }

  // ————————————————
  // Search box/button hookup
  // ————————————————
  function bindSearchHandlers() {
    const btn   = document.getElementById("help-search-btn");
    const input = document.getElementById("help-search");
    if (!btn || !input) return;

    // remove old listeners (in case refresh) then re-attach
    btn.removeEventListener("click", triggerSearch);
    btn.addEventListener("click", triggerSearch);

    input.removeEventListener("keydown", onEnterPress);
    input.addEventListener("keydown", onEnterPress);
  }

  function onEnterPress(e) {
    if (e.key === "Enter") triggerSearch();
  }

  // ——————————————————
  // Search action
  // ——————————————————
  async function triggerSearch() {
    const term = document.getElementById("help-search").value.trim();
    if (term.length < 3) return;
    const results = await searchArticles(term);
    displayRelevantArticles(results, true);
  }

  // ——————————————————————————
  // URL-based default search term
  // ——————————————————————————
  function getSearchTermFromURL() {
    const segs = window.location.pathname.split("/").filter(Boolean);
    return segs.length ? segs.pop() : "getting started";
  }

  // —————————————————————————————————————————
  // Zendesk API call: search
  // —————————————————————————————————————————
  async function searchArticles(query) {
    const url = `${zendeskApi}/articles/search.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || []).slice(0, 3);
  }

  // ——————————————————————————————
  // Initial “relevant” articles load
  // ——————————————————————————————
  async function showRelevantArticles() {
    const term     = getSearchTermFromURL();
    const articles = await searchArticles(term);
    displayRelevantArticles(articles, false);
  }

  // —————————————————————————————————————————
  // Render a list of articles (search or initial)
  // —————————————————————————————————————————
  function displayRelevantArticles(articles, isSearch) {
    const list    = document.getElementById("relevant-articles");
    const display = document.getElementById("article-display");
    const back    = document.getElementById("back-link");

    list.style.display = "block";
    display.classList.remove("show");
    display.style.display = "none";
    back.classList.add("hidden");

    document.getElementById("relevant-title").classList.remove("hidden");
    document.getElementById("category-title").classList.remove("hidden");

    list.innerHTML = "";
    articles.forEach(article => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="#">${article.title}</a>
        <div class="article-snippet">
          ${(article.body||"").replace(/<[^>]+>/g,"").slice(0,280)}...
        </div>
      `;
      li.querySelector("a").addEventListener("click", e => {
        e.preventDefault();
        displayFullArticle(article);
      });
      list.appendChild(li);
    });

    if (isSearch) {
      document.getElementById("relevant-title").textContent = "Search results";
    }
  }

  // —————————————————————————————————————————
  // Show one full article
  // —————————————————————————————————————————
  function displayFullArticle(article) {
    const display = document.getElementById("article-display");
    const content = document.getElementById("article-content");

    // hide lists
    ["relevant-articles","help-sections","help-categories"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
    // hide headers
    ["relevant-title","category-title"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });
    document.getElementById("back-link").classList.remove("hidden");

    // top link
    document.getElementById("article-top-link").innerHTML = `
      <div style="margin-bottom:16px">
        <a href="${article.html_url}" target="_blank"
           style="color:var(--blue);font-size:13px;text-decoration:none">
          See this article in the Help Center
        </a>
      </div>
    `;

    content.innerHTML = `<h4>${article.title}</h4>${article.body}`;
    display.style.display = "block";
    setTimeout(() => display.classList.add("show"), 50);
    display.scrollIntoView({ behavior: "smooth" });
  }

  // —————————————————————————————————————————
  // Hide full-article view, show lists again
  // —————————————————————————————————————————
  function hideArticle() {
    const disp = document.getElementById("article-display");
    if (disp) {
      disp.classList.remove("show");
      disp.style.display = "none";
    }
    const back = document.getElementById("back-link");
    if (back) back.classList.add("hidden");

    ["relevant-title","category-title"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("hidden");
    });
    const list = document.getElementById("relevant-articles");
    if (list) list.style.display = "block";

    const sec = document.getElementById("help-sections");
    const cat = document.getElementById("help-categories");
    if (sec && sec.style.display === "block") sec.style.display = "block";
    else if (cat) cat.style.display = "block";
  }

  // —————————————————————————————————————————
  // Load top-level categories
  // —————————————————————————————————————————
  async function loadCategories() {
    const res       = await fetch(`${zendeskApi}/categories.json`);
    const data      = await res.json();
    const container = document.getElementById("help-categories");
    if (!container) return;
    container.innerHTML = "";

    (data.categories||[]).forEach(cat => {
      const div = document.createElement("div");
      div.className = "category-item";
      div.innerHTML = `
        <div class="category-info">
          <strong>${cat.name}</strong>
          <small>${cat.description}</small>
        </div>
        <span><i data-lucide="chevron-right"></i></span>
      `;
      div.addEventListener("click", () => loadSections(cat.id, cat.name));
      container.appendChild(div);
    });

    if (window.lucide) lucide.createIcons();
  }

  // —————————————————————————————————————————
  // Load sections (accordion) for a category
  // —————————————————————————————————————————
  async function loadSections(categoryId, categoryName) {
    const catsEl = document.getElementById("help-categories");
    if (catsEl) catsEl.style.display = "none";

    const container = document.getElementById("help-sections");
    if (!container) return;
    container.style.display = "block";
    container.innerHTML = `
      <div class="breadcrumb">&larr; All categories</div>
      <h3>${categoryName}</h3>
    `;
    container.querySelector(".breadcrumb").addEventListener("click", () => {
      container.style.display = "none";
      if (catsEl) catsEl.style.display = "block";
    });

    const res  = await fetch(`${zendeskApi}/categories/${categoryId}/sections.json`);
    const data = await res.json();
    for (const section of (data.sections||[])) {
      await renderAccordionSection(section, container);
    }
    if (window.lucide) lucide.createIcons();
  }

  // —————————————————————————————————————————
  // Render one accordion section with its articles
  // —————————————————————————————————————————
  async function renderAccordionSection(section, container) {
    const wrapper = document.createElement("div");

    const header = document.createElement("div");
    header.className = "accordion-header";
    header.innerHTML = `<span>${section.name}</span><i data-lucide="chevron-down"></i>`;

    const content = document.createElement("div");
    content.className = "accordion-content";

    header.addEventListener("click", () => {
      const isActive = content.classList.contains("active");
      document.querySelectorAll(".accordion-content")
              .forEach(c => c.classList.remove("active"));
      document.querySelectorAll(".accordion-header")
              .forEach(h => h.classList.remove("active"));
      document.querySelectorAll(".accordion-header i")
              .forEach(i => i.setAttribute("data-lucide", "chevron-down"));

      if (!isActive) {
        content.classList.add("active");
        header.classList.add("active");
        header.querySelector("i").setAttribute("data-lucide", "chevron-up");
      }
      if (window.lucide) lucide.createIcons();
    });

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    container.appendChild(wrapper);

    const res  = await fetch(`${zendeskApi}/sections/${section.id}/articles.json`);
    const data = await res.json();
    const list = document.createElement("ul");

    (data.articles||[]).forEach(article => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="#">${article.title}</a>
        <div class="article-snippet">
          ${(article.body||"").replace(/<[^>]+>/g,"").slice(0,280)}...
        </div>
      `;
      li.querySelector("a").addEventListener("click", e => {
        e.preventDefault();
        displayFullArticle(article);
      });
      list.appendChild(li);
    });

    content.appendChild(list);
  }

})();
