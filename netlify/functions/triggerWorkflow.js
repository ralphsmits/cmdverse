import multiparty from "multiparty";
import cloudinary from "cloudinary";

// Auto-config via CLOUDINARY_URL in Netlify
cloudinary.v2.config(true);

export async function handler(event, context) {
  console.log("=== TRIGGER WORKFLOW START ===");
  console.log("HTTP Method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    console.log("Rejected non-POST request");
    return { statusCode: 405, body: JSON.stringify({ error: "Only POST allowed" }) };
  }

  // Parse multipart form data
  const form = new multiparty.Form();
  let projectData;
  let files = [];

  try {
    await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, f) => {
        if (err) return reject(err);
        try {
          projectData = JSON.parse(fields.data[0]);
          files = f.files?.files || [];
          resolve();
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  } catch (err) {
    console.error("Form parse / JSON error:", err);
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid form or JSON", details: err.message }) };
  }

  console.log("Parsed projectData:", projectData);
  console.log("Files to upload:", files.map(f => f.originalFilename));

  // Upload files to Cloudinary
  projectData.media = { urls: [] };
  try {
    for (const file of files) {
      const result = await cloudinary.v2.uploader.upload(file.path, { resource_type: "auto" });
      projectData.media.urls.push(result.secure_url);
    }
  } catch (uploadErr) {
    console.error("Cloudinary upload error:", uploadErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Cloudinary upload failed", details: uploadErr.message }) };
  }

  // GitHub dispatch logic
  const repoOwner = "ralphsmits";
  const repoName = "cmdverse";
  const workflowId = "update-projects.yml";
  const token = process.env.TOKEN_GITHUB;

  if (!token) {
    console.error("Missing GitHub token");
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  try {
    const requestBody = {
      ref: "main",
      inputs: { projectJson: JSON.stringify(projectData) }
    };

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

    const responseText = await response.text();

    if (response.status === 204) {
      console.log("Workflow triggered successfully (204 No Content)");
      return { 
        statusCode: 200, 
        body: JSON.stringify({ success: true, projectData, workflowUrl: `https://github.com/${repoOwner}/${repoName}/actions` }) 
      };
    }

    if (!response.ok) {
      console.error("GitHub API error:", response.status, responseText);
      return { statusCode: response.status, body: JSON.stringify({ error: `GitHub API error: ${response.status}`, details: responseText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, projectData, response: responseText }) };
  } catch (err) {
    console.error("Error calling GitHub API:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Network error", details: err.message }) };
  }
}
