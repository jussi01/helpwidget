// helpwidget.js
window.helpWidget = (function() {
  let initialized = false;
  const zendeskSubdomain = "manuonline";
  const zendeskApi       = `https://${zendeskSubdomain}.zendesk.com/api/v2/help_center`;

  return { init, refresh };

  async function init() {
    if (initialized) return;
    initialized = true;
    bindSearchHandlers();
    await showRelevantArticles();
    await loadCategories();
  }

  async function refresh() {
    initialized = false;
    await init();
  }

  function bindSearchHandlers() {
    const btn = document.getElementById("help-search-btn");
    const input = document.getElementById("help-search");
    if (!btn || !input) return;
    btn.addEventListener("click", triggerSearch);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") triggerSearch();
    });
  }

  async function triggerSearch() {
    const termEl = document.getElementById("help-search");
    if (!termEl) return;
    const term = termEl.value.trim();
    if (term.length < 3) return;
    const results = await searchArticles(term);
    displayRelevantArticles(results, true);
  }

  function getSearchTermFromURL() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length ? parts.pop() : "getting started";
  }

  async function searchArticles(query) {
    const url = `${zendeskApi}/articles/search.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || []).slice(0, 3);
  }

  async function showRelevantArticles() {
    const term     = getSearchTermFromURL();
    const articles = await searchArticles(term);
    displayRelevantArticles(articles, false);
  }

  function displayRelevantArticles(articles, isSearch) {
    const list    = document.getElementById("relevant-articles");
    const display = document.getElementById("article-display");
    const back    = document.getElementById("back-link");
    if (!list || !display || !back) return;

    list.style.display    = "block";
    display.classList.remove("show");
    display.style.display = "none";
    back.classList.add("hidden");

    document.getElementById("relevant-title")?.classList.remove("hidden");
    document.getElementById("category-title")?.classList.remove("hidden");

    list.innerHTML = "";
    articles.forEach(article => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="#">${article.title}</a>
        <div class="article-snippet">
          ${(article.body||"").replace(/<[^>]+>/g,"").slice(0,280)}...
        </div>
      `;
      const a = li.querySelector("a");
      if (a) a.addEventListener("click", e => {
        e.preventDefault();
        displayFullArticle(article);
      });
      list.appendChild(li);
    });

    if (isSearch) {
      const rel = document.getElementById("relevant-title");
      if (rel) rel.textContent = "Search results";
    }
  }

  function displayFullArticle(article) {
    const display = document.getElementById("article-display");
    const content = document.getElementById("article-content");
    if (!display || !content) return;

    ["relevant-articles","help-sections","help-categories"]
      .forEach(id => document.getElementById(id)?.style.setProperty("display","none"));
    ["relevant-title","category-title"]
      .forEach(id => document.getElementById(id)?.classList.add("hidden"));
    document.getElementById("back-link")?.classList.remove("hidden");

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

  function hideArticle() {
    const display = document.getElementById("article-display");
    if (display) {
      display.classList.remove("show");
      display.style.display = "none";
    }
    document.getElementById("back-link")?.classList.add("hidden");

    ["relevant-title","category-title"].forEach(id => {
      document.getElementById(id)?.classList.remove("hidden");
    });
    document.getElementById("relevant-articles")?.style.setProperty("display","block");

    const sec = document.getElementById("help-sections");
    const cat = document.getElementById("help-categories");
    if (sec && sec.style.display === "block") sec.style.display = "block";
    else if (cat) cat.style.display = "block";
  }

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

    window.lucide?.createIcons();
  }

  async function loadSections(categoryId, categoryName) {
    document.getElementById("help-categories")?.style.setProperty("display","none");
    const container = document.getElementById("help-sections");
    if (!container) return;
    container.style.display = "block";
    container.innerHTML = `
      <div class="breadcrumb">&larr; All categories</div>
      <h3>${categoryName}</h3>
    `;
    const bc = container.querySelector(".breadcrumb");
    if (bc) {
      bc.addEventListener("click", () => {
        container.style.display = "none";
        document.getElementById("help-categories")?.style.setProperty("display","block");
      });
    }

    const res  = await fetch(`${zendeskApi}/categories/${categoryId}/sections.json`);
    const data = await res.json();
    for (const section of (data.sections||[])) {
      await renderAccordionSection(section, container);
    }
    window.lucide?.createIcons();
  }

  async function renderAccordionSection(section, container) {
    const wrapper = document.createElement("div");
    const header  = document.createElement("div");
    header.className = "accordion-header";
    header.innerHTML = `<span>${section.name}</span><i data-lucide="chevron-down"></i>`;
    const content = document.createElement("div");
    content.className = "accordion-content";

    header.addEventListener("click", () => {
      const isActive = content.classList.contains("active");
      document.querySelectorAll(".accordion-content").forEach(c => c.classList.remove("active"));
      document.querySelectorAll(".accordion-header").forEach(h => h.classList.remove("active"));
      document.querySelectorAll(".accordion-header i")
        .forEach(i => i.setAttribute("data-lucide","chevron-down"));

      if (!isActive) {
        content.classList.add("active");
        header.classList.add("active");
        const ico = header.querySelector("i");
        if (ico) ico.setAttribute("data-lucide","chevron-up");
      }
      window.lucide?.createIcons();
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
      const a = li.querySelector("a");
      if (a) {
        a.addEventListener("click", e => {
          e.preventDefault();
          displayFullArticle(article);
        });
      }
      list.appendChild(li);
    });

    content.appendChild(list);
  }

  // auto-init when #help-widget lands in the DOM
  if (window.MutationObserver) {
    new MutationObserver((m, obs) => {
      if (document.getElementById("help-widget")) {
        init();
        obs.disconnect();
      }
    }).observe(document.body, { childList:true, subtree:true });
  } else {
    const poll = setInterval(() => {
      if (document.getElementById("help-widget")) {
        init();
        clearInterval(poll);
      }
    }, 100);
  }

})();
