const kv = await Deno.openKv();
let githubAccessToken: string;
// Define the GitHub repository and file path
const owner = "netsi1964";
const repo = "StoryTwister";

Deno.serve(async (req) => {
  // Increment a count using Deno KV
  await kv.atomic().sum(["visitors"], 1n).commit();

  // Invoke the function and wait for the href
  await loginToGithub();

  // Get the latest visitor count
  const count = await kv.get(["visitors"]);

  // Get the header and body from the request querystring
  let header = "# default header";
  let body = "Default body";
  let image = "";
  const url = new URL(req.url);
  const queryHeader = url.searchParams.get("header");
  const queryBody = url.searchParams.get("body");
  const queryImage = url.searchParams.get("image");
  if (queryHeader) {
    header = queryHeader;
  }
  if (queryBody) {
    body = queryBody;
  }
  if (queryImage) {
    image = queryImage;
  }
  console.log(header, body, image);

  header = header ?? "header";
  body = body ?? "body";

  const filePath = getFilenameFromHeader(header);
  await createGithubPage(filePath, header, body, image);

  return new Response(
    `Your story will be visible here: https://netsi1964.github.io/StoryTwister/${
      filePath.split(".md")[0]
    }`
  );
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

async function createGithubPage(
  filePath: string,
  header: string,
  body: string,
  image: string
) {
  const sha = await getFileSHA(owner, repo, filePath, githubAccessToken);
  let operation = "Unknown";
  if (sha) {
    operation = "update";
    console.log("Current SHA of the file:", sha);
  } else {
    operation = "create";
  }

  // Define the GitHub API endpoint for updating a file
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  let requestOptions;
  const content = b64(
    `# ${header}\n\n${body}\n\n-----\n${getPrettyDateTimeMarkdown()}`
  );

  if (operation === "update") {
    // Define the PATCH request options
    requestOptions = {
      method: "PUT",
      headers: {
        Authorization: `token ${githubAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update file via Deno Deploy: ${new Date()}`,
        content,
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
  } else {
    // CREATE
    requestOptions = {
      method: "PUT", // Use PUT method to create or update a file
      headers: {
        Authorization: `token ${githubAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Create a new file via Deno Deploy: ${new Date()}`, // Adjust the commit message to reflect file creation
        content,
        // Remove the sha line since it's not needed for a new file
        branch: "main", // Specify the branch if needed, otherwise it defaults to the default branch
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
  }

  // Make the PATCH request using Deno's fetch API
  const response = await fetch(apiUrl, requestOptions);
  const data = await response.json();

  // Handle the response from the GitHub API
  if (response.ok) {
    console.log(`File ${operation} successfully`);
  } else {
    console.error(`Failed to ${operation} file:`, data);
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

    if (response.ok) {
      return data.sha;
    } else {
      console.error("New file");
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

function b64(text: string): string {
  // First, try using Deno's built-in btoa function
  try {
    return btoa(text);
  } catch (e) {
    console.log("Failed base64 encoding using btoa, trying another way...");
    // If btoa is not available or fails, use TextEncoder and manual base64 conversion
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const base64 = btoa(String.fromCharCode(...data));
      return base64;
    } catch (ee) {
      console.log("Failed base64 encoding using TextEncoder...");
    }
  }
  return "";
}

function getFilenameFromHeader(header) {
  // Convert to lowercase
  let filename = header.toLowerCase().trim();

  // Replace spaces with dashes
  filename = filename.replace(/\s+/g, "-");

  // Remove characters that are not letters, numbers, or dashes
  filename = filename.replace(/[^a-z0-9-]/g, "");

  // Append '.md' extension
  filename += ".md";

  return filename;
}

function getPrettyDateTimeMarkdown() {
  const now = new Date();

  // Use Intl.DateTimeFormat to format the date and time in a pretty English format
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  const prettyDateTime = dateFormatter.format(now);

  // Format as Markdown
  return `#### Created: ${prettyDateTime}`;
}
