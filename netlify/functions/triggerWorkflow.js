export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Only POST allowed" };
  }

  let projectData;
  try { projectData = JSON.parse(event.body); } 
  catch(e) { return { statusCode: 400, body: "Invalid JSON" }; }

  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml"; // workflow filename
  const token = process.env.TOKEN_GITHUB;

  const requestBody = {
    ref: "main",
    inputs: {
      projectJson: JSON.stringify(projectData)
    }
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (response.status === 204) {
    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Workflow triggered" }) };
  } else {
    const text = await response.text();
    return { statusCode: response.status, body: JSON.stringify({ error: text }) };
  }
}
