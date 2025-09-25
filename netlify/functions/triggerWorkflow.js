export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Only POST allowed" };
  }

  const projectData = JSON.parse(event.body);

  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml"; // workflow filename
  const token = process.env.TOKEN_GITHUB;   // your PAT stored in Netlify

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ref: "main", // branch to trigger workflow
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
