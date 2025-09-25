import fetch from "node-fetch";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Only POST allowed" };
  }

  const projectData = JSON.parse(event.body);

  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml"; // workflow file name in your repo
  const token = process.env.TOKEN_GITHUB; // your GitHub PAT stored in Netlify secrets

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { projectJson: JSON.stringify(projectData) }
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
