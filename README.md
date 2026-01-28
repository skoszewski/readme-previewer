# Markdown Previewer :mag:

A tool to preview README.md and other files in Markdown. It is designed to run locally, either natively or as a Docker container.

It uses `remark-gfm` to support GitHub Flavored Markdown, `remark-emoji` to support emojis, and `rehype-highlight` for syntax highlighting of code blocks. Some features may not work in other Markdown viewers.

It will render files from a specified directory (default is the current working directory), and follow links to other Markdown files within that directory. It expects `README.md` or `index.md` as the main directory entry point, but you can specify a different file by navigating to it in the browser.

> :warning: **Warning:** It is not designed to be deployed to a public server (yet).

## Run locally

Install Node.js 24 and required dependencies:

```bash
scripts/install-node.sh
npm install
```

> **Note:** You can add a major version number as an argument to `install-node.sh` to install a specific Node.js version (e.g., `scripts/install-node.sh 25`).

To start the app, run:

```bash
npm start
```

or run and expose on all network interfaces:

```bash
npm run host
```

You can specify the documents root directory by setting the `MDPREVIEW_ROOT` environment variable. By default, it uses the current working directory. You can also set the maximum width of the markdown content by setting the `MDPREVIEW_WIDTH` environment variable (default is `900px`).

Example:

```bash
MDPREVIEW_ROOT=/path/to/markdown/files MDPREVIEW_WIDTH=1200px npm run dev
```

## Docker

Build the container image:

```bash
docker build -t $DOCKER_REPO_NAME/markdown-previewer .
```

or pull the image from Docker Hub:

```bash
docker pull $DOCKER_REPO_NAME/markdown-previewer
```

Run the Docker container:

```bash
docker run --rm --name mdpreview -p 3000:3000 -p 5173:5173 -v $(pwd):/docs $DOCKER_REPO_NAME/markdown-previewer
```

## Apple Container

If you are using an Apple Silicon Mac, I encourage you to use the `container` from the [@apple/container](https://github.com/apple/container) project.

Build the container image:

```bash
container builder stop
container builder start --cpus 8 --memory 6G
container build -t $DOCKER_REPO_NAME/markdown-previewer .
```

> :information_source: **Important:** You may need to stop and start the container builder to allocate more resources (CPU and memory) for building the image. Remember to use units like `G` for gigabytes when specifying memory, otherwise it will be interpreted literally as bytes. I recommend at least `--memory 4G` for building this image. Using too little memory may lead to hangs during the build process.

```bash
container run --rm --name mdpreview -p 3000:3000 -p 5173:5173 --mount type=bind,source=$(pwd),target=/docs $DOCKER_REPO_NAME/markdown-previewer
```

You can add the `-e MDPREVIEW_WIDTH=1200px` option to set the maximum width of the markdown content. The MDPREVIEW_ROOT is set to `/docs` inside the container, and should not be changed unless you mount the files to a different location than `/docs`.
