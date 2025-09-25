export async function handler(event, context) {
  console.log("=== TRIGGER WORKFLOW START ===");
  console.log("HTTP Method:", event.httpMethod);
  console.log("Raw body:", event.body);

  if (event.httpMethod !== "POST") {
    console.log("Rejected non-POST request");
    return { statusCode: 405, body: JSON.stringify({ error: "Only POST allowed" }) };
  }

  let projectData;
  try {
    projectData = JSON.parse(event.body);
    console.log("Parsed projectData:", JSON.stringify(projectData, null, 2));
  } catch (err) {
    console.error("JSON parse error:", err);
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml"; 
  const token = process.env.TOKEN_GITHUB;

  console.log("Environment variables:", {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    repoOwner,
    repoName,
    workflowId
  });

  if (!token) {
    console.error("Missing GitHub token");
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  try {
    const requestBody = {
      ref: "main",
      inputs: {
        projectJson: JSON.stringify(projectData)
      }
    };

    console.log("Sending to GitHub API:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Netlify-Function"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("GitHub API response status:", response.status);
    console.log("GitHub API response headers:", Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log("GitHub API response body:", responseText);

    if (response.status === 204) {
      // 204 No Content is actually success for workflow dispatch
      console.log("Workflow triggered successfully (204 No Content)");
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          success: true, 
          message: "Workflow triggered successfully",
          workflowUrl: `https://github.com/${repoOwner}/${repoName}/actions`
        }) 
      };
    }

    if (!response.ok) {
      console.error("GitHub API error:", response.status, responseText);
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ 
          error: `GitHub API error: ${response.status}`,
          details: responseText 
        }) 
      };
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        message: "Workflow triggered",
        response: responseText 
      }) 
    };
  } catch (err) {
    console.error("Error calling GitHub API:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Network error", 
        details: err.message 
      }) 
    };
  }
}
