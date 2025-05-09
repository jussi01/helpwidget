// helpwidget.js
window.helpWidget = (function() {
  var initialized = false;
  var zendeskSubdomain = "manuonline";
  var zendeskApi = "https://" + zendeskSubdomain + ".zendesk.com/api/v2/help_center";

  return {
    init: init,
    refresh: refresh
  };

  // — init only once
  function init() {
    if (initialized) {
      return;
    }
    initialized = true;
    bindSearchHandlers();
    showRelevantArticles();
    loadCategories();
  }

  // — force a re-init
  function refresh() {
    initialized = false;
    init();
  }

  // — attach box + button
  function bindSearchHandlers() {
    var btn = document.getElementById("help-search-btn");
    var input = document.getElementById("help-search");
    if (!btn || !input) {
      return;
    }
    btn.onclick = triggerSearch;
    input.onkeydown = function(e) {
      if (e.key === "Enter") {
        triggerSearch();
      }
    };
  }

  // — search click/enter
  function triggerSearch() {
    var inp = document.getElementById("help-search");
    if (!inp) {
      return;
    }
    var term = inp.value.trim();
    if (term.length < 3) {
      return;
    }
    searchArticles(term, function(results) {
      displayRelevantArticles(results, true);
    });
  }

  // — get default term from URL
  function getSearchTermFromURL() {
    var parts = window.location.pathname.split("/").filter(function(p) { return p; });
    if (parts.length > 0) {
      return parts.pop();
    }
    return "getting started";
  }

  // — call Zendesk search
  function searchArticles(query, callback) {
    var url = zendeskApi + "/articles/search.json?query=" + encodeURIComponent(query);
    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var arr = data.results || [];
        callback(arr.slice(0, 3));
      });
  }

  // — initial load
  function showRelevantArticles() {
    var term = getSearchTermFromURL();
    searchArticles(term, function(articles) {
      displayRelevantArticles(articles, false);
    });
  }

  // — render the list
  function displayRelevantArticles(articles, isSearch) {
    var list    = document.getElementById("relevant-articles");
    var display = document.getElementById("article-display");
    var back    = document.getElementById("back-link");
    if (!list || !display || !back) {
      return;
    }

    list.style.display    = "block";
    display.classList.remove("show");
    display.style.display = "none";
    back.classList.add("hidden");

    var relTitle = document.getElementById("relevant-title");
    var catTitle = document.getElementById("category-title");
    if (relTitle) { relTitle.classList.remove("hidden"); }
    if (catTitle) { catTitle.classList.remove("hidden"); }

    list.innerHTML = "";
    articles.forEach(function(article) {
      var li = document.createElement("li");
      li.innerHTML = ''
        + '<a href="#">' + article.title + '</a>'
        + '<div class="article-snippet">'
        +   ( (article.body||"").replace(/<[^>]+>/g,"").slice(0,280) )
        +   '...'
        + '</div>';
      var a = li.querySelector("a");
      if (a) {
        a.addEventListener("click", function(e) {
          e.preventDefault();
          displayFullArticle(article);
        });
      }
      list.appendChild(li);
    });

    if (isSearch && relTitle) {
      relTitle.textContent = "Search results";
    }
  }

  // — show one full article
  function displayFullArticle(article) {
    var display = document.getElementById("article-display");
    var content = document.getElementById("article-content");
    if (!display || !content) {
      return;
    }

    ["relevant-articles","help-sections","help-categories"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = "none"; }
    });
    ["relevant-title","category-title"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.classList.add("hidden"); }
    });
    var back = document.getElementById("back-link");
    if (back) { back.classList.remove("hidden"); }

    var topLink = document.getElementById("article-top-link");
    if (topLink) {
      topLink.innerHTML = ''
        + '<div style="margin-bottom:16px">'
        +   '<a href="' + article.html_url + '" target="_blank" '
        +     'style="color:var(--blue);font-size:13px;text-decoration:none">'
        +     'See this article in the Help Center'
        +   '</a>'
        + '</div>';
    }

    content.innerHTML = '<h4>' + article.title + '</h4>' + article.body;
    display.style.display = "block";
    setTimeout(function() {
      display.classList.add("show");
    }, 50);
    display.scrollIntoView({ behavior: "smooth" });
  }

  // — back button
  function hideArticle() {
    var display = document.getElementById("article-display");
    if (display) {
      display.classList.remove("show");
      display.style.display = "none";
    }
    var back = document.getElementById("back-link");
    if (back) {
      back.classList.add("hidden");
    }

    ["relevant-title","category-title"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.classList.remove("hidden"); }
    });
    var list = document.getElementById("relevant-articles");
    if (list) { list.style.display = "block"; }

    var sec = document.getElementById("help-sections");
    var cat = document.getElementById("help-categories");
    if (sec && sec.style.display === "block") {
      sec.style.display = "block";
    } else if (cat) {
      cat.style.display = "block";
    }
  }

  // — load categories
  function loadCategories() {
    var url = zendeskApi + "/categories.json";
    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var cats = data.categories || [];
        var container = document.getElementById("help-categories");
        if (!container) { return; }
        container.innerHTML = "";

        cats.forEach(function(cat) {
          var div = document.createElement("div");
          div.className = "category-item";
          div.innerHTML = ''
            + '<div class="category-info">'
            +   '<strong>' + cat.name + '</strong>'
            +   '<small>' + cat.description + '</small>'
            + '</div>'
            + '<span><i data-lucide="chevron-right"></i></span>';
          div.addEventListener("click", function() {
            loadSections(cat.id, cat.name);
          });
          container.appendChild(div);
        });

        if (window.lucide && window.lucide.createIcons) {
          window.lucide.createIcons();
        }
      });
  }

  // — load sections & articles
  function loadSections(categoryId, categoryName) {
    var catsEl = document.getElementById("help-categories");
    if (catsEl) { catsEl.style.display = "none"; }

    var container = document.getElementById("help-sections");
    if (!container) { return; }
    container.style.display = "block";
    container.innerHTML = ''
      + '<div class="breadcrumb">&larr; All categories</div>'
      + '<h3>' + categoryName + '</h3>';

    var bc = container.querySelector(".breadcrumb");
    if (bc) {
      bc.addEventListener("click", function() {
        container.style.display = "none";
        if (catsEl) { catsEl.style.display = "block"; }
      });
    }

    var url = zendeskApi + "/categories/" + categoryId + "/sections.json";
    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var secs = data.sections || [];
        secs.forEach(function(section) {
          renderAccordionSection(section, container);
        });
        if (window.lucide && window.lucide.createIcons) {
          window.lucide.createIcons();
        }
      });
  }

  // — render one accordion section
  function renderAccordionSection(section, container) {
    var wrapper = document.createElement("div");
    var header  = document.createElement("div");
    header.className = "accordion-header";
    header.innerHTML = '<span>' + section.name + '</span><i data-lucide="chevron-down"></i>';
    var content = document.createElement("div");
    content.className = "accordion-content";

    header.addEventListener("click", function() {
      var isActive = content.classList.contains("active");
      Array.prototype.forEach.call(
        document.querySelectorAll(".accordion-content"),
        function(c) { c.classList.remove("active"); }
      );
      Array.prototype.forEach.call(
        document.querySelectorAll(".accordion-header"),
        function(h) { h.classList.remove("active"); }
      );
      Array.prototype.forEach.call(
        document.querySelectorAll(".accordion-header i"),
        function(i) { i.setAttribute("data-lucide","chevron-down"); }
      );

      if (!isActive) {
        content.classList.add("active");
        header.classList.add("active");
        var ico = header.querySelector("i");
        if (ico) {
          ico.setAttribute("data-lucide","chevron-up");
        }
      }
      if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
      }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    container.appendChild(wrapper);

    var url = zendeskApi + "/sections/" + section.id + "/articles.json";
    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var arts = data.articles || [];
        var list = document.createElement("ul");
        arts.forEach(function(article) {
          var li = document.createElement("li");
          li.innerHTML = ''
            + '<a href="#">' + article.title + '</a>'
            + '<div class="article-snippet">'
            +   ( (article.body||"").replace(/<[^>]+>/g,"").slice(0,280) )
            +   '...'
            + '</div>';
          var a = li.querySelector("a");
          if (a) {
            a.addEventListener("click", function(e) {
              e.preventDefault();
              displayFullArticle(article);
            });
          }
          list.appendChild(li);
        });
        content.appendChild(list);
      });
  }

  // — auto-init when widget hits the DOM
  if (window.MutationObserver) {
    new MutationObserver(function(muts, obs) {
      if (document.getElementById("help-widget")) {
        init();
        obs.disconnect();
      }
    }).observe(document.body, { childList:true, subtree:true });
  }
  else {
    var poll = setInterval(function() {
      if (document.getElementById("help-widget")) {
        init();
        clearInterval(poll);
      }
    }, 100);
  }
})();
