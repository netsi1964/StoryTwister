const kv = await Deno.openKv();
let githubAccessToken: string;
// Define the GitHub repository and file path
const owner = "netsi1964";
const repo = "StoryTwister";

Deno.serve(async () => {
  // Increment a count using Deno KV
  await kv.atomic().sum(["visitors"], 1n).commit();

  // Invoke the function and wait for the href
  await loginToGithub();

  // Get the latest visitor count
  const count = await kv.get(["visitors"]);

  await updateGithubPage(
    `# This was created on the ${count.value} visit to the domain!`
  );

  return new Response(`This branch has been run ${count.value} times`);
});

function loginToGithub() {
  // Retrieve the GitHub access token from the environment variables
  githubAccessToken = Deno.env.get("GITHUB_ACCESS_TOKEN") ?? "";

  if (!githubAccessToken) {
    console.error("GitHub access token not found in environment variables");
    Deno.exit(1);
  }

  // You can now use the githubAccessToken to authenticate with the GitHub API using Deno's fetch API
  console.info("Access to Github granted");
}

async function updateGithubPage(md: string) {
  const filePath = "fromDeno.md";

  const sha = await getFileSHA(owner, repo, filePath, githubAccessToken);
  if (sha) {
    console.log("Current SHA of the file:", sha);
  }

  // Define the GitHub API endpoint for updating a file
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // Define the PATCH request options
  const requestOptions = {
    method: "PUT",
    headers: {
      Authorization: `token ${githubAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Update file via Deno Deploy: ${new Date()}`,
      content: btoa(md), // Encode the new content as base64
      sha,
      branch: "main",
      committer: {
        name: "Sten Hougaard",
        email: "netsi1964@gmail.com",
      },
      author: {
        name: "Sten Hougaard",
        email: "netsi1964@gmail.com",
      },
    }),
  };

  // Make the PATCH request using Deno's fetch API
  const response = await fetch(apiUrl, requestOptions);
  const data = await response.json();

  // Handle the response from the GitHub API
  if (response.ok) {
    console.log("File updated successfully:", data);
  } else {
    console.error("Failed to update file:", data);
  }
}

async function getFileSHA(
  owner: string,
  repo: string,
  filePath: string,
  githubAccessToken: string
): Promise<string | null> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const requestOptions = {
    method: "GET",
    headers: {
      Authorization: `token ${githubAccessToken}`,
    },
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();

    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      return data.sha;
    } else {
      console.error("Failed to retrieve file information:", data);
      return null;
    }
  } catch (error) {
    console.error(
      "An error occurred while retrieving file information:",
      error
    );
    return null;
  }
}
