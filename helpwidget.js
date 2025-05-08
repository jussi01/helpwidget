// wwwroot/js/help-widget.js
window.helpWidget = (function() {
  let initialized = false;
  const zendeskSubdomain = "manuonline";
  const zendeskApi = `https://${zendeskSubdomain}.zendesk.com/api/v2/help_center`;

  // wait until <div id="help-widget"> is in the DOM, then kick off init
  function waitForWidget() {
    if (document.getElementById("help-widget")) {
      init();
    } else {
      setTimeout(waitForWidget, 100);
    }
  }

  // handle DOM ready + widget injection
  function onReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", waitForWidget);
    } else {
      waitForWidget();
    }
  }

  // main entry
  async function init() {
    if (initialized) return;
    initialized = true;

    const btn   = document.getElementById("help-search-btn");
    const input = document.getElementById("help-search");
    btn.addEventListener("click", triggerSearch);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") triggerSearch();
    });

    await showRelevantArticles();
    await loadCategories();
  }

  // hide full-article view
  function hideArticle() {
    const disp = document.getElementById("article-display");
    disp.classList.remove("show");
    disp.style.display = "none";
    document.getElementById("back-link").classList.add("hidden");
    document.getElementById("relevant-title").classList.remove("hidden");
    document.getElementById("category-title").classList.remove("hidden");
    document.getElementById("relevant-articles").style.display = "block";
    const sec = document.getElementById("help-sections");
    const cat = document.getElementById("help-categories");
    if (sec && sec.style.display === "block") sec.style.display = "block";
    else cat.style.display = "block";
  }

  // search button handler
  async function triggerSearch() {
    const term = document.getElementById("help-search").value.trim();
    if (term.length < 3) return;
    const results = await searchArticles(term);
    displayRelevantArticles(results, true);
  }

  function getSearchTermFromURL() {
    const seg = window.location.pathname.split("/").filter(Boolean);
    return seg.length ? seg.pop() : "getting started";
  }

  // Zendesk search API
  async function searchArticles(query) {
    const url = `${zendeskApi}/articles/search.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || []).slice(0, 3);
  }

  // show 3 articles based on URL or search
  async function showRelevantArticles() {
    const term     = getSearchTermFromURL();
    const articles = await searchArticles(term);
    displayRelevantArticles(articles, false);
  }

  // render list of articles
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
    articles.forEach(a => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="#">${a.title}</a>
        <div class="article-snippet">
          ${(a.body||"").replace(/<[^>]+>/g,"").slice(0,280)}...
        </div>
      `;
      li.querySelector("a").addEventListener("click", e => {
        e.preventDefault();
        displayFullArticle(a);
      });
      list.appendChild(li);
    });

    if (isSearch) {
      document.getElementById("relevant-title").textContent = "Search results";
    }
  }

  // show the full article
  function displayFullArticle(article) {
    const display = document.getElementById("article-display");
    const content = document.getElementById("article-content");

    ["relevant-articles","help-sections","help-categories"]
      .forEach(id => document.getElementById(id).style.display = "none");
    ["relevant-title","category-title"]
      .forEach(id => document.getElementById(id).classList.add("hidden"));
    document.getElementById("back-link").classList.remove("hidden");

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

  // load top‐level categories
  async function loadCategories() {
    const res       = await fetch(`${zendeskApi}/categories.json`);
    const data      = await res.json();
    const container = document.getElementById("help-categories");
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

  // load sections & articles accordion
  async function loadSections(categoryId, categoryName) {
    document.getElementById("help-categories").style.display = "none";
    const container = document.getElementById("help-sections");
    container.style.display = "block";
    container.innerHTML = `
      <div class="breadcrumb">&larr; All categories</div>
      <h3>${categoryName}</h3>
    `;
    container.querySelector(".breadcrumb")
      .addEventListener("click", () => {
        container.style.display = "none";
        document.getElementById("help-categories").style.display = "block";
      });

    const res  = await fetch(`${zendeskApi}/categories/${categoryId}/sections.json`);
    const data = await res.json();
    for (const section of (data.sections||[])) {
      await renderAccordionSection(section, container);
    }
    if (window.lucide) lucide.createIcons();
  }

  // render one accordion section
  async function renderAccordionSection(section, container) {
    const wrapper = document.createElement("div");
    const header  = document.createElement("div");
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

  // start everything
  onReady();

  return { init };
})();
window.helpWidget = {
  init: init   // or whatever your main init() is called
};
