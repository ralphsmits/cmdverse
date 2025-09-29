import cloudinary from "cloudinary";

// Auto-config via CLOUDINARY_URL environment variable
cloudinary.v2.config(true);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Only POST allowed" }) };
  }

  let projectData;
  try {
    projectData = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON", details: err.message }) };
  }

  // Upload base64 files to Cloudinary
  projectData.media = { urls: [] };
  try {
    for (const file of projectData.mediaFiles || []) {
      const result = await cloudinary.v2.uploader.upload(`data:;base64,${file.content}`, {
        resource_type: "auto",
        public_id: file.filename.split(".")[0]
      });
      projectData.media.urls.push(result.secure_url);
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Cloudinary upload failed", details: err.message }) };
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
}
