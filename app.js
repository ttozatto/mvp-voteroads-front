function setStatus(element, message, ok) {
  element.textContent = message || "";
  element.className =
    "status-message " + (message ? (ok ? "ok" : "error") : "");
}

async function fetchJson(method, path, options) {
  var url = "http://localhost:5000" + path;
  var fetchOptions = {
    method: method,
    headers: options && options.headers ? options.headers : undefined,
    body: options && options.body ? options.body : undefined,
  };
  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { ok: res.ok, status: res.status, data: data };
}

async function loadProjects() {
  var statusEl = document.getElementById("projectsStatus");
  var listEl = document.getElementById("projectsList");
  listEl.innerHTML = "";
  setStatus(statusEl, "Carregando projetos...", true);

  try {
    var result = await fetchJson("GET", "/projects");
    if (!result.ok) {
      var msg =
        result.data && result.data.message
          ? result.data.message
          : "Erro HTTP " + result.status;
      setStatus(statusEl, msg, false);
      return;
    }

    var projects =
      result.data && result.data.projects ? result.data.projects : [];
    if (!projects.length) {
      listEl.innerHTML =
        "<div style='padding:8px;font-size:13px;color:#6b7280;'>Nenhum projeto cadastrado.</div>";
      setStatus(statusEl, "OK", true);
      return;
    }

    projects.forEach(function (proj) {
      var div = document.createElement("div");
      div.className = "project-item";
      div.onclick = function () {
        loadProjectDetails(proj.name);
        loadFeatureForm(proj.name);
      };

      var left = document.createElement("div");
      var nameEl = document.createElement("div");
      nameEl.className = "project-item-name";
      nameEl.textContent = proj.name;
      var dateEl = document.createElement("div");
      dateEl.className = "project-item-date";
      if (proj.created_at) {
        try {
          var d = new Date(proj.created_at);
          dateEl.textContent = d.toLocaleDateString();
        } catch (e) {
          dateEl.textContent = proj.created_at;
        }
      }
      left.appendChild(nameEl);
      left.appendChild(dateEl);

      div.appendChild(left);
      listEl.appendChild(div);
    });

    setStatus(statusEl, "Projetos carregados.", true);
  } catch (err) {
    setStatus(statusEl, "Erro de rede: " + err.message, false);
  }
}

async function loadProjectDetails(name) {
  var detailsContainer = document.getElementById("projectDetails");
  var emptyState = document.getElementById("project-details-empty");
  var nameEl = document.getElementById("projectName");
  var createdEl = document.getElementById("projectCreatedAt");
  var descEl = document.getElementById("projectDescription");
  var featuresEl = document.getElementById("projectFeatures");

  var ideaKanban = document.getElementById("features-idea");
  var plannedKanban = document.getElementById("features-planned");
  var inProgressKanban = document.getElementById("features-in-progress");
  var completedKanban = document.getElementById("features-done");

  emptyState.style.display = "none";
  detailsContainer.style.display = "block";

  nameEl.textContent = "Carregando...";
  createdEl.textContent = "";
  descEl.textContent = "";
  featuresEl.innerHTML = "";

  ideaKanban.innerHTML = "";
  plannedKanban.innerHTML = "";
  inProgressKanban.innerHTML = "";
  completedKanban.innerHTML = "";

  try {
    var query = "?name=" + encodeURIComponent(name);
    var result = await fetchJson("GET", "/project" + query);
    if (!result.ok) {
      var msg =
        result.data && result.data.message
          ? result.data.message
          : "Erro HTTP " + result.status;
      nameEl.textContent = "Erro ao carregar projeto";
      descEl.textContent = msg;
      return;
    }

    var proj = result.data;
    nameEl.textContent = proj.name || "(sem nome)";
    if (proj.created_at) {
      try {
        var d = new Date(proj.created_at);
        createdEl.textContent = "Criado em: " + d.toLocaleDateString();
      } catch (e) {
        createdEl.textContent = "Criado em: " + proj.created_at;
      }
    } else {
      createdEl.textContent = "";
    }
    descEl.textContent = proj.description || "";

    var feats = proj.features || [];
    if (!feats.length) {
      featuresEl.innerHTML = "<small>Nenhuma feature cadastrada.</small>";
    } else {
      feats.forEach(function (f) {
        var fDiv = document.createElement("div");
        fDiv.className = "feature-item";

        var fBody = document.createElement("div");
        fBody.className = "feature-body";

        var fLeft = document.createElement("div");
        fLeft.className = "feature-left";

        var fRight = document.createElement("div");
        fRight.className = "feature-right";

        var header = document.createElement("div");
        header.className = "feature-header";

        var fname = document.createElement("div");
        fname.className = "feature-name";
        fname.textContent = f.name || "(sem nome)";

        header.appendChild(fname);

        var fDesc = document.createElement("div");
        fDesc.className = "feature-desc";
        fDesc.textContent = f.description || "";

        fVotes = document.createElement("div");
        fVotes.id = "featureVotes-" + f.name;
        fVotes.className = "vote-value";
        fVotes.textContent = f.votes !== undefined ? String(f.votes) : "0";

        var fDate = document.createElement("small");
        fDate.className = "feature-extra";
        fDate.textContent = f.created_at
          ? new Date(f.created_at).toLocaleDateString()
          : "(sem data)";

        fDiv.appendChild(header);
        if (fDesc.textContent) fLeft.appendChild(fDesc);

        btnVoteUp = document.createElement("button");
        btnVoteUp.textContent = "▲";
        btnVoteUp.className = "vote-btn";
        btnVoteUp.onclick = function () {
          handleVoteFeature(proj.name, f.name, 1);
        };

        btnVoteDown = document.createElement("button");
        btnVoteDown.textContent = "▼";
        btnVoteDown.className = "vote-btn";
        btnVoteDown.onclick = function () {
          handleVoteFeature(proj.name, f.name, -1);
        };

        fRight.appendChild(btnVoteUp);
        fRight.appendChild(fVotes);
        fRight.appendChild(btnVoteDown);

        fLeft.appendChild(fDate);
        fBody.appendChild(fLeft);
        fBody.appendChild(fRight);
        fDiv.appendChild(fBody);

        switch (f.status) {
          case "Idea":
            ideaKanban.appendChild(fDiv);
            break;
          case "Planned":
            plannedKanban.appendChild(fDiv);
            break;
          case "In Progress":
            inProgressKanban.appendChild(fDiv);
            break;
          case "Done":
            completedKanban.appendChild(fDiv);
            break;
          default:
            break;
        }
      });
    }
  } catch (err) {
    nameEl.textContent = "Erro ao carregar projeto";
    descEl.textContent = "Erro de rede: " + err.message;
  }
}

