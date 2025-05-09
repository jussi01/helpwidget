v// helpwidget.js
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
        </di
