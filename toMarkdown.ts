import { marked } from "https://cdn.skypack.dev/marked@4.0.10";

// get all .md files /stories/*.md and save them to /stories/html/*.html

const stories = Deno.readDirSync("./stories");

for (const story of stories) {
  if (story.isFile && story.name.endsWith(".md")) {
    const markdown = Deno.readTextFileSync(`./stories/${story.name}`);

    const html = marked.parse(markdown);

    Deno.writeTextFileSync(
      `./stories/html/${story.name.replace(".md", ".html")}`,
      html
    );
  }
}

function toHTMLPage(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Story Twister</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
  <main
    ${body}
    </main>
  </body>
</html>`;
}
