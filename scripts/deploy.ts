/**
 * Build and push Docker image to Docker Hub.
 *
 * Usage:
 *   bun run scripts/deploy.ts           # tag = git short SHA
 *   bun run scripts/deploy.ts 1.2.3     # tag = 1.2.3
 *
 * Always pushes two tags: the explicit tag + `latest`.
 *
 * On the server, just run:
 *   IMAGE_TAG=<tag> docker compose pull && docker compose up -d
 */

const DOCKER_HUB_IMAGE = Bun.env.DOCKER_HUB_IMAGE;
if (!DOCKER_HUB_IMAGE) {
  throw new Error("DOCKER_HUB_IMAGE not set");
}

async function exec(cmd: string, args: string[]): Promise<void> {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const proc = Bun.spawn([cmd, ...args], { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Exit ${code}: ${cmd} ${args.join(" ")}`);
  }
}

async function dockerLogin(): Promise<void> {
  const username = Bun.env.DOCKERHUB_USERNAME;
  const token = Bun.env.DOCKERHUB_TOKEN;

  if (!username || !token) {
    console.log("DOCKERHUB_USERNAME / DOCKERHUB_TOKEN not set — skipping docker login (assuming already logged in)");
    return;
  }

  console.log(`\nLogging in to Docker Hub as ${username}…`);
  const proc = Bun.spawn(
    ["docker", "login", "-u", username, "--password-stdin"],
    { stdin: "pipe", stdout: "inherit", stderr: "inherit" },
  );
  proc.stdin.write(token);
  proc.stdin.end();
  const code = await proc.exited;
  if (code !== 0) throw new Error("docker login failed");
}

async function gitShortSha(): Promise<string> {
  const proc = Bun.spawn(["git", "rev-parse", "--short", "HEAD"], {
    stdout: "pipe",
  });
  const sha = (await new Response(proc.stdout).text()).trim();
  await proc.exited;
  if (!sha) throw new Error("Could not read git SHA");
  return sha;
}

async function main(): Promise<void> {
  const tag = Bun.argv[2]?.trim() || (await gitShortSha());

  const imageTagged = `${DOCKER_HUB_IMAGE}:${tag}`;
  const imageLatest = `${DOCKER_HUB_IMAGE}:latest`;

  await dockerLogin();

  console.log(`\nBuilding image → ${imageTagged} + ${imageLatest}`);

  await exec("docker", [
    "build",
    "--platform", "linux/amd64",
    "-t", imageTagged,
    "-t", imageLatest,
    ".",
  ]);

  await exec("docker", ["push", imageTagged]);
  await exec("docker", ["push", imageLatest]);

  console.log(`\nDone.`);
  console.log(`\nTo deploy on the server:`);
  console.log(`  IMAGE_TAG=${tag} docker compose pull && docker compose up -d`);
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
