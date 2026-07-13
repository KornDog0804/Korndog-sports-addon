const fetch = require("node-fetch");

const TARGETS = [
  { id: "677d9adfa9a51b0008497fa0", name: "UFC" },
  { id: "59b722526996084038c01e1b", name: "TNA Wrestling" }
];

async function fetchTarget(target) {
  const urls = [
    `https://api.pluto.tv/v2/channels/${target.id}`,
    `https://api.pluto.tv/v2/channels?id=${target.id}`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });

      const text = await response.text();
      console.log(`\n${target.name}`);
      console.log(`URLS: ${response.status}`);
      console.log(url);
      console.log(text.slice(0, 1500));

      if (response.ok) return;
    } catch (error) {
      console.error(`${target.name}: ${error.message}`);
    }
  }
}

async function main() {
  for (const target of TARGETS) {
    await fetchTarget(target);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