async function handleVoteFeature(projectName, featureName, value) {
  try {
    var formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("feature_name", featureName);
    formData.append("value", value);

    var result = await fetchJson("POST", "/vote", { body: formData });
    if (!result.ok) {
      alert(
        "Erro ao votar: " +
          (result.data && result.data.message
            ? result.data.message
            : "Erro HTTP " + result.status)
      );
      return;
    }
    var votes = document.getElementById("featureVotes-" + featureName);
    votes.textContent =
      result.data && result.data.votes !== undefined
        ? String(result.data.votes)
        : "0";
  } catch (err) {
    alert("Erro de rede: " + err.message, false);
  }
}

async function handleNewProjectSubmit(event) {
  event.preventDefault();
  var form = event.target;
  var statusEl = document.getElementById("newProjectStatus");

  setStatus(statusEl, "Enviando...", true);

  var formData = new FormData();
  formData.append("name", form.name.value);
  formData.append("description", form.description.value);

  try {
    var result = await fetchJson("POST", "/project", { body: formData });
    if (!result.ok) {
      var msg =
        result.data && result.data.message
          ? result.data.message
          : "Erro HTTP " + result.status;
      setStatus(statusEl, msg, false);
      return;
    }
    setStatus(statusEl, "Projeto criado com sucesso.", true);
    form.reset();
    loadProjects();
    if (result.data && result.data.name) {
      loadProjectDetails(result.data.name);
    }
  } catch (err) {
    setStatus(statusEl, "Erro de rede: " + err.message, false);
  }
}

async function handleNewFeatureSubmit(event) {
  event.preventDefault();
  var form = event.target;
  var statusEl = document.getElementById("newFeatureStatus");

  setStatus(statusEl, "Enviando...", true);

  var formData = new FormData();
  formData.append("project_name", form.projectName);
  formData.append("name", form.name.value);
  formData.append("description", form.description.value);
  if (form.status.value) {
    formData.append("status", form.status.value);
  }

  try {
    var result = await fetchJson("POST", "/feature", { body: formData });
    if (!result.ok) {
      var msg =
        result.data && result.data.message
          ? result.data.message
          : "Erro HTTP " + result.status;
      setStatus(statusEl, msg, false);
      return;
    }
    setStatus(statusEl, "Feature adicionada com sucesso.", true);
    form.reset();
    if (result.data && result.data.name) {
      loadProjectDetails(result.data.name);
    } else if (form.project_name.value) {
      loadProjectDetails(form.project_name.value);
    }
  } catch (err) {
    setStatus(statusEl, "Erro de rede: " + err.message, false);
  }
}

async function loadFeatureForm(selectedProject) {
  var card = document.getElementById("newFeatureCard");
  card.style.visibility = "visible";

  var form = document.getElementById("newFeatureForm");
  form.projectName = selectedProject;
}

document.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("vote-btn") ||
    e.target.classList.contains("project-item")
  ) {
    const el = e.target;
    el.classList.remove("clicked");
    void el.offsetWidth;
    el.classList.add("clicked");
  }
});

document
  .getElementById("newProjectForm")
  .addEventListener("submit", handleNewProjectSubmit);
document
  .getElementById("newFeatureForm")
  .addEventListener("submit", handleNewFeatureSubmit);

loadProjects();
