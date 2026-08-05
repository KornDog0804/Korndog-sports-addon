PLUGIN = {
  id: "korndog.stremio.publicdomain",
  label: "KornDog Public Domain Movies",
  description: "Searches Stremio's official Public Domain Movies addon and returns playable streams.",
  capabilities: ["stream_search"],
  contentTypes: ["movie"]
};

var ADDON_BASE =
  "https://caching.stremio.net/publicdomainmovies.now.sh";

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function getJson(url) {
  var response = host.httpGet(url, {
    "Accept": "application/json",
    "User-Agent": "KornDog-Lumora-Bridge/1.0"
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error("HTTP " + response.status);
  }

  var data = safeJson(response.body);

  if (!data) {
    throw new Error("Invalid JSON response");
  }

  return data;
}

function search(host, query, year, season, episode) {
  query = String(query || "").trim();

  if (!query) {
    throw new Error("Empty search query");
  }

  host.reportProgress(
    'Searching public-domain movies for "' + query + '"'
  );

  var url =
    ADDON_BASE +
    "/catalog/movie/publicdomainmovies/search=" +
    encodeURIComponent(query) +
    ".json";

  var data = getJson(url);
  var metas = data && Array.isArray(data.metas)
    ? data.metas
    : [];

  var sent = 0;

  for (var i = 0; i < metas.length && sent < 50; i++) {
    var item = metas[i];

    if (!item || !item.id || !item.name) {
      continue;
    }

    host.reportResult({
      title: item.name,
      token: "publicdomain:" + item.id,
      source: "Stremio Public Domain",
      quality: item.releaseInfo || "",
      size: item.description || ""
    });

    sent++;
  }

  return sent === 0
    ? "No public-domain matches"
    : sent + " result" + (sent === 1 ? "" : "s");
}

function resolve(host, token, season, episode) {
  var prefix = "publicdomain:";

  if (!token || token.indexOf(prefix) !== 0) {
    throw new Error("Invalid token");
  }

  var id = token.substring(prefix.length);

  host.reportProgress("Resolving public-domain stream");

  var url =
    ADDON_BASE +
    "/stream/movie/" +
    encodeURIComponent(id) +
    ".json";

  var data = getJson(url);
  var streams = data && Array.isArray(data.streams)
    ? data.streams
    : [];

  for (var i = 0; i < streams.length; i++) {
    var stream = streams[i];

    if (
      stream &&
      typeof stream.url === "string" &&
      /^https?:\/\//.test(stream.url)
    ) {
      return {
        url: stream.url
      };
    }
  }

  throw new Error("No direct HTTP stream available");
}
