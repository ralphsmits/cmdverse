export async function handler(event, context) {
  console.log("Received event:", event.body);  // log input

  if (event.httpMethod !== "POST") {
    console.log("Rejected non-POST request");
    return { statusCode: 405, body: "Only POST allowed" };
  }

  let projectData;
  try {
    projectData = JSON.parse(event.body);
    console.log("Parsed projectData:", projectData);
  } catch (err) {
    console.error("JSON parse error:", err);
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml"; 
  const token = process.env.TOKEN_GITHUB;

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { projectJson: JSON.stringify(projectData) }
      })
    });

    console.log("GitHub API response status:", response.status);
    const text = await response.text();
    console.log("GitHub API response body:", text);

    if (!response.ok) {
      return { statusCode: response.status, body: text };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, rawResponse: text }) };
  } catch (err) {
    console.error("Error calling GitHub API:", err);
    return { statusCode: 500, body: err.message };
  }
}
