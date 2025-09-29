const fetch = require("node-fetch");

module.exports.handler = async function(event, context) {
  console.log("=== TRIGGER WORKFLOW START ===");
  console.log("HTTP Method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Only POST allowed" }) };
  }

  let projectData;
  try {
    projectData = JSON.parse(event.body);
    console.log("Parsed projectData:", projectData);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON", details: err.message }) };
  }

  // GitHub workflow dispatch
  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml";
  const token = process.env.TOKEN_GITHUB;

  if (!token) return { statusCode: 500, body: JSON.stringify({ error: "Missing GitHub token" }) };

  try {
    const requestBody = { ref: "main", inputs: { projectJson: JSON.stringify(projectData) } };
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (response.status === 204) {
      return { statusCode: 200, body: JSON.stringify({ success: true, projectData }) };
    }

    const responseText = await response.text();
    return { statusCode: response.status, body: JSON.stringify({ error: "GitHub API error", details: responseText }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Network error", details: err.message }) };
  }
};
