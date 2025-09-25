import fetch from "node-fetch";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Only POST allowed" };
  }

  const projectData = JSON.parse(event.body);

  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml"; // MUST match actual workflow filename
  const token = process.env.TOKEN_GITHUB;

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        ref: "main", // or "master"
        inputs: { projectJson: JSON.stringify(projectData) } // must match YAML
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { statusCode: response.status, body: errorText };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
}
